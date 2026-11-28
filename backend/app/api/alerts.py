"""Alert endpoints (docs/API.md section 12)."""

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import current_user

from app.api.decorators import login_required
from app.schemas.alerts import AlertsQuery
from app.services import alerts as alert_service

bp = Blueprint("alerts", __name__)


@bp.get("")
@login_required
def list_alerts() -> Response:
    query = AlertsQuery.model_validate(request.args.to_dict())
    return jsonify(alert_service.get_alerts(query).model_dump(mode="json"))


@bp.post("/<int:alert_id>/acknowledge")
@login_required
def acknowledge_alert(alert_id: int) -> Response:
    return jsonify(alert_service.acknowledge(alert_id, current_user).model_dump(mode="json"))
