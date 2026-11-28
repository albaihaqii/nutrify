"""Storing the analysis: the snapshot, one observation per hole and the state of each hole."""

from datetime import timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from flask import Flask

from app.extensions import db
from app.models import (
    Capture,
    Device,
    Observation,
    Plant,
    PlantClass,
    QcStatus,
    SensorReading,
)
from app.models.types import utcnow
from app.schemas.camera import CameraAnalysis, PlantAnalysis, RuleStep
from app.services.settings_defaults import DEFAULT_ROI_CONFIG, DEFAULT_SETTINGS
from app.services.vision.recorder import Recorder

JPEG = b"\xff\xd8 not a real picture \xff\xd9"
FEATURES = {"mean_r": 92.3, "mean_g": 103.9, "mean_b": 53.6}


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def result(position: int, status: str | None = "normal", **changes: object) -> PlantAnalysis:
    data: dict = {
        "position": position,
        "status": status,
        "confidence": 0.72,
        "observed": status or "normal",
        "predicted": "normal",
        "leaf_area_ratio": 0.5912,
        "features": FEATURES,
        "rule_path": [RuleStep(feature="mean_r", operator="<=", threshold=144.55)],
        "comparators": [],
    }
    if status == "no_plant":
        data |= {"confidence": None, "predicted": None, "features": None, "rule_path": []}
    return PlantAnalysis(**{**data, **changes})


def analysis(*plants: PlantAnalysis) -> CameraAnalysis:
    return CameraAnalysis(
        analyzed_at=utcnow(), model_version="c45-0.1.0", consensus=False, plants=list(plants)
    )


def six(status: str = "normal") -> list[PlantAnalysis]:
    return [result(position, status) for position in range(1, 7)]


@pytest.fixture()
def snapshots(app: Flask) -> Path:
    return Path(app.config["STORAGE_DIR"]) / "snapshots"


@pytest.fixture()
def clock() -> Clock:
    return Clock()


@pytest.fixture()
def recorder(snapshots: Path, clock: Clock, webcam: Device) -> Recorder:
    return Recorder(snapshots, clock)


def settings(**changes: object) -> dict:
    return {**DEFAULT_SETTINGS, "observation_store_interval_seconds": 300, **changes}


def observations() -> list[Observation]:
    return list(db.session.scalars(db.select(Observation).order_by(Observation.id)))


# --- what is stored --------------------------------------------------------------------------


def test_it_stores_the_frame_and_one_observation_per_hole(
    recorder: Recorder, snapshots: Path
) -> None:
    assert recorder.record(JPEG, analysis(*six()), settings())

    capture = db.session.scalars(db.select(Capture)).one()
    assert (snapshots / capture.image_path).read_bytes() == JPEG
    assert capture.roi_config == DEFAULT_ROI_CONFIG

    rows = observations()
    assert len(rows) == 6
    assert {row.capture_id for row in rows} == {capture.id}
    row = rows[0]
    assert row.stable_class is PlantClass.NORMAL
    assert row.predicted_class is PlantClass.NORMAL
    assert row.qc_status is QcStatus.OK
    assert (row.mean_r, row.mean_g, row.mean_b) == (
        Decimal("92.30"),
        Decimal("103.90"),
        Decimal("53.60"),
    )
    assert row.leaf_area_ratio == Decimal("0.5912")
    assert row.confidence == Decimal("0.720")
    assert row.rule_path == [{"feature": "mean_r", "operator": "<=", "threshold": 144.55}]
    assert row.model_version == "c45-0.1.0"


def test_a_hole_without_a_status_yet_is_left_out(recorder: Recorder) -> None:
    plants = [result(1, None), *[result(position) for position in range(2, 7)]]
    recorder.record(JPEG, analysis(*plants), settings())
    assert len(observations()) == 5


def test_nothing_is_stored_before_any_hole_has_a_status(recorder: Recorder) -> None:
    assert not recorder.record(JPEG, analysis(result(1, None)), settings())
    assert db.session.scalars(db.select(Capture)).first() is None


def test_an_empty_hole_has_no_colours(recorder: Recorder) -> None:
    recorder.record(JPEG, analysis(result(1, "no_plant", leaf_area_ratio=0.0)), settings())

    row = observations()[0]
    assert row.qc_status is QcStatus.NO_PLANT
    assert row.stable_class is None and row.predicted_class is None
    assert row.mean_r is None and row.rule_path is None


