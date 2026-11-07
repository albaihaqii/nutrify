"""Health check and generic error format."""

from flask.testing import FlaskClient

from tests.helpers import error_of


def test_health_reports_ok(client: FlaskClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok", "database": "ok"}


def test_unknown_route_uses_error_format(client: FlaskClient) -> None:
    response = client.get("/api/unknown")
    assert response.status_code == 404
    assert error_of(response)["code"] == "not_found"


def test_wrong_method_uses_error_format(client: FlaskClient) -> None:
    response = client.delete("/api/health")
    assert response.status_code == 405
    assert error_of(response)["code"] == "method_not_allowed"