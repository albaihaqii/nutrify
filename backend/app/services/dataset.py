"""The labelled dataset: how much is ready to train on, and the CSV export (docs/Schema.md 7)."""

from sqlalchemy import ColumnElement, and_, case, or_

from app.extensions import db
from app.models import Observation, Plant, PlantClass, QcStatus
from app.schemas.common import _format_utc
from app.schemas.dataset import DatasetSummaryOut, ExportQuery
from app.services.sensors import to_naive_utc

CSV_HEADER = (
    "Mean_R,Mean_G,Mean_B,pH,EC,Temperature,label,observation_id,plant_position,observed_at"
)

SENSOR_MISSING = or_(
    Observation.ph.is_(None), Observation.ec.is_(None), Observation.temperature.is_(None)
)
# What a model can learn from: a label, a leaf and the sensor values of the same moment.
USABLE = and_(
    Observation.label_class.is_not(None),
    Observation.qc_status == QcStatus.OK,
    Observation.mean_r.is_not(None),
    ~SENSOR_MISSING,
)
# `ok` results that were stored without sensor values count as `stale_sensor`.
EFFECTIVE_QC = case(
    (and_(Observation.qc_status == QcStatus.OK, SENSOR_MISSING), "stale_sensor"),
    else_=Observation.qc_status,
)


def _count(*conditions: ColumnElement[bool]) -> int:
    return db.session.scalar(db.select(db.func.count(Observation.id)).where(*conditions)) or 0


def get_summary() -> DatasetSummaryOut:
    by_class = dict.fromkeys((item.value for item in PlantClass), 0)
    for label, total in db.session.execute(
        db.select(Observation.label_class, db.func.count(Observation.id))
        .where(USABLE)
        .group_by(Observation.label_class)
    ):
        by_class[label.value] = total

    by_qc = dict.fromkeys((item.value for item in QcStatus), 0)
    for status, total in db.session.execute(
        db.select(EFFECTIVE_QC, db.func.count(Observation.id)).group_by(EFFECTIVE_QC)
    ):
        by_qc[status.value if isinstance(status, QcStatus) else status] = total

    return DatasetSummaryOut(
        total_observations=_count(),
        labeled=_count(Observation.label_class.is_not(None)),
        usable=_count(USABLE),
        by_class=by_class,
        by_qc_status=by_qc,
    )


def build_csv(query: ExportQuery) -> str:
    """The usable rows, oldest first. Plain CSV without a BOM or quotes: it goes straight into
    pandas, where a BOM would corrupt the name of the first column."""
    conditions = [USABLE]
    if query.from_ is not None:
        conditions.append(Observation.observed_at >= to_naive_utc(query.from_))
    if query.to is not None:
        conditions.append(Observation.observed_at <= to_naive_utc(query.to))
    rows = db.session.execute(
        db.select(Observation, Plant.position)
        .join(Plant, Plant.id == Observation.plant_id)
        .where(*conditions)
        .order_by(Observation.observed_at, Observation.id)
    )
    lines = [CSV_HEADER]
    for observation, position in rows:
        assert observation.label_class is not None
        lines.append(
            ",".join(
                [
                    str(observation.mean_r),
                    str(observation.mean_g),
                    str(observation.mean_b),
                    str(observation.ph),
                    str(observation.ec),
                    str(observation.temperature),
                    observation.label_class.value,
                    str(observation.id),
                    str(position),
                    _format_utc(observation.observed_at),
                ]
            )
        )
    return "\n".join(lines) + "\n"
