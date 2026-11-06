"""Settings endpoints (docs/API.md section 14)."""

from flask import Blueprint, Response, jsonify
from flask_jwt_extended import current_user

from app.api.decorators import admin_required, login_required
from app.api.utils import get_json_object
from app.services import settings as settings_service

bp = Blueprint("settings", __name__)


@bp.get("")
@login_required
def read_settings() -> Response:
    return jsonify(settings_service.get_settings())


@bp.put("")
@admin_required
def update_settings() -> Response:
    patch = get_json_object()
    return jsonify(settings_service.update_settings(patch, current_user))