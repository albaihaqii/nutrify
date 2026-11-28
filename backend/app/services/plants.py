"""Plants and observations: the current status of each hole and the stored results."""

from collections import Counter
from datetime import timedelta
from typing import Any

from sqlalchemy import ColumnElement, and_

from app.errors import ApiError
from app.extensions import db
from app.models import Observation, Plant, PlantClass, QcStatus, User
from app.models.types import utcnow
from app.schemas.plants import (
    DailyCondition,
    DailyConditionsOut,
    DailyConditionsQuery,
    ExportRow,
    LabelIn,
    LastObservation,
    ObservationFeatures,
    ObservationFilters,
    ObservationOut,
    ObservationsExport,
    ObservationsOut,
    ObservationsQuery,
    PlantDetailOut,
    PlantOut,
    PlantsOut,
    StatusChange,
)
from app.services.sensors import to_naive_utc

COUNTED_STATUSES = ("normal", "n_deficiency", "fe_deficiency", "needs_check")
EXPORT_LIMIT = 20000  # rows in one export
HISTORY_SCAN = 1000  # newest results of a hole read to find its status changes
HISTORY_CHANGES = 5

# The observations that carry each status; the inverse of `status_code`.
STATUS_CONDITIONS: dict[str, ColumnElement[bool]] = {
    "normal": Observation.stable_class == PlantClass.NORMAL,
    "n_deficiency": Observation.stable_class == PlantClass.N_DEFICIENCY,
    "fe_deficiency": Observation.stable_class == PlantClass.FE_DEFICIENCY,
    "no_plant": Observation.qc_status == QcStatus.NO_PLANT,
    "needs_check": and_(
        Observation.stable_class.is_(None), Observation.qc_status != QcStatus.NO_PLANT
    ),
}


def status_code(stable_class: PlantClass | None, qc_status: QcStatus) -> str:
    """The status of a stored result, in the words of the live analysis."""
    if stable_class is not None:
        return stable_class.value
    return "no_plant" if qc_status is QcStatus.NO_PLANT else "needs_check"


def status_of(observation: Observation | None) -> str | None:
    """The status a stored observation stands for, or None when there is no observation."""
    if observation is None:
        return None
    return status_code(observation.stable_class, observation.qc_status)


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
        has_image=observation.capture_id is not None,
    )


def _conditions(filters: ObservationFilters) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if filters.plant is not None:
        conditions.append(Plant.position == filters.plant)
    if filters.from_ is not None:
        conditions.append(Observation.observed_at >= to_naive_utc(filters.from_))
    if filters.to is not None:
        conditions.append(Observation.observed_at <= to_naive_utc(filters.to))
    if filters.status is not None:
        conditions.append(STATUS_CONDITIONS[filters.status])
    if filters.label == "labeled":
        conditions.append(Observation.label_class.is_not(None))
    elif filters.label == "unlabeled":
        conditions.append(Observation.label_class.is_(None))
    if filters.labelable:
        conditions.append(Observation.capture_id.is_not(None))
        conditions.append(Observation.qc_status != QcStatus.NO_PLANT)
    return conditions


def _matching(filters: ObservationFilters) -> Any:
    """Observations and the position of their hole that match the filters, newest first."""
    return (
        db.select(Observation, Plant.position)
        .join(Plant, Plant.id == Observation.plant_id)
        .where(*_conditions(filters))
        .order_by(Observation.observed_at.desc(), Plant.position)
    )


def get_observations(query: ObservationsQuery) -> ObservationsOut:
    """Stored results, newest first; the six holes of one analysis come in position order."""
    total = (
        db.session.scalar(
            db.select(db.func.count(Observation.id))
            .join(Plant, Plant.id == Observation.plant_id)
            .where(*_conditions(query))
        )
        or 0
    )
    rows = db.session.execute(
        _matching(query).limit(query.page_size).offset((query.page - 1) * query.page_size)
    ).all()
    return ObservationsOut(
        items=[_observation_out(observation, position) for observation, position in rows],
        page=query.page,
        page_size=query.page_size,
        total=total,
    )


def get_observation_export(filters: ObservationFilters) -> ObservationsExport:
    """All results that match the filters, newest first, in the few fields of the CSV export."""
    rows = db.session.execute(_matching(filters).limit(EXPORT_LIMIT + 1)).all()
    if len(rows) > EXPORT_LIMIT:
        raise ApiError(
            422,
            "validation_error",
            f"too many rows (maximum {EXPORT_LIMIT}); use a shorter window",
            {"field": "from"},
        )
    return ObservationsExport(
        items=[
            ExportRow(
                observed_at=observation.observed_at,
                plant_position=position,
                status=status_of(observation),  # type: ignore[arg-type]
                confidence=_number(observation.confidence),
                ph=_number(observation.ph),
                ec=_number(observation.ec),
                temperature=_number(observation.temperature),
            )
            for observation, position in rows
        ]
    )


def _status_history(plant_id: int) -> list[StatusChange]:
    """The latest stretches in which the hole kept one status, newest first. A stretch starts at
    its oldest stored result that is still inside the rows read."""
    rows = db.session.scalars(
        db.select(Observation)
        .where(Observation.plant_id == plant_id)
        .order_by(Observation.observed_at.desc(), Observation.id.desc())
        .limit(HISTORY_SCAN)
    )
    changes: list[StatusChange] = []
    for observation in rows:
        status = status_of(observation)
        if changes and changes[-1].status == status:
            changes[-1].since = observation.observed_at
            continue
        if len(changes) == HISTORY_CHANGES:
            break
        changes.append(
            StatusChange(
                since=observation.observed_at,
                status=status,  # type: ignore[arg-type]
                confidence=_number(observation.confidence),
            )
        )
    return changes


def get_plant(position: int) -> PlantDetailOut:
    """A hole with its latest result in full and its latest status changes."""
    row = db.session.execute(
        db.select(Plant, Observation)
        .join(Observation, Observation.id == Plant.last_observation_id)
        .where(Plant.position == position)
    ).one_or_none()
    if row is None:
        raise ApiError(404, "not_found", "There is no result for this hole yet")
    plant, last = row
    return PlantDetailOut(
        position=plant.position,
        status=status_of(last),  # type: ignore[arg-type]
        current_class=plant.current_class.value if plant.current_class else None,
        current_since=plant.current_since,
        latest_observation=_observation_out(last, plant.position),
        status_history=_status_history(plant.id),
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


def set_label(observation_id: int, body: LabelIn, user: User) -> ObservationOut:
    """Set or clear the ground-truth label a person gave a result. Who and when are recorded."""
    row = db.session.execute(
        db.select(Observation, Plant.position)
        .join(Plant, Plant.id == Observation.plant_id)
        .where(Observation.id == observation_id)
    ).first()
    if row is None:
        raise ApiError(404, "not_found", "Observation not found")
    observation, position = row
    if body.label_class is None:
        observation.label_class = None
        observation.labeled_by = None
        observation.labeled_at = None
    else:
        observation.label_class = PlantClass(body.label_class)
        observation.labeled_by = user.id
        observation.labeled_at = utcnow()
    db.session.commit()
    return _observation_out(observation, position)
