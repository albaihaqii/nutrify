"""Observation endpoints (docs/API.md section 7)."""

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import current_user

from app.api.decorators import admin_required, image_login_required, login_required
from app.api.utils import load_body
from app.schemas.plants import LabelIn, ObservationFilters, ObservationsQuery
from app.services import plants as plant_service
from app.services.vision import crops

bp = Blueprint("observations", __name__)

# A picture never changes once stored, so the browser may keep it.
CACHE = {"Cache-Control": "private, max-age=86400"}


@bp.get("")
@login_required
def list_observations() -> Response:
    query = ObservationsQuery.model_validate(request.args.to_dict())
    return jsonify(plant_service.get_observations(query).model_dump(mode="json"))


@bp.get("/export")
@login_required
def export_observations() -> Response:
    filters = ObservationFilters.model_validate(request.args.to_dict())
    return jsonify(plant_service.get_observation_export(filters).model_dump(mode="json"))


@bp.get("/<int:observation_id>/image")
@image_login_required
def image(observation_id: int) -> Response:
    jpeg = crops.render(observation_id, request.args.get("view", "photo"))
    return Response(jpeg, mimetype="image/jpeg", headers=CACHE)


@bp.patch("/<int:observation_id>/label")
@admin_required
def label(observation_id: int) -> Response:
    body = load_body(LabelIn)
    return jsonify(
        plant_service.set_label(observation_id, body, current_user).model_dump(mode="json")
    )
