"""Model endpoints (docs/API.md section 10)."""

from flask import Blueprint, Response, jsonify, request

from app.api.decorators import login_required
from app.errors import ApiError
from app.services import model_registry, prediction

bp = Blueprint("models", __name__)


@bp.get("")
@login_required
def list_models() -> Response:
    return jsonify(model_registry.get_report().model_dump(mode="json"))


@bp.get("/c45/tree")
@login_required
def c45_tree() -> Response:
    return jsonify(model_registry.get_tree().model_dump(mode="json"))


@bp.post("/predict")
@login_required
def predict() -> Response:
    upload = request.files.get("image")
    data = upload.read() if upload else b""
    if not data:
        raise ApiError(422, "validation_error", "image: a file is required", {"field": "image"})
    result = prediction.predict_image(data)
    return jsonify(result.model_dump(mode="json", by_alias=True))
