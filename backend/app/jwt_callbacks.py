"""Flask-JWT-Extended callbacks: load the user and return uniform 401 errors."""

from typing import Any

from flask import Response

from app.errors import error_response
from app.extensions import db, jwt
from app.models import User


def register_jwt_callbacks() -> None:
    @jwt.user_lookup_loader
    def load_user(_header: dict[str, Any], payload: dict[str, Any]) -> User | None:
        user = db.session.get(User, int(payload["sub"]))
        if user is None or not user.is_active:
            return None
        return user

    @jwt.user_lookup_error_loader
    def user_not_found(_header: dict[str, Any], _payload: dict[str, Any]) -> tuple[Response, int]:
        return error_response(401, "unauthorized", "User no longer exists or is inactive")

    @jwt.unauthorized_loader
    def missing_token(reason: str) -> tuple[Response, int]:
        return error_response(401, "unauthorized", reason)

    @jwt.invalid_token_loader
    def invalid_token(reason: str) -> tuple[Response, int]:
        return error_response(401, "unauthorized", reason)

    @jwt.expired_token_loader
    def expired_token(_header: dict[str, Any], _payload: dict[str, Any]) -> tuple[Response, int]:
        return error_response(401, "unauthorized", "Token has expired")
