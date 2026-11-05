"""Health check endpoint (docs/API.md section 3)."""

from flask import Blueprint, Response, jsonify
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db

bp = Blueprint("health", __name__)

@bp.get("/health")
def health() -> tuple[Response, int]:
    try:
        db.session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return jsonify({"status": "degraded", "database": "error"}), 503
    return jsonify({"status": "ok", "database": "ok"}), 200