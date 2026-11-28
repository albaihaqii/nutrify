"""Dashboard endpoints (docs/API.md section 6)."""

from flask import Blueprint, Response, jsonify, request

from app.api.decorators import login_required
from app.schemas.plants import DailyConditionsQuery
from app.services import plants as plant_service

bp = Blueprint("dashboard", __name__)


@bp.get("/daily-conditions")
@login_required
def daily_conditions() -> Response:
    query = DailyConditionsQuery.model_validate(request.args.to_dict())
    return jsonify(plant_service.get_daily_conditions(query).model_dump(mode="json"))
