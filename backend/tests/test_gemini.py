"""The Gemini advisor, with the network replaced, and the choice between it and the rules."""

import io
import json
import threading
import urllib.error
from datetime import timedelta
from typing import Any

import pytest
from flask import Flask, current_app
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Advice, AdviceSource, AdviceTrigger, Severity
from app.models.types import utcnow
from app.services.advisor import generator
from app.services.advisor.background import BackgroundRunner
from app.services.advisor.base import AdviceContext
from app.services.advisor.gemini import AdvisorError, GeminiAdvisor
from app.services.advisor.prompts import build_prompt
from app.services.advisor.triggers import metric_facts
from app.services.settings_defaults import DEFAULT_SETTINGS

GOOD = {
    "summary": "Lubang 3 menunjukkan tanda kekurangan nitrogen.",
    "likely_causes": ["Nitrogen dalam larutan kurang"],
    "suggested_actions": ["Periksa larutan nutrisi", "Pantau 24 jam"],
    "severity": "warning",
}


def context(position: int = 3, status: str = "n_deficiency", ph: float = 6.0) -> AdviceContext:
    return AdviceContext(
        trigger=AdviceTrigger.PLANT_STATUS,
        plant_position=position,
        status=status,
        confidence=0.9,
        recent_statuses=["normal", status],
        metrics=metric_facts({"ph": ph, "ec": 1.2, "temperature": 22.0}, DEFAULT_SETTINGS),
    )


class FakeResponse(io.BytesIO):
    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()


def answer(text: str) -> FakeResponse:
    body = {"candidates": [{"content": {"parts": [{"text": text}]}}]}
    return FakeResponse(json.dumps(body).encode())


@pytest.fixture()
def calls(monkeypatch: pytest.MonkeyPatch) -> list[Any]:
    """Every request that was sent; the reply is `calls.reply`, or an exception to raise."""
    sent: list[Any] = []

    class Calls(list):
        reply: Any = answer(json.dumps(GOOD))

    record = Calls()

    def fake_urlopen(request: Any, timeout: float) -> Any:
        record.append((request, timeout))
        if isinstance(record.reply, Exception):
            raise record.reply
        return record.reply

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    del sent
    return record


def advisor() -> GeminiAdvisor:
    return GeminiAdvisor("secret-key", "gemini-test")


# --- the advisor ------------------------------------------------------------------------------


def test_a_valid_answer_becomes_advice(calls: list[Any]) -> None:
    draft = advisor().advise(context())

    assert draft.summary == GOOD["summary"]
    assert draft.suggested_actions == GOOD["suggested_actions"]
    assert draft.severity is Severity.WARNING
    assert draft.source is AdviceSource.LLM
    assert (draft.provider, draft.model_name) == ("gemini", "gemini-test")


def test_the_request_carries_the_key_in_a_header_and_the_facts_in_the_body(
    calls: list[Any],
) -> None:
    advisor().advise(context())

    request, timeout = calls[0]
    assert request.full_url.endswith("/models/gemini-test:generateContent")
    assert request.get_header("X-goog-api-key") == "secret-key"
    assert "secret-key" not in request.full_url
    assert timeout == 20
    body = json.loads(request.data)
    assert body["generationConfig"]["responseMimeType"] == "application/json"
    assert "kekurangan nitrogen" in body["contents"][0]["parts"][0]["text"]


def test_the_prompt_holds_facts_and_never_asks_for_a_class() -> None:
    prompt = build_prompt(context())

    assert '"lubang": 3' in prompt
    assert "di atas rentang ideal" not in prompt  # ph 6.0 is in range
    assert "kekurangan nitrogen (N)" in prompt
    assert "dalam rentang ideal" in prompt
    assert "normal" in prompt  # the recent statuses


@pytest.mark.parametrize(
    "text",
    [
        "bukan json",
        json.dumps({**GOOD, "severity": "urgent"}),
        json.dumps({**GOOD, "suggested_actions": []}),
        json.dumps({**GOOD, "suggested_actions": ["a"] * 6}),
        json.dumps({**GOOD, "summary": "  "}),
        json.dumps({k: v for k, v in GOOD.items() if k != "summary"}),
        json.dumps([GOOD]),
    ],
)
def test_an_answer_that_does_not_fit_is_refused(calls: list[Any], text: str) -> None:
    calls.reply = answer(text)

    with pytest.raises(AdvisorError):
        advisor().advise(context())


@pytest.mark.parametrize(
    "failure",
    [
        urllib.error.HTTPError("https://x", 429, "quota", {}, None),  # type: ignore[arg-type]
        urllib.error.URLError("no internet"),
        TimeoutError("slow"),
    ],
)
def test_a_failed_call_is_an_advisor_error(calls: list[Any], failure: Exception) -> None:
    calls.reply = failure

    with pytest.raises(AdvisorError) as error:
        advisor().advise(context())

    assert "secret-key" not in str(error.value)


