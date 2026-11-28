"""Plants and observations: the current status of each hole and the stored results."""

from collections import Counter
from datetime import timedelta

from app.extensions import db
from app.models import Observation, Plant, QcStatus
from app.schemas.plants import (
    DailyCondition,
    DailyConditionsOut,
    DailyConditionsQuery,
    LastObservation,
    ObservationFeatures,
    ObservationOut,
    ObservationsOut,
    ObservationsQuery,
    PlantOut,
    PlantsOut,
)
from app.services.sensors import to_naive_utc

COUNTED_STATUSES = ("normal", "n_deficiency", "fe_deficiency", "needs_check")


def status_of(observation: Observation | None) -> str | None:
    """The status a stored observation stands for, in the words of the live analysis."""
    if observation is None:
        return None
    if observation.stable_class is not None:
        return observation.stable_class.value
    if observation.qc_status is QcStatus.NO_PLANT:
        return "no_plant"
    return "needs_check"


def _number(value: object) -> float | None:
    return None if value is None else float(value)  # type: ignore[arg-type]


def get_plants() -> PlantsOut:
    """The holes that have a stored result, by position; none before the worker has stored one."""
    rows = db.session.execute(
        db.select(Plant, Observation)
        .outerjoin(Observation, Observation.id == Plant.last_observation_id)
        .order_by(Plant.position)
    ).all()
    items = [
        PlantOut(
            position=plant.position,
            status=status_of(last),
            current_class=plant.current_class.value if plant.current_class else None,
            current_since=plant.current_since,
            last_observation=None
            if last is None
            else LastObservation(
                id=last.id,
                observed_at=last.observed_at,
                confidence=_number(last.confidence),
                qc_status=last.qc_status.value,
            ),
        )
        for plant, last in rows
    ]
    return PlantsOut(items=items)


def _observation_out(observation: Observation, position: int) -> ObservationOut:
    return ObservationOut(
        id=observation.id,
        plant_position=position,
        observed_at=observation.observed_at,
        status=status_of(observation),  # type: ignore[arg-type]
        features=ObservationFeatures(
            mean_r=_number(observation.mean_r),
            mean_g=_number(observation.mean_g),
            mean_b=_number(observation.mean_b),
            leaf_area_ratio=float(observation.leaf_area_ratio),
            ph=_number(observation.ph),
            ec=_number(observation.ec),
            temperature=_number(observation.temperature),
        ),
        predicted_class=observation.predicted_class.value if observation.predicted_class else None,
        stable_class=observation.stable_class.value if observation.stable_class else None,
        confidence=_number(observation.confidence),
        rule_path=observation.rule_path,
        qc_status=observation.qc_status.value,
        model_version=observation.model_version,
        label_class=observation.label_class.value if observation.label_class else None,
    )


def get_observations(query: ObservationsQuery) -> ObservationsOut:
    """Stored results, newest first; the six holes of one analysis come in position order."""
    total = db.session.scalar(db.select(db.func.count(Observation.id))) or 0
    rows = db.session.execute(
        db.select(Observation, Plant.position)
        .join(Plant, Plant.id == Observation.plant_id)
        .order_by(Observation.observed_at.desc(), Plant.position)
        .limit(query.page_size)
        .offset((query.page - 1) * query.page_size)
    ).all()
    return ObservationsOut(
        items=[_observation_out(observation, position) for observation, position in rows],
        page=query.page,
        page_size=query.page_size,
        total=total,
    )


def get_daily_conditions(query: DailyConditionsQuery) -> DailyConditionsOut:
    """Holes per status at the end of each of `days` days of 24 hours, oldest day first.

    The condition of a hole on a day is its last stored result of that day.
    """
    start = to_naive_utc(query.from_)
    end = start + timedelta(days=query.days)
    rows = db.session.execute(
        db.select(Observation)
        .where(Observation.observed_at >= start, Observation.observed_at < end)
        .order_by(Observation.observed_at, Observation.id)
    ).scalars()

    last: dict[tuple[int, int], str | None] = {}
    for observation in rows:
        day = (observation.observed_at - start) // timedelta(days=1)
        last[(day, observation.plant_id)] = status_of(observation)

    items = []
    for day in range(query.days):
        counts = Counter(status for (d, _), status in last.items() if d == day)
        items.append(
            DailyCondition(
                start=start + timedelta(days=day),
                **{status: counts[status] for status in COUNTED_STATUSES},
            )
        )
    return DailyConditionsOut(items=items)
