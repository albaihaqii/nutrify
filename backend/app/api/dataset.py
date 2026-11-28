"""Dataset endpoints (docs/API.md section 8)."""

from flask import Blueprint, Response, jsonify, request

from app.api.decorators import admin_required, login_required
from app.models.types import utcnow
from app.schemas.dataset import ExportQuery
from app.services import dataset as dataset_service

bp = Blueprint("dataset", __name__)


@bp.get("/summary")
@login_required
def summary() -> Response:
    return jsonify(dataset_service.get_summary().model_dump(mode="json"))


@bp.get("/export")
@admin_required
def export() -> Response:
    query = ExportQuery.model_validate(request.args.to_dict())
    filename = f"nutrify-dataset-{utcnow():%Y%m%d}.csv"
    return Response(
        dataset_service.build_csv(query),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
