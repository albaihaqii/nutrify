"""Small helpers shared by the test modules."""

from typing import Any

from flask.testing import FlaskClient

ADMIN_EMAIL = "admin@test.id"
ADMIN_PASSWORD = "admin-password-1"
VIEWER_EMAIL = "viewer@test.id"
VIEWER_PASSWORD = "viewer-password-1"


def login(client: FlaskClient, email: str, password: str) -> dict[str, str]:
    """Log in and return the Authorization header for later requests."""
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['access_token']}"}


def error_of(response: Any) -> dict[str, Any]:
    """The error object of an error response (docs/API.md section 1.4)."""
    body = response.get_json()
    assert set(body) == {"error"}, body
    return body["error"]
