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


# --- filters and export ----------------------------------------------------------------------


def listed(client: FlaskClient, headers: dict[str, str], **params: object) -> list[dict]:
    response = client.get("/api/observations", query_string=params, headers=headers)
    assert response.status_code == 200, response.get_json()
    return response.get_json()["items"]


def test_observations_can_be_filtered_by_plant_and_time(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    add(1, START)
    add(2, START + timedelta(hours=1))
    add(2, START + timedelta(hours=2))
    add(2, START + timedelta(hours=3))

    assert {row["plant_position"] for row in listed(client, viewer_headers, plant=2)} == {2}
    rows = listed(
        client,
        viewer_headers,
        **{"from": "2026-11-20T01:00:00Z", "to": "2026-11-20T02:00:00Z"},
    )
    assert [row["observed_at"] for row in rows] == [
        "2026-11-20T02:00:00.000Z",
        "2026-11-20T01:00:00.000Z",
    ]


def test_observations_can_be_filtered_by_status(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    add(1, START, PlantClass.NORMAL)
    add(2, START, PlantClass.N_DEFICIENCY)
    add(3, START, PlantClass.FE_DEFICIENCY)
    add(4, START, None, QcStatus.NEEDS_CHECK)
    add(5, START, None, QcStatus.INVALID_LEAF)
    add(6, START, None, QcStatus.NO_PLANT)

    def positions(status: str) -> list[int]:
        return [row["plant_position"] for row in listed(client, viewer_headers, status=status)]

    assert positions("normal") == [1]
    assert positions("n_deficiency") == [2]
    assert positions("fe_deficiency") == [3]
    assert positions("needs_check") == [4, 5]
    assert positions("no_plant") == [6]


def test_the_total_counts_the_filtered_rows(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    add(1, START)
    add(2, START)

    body = client.get(
        "/api/observations", query_string={"plant": 2}, headers=viewer_headers
    ).get_json()

    assert body["total"] == 1


@pytest.mark.parametrize("params", [{"plant": 7}, {"status": "sick"}, {"from": "yesterday"}])
def test_a_bad_filter_is_rejected(
    client: FlaskClient, viewer_headers: dict[str, str], params: dict
) -> None:
    response = client.get("/api/observations", query_string=params, headers=viewer_headers)
    assert response.status_code == 422


def test_the_export_has_every_matching_row_without_paging(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    for minute in range(25):
        add(1, START + timedelta(minutes=minute))
    add(2, START)

    response = client.get(
        "/api/observations/export", query_string={"plant": 1}, headers=viewer_headers
    )

    items = response.get_json()["items"]
    assert len(items) == 25
    assert set(items[0]) == {
        "observed_at",
        "plant_position",
        "status",
        "confidence",
        "ph",
        "ec",
        "temperature",
    }


def test_an_export_that_is_too_large_is_refused(
    monkeypatch: pytest.MonkeyPatch, client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    monkeypatch.setattr("app.services.plants.EXPORT_LIMIT", 2)
    for minute in range(3):
        add(1, START + timedelta(minutes=minute))

    response = client.get("/api/observations/export", headers=viewer_headers)

    assert response.status_code == 422
    assert error_of(response)["details"] == {"field": "from"}


# --- plant detail ----------------------------------------------------------------------------


def make_latest(position: int) -> None:
    """Point the hole at its newest observation, like the recorder does."""
    plant = hole(position)
    last = db.session.scalars(
        db.select(Observation)
        .where(Observation.plant_id == plant.id)
        .order_by(Observation.observed_at.desc())
    ).first()
    assert last is not None
    plant.last_observation_id = last.id
    plant.current_class = last.stable_class
    plant.current_since = last.observed_at
    db.session.commit()


def test_a_plant_has_its_latest_result_and_its_status_changes(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    for hours, stable in enumerate(
        [PlantClass.NORMAL, PlantClass.NORMAL, PlantClass.N_DEFICIENCY, PlantClass.N_DEFICIENCY]
    ):
        row = add(3, START + timedelta(hours=hours), stable)
    row.mean_r, row.mean_g, row.mean_b = Decimal("118.40"), Decimal("160.20"), Decimal("70.90")
    row.rule_path = [{"feature": "mean_r", "operator": "<=", "threshold": 144.55}]
    row.confidence = Decimal("0.910")
    db.session.commit()
    make_latest(3)

    response = client.get("/api/plants/3", headers=viewer_headers)

    body = response.get_json()
    assert (body["position"], body["status"], body["current_class"]) == (
        3,
        "n_deficiency",
        "n_deficiency",
    )
    latest = body["latest_observation"]
    assert latest["id"] == row.id
    assert latest["features"]["mean_r"] == 118.4
    assert latest["rule_path"] == [{"feature": "mean_r", "operator": "<=", "threshold": 144.55}]
    assert latest["has_image"] is False
    assert body["status_history"] == [
        {"since": "2026-11-20T02:00:00.000Z", "status": "n_deficiency", "confidence": 0.91},
        {"since": "2026-11-20T00:00:00.000Z", "status": "normal", "confidence": None},
    ]


def test_the_status_history_keeps_only_the_latest_changes(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    classes = [PlantClass.NORMAL, PlantClass.N_DEFICIENCY] * 4  # eight stretches of one result
    for hours, stable in enumerate(classes):
        add(1, START + timedelta(hours=hours), stable)
    make_latest(1)

    history = client.get("/api/plants/1", headers=viewer_headers).get_json()["status_history"]

    assert len(history) == 5
    assert history[0]["since"] == "2026-11-20T07:00:00.000Z"


@pytest.mark.parametrize("position", [1, 7, 0])
def test_a_hole_without_a_result_is_not_found(
    client: FlaskClient, viewer_headers: dict[str, str], position: int
) -> None:
    response = client.get(f"/api/plants/{position}", headers=viewer_headers)

    assert response.status_code == 404
    assert error_of(response)["code"] == "not_found"
