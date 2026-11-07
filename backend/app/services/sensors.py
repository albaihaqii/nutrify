"""Sensor readings: storing what the sensor node sends and reading the latest values."""

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any

from app.errors import ApiError
from app.extensions import db
from app.models import Device, SensorReading
from app.models.types import utcnow
from app.schemas.sensors import (
    HistoryOut,
    HistoryPoint,
    HistoryQuery,
    LatestReading,
    MetricStatus,
    RangedMetric,
    ReadingIn,
    TdsMetric,
)
from app.services.settings import get_settings

EC_TO_PPM_FACTOR = 500  # tds_ppm = ec (mS/cm) x 500, see docs/Domain.md section 2.3
MAX_FUTURE_SKEW = timedelta(minutes=5)

DEFAULT_HISTORY_WINDOW = timedelta(hours=24)
MAX_HISTORY_POINTS = 2000
EPOCH = datetime(1970, 1, 1)
BUCKET_SECONDS = {"1m": 60, "5m": 300, "1h": 3600}

# Decimal places stored in the database (docs/Schema.md section 4.3).
PH_DECIMALS = 2
EC_DECIMALS = 3
TEMPERATURE_DECIMALS = 1


def ec_to_tds_ppm(ec: float) -> int:
    """TDS in ppm from EC in mS/cm, rounded half up."""
    return int(ec * EC_TO_PPM_FACTOR + 0.5)


def metric_status(value: float, minimum: float, maximum: float) -> MetricStatus:
    """low below the ideal range, high above it, in_range otherwise (limits included)."""
    if value < minimum:
        return "low"
    if value > maximum:
        return "high"
    return "in_range"


def to_naive_utc(value: datetime) -> datetime:
    """Convert to naive UTC. A datetime without a time zone is taken as UTC."""
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def record_reading(device: Device, data: ReadingIn) -> SensorReading:
    """Store a reading from a sensor node and mark the device as seen."""
    now = utcnow()
    recorded_at = to_naive_utc(data.recorded_at) if data.recorded_at else now
    if recorded_at > now + MAX_FUTURE_SKEW:
        raise ApiError(
            422,
            "validation_error",
            "recorded_at: must not be in the future",
            {"field": "recorded_at"},
        )

    # Round to the stored precision first, so the derived TDS matches the stored EC.
    ec = round(data.ec, EC_DECIMALS)
    reading = SensorReading(
        device_id=device.id,
        ph=round(data.ph, PH_DECIMALS),
        ec=ec,
        tds_ppm=ec_to_tds_ppm(ec),
        temperature=round(data.temperature, TEMPERATURE_DECIMALS),
        recorded_at=recorded_at,
        received_at=now,
    )
    db.session.add(reading)

    device.last_seen_at = now
    if data.firmware_version:
        device.firmware_version = data.firmware_version
    db.session.commit()
    return reading


def build_latest(reading: SensorReading, settings: dict[str, Any], now: datetime) -> LatestReading:
    """Describe a reading with each value's status against the ideal ranges."""
    ph, ec, temperature = float(reading.ph), float(reading.ec), float(reading.temperature)
    age_seconds = (now - reading.recorded_at).total_seconds()
    return LatestReading(
        id=reading.id,
        recorded_at=reading.recorded_at,
        received_at=reading.received_at,
        is_stale=age_seconds > settings["sensor_stale_seconds"],
        ph=RangedMetric(value=ph, status=metric_status(ph, settings["ph_min"], settings["ph_max"])),
        ec=RangedMetric(
            value=ec,
            status=metric_status(ec, settings["ec_min"], settings["ec_max"]),
            unit="mS/cm",
        ),
        tds_ppm=TdsMetric(value=reading.tds_ppm),
        temperature=RangedMetric(
            value=temperature,
            status=metric_status(
                temperature, settings["temperature_min"], settings["temperature_max"]
            ),
            unit="celsius",
        ),
    )


