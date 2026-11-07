"""Sensor ingestion, latest reading, and history."""

from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Device, SensorReading
from tests.helpers import error_of

GOOD = {"ph": 6.12, "ec": 1.841, "temperature": 24.7}


def iso(minutes_ago: float) -> str:
    """A UTC timestamp in the past, formatted like the API does."""
    moment = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return moment.strftime("%Y-%m-%dT%H:%M:%S.") + f"{moment.microsecond // 1000:03d}Z"


@pytest.fixture()
def send(client: FlaskClient, sensor_node: tuple[Device, str]) -> Any:
    """Send a reading as the sensor node."""
    _, api_key = sensor_node

    def sender(body: dict[str, Any], key: str | None = api_key) -> Any:
        headers = {"X-API-Key": key} if key else {}
        return client.post("/api/sensor-readings", headers=headers, json=body)

    return sender


# --- ingestion ---------------------------------------------------------------------------


def test_reading_is_stored_with_a_derived_tds(send: Any, sensor_node: tuple[Device, str]) -> None:
    response = send({**GOOD, "firmware_version": "0.1.0"})
    assert response.status_code == 201
    body = response.get_json()
    assert body["tds_ppm"] == 921  # 1.841 x 500, rounded
    assert body["received_at"].endswith("Z")

    stored = db.session.get(SensorReading, body["id"])
    assert (float(stored.ph), float(stored.ec), float(stored.temperature)) == (6.12, 1.841, 24.7)

    device, _ = sensor_node
    db.session.refresh(device)
    assert device.firmware_version == "0.1.0"
    assert device.last_seen_at is not None


def test_values_are_rounded_to_the_stored_precision(send: Any) -> None:
    body = send({"ph": 6.1234, "ec": 1.8406, "temperature": 24.66}).get_json()
    stored = db.session.get(SensorReading, body["id"])
    assert (float(stored.ph), float(stored.ec), float(stored.temperature)) == (6.12, 1.841, 24.7)
    assert body["tds_ppm"] == 921  # derived from the rounded EC


def test_the_client_cannot_set_tds_and_unknown_fields_are_ignored(send: Any) -> None:
    response = send({"ph": 6.0, "ec": 1.8, "temperature": 24.0, "tds_ppm": 99999, "note": "x"})
    assert response.status_code == 201
    assert response.get_json()["tds_ppm"] == 900


def test_recorded_at_defaults_to_now_and_may_be_in_the_past(send: Any) -> None:
    assert send({**GOOD, "recorded_at": iso(30)}).status_code == 201


def test_recorded_at_in_the_future_is_rejected(send: Any) -> None:
    response = send({**GOOD, "recorded_at": "2099-01-01T00:00:00Z"})
    assert response.status_code == 422
    assert error_of(response)["details"]["field"] == "recorded_at"


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"ph": 15, "ec": 1.8, "temperature": 24}, "ph"),
        ({"ph": -0.1, "ec": 1.8, "temperature": 24}, "ph"),
        ({"ph": 6, "ec": 11, "temperature": 24}, "ec"),
        ({"ph": 6, "temperature": 24}, "ec"),
        ({"ph": 6, "ec": 1.8, "temperature": -127}, "temperature"),  # DS18B20 error value
        ({"ph": "abc", "ec": 1.8, "temperature": 24}, "ph"),
    ],
)
def test_invalid_values_are_rejected(send: Any, body: dict[str, Any], field: str) -> None:
    response = send(body)
    assert response.status_code == 422
    error = error_of(response)
    assert error["code"] == "validation_error"
    assert error["details"]["field"] == field


def test_the_api_key_is_required(
    client: FlaskClient,
    send: Any,
    admin_headers: dict[str, str],
    sensor_node: tuple[Device, str],
) -> None:
    for response in (
        send(GOOD, key=None),
        send(GOOD, key="nfy_wrong"),
        client.post("/api/sensor-readings", headers=admin_headers, json=GOOD),  # bearer token
    ):
        assert response.status_code == 401
        assert error_of(response)["code"] == "unauthorized"


def test_an_inactive_device_cannot_send(send: Any, sensor_node: tuple[Device, str]) -> None:
    device, _ = sensor_node
    device.is_active = False
    db.session.commit()
    assert send(GOOD).status_code == 401


# --- latest ------------------------------------------------------------------------------


