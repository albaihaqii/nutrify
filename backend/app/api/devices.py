"""Device endpoints (docs/API.md section 13). Admin only."""

from flask import Blueprint, Response, jsonify

from app.api.decorators import admin_required
from app.api.utils import load_body
from app.errors import ApiError
from app.schemas.devices import DeviceCreate, DeviceKeyOut, DeviceUpdate
from app.services import devices as device_service

bp = Blueprint("devices", __name__)


@bp.get("")
@admin_required
def list_devices() -> Response:
    items = device_service.list_devices()
    return jsonify({"items": [item.model_dump(mode="json") for item in items]})


@bp.post("")
@admin_required
def create_device() -> tuple[Response, int]:
    body = load_body(DeviceCreate)
    device, api_key = device_service.create_device(body.code, body.name, body.type)
    result = DeviceKeyOut(id=device.id, code=device.code, api_key=api_key)
    return jsonify(result.model_dump(mode="json")), 201


@bp.patch("/<int:device_id>")
@admin_required
def update_device(device_id: int) -> Response:
    changes = load_body(DeviceUpdate).model_dump(exclude_unset=True)
    if not changes:
        raise ApiError(422, "validation_error", "Send at least one of: name, is_active")
    device_service.update_device(device_id, changes)
    return jsonify(device_service.get_device_out(device_id).model_dump(mode="json"))


@bp.post("/<int:device_id>/rotate-key")
@admin_required
def rotate_device_key(device_id: int) -> Response:
    device, api_key = device_service.rotate_key(device_id)
    result = DeviceKeyOut(id=device.id, code=device.code, api_key=api_key)
    return jsonify(result.model_dump(mode="json"))