def get_latest_reading() -> LatestReading:
    reading = db.session.scalar(
        db.select(SensorReading)
        .order_by(SensorReading.recorded_at.desc(), SensorReading.id.desc())
        .limit(1)
    )
    if reading is None:
        raise ApiError(404, "not_found", "No sensor readings yet")
    return build_latest(reading, get_settings(), utcnow())


def resolve_window(query: HistoryQuery, now: datetime) -> tuple[datetime, datetime]:
    """Time window as naive UTC. Defaults to the last 24 hours."""
    end = to_naive_utc(query.to) if query.to else now
    start = to_naive_utc(query.from_) if query.from_ else end - DEFAULT_HISTORY_WINDOW
    if start >= end:
        raise ApiError(422, "validation_error", "from: must be earlier than to", {"field": "from"})
    return start, end


def too_many_points(field: str) -> ApiError:
    return ApiError(
        422,
        "validation_error",
        f"{field}: too many points (maximum {MAX_HISTORY_POINTS}); "
        "use a shorter window or a larger interval",
        {"field": field},
    )


def _fetch_rows(start: datetime, end: datetime, limit: int | None = None) -> list[Any]:
    statement = (
        db.select(
            SensorReading.recorded_at,
            SensorReading.ph,
            SensorReading.ec,
            SensorReading.tds_ppm,
            SensorReading.temperature,
        )
        .where(SensorReading.recorded_at >= start, SensorReading.recorded_at <= end)
        .order_by(SensorReading.recorded_at, SensorReading.id)
    )
    if limit is not None:
        statement = statement.limit(limit)
    return list(db.session.execute(statement).all())


def _point(time: datetime, values: dict[str, float | int], metric: str | None) -> HistoryPoint:
    if metric:
        values = {metric: values[metric]}
    return HistoryPoint(time=time, **values)


def _raw_points(rows: list[Any], metric: str | None) -> list[HistoryPoint]:
    return [
        _point(
            row.recorded_at,
            {
                "ph": float(row.ph),
                "ec": float(row.ec),
                "tds_ppm": row.tds_ppm,
                "temperature": float(row.temperature),
            },
            metric,
        )
        for row in rows
    ]


def _bucket_points(rows: list[Any], size: int, metric: str | None) -> list[HistoryPoint]:
    """Mean of each metric per time bucket, aligned to UTC, oldest first."""
    buckets: dict[int, list[float]] = {}
    for row in rows:
        index = int((row.recorded_at - EPOCH).total_seconds() // size)
        total = buckets.setdefault(index, [0, 0.0, 0.0, 0.0, 0.0])
        total[0] += 1
        total[1] += float(row.ph)
        total[2] += float(row.ec)
        total[3] += row.tds_ppm
        total[4] += float(row.temperature)

    points = []
    for index in sorted(buckets):
        count, ph, ec, tds, temperature = buckets[index]
        points.append(
            _point(
                EPOCH + timedelta(seconds=index * size),
                {
                    "ph": round(ph / count, PH_DECIMALS),
                    "ec": round(ec / count, EC_DECIMALS),
                    "tds_ppm": int(tds / count + 0.5),
                    "temperature": round(temperature / count, TEMPERATURE_DECIMALS),
                },
                metric,
            )
        )
    return points


def get_history(query: HistoryQuery) -> HistoryOut:
    """Sensor history for charts: raw readings or means per time bucket, oldest first."""
    start, end = resolve_window(query, utcnow())

    if query.interval == "raw":
        rows = _fetch_rows(start, end, limit=MAX_HISTORY_POINTS + 1)
        if len(rows) > MAX_HISTORY_POINTS:
            raise too_many_points("interval")
        return HistoryOut(interval="raw", items=_raw_points(rows, query.metric))

    size = BUCKET_SECONDS[query.interval]
    if ceil((end - start).total_seconds() / size) > MAX_HISTORY_POINTS:
        raise too_many_points("interval")
    rows = _fetch_rows(start, end)
    return HistoryOut(interval=query.interval, items=_bucket_points(rows, size, query.metric))