def test_an_answer_without_candidates_is_an_advisor_error(calls: list[Any]) -> None:
    calls.reply = FakeResponse(json.dumps({"promptFeedback": {"blockReason": "SAFETY"}}).encode())

    with pytest.raises(AdvisorError):
        advisor().advise(context())


# --- the choice -------------------------------------------------------------------------------


@pytest.fixture()
def keyed(app: Flask) -> Flask:
    app.config["GEMINI_API_KEY"] = "secret-key"
    app.config["GEMINI_MODEL"] = "gemini-test"
    return app


def test_without_a_key_the_rules_advise_and_nothing_is_sent(app: Flask, calls: list[Any]) -> None:
    row = generator.create_advice(context())

    assert row.source is AdviceSource.RULES
    assert calls == []


def test_with_a_key_the_model_advises(keyed: Flask, calls: list[Any]) -> None:
    row = generator.create_advice(context())

    assert row.source is AdviceSource.LLM
    assert row.provider == "gemini"
    assert row.model_name == "gemini-test"
    assert row.context["status"] == "n_deficiency"
    assert len(calls) == 1


def test_when_the_model_fails_the_rules_advise(keyed: Flask, calls: list[Any]) -> None:
    calls.reply = urllib.error.URLError("no internet")

    row = generator.create_advice(context())

    assert row.source is AdviceSource.RULES
    assert row.provider is None
    assert row.suggested_actions[0] == "Periksa konsentrasi larutan nutrisi"


def test_the_same_facts_reuse_the_answer_for_a_while(keyed: Flask, calls: list[Any]) -> None:
    first = generator.create_advice(context(ph=6.2))
    second = generator.create_advice(context(ph=5.8))  # same band

    assert len(calls) == 1
    assert second.id != first.id
    assert second.summary == first.summary
    assert second.source is AdviceSource.LLM


def test_other_facts_ask_the_model_again(keyed: Flask, calls: list[Any]) -> None:
    generator.create_advice(context(ph=6.0))
    generator.create_advice(context(ph=7.2))  # another band
    generator.create_advice(context(position=4, ph=6.0))  # another hole

    assert len(calls) == 3


def test_an_old_answer_is_not_reused(keyed: Flask, calls: list[Any]) -> None:
    generator.create_advice(context())
    db.session.execute(db.update(Advice).values(created_at=utcnow() - timedelta(hours=7)))
    db.session.commit()

    generator.create_advice(context())

    assert len(calls) == 2


def test_a_fallback_answer_is_never_reused(keyed: Flask, calls: list[Any]) -> None:
    calls.reply = urllib.error.URLError("no internet")
    generator.create_advice(context())
    calls.reply = answer(json.dumps(GOOD))

    row = generator.create_advice(context())

    assert row.source is AdviceSource.LLM


# --- the header chip --------------------------------------------------------------------------


def advisor_chip(client: FlaskClient, headers: dict) -> bool:
    return client.get("/api/status", headers=headers).get_json()["advisor"]


def test_the_chip_is_offline_without_a_key(client: FlaskClient, viewer_headers: dict) -> None:
    assert advisor_chip(client, viewer_headers) is False


def test_the_chip_is_online_with_a_key(
    keyed: Flask, client: FlaskClient, viewer_headers: dict
) -> None:
    assert advisor_chip(client, viewer_headers) is True


def test_the_chip_follows_the_newest_advice(
    keyed: Flask, calls: list[Any], client: FlaskClient, viewer_headers: dict
) -> None:
    calls.reply = urllib.error.URLError("no internet")
    generator.create_advice(context())
    assert advisor_chip(client, viewer_headers) is False

    calls.reply = answer(json.dumps(GOOD))
    generator.create_advice(context(position=5))
    assert advisor_chip(client, viewer_headers) is True


# --- the background runner --------------------------------------------------------------------


def test_a_job_runs_in_another_thread_inside_the_app_context(app: Flask) -> None:
    seen: dict[str, Any] = {}

    def job() -> None:
        seen["thread"] = threading.current_thread().name
        seen["app"] = current_app.name

    runner = BackgroundRunner(app)
    runner.submit(job)
    runner.close()

    assert seen["thread"].startswith("advisor")
    assert seen["app"] == app.name


def test_a_failing_job_does_not_stop_the_next_one(app: Flask) -> None:
    done: list[int] = []

    def broken() -> None:
        raise RuntimeError("boom")

    runner = BackgroundRunner(app)
    runner.submit(broken)
    runner.submit(lambda: done.append(1))
    runner.close()

    assert done == [1]