def test_latest_is_not_found_before_any_reading(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    response = client.get("/api/sensor-readings/latest", headers=viewer_headers)
    assert response.status_code == 404
    assert error_of(response)["code"] == "not_found"


def test_latest_requires_login(client: FlaskClient) -> None:
    assert client.get("/api/sensor-readings/latest").status_code == 401


def test_latest_describes_each_value(
    client: FlaskClient, viewer_headers: dict[str, str], send: Any
) -> None:
    send({"ph": 6.0, "ec": 2.1, "temperature": 17.5})
    body = client.get("/api/sensor-readings/latest", headers=viewer_headers).get_json()
    assert body["is_stale"] is False
    assert body["ph"] == {"value": 6.0, "status": "in_range"}
    assert body["ec"] == {"value": 2.1, "status": "high", "unit": "mS/cm"}
    assert body["tds_ppm"] == {"value": 1050}
    assert body["temperature"] == {"value": 17.5, "status": "low", "unit": "celsius"}


def test_latest_is_stale_when_the_reading_is_old(
    client: FlaskClient, viewer_headers: dict[str, str], send: Any
) -> None:
    send({**GOOD, "recorded_at": iso(10)})  # older than sensor_stale_seconds (120 s)
    body = client.get("/api/sensor-readings/latest", headers=viewer_headers).get_json()
    assert body["is_stale"] is True


def test_latest_follows_recorded_time_not_arrival_order(
    client: FlaskClient, viewer_headers: dict[str, str], send: Any
) -> None:
    send({"ph": 6.0, "ec": 1.8, "temperature": 24, "recorded_at": iso(1)})
    send({"ph": 5.0, "ec": 1.8, "temperature": 24, "recorded_at": iso(20)})  # arrives later
    body = client.get("/api/sensor-readings/latest", headers=viewer_headers).get_json()
    assert body["ph"]["value"] == 6.0


# --- history -----------------------------------------------------------------------------


def test_history_requires_login(client: FlaskClient) -> None:
    assert client.get("/api/sensor-readings").status_code == 401


def test_history_is_empty_without_readings(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    body = client.get("/api/sensor-readings", headers=viewer_headers).get_json()
    assert body == {"interval": "5m", "items": []}


def test_history_averages_per_bucket_oldest_first(
    client: FlaskClient, viewer_headers: dict[str, str], send: Any
) -> None:
    # Two readings in one hour two hours ago and one just now: two 1-hour buckets.
    base = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    old = (base - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    old_later = (base - timedelta(hours=2) + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
    send({"ph": 6.0, "ec": 1.8, "temperature": 24.0, "recorded_at": old})
    send({"ph": 6.2, "ec": 1.6, "temperature": 25.0, "recorded_at": old_later})
    send({"ph": 5.8, "ec": 1.5, "temperature": 22.0, "recorded_at": iso(1)})

    body = client.get("/api/sensor-readings?interval=1h", headers=viewer_headers).get_json()
    assert body["interval"] == "1h"
    assert len(body["items"]) == 2
    first, second = body["items"]
    assert first["time"] < second["time"]
    assert first["ph"] == 6.1  # mean of 6.0 and 6.2
    assert first["ec"] == 1.7
    assert first["tds_ppm"] == 850
    assert first["temperature"] == 24.5
    assert second["ph"] == 5.8


def test_history_raw_returns_every_reading(
    client: FlaskClient, viewer_headers: dict[str, str], send: Any
) -> None:
    for minutes_ago in (3, 2, 1):
        send({**GOOD, "recorded_at": iso(minutes_ago)})
    body = client.get("/api/sensor-readings?interval=raw", headers=viewer_headers).get_json()
    assert body["interval"] == "raw"
    assert len(body["items"]) == 3
    times = [item["time"] for item in body["items"]]
    assert times == sorted(times)


def test_history_metric_filter_keeps_only_that_metric(
    client: FlaskClient, viewer_headers: dict[str, str], send: Any
) -> None:
    send(GOOD)
    body = client.get(
        "/api/sensor-readings?interval=raw&metric=ph", headers=viewer_headers
    ).get_json()
    assert set(body["items"][0]) == {"time", "ph"}


def test_history_window_excludes_readings_outside_it(
    client: FlaskClient, viewer_headers: dict[str, str], send: Any
) -> None:
    send({**GOOD, "recorded_at": iso(60 * 30)})  # 30 hours ago: outside the default 24 hours
    body = client.get("/api/sensor-readings?interval=raw", headers=viewer_headers).get_json()
    assert body["items"] == []


@pytest.mark.parametrize(
    ("query", "field"),
    [
        ("interval=10m", "interval"),
        ("metric=salinity", "metric"),
        ("from=yesterday", "from"),
        ("from=2026-11-07T00:00:00Z&to=2026-11-06T00:00:00Z", "from"),
        ("interval=1m&from=2020-01-01T00:00:00Z", "interval"),  # too many points
    ],
)
def test_history_rejects_bad_queries(
    client: FlaskClient, viewer_headers: dict[str, str], query: str, field: str
) -> None:
    response = client.get(f"/api/sensor-readings?{query}", headers=viewer_headers)
    assert response.status_code == 422
    assert error_of(response)["details"]["field"] == field
