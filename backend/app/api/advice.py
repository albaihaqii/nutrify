"""Advice endpoints (docs/API.md section 11)."""

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import current_user

from app.api.decorators import admin_required, login_required
from app.api.utils import load_body
from app.schemas.advice import AdviceQuery, GenerateIn, LatestQuery, RuleUpdate
from app.services import advice as advice_service

bp = Blueprint("advice", __name__)


@bp.get("")
@login_required
def list_advice() -> Response:
    query = AdviceQuery.model_validate(request.args.to_dict())
    return jsonify(advice_service.get_advice(query).model_dump(mode="json"))


@bp.get("/latest")
@login_required
def latest_advice() -> Response:
    query = LatestQuery.model_validate(request.args.to_dict())
    return jsonify(advice_service.get_latest_advice(query.plant).model_dump(mode="json"))


@bp.get("/rules")
@login_required
def list_rules() -> Response:
    return jsonify(advice_service.get_rules().model_dump(mode="json"))


@bp.put("/rules/<code>")
@admin_required
def update_rule(code: str) -> Response:
    body = load_body(RuleUpdate)
    return jsonify(advice_service.update_rule(code, body, current_user).model_dump(mode="json"))


@bp.post("/generate")
@admin_required
def generate_advice() -> tuple[Response, int]:
    body = load_body(GenerateIn)
    return jsonify(advice_service.generate(body).model_dump(mode="json")), 201
