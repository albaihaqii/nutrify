"""Make one piece of advice and store it."""

from app.extensions import db
from app.models import Advice, Observation, Plant
from app.services.advisor.base import AdviceContext, Advisor
from app.services.advisor.rules import RulesAdvisor


def advisor() -> Advisor:
    return RulesAdvisor()


def create_advice(
    context: AdviceContext, plant: Plant | None = None, observation: Observation | None = None
) -> Advice:
    """Advise on the context and store the advice with the facts it was made from."""
    draft = advisor().advise(context)
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
