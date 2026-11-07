"""Login, current user, password change, and login throttling."""

from collections.abc import Callable

from flask.testing import FlaskClient

from app.extensions import db
from app.models import User, UserRole
from tests.helpers import ADMIN_EMAIL, ADMIN_PASSWORD, error_of, login


def test_login_returns_token_and_user(client: FlaskClient, admin: User) -> None:
    response = client.post(
        "/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 43200
    assert body["access_token"]
    assert body["user"] == {
        "id": admin.id,
        "name": admin.name,
        "email": ADMIN_EMAIL,
        "role": "admin",
    }


def test_login_email_is_case_insensitive(client: FlaskClient, admin: User) -> None:
    response = client.post(
        "/api/auth/login", json={"email": " ADMIN@Test.ID ", "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200


def test_wrong_password_and_unknown_email_look_the_same(client: FlaskClient, admin: User) -> None:
    wrong_password = client.post(
        "/api/auth/login", json={"email": ADMIN_EMAIL, "password": "not-the-password"}
    )
    unknown_email = client.post(
        "/api/auth/login", json={"email": "nobody@test.id", "password": ADMIN_PASSWORD}
    )
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert error_of(wrong_password) == error_of(unknown_email)
    assert error_of(wrong_password)["code"] == "invalid_credentials"


def test_login_with_missing_password_is_a_validation_error(client: FlaskClient) -> None:
    response = client.post("/api/auth/login", json={"email": ADMIN_EMAIL})
    assert response.status_code == 422
    error = error_of(response)
    assert error["code"] == "validation_error"
    assert error["details"]["field"] == "password"


def test_login_body_must_be_a_json_object(client: FlaskClient) -> None:
    response = client.post("/api/auth/login", data="not json", content_type="text/plain")
    assert response.status_code == 400
    assert error_of(response)["code"] == "bad_request"


def test_inactive_account_cannot_log_in(
    client: FlaskClient, make_user: Callable[..., User]
) -> None:
    make_user("off@test.id", "some-password-1", UserRole.VIEWER, is_active=False)
    response = client.post(
        "/api/auth/login", json={"email": "off@test.id", "password": "some-password-1"}
    )
    assert response.status_code == 403
    assert error_of(response)["code"] == "forbidden"


def test_login_is_blocked_after_five_failures(client: FlaskClient, admin: User) -> None:
    for _ in range(5):
        response = client.post(
            "/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-password"}
        )
        assert response.status_code == 401

    blocked = client.post(
        "/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert blocked.status_code == 429
    assert error_of(blocked)["code"] == "rate_limited"


def test_me_returns_the_current_user(
    client: FlaskClient, admin: User, admin_headers: dict[str, str]
) -> None:
    response = client.get("/api/auth/me", headers=admin_headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"
    assert body["last_login_at"].endswith("Z")


def test_me_without_a_valid_token_is_unauthorized(client: FlaskClient) -> None:
    for headers in ({}, {"Authorization": "Bearer not-a-token"}):
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401
        assert error_of(response)["code"] == "unauthorized"


def test_change_password(client: FlaskClient, admin: User, admin_headers: dict[str, str]) -> None:
    response = client.put(
        "/api/auth/password",
        headers=admin_headers,
        json={"current_password": ADMIN_PASSWORD, "new_password": "brand-new-password"},
    )
    assert response.status_code == 204
    assert login(client, ADMIN_EMAIL, "brand-new-password")


def test_change_password_rejects_a_wrong_current_password(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    response = client.put(
        "/api/auth/password",
        headers=admin_headers,
        json={"current_password": "wrong", "new_password": "brand-new-password"},
    )
    assert response.status_code == 422
    assert error_of(response)["details"]["field"] == "current_password"


def test_change_password_rejects_a_short_new_password(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    response = client.put(
        "/api/auth/password",
        headers=admin_headers,
        json={"current_password": ADMIN_PASSWORD, "new_password": "short"},
    )
    assert response.status_code == 422
    assert error_of(response)["details"]["field"] == "new_password"


def test_token_of_a_deactivated_user_stops_working(
    client: FlaskClient, viewer: User, viewer_headers: dict[str, str]
) -> None:
    viewer.is_active = False
    db.session.commit()
    response = client.get("/api/auth/me", headers=viewer_headers)
    assert response.status_code == 401