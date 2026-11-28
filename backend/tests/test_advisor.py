"""The rule-based advisor and what starts it: a hole that changes status, a sensor that stays
out of range."""

from datetime import timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from flask import Flask

from app.extensions import db
from app.models import (
    Advice,
    AdviceRule,
    AdviceSource,
    AdviceTrigger,
    Device,
    SensorReading,
    Severity,
)
from app.models.types import utcnow
from app.services.advisor import triggers
from app.services.advisor.base import AdviceContext
from app.services.advisor.rules import DEFAULT_ACTIONS, RULE_CODES, RulesAdvisor
from app.services.settings_defaults import DEFAULT_SETTINGS
from app.services.vision.recorder import Recorder
from app.services.vision.worker import VisionWorker
from tests.test_recorder import JPEG, Clock, analysis, result, settings
from tests.test_vision_worker import Clock as WorkerClock
from tests.test_vision_worker import FakeCamera

IN_RANGE = {"ph": 6.0, "ec": 1.8, "temperature": 22.0}


def metrics(**values: float):
    return triggers.metric_facts({**IN_RANGE, **values}, DEFAULT_SETTINGS)


def advice_rows() -> list[Advice]:
    return list(db.session.scalars(db.select(Advice).order_by(Advice.id)))


def add_readings(device: Device, minutes: int, **values: float) -> None:
    """One reading every 10 seconds for the last `minutes` minutes, newest at 'now'."""
    now = utcnow()
    merged = {**IN_RANGE, **values}
    for step in range(minutes * 6 + 1):
        db.session.add(
            SensorReading(
                device_id=device.id,
                ph=Decimal(str(merged["ph"])),
                ec=Decimal(str(merged["ec"])),
                tds_ppm=int(merged["ec"] * 500),
                temperature=Decimal(str(merged["temperature"])),
                recorded_at=now - timedelta(seconds=10 * step),
            )
        )
    db.session.commit()


# --- the rules --------------------------------------------------------------------------------


def plant_context(status: str, **values: float) -> AdviceContext:
    return AdviceContext(
        trigger=AdviceTrigger.PLANT_STATUS,
        plant_position=3,
        status=status,
        confidence=0.9,
        metrics=metrics(**values),
    )


def test_a_nitrogen_deficiency_gets_the_nitrogen_advice(app: Flask) -> None:
    draft = RulesAdvisor().advise(plant_context("n_deficiency"))

    assert draft.summary == "Tanaman pada lubang 3 menunjukkan tanda kekurangan nitrogen."
    assert draft.suggested_actions == DEFAULT_ACTIONS["n_deficiency_in_range"]
    assert draft.severity is Severity.WARNING
    assert draft.source is AdviceSource.RULES
    assert (draft.provider, draft.model_name) == (None, None)


def test_a_high_ph_is_named_as_the_cause_of_an_iron_deficiency(app: Flask) -> None:
    draft = RulesAdvisor().advise(plant_context("fe_deficiency", ph=7.1))

    assert draft.likely_causes[0] == "pH tandon yang tinggi membuat zat besi sulit diserap"
    assert "pH 7,1 di atas rentang ideal 5,5 sampai 6,5" in draft.likely_causes


def test_a_hole_to_check_gets_the_check_advice(app: Flask) -> None:
    draft = RulesAdvisor().advise(plant_context("needs_check"))

    assert draft.summary == "Status lubang 3 perlu dicek langsung."
    assert draft.severity is Severity.INFO


