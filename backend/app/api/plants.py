"""Plant endpoints (docs/API.md section 7)."""

from flask import Blueprint, Response, jsonify

from app.api.decorators import login_required
from app.services import plants as plant_service

bp = Blueprint("plants", __name__)


@bp.get("")
@login_required
def list_plants() -> Response:
    return jsonify(plant_service.get_plants().model_dump(mode="json"))
