"""When advice is made, and the facts it is made from.

Two things start advice (docs/Architecture.md section 4.5): a hole whose stabilised status changes
to a deficiency or `needs_check`, and a sensor value that stays out of its ideal range.
"""

import logging
from datetime import timedelta
from typing import Any

from app.extensions import db
from app.models import (
    Advice,
    AdviceTrigger,
    Observation,
    Plant,
    SensorReading,
)
from app.models.types import utcnow
from app.services.advisor.base import (
    METRICS,
    AdviceContext,
    MetricBand,
    MetricFact,
    MetricName,
)
from app.services.advisor.generator import create_advice
from app.services.plants import status_of
from app.services.sensors import metric_status

log = logging.getLogger("nutrify.advisor")

ADVISED_STATUSES = ("n_deficiency", "fe_deficiency", "needs_check")
SUSTAINED = timedelta(minutes=5)  # a value must stay out of range this long
COVERAGE_SLACK = timedelta(seconds=60)  # how late the first reading of the window may be
REPEAT_AFTER = timedelta(hours=1)  # new advice for a value that stays out of range
RECENT_RESULTS = 5  # results of a hole the advisor gets to see


def metric_facts(
    values: dict[MetricName, float | None], settings: dict[str, Any]
) -> dict[MetricName, MetricFact]:
    """The sensor values with their band; a missing value is left out."""
    facts: dict[MetricName, MetricFact] = {}
    for name in METRICS:
        value = values[name]
        if value is None:
            continue
        low, high = settings[f"{name}_min"], settings[f"{name}_max"]
        facts[name] = MetricFact(value, metric_status(value, low, high), low, high)
    return facts


def reading_values(row: SensorReading | Observation) -> dict[MetricName, float | None]:
    return {
        name: None if getattr(row, name) is None else float(getattr(row, name)) for name in METRICS
    }


def advise_plant_status(
    hole: Plant, observation: Observation, settings: dict[str, Any]
) -> Advice | None:
    """Advice for a hole with its latest result. None when the status needs no advice."""
    status = status_of(observation)
    if status not in ADVISED_STATUSES:
        return None
    context = AdviceContext(
        trigger=AdviceTrigger.PLANT_STATUS,
        plant_position=hole.position,
        status=status,
        confidence=None if observation.confidence is None else float(observation.confidence),
        recent_statuses=_recent_statuses(hole, observation),
        metrics=metric_facts(reading_values(observation), settings),
    )
    return create_advice(context, hole, observation)


def _recent_statuses(hole: Plant, observation: Observation) -> list[str]:
    """The statuses of the hole's last stored results up to this one, oldest first."""
    rows = db.session.scalars(
        db.select(Observation)
        .where(Observation.plant_id == hole.id, Observation.id <= observation.id)
        .order_by(Observation.id.desc())
        .limit(RECENT_RESULTS)
    )
    return [str(status_of(row)) for row in reversed(list(rows))]


def advise_changes(changes: list[tuple[int, int]], settings: dict[str, Any]) -> None:
    """Advice for holes that changed status, given as (hole id, observation id). The rows are read
    again, so this can run in another thread. One failure is logged and does not stop the rest."""
    for hole_id, observation_id in changes:
        try:
            hole = db.session.get(Plant, hole_id)
            observation = db.session.get(Observation, observation_id)
            if hole is not None and observation is not None:
                advise_plant_status(hole, observation, settings)
        except Exception:
            db.session.rollback()
            log.exception("Cannot make advice for hole %s", hole_id)


def advise_metric(focus: MetricName, metrics: dict[MetricName, MetricFact]) -> Advice:
    """Advice about one sensor value that is out of range."""
    context = AdviceContext(trigger=AdviceTrigger.SENSOR_RANGE, focus=focus, metrics=metrics)
    return create_advice(context)


def latest_fresh_reading(settings: dict[str, Any]) -> SensorReading | None:
    """The newest sensor reading, or None when there is none or it is older than the limit."""
    reading = db.session.scalar(
        db.select(SensorReading).order_by(SensorReading.recorded_at.desc()).limit(1)
    )
    if reading is None:
        return None
    age = utcnow() - reading.recorded_at
    return reading if age <= timedelta(seconds=settings["sensor_stale_seconds"]) else None


def out_of_range(metrics: dict[MetricName, MetricFact]) -> list[MetricName]:
    return [name for name in METRICS if name in metrics and metrics[name].band != "in_range"]


def _sustained_band(
    readings: list[SensorReading], name: MetricName, settings: dict[str, Any]
) -> MetricBand:
    """The band the value kept during all of the window, or `in_range` when it did not keep one."""
    low, high = settings[f"{name}_min"], settings[f"{name}_max"]
    bands = {metric_status(float(getattr(row, name)), low, high) for row in readings}
    return bands.pop() if len(bands) == 1 else "in_range"


def watch_sensors(settings: dict[str, Any]) -> list[Advice]:
    """Make advice for every value that stayed out of range for `SUSTAINED`, at most once per
    `REPEAT_AFTER` for the same value and side. Returns the advice that was made."""
    now = utcnow()
    start = now - SUSTAINED
    readings = list(
        db.session.scalars(
            db.select(SensorReading)
            .where(SensorReading.recorded_at >= start)
            .order_by(SensorReading.recorded_at)
        )
    )
    if not readings or readings[0].recorded_at > start + COVERAGE_SLACK:
        return []
    latest = latest_fresh_reading(settings)
    if latest is None:
        return []

    metrics = metric_facts(reading_values(latest), settings)
    made: list[Advice] = []
    for name in out_of_range(metrics):
        if _sustained_band(readings, name, settings) == "in_range":
            continue
        context = AdviceContext(trigger=AdviceTrigger.SENSOR_RANGE, focus=name, metrics=metrics)
        prefix = f"sensor_range:{name}:{metrics[name].band}:"
        recent = db.session.scalar(
            db.select(Advice.id)
            .where(
                Advice.trigger == AdviceTrigger.SENSOR_RANGE,
                Advice.created_at >= now - REPEAT_AFTER,
                Advice.cache_key.startswith(prefix),
            )
            .limit(1)
        )
        if recent is None:
            made.append(create_advice(context))
    return made
