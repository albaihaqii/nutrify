"""Shared test setup. Tests run on an in-memory SQLite database, never on MySQL."""

from collections.abc import Callable, Iterator
from datetime import timedelta

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app import create_app
from app.extensions import db
from app.models import Device, DeviceType, User, UserRole
from app.services import auth as auth_service
from app.services import devices as device_service
from tests.helpers import ADMIN_EMAIL, ADMIN_PASSWORD, VIEWER_EMAIL, VIEWER_PASSWORD, login


class TestConfig:
    """Own settings, so tests never depend on backend/.env and never touch the real database."""

    __test__ = False  # not a test class, even though the name starts with "Test"

    TESTING = True
    SECRET_KEY = "test-secret-key"
    JWT_SECRET_KEY = "test-jwt-secret-key-with-at-least-32-bytes"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    CORS_ORIGINS = ["http://localhost:5173"]


@pytest.fixture()
def app() -> Iterator[Flask]:
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(autouse=True)
def reset_login_throttle() -> None:
    """The throttle lives in memory for the whole process, so clear it between tests."""
    auth_service.login_throttle._failures.clear()


@pytest.fixture()
def client(app: Flask) -> FlaskClient:
    return app.test_client()


@pytest.fixture()
def make_user(app: Flask) -> Callable[..., User]:
    def factory(
        email: str, password: str, role: UserRole = UserRole.VIEWER, is_active: bool = True
    ) -> User:
        user = User(name=email.split("@")[0], email=email, role=role, is_active=is_active)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    return factory


@pytest.fixture()
def admin(make_user: Callable[..., User]) -> User:
    return make_user(ADMIN_EMAIL, ADMIN_PASSWORD, UserRole.ADMIN)


@pytest.fixture()
def viewer(make_user: Callable[..., User]) -> User:
    return make_user(VIEWER_EMAIL, VIEWER_PASSWORD, UserRole.VIEWER)


@pytest.fixture()
def admin_headers(client: FlaskClient, admin: User) -> dict[str, str]:
    return login(client, ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture()
def viewer_headers(client: FlaskClient, viewer: User) -> dict[str, str]:
    return login(client, VIEWER_EMAIL, VIEWER_PASSWORD)


@pytest.fixture()
def sensor_node(app: Flask) -> tuple[Device, str]:
    """A sensor node and its API key (the key is only known at creation)."""
    device, api_key = device_service.create_device(
        "sensor-node-1", "Sensor node 1", DeviceType.SENSOR_NODE
    )
    assert api_key is not None
    return device, api_key