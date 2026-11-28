"""Plants, observations and the daily conditions of the dashboard."""

from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Device, Observation, Plant, PlantClass, QcStatus
from app.services.vision.recorder import Recorder
from tests.helpers import error_of
from tests.test_recorder import JPEG, analysis, result, settings

START = datetime(2026, 11, 20)  # the start of the first day, naive UTC
FROM = {"from": "2026-11-20T00:00:00Z"}


def hole(position: int) -> Plant:
    plant = db.session.scalar(db.select(Plant).filter_by(position=position))
    if plant is None:
        plant = Plant(position=position)
        db.session.add(plant)
        db.session.flush()
    return plant


def add(
    position: int,
    at: datetime,
    stable: PlantClass | None = PlantClass.NORMAL,
    qc: QcStatus = QcStatus.OK,
) -> Observation:
    row = Observation(
        plant_id=hole(position).id,
        observed_at=at,
        leaf_area_ratio=Decimal("0.5"),
        stable_class=stable,
        qc_status=qc,
    )
    db.session.add(row)
    db.session.commit()
    return row


def days(client: FlaskClient, headers: dict[str, str], **params: object) -> list[dict]:
    response = client.get("/api/dashboard/daily-conditions", query_string=params, headers=headers)
    assert response.status_code == 200, response.get_json()
    return response.get_json()["items"]


def counts(day: dict) -> tuple[int, int, int, int]:
    return day["normal"], day["n_deficiency"], day["fe_deficiency"], day["needs_check"]


def test_the_endpoints_need_a_login(client: FlaskClient) -> None:
    for url in ("/api/plants", "/api/observations", "/api/dashboard/daily-conditions"):
        assert client.get(url).status_code == 401


# --- plants ----------------------------------------------------------------------------------


def test_there_are_no_plants_before_the_worker_stored_anything(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    response = client.get("/api/plants", headers=viewer_headers)
    assert response.get_json() == {"items": []}


def test_a_plant_shows_the_status_of_its_latest_result(
    app: Flask, webcam: Device, client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    recorder = Recorder(Path(app.config["STORAGE_DIR"]) / "snapshots")
    shot = analysis(
        result(1),
        result(2, "fe_deficiency", confidence=0.8),
        result(3, "needs_check", confidence=None),
        result(4, "no_plant", leaf_area_ratio=0.0),
    )
    recorder.record(JPEG, shot, settings())

    items = client.get("/api/plants", headers=viewer_headers).get_json()["items"]

    assert [item["position"] for item in items] == [1, 2, 3, 4]
    assert [item["status"] for item in items] == [
        "normal",
        "fe_deficiency",
        "needs_check",
        "no_plant",
    ]
    assert [item["current_class"] for item in items] == ["normal", "fe_deficiency", None, None]
    first = items[0]
    assert first["current_since"].endswith("Z")
    assert first["last_observation"]["confidence"] == 0.72
    assert first["last_observation"]["qc_status"] == "ok"
    assert items[2]["last_observation"]["qc_status"] == "needs_check"


# --- observations ----------------------------------------------------------------------------


def test_observations_come_newest_first_with_their_features(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    old = add(1, START)
    new = add(2, START + timedelta(hours=1), PlantClass.N_DEFICIENCY)
    new.ph, new.ec, new.temperature = Decimal("6.10"), Decimal("1.720"), Decimal("24.6")
    new.mean_r = Decimal("118.40")
    db.session.commit()

    body = client.get("/api/observations", headers=viewer_headers).get_json()

    assert (body["page"], body["page_size"], body["total"]) == (1, 20, 2)
    first, second = body["items"]
    assert (first["id"], second["id"]) == (new.id, old.id)
    assert first["plant_position"] == 2
    assert first["status"] == "n_deficiency"
    assert first["features"] == {
        "mean_r": 118.4,
        "mean_g": None,
        "mean_b": None,
        "leaf_area_ratio": 0.5,
        "ph": 6.1,
        "ec": 1.72,
        "temperature": 24.6,
    }
    assert first["observed_at"] == "2026-11-20T01:00:00.000Z"


def test_the_status_of_an_observation_without_a_class(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    add(1, START, None, QcStatus.NO_PLANT)
    add(2, START, None, QcStatus.NEEDS_CHECK)
    add(3, START, None, QcStatus.INVALID_LEAF)

    items = client.get("/api/observations", headers=viewer_headers).get_json()["items"]

    assert [item["status"] for item in items] == ["no_plant", "needs_check", "needs_check"]


def test_observations_are_paged(client: FlaskClient, viewer_headers: dict[str, str]) -> None:
    for minute in range(5):
        add(1, START + timedelta(minutes=minute))

    body = client.get(
        "/api/observations", query_string={"page": 2, "page_size": 2}, headers=viewer_headers
    ).get_json()

    assert (body["page"], body["total"], len(body["items"])) == (2, 5, 2)
    assert body["items"][0]["observed_at"] == "2026-11-20T00:02:00.000Z"


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 101}, {"page_size": "x"}])
def test_a_bad_page_is_rejected(
    client: FlaskClient, viewer_headers: dict[str, str], params: dict
) -> None:
    response = client.get("/api/observations", query_string=params, headers=viewer_headers)
    assert response.status_code == 422
    assert error_of(response)["code"] == "validation_error"


# --- daily conditions ------------------------------------------------------------------------


def test_every_day_of_the_window_is_listed_even_without_results(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    items = days(client, viewer_headers, **FROM, days=3)

    assert [item["start"] for item in items] == [
        "2026-11-20T00:00:00.000Z",
        "2026-11-21T00:00:00.000Z",
        "2026-11-22T00:00:00.000Z",
    ]
    assert all(counts(item) == (0, 0, 0, 0) for item in items)


def test_a_hole_counts_with_its_last_result_of_the_day(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    add(1, START + timedelta(hours=8), PlantClass.NORMAL)
    add(1, START + timedelta(hours=20), PlantClass.FE_DEFICIENCY)
    add(2, START + timedelta(hours=9), PlantClass.N_DEFICIENCY)
    add(3, START + timedelta(hours=9), None, QcStatus.NEEDS_CHECK)
    add(4, START + timedelta(hours=9), PlantClass.NORMAL)
    add(5, START + timedelta(hours=9), None, QcStatus.NO_PLANT)
    add(4, START + timedelta(days=1, hours=1), PlantClass.NORMAL)

    first, second, third = days(client, viewer_headers, **FROM, days=3)

    assert counts(first) == (1, 1, 1, 1)  # hole 5 is empty and not counted
    assert counts(second) == (1, 0, 0, 0)
    assert counts(third) == (0, 0, 0, 0)


def test_results_outside_the_window_are_ignored(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    add(1, START - timedelta(seconds=1))
    add(1, START + timedelta(days=2))

    items = days(client, viewer_headers, **FROM, days=2)

    assert all(counts(item) == (0, 0, 0, 0) for item in items)


def test_the_window_accepts_an_offset_and_is_limited(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    add(1, START - timedelta(hours=2))  # 22:00 UTC the day before = 05:00 at +07:00

    items = days(client, viewer_headers, **{"from": "2026-11-20T00:00:00+07:00"}, days=1)
    assert counts(items[0]) == (1, 0, 0, 0)

    for params in ({}, {**FROM, "days": 0}, {**FROM, "days": 32}):
        response = client.get(
            "/api/dashboard/daily-conditions", query_string=params, headers=viewer_headers
        )
        assert response.status_code == 422