def test_needs_check_depends_on_why_there_is_no_class(recorder: Recorder) -> None:
    disagree = result(1, "needs_check", confidence=None)  # has features: the comparators differ
    leaf_area = result(
        2, "needs_check", confidence=None, predicted=None, features=None, rule_path=[]
    )
    recorder.record(JPEG, analysis(disagree, leaf_area), settings())

    first, second = observations()
    assert first.qc_status is QcStatus.NEEDS_CHECK
    assert first.predicted_class is PlantClass.NORMAL and first.stable_class is None
    assert second.qc_status is QcStatus.INVALID_LEAF and second.mean_r is None


# --- sensor values ---------------------------------------------------------------------------


def add_reading(device: Device, age_seconds: int) -> None:
    db.session.add(
        SensorReading(
            device_id=device.id,
            ph=Decimal("6.15"),
            ec=Decimal("2.270"),
            tds_ppm=1136,
            temperature=Decimal("25.6"),
            recorded_at=utcnow() - timedelta(seconds=age_seconds),
        )
    )
    db.session.commit()


def test_a_fresh_sensor_reading_is_stored_with_the_observation(
    recorder: Recorder, sensor_node: tuple[Device, str]
) -> None:
    add_reading(sensor_node[0], age_seconds=10)
    recorder.record(JPEG, analysis(result(1)), settings())

    row = observations()[0]
    assert (row.ph, row.ec, row.temperature) == (Decimal("6.15"), Decimal("2.270"), Decimal("25.6"))


def test_an_old_sensor_reading_is_not_stored(
    recorder: Recorder, sensor_node: tuple[Device, str]
) -> None:
    add_reading(sensor_node[0], age_seconds=600)
    recorder.record(JPEG, analysis(result(1)), settings())
    assert (observations()[0].ph, observations()[0].ec) == (None, None)


def test_without_any_sensor_reading_the_values_stay_empty(recorder: Recorder) -> None:
    recorder.record(JPEG, analysis(result(1)), settings())
    assert observations()[0].temperature is None


# --- when it stores --------------------------------------------------------------------------


def test_it_stores_again_only_after_the_interval(recorder: Recorder, clock: Clock) -> None:
    assert recorder.record(JPEG, analysis(*six()), settings())

    clock.now = 299
    assert not recorder.record(JPEG, analysis(*six()), settings())
    clock.now = 300
    assert recorder.record(JPEG, analysis(*six()), settings())
    assert len(observations()) == 12


def test_a_change_of_status_is_stored_at_once(recorder: Recorder, clock: Clock) -> None:
    recorder.record(JPEG, analysis(*six()), settings())

    clock.now = 10
    changed = [result(1, "n_deficiency"), *[result(position) for position in range(2, 7)]]
    assert recorder.record(JPEG, analysis(*changed), settings())


def test_a_result_that_is_still_settling_does_not_force_a_store(
    recorder: Recorder, clock: Clock
) -> None:
    recorder.record(JPEG, analysis(*six()), settings())

    clock.now = 10
    unsure = [result(1, "normal", observed="n_deficiency"), *[result(p) for p in range(2, 7)]]
    assert not recorder.record(JPEG, analysis(*unsure), settings())


def test_it_stores_nothing_without_a_webcam_device(app: Flask, snapshots: Path) -> None:
    recorder = Recorder(snapshots)
    assert not recorder.record(JPEG, analysis(result(1)), settings())
    assert db.session.scalars(db.select(Capture)).first() is None
    assert not snapshots.exists()


# --- the six holes ---------------------------------------------------------------------------


def test_the_state_of_each_hole_follows_the_latest_observation(recorder: Recorder) -> None:
    plants = [result(1), result(2, "fe_deficiency"), result(3, "no_plant")]
    recorder.record(JPEG, analysis(*plants), settings())

    holes = {hole.position: hole for hole in db.session.scalars(db.select(Plant))}
    assert holes[1].current_class is PlantClass.NORMAL
    assert holes[2].current_class is PlantClass.FE_DEFICIENCY
    assert holes[3].current_class is None
    latest = {row.plant_id: row.id for row in observations()}
    assert holes[1].last_observation_id == latest[holes[1].id]
    assert holes[1].current_since is not None


def test_current_since_moves_only_when_the_status_changes(recorder: Recorder, clock: Clock) -> None:
    recorder.record(JPEG, analysis(result(1)), settings())
    hole = db.session.scalars(db.select(Plant)).one()
    since = hole.current_since

    clock.now = 300
    recorder.record(JPEG, analysis(result(1)), settings())  # same status again
    db.session.refresh(hole)
    assert hole.current_since == since

    clock.now = 600
    recorder.record(JPEG, analysis(result(1, "fe_deficiency")), settings())
    db.session.refresh(hole)
    assert hole.current_since > since
    assert hole.current_class is PlantClass.FE_DEFICIENCY
