"""Camera endpoints (docs/API.md section 9)."""

from flask import Blueprint, Response, jsonify

from app.api.decorators import image_login_required, login_required
from app.services import camera as camera_service

bp = Blueprint("camera", __name__)

NO_CACHE = {"Cache-Control": "no-store"}


@bp.get("/status")
@login_required
def status() -> Response:
    return jsonify(camera_service.get_status().model_dump(mode="json"))


@bp.get("/analysis")
@login_required
def analysis() -> Response:
    return jsonify(camera_service.get_analysis().model_dump(mode="json"))


@bp.get("/snapshot")
@image_login_required
def snapshot() -> Response:
    return Response(camera_service.snapshot(), mimetype="image/jpeg", headers=NO_CACHE)


@bp.get("/stream")
@image_login_required
def stream() -> Response:
    return Response(
        camera_service.stream(),
        mimetype=f"multipart/x-mixed-replace; boundary={camera_service.BOUNDARY}",
        headers=NO_CACHE,
    )