@pytest.mark.parametrize(
    ("focus", "value", "summary", "cause"),
    [
        ("ph", 7.1, "pH 7,1 di atas rentang ideal 5,5 sampai 6,5.", "Sensor belum dikalibrasi"),
        (
            "ec",
            1.2,
            "EC 1,20 mS/cm di bawah rentang ideal 1,50 sampai 2,00 mS/cm.",
            "terlalu encer",
        ),
        ("ec", 2.6, "EC 2,60 mS/cm di atas rentang ideal 1,50 sampai 2,00 mS/cm.", "terlalu pekat"),
        (
            "temperature",
            29.0,
            "Suhu air 29,0 °C di atas rentang ideal 18,0 sampai 26,0 °C.",
            "tinggi",
        ),
        (
            "temperature",
            15.0,
            "Suhu air 15,0 °C di bawah rentang ideal 18,0 sampai 26,0 °C.",
            "rendah",
        ),
    ],
)
def test_a_sensor_out_of_range_gets_its_own_advice(
    app: Flask, focus: str, value: float, summary: str, cause: str
) -> None:
    context = AdviceContext(
        trigger=AdviceTrigger.SENSOR_RANGE, focus=focus, metrics=metrics(**{focus: value})
    )
    draft = RulesAdvisor().advise(context)

    assert draft.summary == summary
    assert cause in draft.likely_causes[0]


def test_an_edit_of_the_actions_replaces_the_default(app: Flask) -> None:
    db.session.add(AdviceRule(code="needs_check", suggested_actions=["Cek hole"]))
    db.session.commit()

    assert RulesAdvisor().advise(plant_context("needs_check")).suggested_actions == ["Cek hole"]
    assert (
        RulesAdvisor().advise(plant_context("n_deficiency")).suggested_actions
        == (DEFAULT_ACTIONS["n_deficiency_in_range"])
    )


def test_every_rule_has_default_actions() -> None:
    assert set(DEFAULT_ACTIONS) == set(RULE_CODES)


def test_the_cache_key_follows_the_status_and_the_bands() -> None:
    same = plant_context("n_deficiency", ph=6.2).cache_key()
    assert same == plant_context("n_deficiency", ph=5.8).cache_key()
    assert same != plant_context("n_deficiency", ph=7.0).cache_key()
    assert same != plant_context("fe_deficiency", ph=6.2).cache_key()


# --- a hole changes status --------------------------------------------------------------------


@pytest.fixture()
def recorder(app: Flask, webcam: Device) -> Recorder:
    return Recorder(Path(app.config["STORAGE_DIR"]) / "snapshots", Clock())


def test_a_hole_that_turns_deficient_gets_advice(recorder: Recorder) -> None:
    recorder.record(JPEG, analysis(result(1), result(3, "n_deficiency")), settings())

    rows = advice_rows()
    assert len(rows) == 1
    assert rows[0].trigger is AdviceTrigger.PLANT_STATUS
    assert rows[0].plant_class.value == "n_deficiency"
    assert rows[0].observation_id is not None
    assert rows[0].context["plant_position"] == 3


def test_healthy_and_empty_holes_get_no_advice(recorder: Recorder) -> None:
    recorder.record(JPEG, analysis(result(1), result(2, "no_plant")), settings())

    assert advice_rows() == []


def test_a_status_that_stays_the_same_gets_advice_only_once(recorder: Recorder) -> None:
    recorder.record(JPEG, analysis(result(3, "n_deficiency")), settings())
    again = Recorder(recorder._snapshots, Clock())  # a restarted worker remembers nothing
    again.record(JPEG, analysis(result(3, "n_deficiency")), settings())

    assert len(advice_rows()) == 1


def test_a_hole_that_changes_between_problems_gets_new_advice(recorder: Recorder) -> None:
    recorder.record(JPEG, analysis(result(3, "n_deficiency")), settings())
    recorder.record(JPEG, analysis(result(3, "fe_deficiency")), settings())

    assert [row.plant_class.value for row in advice_rows()] == ["n_deficiency", "fe_deficiency"]


