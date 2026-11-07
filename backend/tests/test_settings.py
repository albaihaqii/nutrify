"""Reading and updating settings."""

from flask.testing import FlaskClient

from tests.helpers import error_of


def test_settings_require_login(client: FlaskClient) -> None:
    assert client.get("/api/settings").status_code == 401


def test_viewer_can_read_defaults(client: FlaskClient, viewer_headers: dict[str, str]) -> None:
    response = client.get("/api/settings", headers=viewer_headers)
    assert response.status_code == 200
    body = response.get_json()
    assert len(body) == 13
    assert (body["ph_min"], body["ph_max"]) == (5.5, 6.5)
    assert body["sensor_stale_seconds"] == 120
    assert len(body["roi_config"]) == 6


def test_viewer_cannot_update(client: FlaskClient, viewer_headers: dict[str, str]) -> None:
    response = client.put("/api/settings", headers=viewer_headers, json={"ph_min": 5.0})
    assert response.status_code == 403


def test_admin_updates_part_of_the_settings(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    response = client.put(
        "/api/settings", headers=admin_headers, json={"ph_min": 5.6, "sensor_stale_seconds": 60}
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["ph_min"] == 5.6
    assert body["sensor_stale_seconds"] == 60
    assert body["ph_max"] == 6.5  # untouched

    assert client.get("/api/settings", headers=admin_headers).get_json()["ph_min"] == 5.6


def test_update_is_validated_as_a_whole(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    # Only ph_min is sent, but together with the stored ph_max (6.5) it is invalid.
    response = client.put("/api/settings", headers=admin_headers, json={"ph_min": 7.0})
    assert response.status_code == 422
    assert error_of(response)["code"] == "validation_error"
    # Nothing was saved.
    assert client.get("/api/settings", headers=admin_headers).get_json()["ph_min"] == 5.5


def test_update_rejects_wrong_types_and_unknown_keys(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    wrong_type = client.put(
        "/api/settings", headers=admin_headers, json={"consensus_enabled": "yes"}
    )
    assert wrong_type.status_code == 422
    unknown = client.put("/api/settings", headers=admin_headers, json={"nonsense": 1})
    assert unknown.status_code == 422


def test_update_rejects_a_region_outside_the_frame(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    roi = client.get("/api/settings", headers=admin_headers).get_json()["roi_config"]
    roi[0]["x"] = 0.9  # x + w goes beyond 1
    response = client.put("/api/settings", headers=admin_headers, json={"roi_config": roi})
    assert response.status_code == 422