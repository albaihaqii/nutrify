"""Sensor readings: storing what the sensor node sends and reading the latest values."""

from datetime import datetime, timedelta, timezone
from typing import Any

from app.errors import ApiError
from app.extensions import db
from app.models import Device, SensorReading
from app.models.types import utcnow
from app.schemas.sensors import (
    LatestReading,
    MetricStatus,
    RangedMetric,
    ReadingIn,
    TdsMetric,
)
from app.services.settings import get_settings

EC_TO_PPM_FACTOR = 500  # tds_ppm = ec (mS/cm) x 500, see docs/Domain.md section 2.3
MAX_FUTURE_SKEW = timedelta(minutes=5)

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
        ph=RangedMetric(
            value=ph, status=metric_status(ph, settings["ph_min"], settings["ph_max"])
        ),
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