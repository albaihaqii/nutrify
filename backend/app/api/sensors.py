"""Sensor reading endpoints (docs/API.md section 5)."""

from flask import Blueprint, Response, g, jsonify, request

from app.api.decorators import device_required, login_required
from app.api.utils import load_body
from app.schemas.sensors import HistoryQuery, ReadingCreated, ReadingIn
from app.services import sensors as sensor_service

bp = Blueprint("sensors", __name__)


@bp.post("")
@device_required
def create_reading() -> tuple[Response, int]:
    body = load_body(ReadingIn)
    reading = sensor_service.record_reading(g.device, body)
    result = ReadingCreated(id=reading.id, tds_ppm=reading.tds_ppm, received_at=reading.received_at)
    return jsonify(result.model_dump(mode="json")), 201


@bp.get("")
@login_required
def list_readings() -> Response:
    query = HistoryQuery.model_validate(request.args.to_dict())
    result = sensor_service.get_history(query)
    return jsonify(result.model_dump(mode="json", exclude_none=True))


@bp.get("/latest")
@login_required
def latest_reading() -> Response:
    result = sensor_service.get_latest_reading()
    return jsonify(result.model_dump(mode="json", exclude_none=True))
