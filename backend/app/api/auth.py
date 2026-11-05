"""Authentication endpoints (docs/API.md section 4)."""

from flask import Blueprint, Response, current_app, jsonify, request
from flask_jwt_extended import current_user

from app.api.decorators import login_required
from app.api.utils import load_body
from app.schemas.auth import ChangePasswordRequest, LoginRequest, UserMe, UserOut
from app.services import auth as auth_service

bp = Blueprint("auth", __name__)

@bp.post("/login")
def login() -> Response:
    body = load_body(LoginRequest)
    user = auth_service.authenticate(body.email, body.password, request.remote_addr or "unknown")
    expires_in = int(current_app.config["JWT_ACCESS_TOKEN_EXPIRES"].total_seconds())
    return jsonify(
        {
            "access_token": auth_service.issue_token(user),
            "token_type": "bearer",
            "expires_in": expires_in,
            "user": UserOut.model_validate(user).model_dump(mode="json"),
        }
    )

@bp.get("/me")
@login_required
def me() -> Response:
    return jsonify(UserMe.model_validate(current_user).model_dump(mode="json"))

@bp.put("/password")
@login_required
def change_password() -> tuple[str, int]:
    body = load_body(ChangePasswordRequest)
    auth_service.change_password(current_user, body.current_password, body.new_password)
    return "", 204