def test_advice_that_fails_does_not_cost_the_observations(
    recorder: Recorder, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(*args: object) -> None:
        raise RuntimeError("no advice today")

    monkeypatch.setattr("app.services.vision.recorder.advise_plant_status", broken)

    assert recorder.record(JPEG, analysis(result(3, "n_deficiency")), settings())
    assert advice_rows() == []


# --- a sensor stays out of range --------------------------------------------------------------


def test_a_value_out_of_range_for_five_minutes_gets_advice(
    app: Flask, sensor_node: tuple[Device, str]
) -> None:
    add_readings(sensor_node[0], minutes=5, ph=7.1)

    made = triggers.watch_sensors(DEFAULT_SETTINGS)

    assert len(made) == 1
    row = advice_rows()[0]
    assert row.trigger is AdviceTrigger.SENSOR_RANGE
    assert row.plant_id is None
    assert row.summary == "pH 7,1 di atas rentang ideal 5,5 sampai 6,5."


def test_a_value_out_of_range_for_less_time_gets_no_advice(
    app: Flask, sensor_node: tuple[Device, str]
) -> None:
    add_readings(sensor_node[0], minutes=3, ph=7.1)

    assert triggers.watch_sensors(DEFAULT_SETTINGS) == []


def test_a_value_that_came_back_into_range_gets_no_advice(
    app: Flask, sensor_node: tuple[Device, str]
) -> None:
    device = sensor_node[0]
    add_readings(device, minutes=5, ph=7.1)
    db.session.execute(
        db.update(SensorReading)
        .where(SensorReading.recorded_at > utcnow() - timedelta(minutes=2))
        .values(ph=Decimal("6.0"))
    )
    db.session.commit()

    assert triggers.watch_sensors(DEFAULT_SETTINGS) == []


def test_a_stale_sensor_gets_no_advice(app: Flask, sensor_node: tuple[Device, str]) -> None:
    add_readings(sensor_node[0], minutes=5, ph=7.1)
    db.session.execute(
        db.update(SensorReading).values(
            recorded_at=SensorReading.recorded_at - timedelta(minutes=10)
        )
    )
    db.session.commit()

    assert triggers.watch_sensors(DEFAULT_SETTINGS) == []


def test_the_same_problem_gets_advice_again_only_after_an_hour(
    app: Flask, sensor_node: tuple[Device, str]
) -> None:
    add_readings(sensor_node[0], minutes=5, ph=7.1)
    triggers.watch_sensors(DEFAULT_SETTINGS)
    assert triggers.watch_sensors(DEFAULT_SETTINGS) == []

    db.session.execute(db.update(Advice).values(created_at=utcnow() - timedelta(minutes=61)))
    db.session.commit()
    assert len(triggers.watch_sensors(DEFAULT_SETTINGS)) == 1


def test_the_other_side_of_the_range_is_a_new_problem(
    app: Flask, sensor_node: tuple[Device, str]
) -> None:
    add_readings(sensor_node[0], minutes=5, ph=7.1)
    triggers.watch_sensors(DEFAULT_SETTINGS)
    db.session.execute(db.update(SensorReading).values(ph=Decimal("4.5")))
    db.session.commit()

    assert len(triggers.watch_sensors(DEFAULT_SETTINGS)) == 1


def test_two_values_out_of_range_get_two_pieces_of_advice(
    app: Flask, sensor_node: tuple[Device, str]
) -> None:
    add_readings(sensor_node[0], minutes=5, ph=7.1, temperature=30.0)

    assert len(triggers.watch_sensors(DEFAULT_SETTINGS)) == 2


# --- the worker -------------------------------------------------------------------------------


def test_the_worker_looks_at_the_sensors_every_half_minute(webcam: Device, app: Flask) -> None:
    from app.services.vision.frame_store import FrameStore

    calls: list[dict] = []
    clock = WorkerClock()
    worker = VisionWorker(
        FakeCamera(),
        FrameStore(Path(app.config["STORAGE_DIR"]) / "frames"),
        clock=clock,
        watch_sensors=calls.append,
    )

    worker.tick()
    assert len(calls) == 1
    clock.now = 10
    worker.tick()
    assert len(calls) == 1
    clock.now = 31
    worker.tick()
    assert len(calls) == 2


def test_a_failure_while_looking_at_the_sensors_does_not_stop_the_worker(
    webcam: Device, app: Flask
) -> None:
    from app.services.vision.frame_store import FrameStore

    def broken(settings: dict) -> None:
        raise RuntimeError("boom")

    camera = FakeCamera()
    worker = VisionWorker(
        camera,
        FrameStore(Path(app.config["STORAGE_DIR"]) / "frames"),
        clock=WorkerClock(),
        watch_sensors=broken,
    )

    worker.tick()
    worker.tick()
    assert camera.opened
