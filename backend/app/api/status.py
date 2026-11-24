"""Service status for the header chips (docs/API.md section 3)."""

from flask import Blueprint, Response, jsonify

from app.api.decorators import login_required
from app.services import status as status_service

bp = Blueprint("status", __name__)


@bp.get("/status")
@login_required
def status() -> Response:
    return jsonify(status_service.get_service_status().model_dump(mode="json"))
