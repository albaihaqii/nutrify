"""Health check endpoint."""

from flask import Blueprint, jsonify
from sqlalchemy import text

from ..extensions import db

bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    """Report API status and whether the database is reachable."""
    try:
        db.session.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "unavailable"
    status = "ok" if database == "ok" else "degraded"
    return jsonify(status=status, database=database), 200 if status == "ok" else 503