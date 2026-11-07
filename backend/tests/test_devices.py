"""Device management and device API keys."""

from flask.testing import FlaskClient

from app.models import Device
from tests.helpers import error_of

READING = {"ph": 6.1, "ec": 1.8, "temperature": 24.5}


def test_devices_are_admin_only(client: FlaskClient, viewer_headers: dict[str, str]) -> None:
    assert client.get("/api/devices").status_code == 401
    response = client.get("/api/devices", headers=viewer_headers)
    assert response.status_code == 403
    assert error_of(response)["code"] == "forbidden"


def test_create_sensor_node_returns_a_key_once(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/devices",
        headers=admin_headers,
        json={"code": "sensor-node-2", "name": "Second node", "type": "sensor_node"},
    )
    assert response.status_code == 201
    assert response.get_json()["api_key"].startswith("nfy_")

    listing = client.get("/api/devices", headers=admin_headers).get_json()["items"]
    assert [item["code"] for item in listing] == ["sensor-node-2"]
    assert "api_key" not in listing[0]
    assert "api_key_hash" not in listing[0]


def test_create_webcam_has_no_key(client: FlaskClient, admin_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/devices",
        headers=admin_headers,
        json={"code": "webcam-1", "name": "Webcam", "type": "webcam"},
    )
    assert response.status_code == 201
    assert response.get_json()["api_key"] is None


def test_create_rejects_duplicate_and_invalid_codes(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    body = {"code": "sensor-node-9", "name": "Node", "type": "sensor_node"}
    assert client.post("/api/devices", headers=admin_headers, json=body).status_code == 201

    duplicate = client.post("/api/devices", headers=admin_headers, json=body)
    assert duplicate.status_code == 409
    assert error_of(duplicate)["code"] == "conflict"

    invalid = client.post("/api/devices", headers=admin_headers, json={**body, "code": "Bad Code!"})
    assert invalid.status_code == 422
    assert error_of(invalid)["details"]["field"] == "code"


def test_update_device(
    client: FlaskClient, admin_headers: dict[str, str], sensor_node: tuple[Device, str]
) -> None:
    device, _ = sensor_node
    response = client.patch(
        f"/api/devices/{device.id}",
        headers=admin_headers,
        json={"name": "Renamed", "is_active": False},
    )
    assert response.status_code == 200
    assert response.get_json()["name"] == "Renamed"
    assert response.get_json()["is_active"] is False


def test_update_rejects_empty_body_and_unknown_device(
    client: FlaskClient, admin_headers: dict[str, str], sensor_node: tuple[Device, str]
) -> None:
    device, _ = sensor_node
    empty = client.patch(f"/api/devices/{device.id}", headers=admin_headers, json={})
    assert empty.status_code == 422
    missing = client.patch("/api/devices/9999", headers=admin_headers, json={"name": "x"})
    assert missing.status_code == 404
    assert error_of(missing)["code"] == "not_found"


def test_rotating_a_key_stops_the_old_key(
    client: FlaskClient, admin_headers: dict[str, str], sensor_node: tuple[Device, str]
) -> None:
    device, old_key = sensor_node
    rotated = client.post(f"/api/devices/{device.id}/rotate-key", headers=admin_headers)
    assert rotated.status_code == 200
    new_key = rotated.get_json()["api_key"]
    assert new_key != old_key

    old = client.post("/api/sensor-readings", headers={"X-API-Key": old_key}, json=READING)
    new = client.post("/api/sensor-readings", headers={"X-API-Key": new_key}, json=READING)
    assert old.status_code == 401
    assert new.status_code == 201


def test_webcam_cannot_rotate_a_key(client: FlaskClient, admin_headers: dict[str, str]) -> None:
    created = client.post(
        "/api/devices",
        headers=admin_headers,
        json={"code": "webcam-1", "name": "Webcam", "type": "webcam"},
    )
    response = client.post(
        f"/api/devices/{created.get_json()['id']}/rotate-key", headers=admin_headers
    )
    assert response.status_code == 422


def test_status_goes_from_never_seen_to_online(
    client: FlaskClient, admin_headers: dict[str, str], sensor_node: tuple[Device, str]
) -> None:
    _, api_key = sensor_node

    def status() -> str:
        items = client.get("/api/devices", headers=admin_headers).get_json()["items"]
        return items[0]["status"]

    assert status() == "never_seen"
    client.post("/api/sensor-readings", headers={"X-API-Key": api_key}, json=READING)
    assert status() == "online"
