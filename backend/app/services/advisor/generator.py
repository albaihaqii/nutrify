"""Make one piece of advice and store it: the language model when there is one, else the rules."""

import logging
from datetime import timedelta

from flask import current_app

from app.extensions import db
from app.models import Advice, AdviceSource, Observation, Plant
from app.models.types import utcnow
from app.services.advisor.base import AdviceContext, AdviceDraft
from app.services.advisor.gemini import AdvisorError, GeminiAdvisor
from app.services.advisor.rules import RulesAdvisor

log = logging.getLogger("nutrify.advisor")

CACHE_TTL = timedelta(hours=6)  # the same facts get the same model answer for this long


def llm_advisor() -> GeminiAdvisor | None:
    """The language model advisor, or None when no key is configured."""
    key = current_app.config.get("GEMINI_API_KEY", "")
    if not key:
        return None
    return GeminiAdvisor(key, current_app.config["GEMINI_MODEL"])


def _cached(context: AdviceContext) -> AdviceDraft | None:
    """A recent model answer for the same status and sensor bands."""
    row = db.session.scalar(
        db.select(Advice)
        .where(
            Advice.cache_key == context.cache_key(),
            Advice.source == AdviceSource.LLM,
            Advice.created_at >= utcnow() - CACHE_TTL,
        )
        .order_by(Advice.created_at.desc(), Advice.id.desc())
        .limit(1)
    )
    if row is None:
        return None
    return AdviceDraft(
        summary=row.summary,
        likely_causes=list(row.likely_causes),
        suggested_actions=list(row.suggested_actions),
        severity=row.severity,
        source=row.source,
        provider=row.provider,
        model_name=row.model_name,
    )


def _draft(context: AdviceContext) -> AdviceDraft:
    llm = llm_advisor()
    if llm is None:
        return RulesAdvisor().advise(context)
    cached = _cached(context)
    if cached is not None:
        return cached
    try:
        return llm.advise(context)
    except AdvisorError as error:
        log.warning("The language model gave no advice (%s); using the rules", error)
        return RulesAdvisor().advise(context)


def create_advice(
    context: AdviceContext, plant: Plant | None = None, observation: Observation | None = None
) -> Advice:
    """Advise on the context and store the advice with the facts it was made from."""
    draft = _draft(context)
    row = Advice(
        trigger=context.trigger,
        plant_id=None if plant is None else plant.id,
        observation_id=None if observation is None else observation.id,
        plant_class=None if observation is None else observation.stable_class,
        severity=draft.severity,
        summary=draft.summary,
        likely_causes=draft.likely_causes,
        suggested_actions=draft.suggested_actions,
        source=draft.source,
        provider=draft.provider,
        model_name=draft.model_name,
        context=context.as_json(),
        cache_key=context.cache_key(),
    )
    db.session.add(row)
    db.session.commit()
    return row
