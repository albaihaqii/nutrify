"""User management by admins."""

from flask.testing import FlaskClient

from app.models import User
from tests.helpers import ADMIN_EMAIL, VIEWER_EMAIL, VIEWER_PASSWORD, error_of, login

NEW_USER = {
    "name": "Budi",
    "email": "budi@test.id",
    "password": "budi-password-1",
    "role": "viewer",
}


def test_users_are_admin_only(client: FlaskClient, viewer_headers: dict[str, str]) -> None:
    assert client.get("/api/users").status_code == 401
    for response in (
        client.get("/api/users", headers=viewer_headers),
        client.post("/api/users", headers=viewer_headers, json=NEW_USER),
        client.patch("/api/users/1", headers=viewer_headers, json={"name": "x"}),
    ):
        assert response.status_code == 403
        assert error_of(response)["code"] == "forbidden"


def test_list_users_never_exposes_passwords(
    client: FlaskClient, admin_headers: dict[str, str], viewer: User
) -> None:
    items = client.get("/api/users", headers=admin_headers).get_json()["items"]
    assert [item["email"] for item in items] == [ADMIN_EMAIL, VIEWER_EMAIL]
    for item in items:
        assert set(item) == {"id", "name", "email", "role", "is_active", "last_login_at"}


def test_create_user_who_can_then_log_in(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    response = client.post("/api/users", headers=admin_headers, json=NEW_USER)
    assert response.status_code == 201
    body = response.get_json()
    assert body["role"] == "viewer"
    assert body["is_active"] is True
    assert "password" not in body and "password_hash" not in body
    assert login(client, NEW_USER["email"], NEW_USER["password"])


def test_create_normalizes_the_email(client: FlaskClient, admin_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/users", headers=admin_headers, json={**NEW_USER, "email": " Budi@Test.ID "}
    )
    assert response.get_json()["email"] == "budi@test.id"


def test_create_rejects_a_duplicate_email(
    client: FlaskClient, admin_headers: dict[str, str]
) -> None:
    client.post("/api/users", headers=admin_headers, json=NEW_USER)
    response = client.post(
        "/api/users", headers=admin_headers, json={**NEW_USER, "email": "BUDI@test.id"}
    )
    assert response.status_code == 409
    assert error_of(response)["details"]["field"] == "email"


def test_create_rejects_invalid_input(client: FlaskClient, admin_headers: dict[str, str]) -> None:
    cases = [
        ({"email": "not-an-email"}, "email"),
        ({"password": "short"}, "password"),
        ({"role": "superuser"}, "role"),
        ({"name": "   "}, "name"),
    ]
    for change, field in cases:
        response = client.post("/api/users", headers=admin_headers, json={**NEW_USER, **change})
        assert response.status_code == 422, change
        assert error_of(response)["details"]["field"] == field


def test_update_name_and_role(
    client: FlaskClient, admin_headers: dict[str, str], viewer: User
) -> None:
    response = client.patch(
        f"/api/users/{viewer.id}",
        headers=admin_headers,
        json={"name": "  New Name ", "role": "admin"},
    )
    assert response.status_code == 200
    assert response.get_json()["name"] == "New Name"
    assert response.get_json()["role"] == "admin"


def test_update_rejects_empty_body_email_change_and_unknown_user(
    client: FlaskClient, admin_headers: dict[str, str], viewer: User
) -> None:
    url = f"/api/users/{viewer.id}"
    assert client.patch(url, headers=admin_headers, json={}).status_code == 422

    email = client.patch(url, headers=admin_headers, json={"email": "other@test.id"})
    assert email.status_code == 422
    assert error_of(email)["details"]["field"] == "email"

    short = client.patch(url, headers=admin_headers, json={"password": "short"})
    assert short.status_code == 422

    missing = client.patch("/api/users/9999", headers=admin_headers, json={"name": "x"})
    assert missing.status_code == 404


def test_admin_can_set_a_new_password_for_a_user(
    client: FlaskClient, admin_headers: dict[str, str], viewer: User
) -> None:
    response = client.patch(
        f"/api/users/{viewer.id}", headers=admin_headers, json={"password": "reset-password-1"}
    )
    assert response.status_code == 200
    assert login(client, VIEWER_EMAIL, "reset-password-1")
    old = client.post("/api/auth/login", json={"email": VIEWER_EMAIL, "password": VIEWER_PASSWORD})
    assert old.status_code == 401


def test_admin_cannot_deactivate_or_demote_themselves(
    client: FlaskClient, admin_headers: dict[str, str], admin: User
) -> None:
    url = f"/api/users/{admin.id}"
    deactivate = client.patch(url, headers=admin_headers, json={"is_active": False})
    assert deactivate.status_code == 403
    assert error_of(deactivate)["details"]["field"] == "is_active"

    demote = client.patch(url, headers=admin_headers, json={"role": "viewer"})
    assert demote.status_code == 403
    assert error_of(demote)["details"]["field"] == "role"

    rename = client.patch(url, headers=admin_headers, json={"name": "Admin Utama"})
    assert rename.status_code == 200


def test_deactivated_user_loses_access(
    client: FlaskClient, admin_headers: dict[str, str], viewer: User, viewer_headers: dict[str, str]
) -> None:
    response = client.patch(
        f"/api/users/{viewer.id}", headers=admin_headers, json={"is_active": False}
    )
    assert response.status_code == 200
    assert response.get_json()["is_active"] is False

    # The token issued earlier no longer works, and logging in again is refused.
    assert client.get("/api/settings", headers=viewer_headers).status_code == 401
    relogin = client.post(
        "/api/auth/login", json={"email": VIEWER_EMAIL, "password": VIEWER_PASSWORD}
    )
    assert relogin.status_code == 403
