"""The language model advisor: Gemini over its REST API (docs/Architecture.md section 4.5).

The answer is checked before it is used. Any failure (no network, a quota, a refusal, text that
is not the JSON we asked for) raises `AdvisorError`, and the caller falls back to the rules.
"""

import json
import urllib.error
import urllib.request
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, ValidationError

from app.models import AdviceSource, Severity
from app.services.advisor.base import AdviceContext, AdviceDraft
from app.services.advisor.prompts import SYSTEM_PROMPT, build_prompt

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
TIMEOUT_SECONDS = 20.0
PROVIDER = "gemini"

Line = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]


class AdvisorError(Exception):
    """The language model gave no usable advice."""


class LlmAdvice(BaseModel):
    """The JSON the model must return."""

    summary: Line
    likely_causes: list[Line] = Field(max_length=5)
    suggested_actions: list[Line] = Field(min_length=1, max_length=5)
    severity: Literal["info", "warning", "critical"]


class GeminiAdvisor:
    def __init__(self, api_key: str, model: str, timeout: float = TIMEOUT_SECONDS) -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    def advise(self, context: AdviceContext) -> AdviceDraft:
        text = self._generate(build_prompt(context))
        try:
            advice = LlmAdvice.model_validate_json(text)
        except ValidationError as error:
            raise AdvisorError("the answer is not the JSON that was asked for") from error
        return AdviceDraft(
            summary=advice.summary,
            likely_causes=advice.likely_causes,
            suggested_actions=advice.suggested_actions,
            severity=Severity(advice.severity),
            source=AdviceSource.LLM,
            provider=PROVIDER,
            model_name=self._model,
        )

    def _generate(self, prompt: str) -> str:
        body = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.3},
        }
        request = urllib.request.Request(
            f"{BASE_URL}/models/{self._model}:generateContent",
            data=json.dumps(body).encode(),
            headers={"x-goog-api-key": self._api_key, "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                answer = json.load(response)
        except urllib.error.HTTPError as error:
            raise AdvisorError(f"Gemini answered HTTP {error.code}") from error
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            raise AdvisorError(f"cannot reach Gemini: {error}") from error
        try:
            parts = answer["candidates"][0]["content"]["parts"]
            return "".join(part["text"] for part in parts if not part.get("thought"))
        except (KeyError, IndexError, TypeError) as error:
            raise AdvisorError("Gemini gave no answer (blocked or empty)") from error
