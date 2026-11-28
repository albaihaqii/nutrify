"""Observation endpoints (docs/API.md section 7)."""

from flask import Blueprint, Response, jsonify, request

from app.api.decorators import login_required
from app.schemas.plants import ObservationsQuery
from app.services import plants as plant_service

bp = Blueprint("observations", __name__)


@bp.get("")
@login_required
def list_observations() -> Response:
    query = ObservationsQuery.model_validate(request.args.to_dict())
    return jsonify(plant_service.get_observations(query).model_dump(mode="json"))
