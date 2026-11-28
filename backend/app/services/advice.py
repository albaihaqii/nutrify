"""Advice and the fallback rules: what the API lists, edits and generates on request."""

from datetime import timedelta

from sqlalchemy import ColumnElement, Select

from app.errors import ApiError
from app.extensions import db
from app.models import Advice, AdviceRule, AdviceSource, Observation, Plant, User
from app.models.types import utcnow
from app.schemas.advice import (
    AdviceFilters,
    AdviceOut,
    AdvicePageOut,
    AdviceQuery,
    AdviceRuleOut,
    AdviceRulesOut,
    GenerateIn,
    RuleUpdate,
)
from app.services.advisor import triggers
from app.services.advisor.rules import RULE_CODES, stored_actions
from app.services.sensors import to_naive_utc
from app.services.settings import get_settings

GENERATE_INTERVAL = timedelta(minutes=1)  # per plant, or for the sensors as a whole


def _out(row: Advice, position: int | None) -> AdviceOut:
    return AdviceOut(
        id=row.id,
        created_at=row.created_at,
        trigger=row.trigger.value,
        plant_position=position,
        plant_class=row.plant_class.value if row.plant_class else None,
        severity=row.severity.value,
        summary=row.summary,
        likely_causes=row.likely_causes,
        suggested_actions=row.suggested_actions,
        source=row.source.value,
        provider=row.provider,
        model_name=row.model_name,
    )


def _conditions(filters: AdviceFilters) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if filters.source is not None:
        conditions.append(Advice.source == AdviceSource(filters.source))
    if filters.plant is not None:
        conditions.append(Plant.position == filters.plant)
    if filters.trigger is not None:
        conditions.append(Advice.trigger == filters.trigger)
    if filters.from_ is not None:
        conditions.append(Advice.created_at >= to_naive_utc(filters.from_))
    if filters.to is not None:
        conditions.append(Advice.created_at <= to_naive_utc(filters.to))
    return conditions


def _matching(*conditions: ColumnElement[bool]) -> Select:
    return (
        db.select(Advice, Plant.position)
        .outerjoin(Plant, Plant.id == Advice.plant_id)
        .where(*conditions)
        .order_by(Advice.created_at.desc(), Advice.id.desc())
    )


def get_advice(query: AdviceQuery) -> AdvicePageOut:
    """Stored advice, newest first."""
    conditions = _conditions(query)
    total = (
        db.session.scalar(
            db.select(db.func.count(Advice.id))
            .outerjoin(Plant, Plant.id == Advice.plant_id)
            .where(*conditions)
        )
        or 0
    )
    rows = db.session.execute(
        _matching(*conditions).limit(query.page_size).offset((query.page - 1) * query.page_size)
    ).all()
    return AdvicePageOut(
        items=[_out(row, position) for row, position in rows],
        page=query.page,
        page_size=query.page_size,
        total=total,
    )


def get_latest_advice(plant: int | None) -> AdviceOut:
    conditions = [] if plant is None else [Plant.position == plant]
    found = db.session.execute(_matching(*conditions).limit(1)).first()
    if found is None:
        raise ApiError(404, "not_found", "No advice yet")
    return _out(*found)


def _rule_out(code: str, row: AdviceRule | None) -> AdviceRuleOut:
    return AdviceRuleOut(
        code=code,
        suggested_actions=stored_actions(code) if row is None else row.suggested_actions,
        updated_at=None if row is None else row.updated_at,
        updated_by=None if row is None else row.updated_by,
    )


def get_rules() -> AdviceRulesOut:
    """All six rules; a rule that was never edited has its default actions."""
    rows = {row.code: row for row in db.session.scalars(db.select(AdviceRule))}
    return AdviceRulesOut(items=[_rule_out(code, rows.get(code)) for code in RULE_CODES])


def update_rule(code: str, body: RuleUpdate, user: User) -> AdviceRuleOut:
    if code not in RULE_CODES:
        raise ApiError(404, "not_found", f"No advice rule {code!r}")
    row = db.session.get(AdviceRule, code)
    if row is None:
        row = AdviceRule(code=code)
        db.session.add(row)
    row.suggested_actions = body.suggested_actions
    row.updated_by = user.id
    row.updated_at = utcnow()
    db.session.commit()
    return _rule_out(code, row)


def generate(body: GenerateIn) -> AdviceOut:
    """Advice on request, from the latest result of a hole or the current sensor values."""
    settings = get_settings()
    hole = None
    if body.plant is not None:
        hole = db.session.scalar(db.select(Plant).filter_by(position=body.plant))
        if hole is None:
            raise ApiError(404, "not_found", f"No results yet for hole {body.plant}")
    _check_interval(hole)

    if hole is not None:
        observation = (
            db.session.get(Observation, hole.last_observation_id)
            if hole.last_observation_id
            else None
        )
        row = (
            triggers.advise_plant_status(hole, observation, settings)
            if observation is not None
            else None
        )
        if row is None:
            raise ApiError(
                422,
                "validation_error",
                "The hole has no deficiency or check to advise on",
                {"field": "plant"},
            )
    else:
        reading = triggers.latest_fresh_reading(settings)
        metrics = (
            {}
            if reading is None
            else triggers.metric_facts(triggers.reading_values(reading), settings)
        )
        out = triggers.out_of_range(metrics)
        if not out:
            raise ApiError(
                422,
                "validation_error",
                "No sensor value is out of its ideal range",
                {"field": "trigger"},
            )
        row = triggers.advise_metric(out[0], metrics)
    return _out(row, None if hole is None else hole.position)


def _check_interval(hole: Plant | None) -> None:
    """One request per plant per minute; the sensors count as one."""
    recent = db.session.scalar(
        db.select(Advice.id)
        .where(
            Advice.plant_id.is_(None) if hole is None else Advice.plant_id == hole.id,
            Advice.created_at >= utcnow() - GENERATE_INTERVAL,
        )
        .limit(1)
    )
    if recent is not None:
        raise ApiError(429, "rate_limited", "Advice was made a moment ago. Try again in a minute.")
