"""User management endpoints (docs/API.md section 4). Admin only."""

from flask import Blueprint, Response, jsonify
from flask_jwt_extended import current_user

from app.api.decorators import admin_required
from app.api.utils import load_body
from app.errors import ApiError
from app.schemas.users import UserCreate, UserUpdate
from app.services import users as user_service

bp = Blueprint("users", __name__)


@bp.get("")
@admin_required
def list_users() -> Response:
    items = user_service.list_users()
    return jsonify({"items": [item.model_dump(mode="json") for item in items]})


@bp.post("")
@admin_required
def create_user() -> tuple[Response, int]:
    body = load_body(UserCreate)
    user = user_service.create_user(body.name, body.email, body.password, body.role)
    return jsonify(user.model_dump(mode="json")), 201


@bp.patch("/<int:user_id>")
@admin_required
def update_user(user_id: int) -> Response:
    changes = load_body(UserUpdate).model_dump(exclude_unset=True)
    if not changes:
        raise ApiError(
            422, "validation_error", "Send at least one of: name, role, is_active, password"
        )
    user = user_service.update_user(user_id, changes, current_user)
    return jsonify(user.model_dump(mode="json"))