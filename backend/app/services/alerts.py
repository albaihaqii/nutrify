"""Alerts: what needs attention right now (docs/API.md section 12).

`sync_alerts` compares the conditions that hold now with the open alerts: a new condition opens an
alert and one that has cleared closes it. It is safe to call at any time and as often as wanted.
"""

import threading
import time
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any

from sqlalchemy import ColumnElement, Select

from app.errors import ApiError
from app.extensions import db
from app.models import (
    Alert,
    AlertCode,
    Device,
    DeviceType,
    Plant,
    PlantClass,
    SensorReading,
    Severity,
    User,
)
from app.models.types import utcnow
from app.schemas.alerts import AlertOut, AlertsOut, AlertsQuery
from app.services import camera as camera_service
from app.services.advisor.base import METRICS, MetricName
from app.services.advisor.rules import SENSOR_RULES, SEVERITIES
from app.services.sensors import metric_status, to_naive_utc
from app.services.settings import get_settings

SYNC_EVERY = 5.0  # seconds: the least time between two syncs asked for with `throttle`
_lock = threading.Lock()
_last_sync = float("-inf")

Key = tuple[Any, ...]


@dataclass(frozen=True)
class Condition:
    """Something that holds now. `key` says which alert it is, so one condition is one alert."""

    code: AlertCode
    key: Key
    severity: Severity
    params: dict[str, Any]
    plant_id: int | None = None
    device_id: int | None = None


@dataclass
class Found:
    conditions: list[Condition] = field(default_factory=list)
    unknown: set[AlertCode] = field(default_factory=set)  # alerts of these codes stay as they are


def _alert_key(alert: Alert) -> Key:
    params = alert.params or {}
    if alert.code is AlertCode.SENSOR_OUT_OF_RANGE:
        return (alert.code, params.get("metric"))
    if alert.code is AlertCode.PLANT_DEFICIENCY:
        return (alert.code, alert.plant_id, params.get("status"))
    return (alert.code, alert.device_id)


def _sensor_conditions(settings: dict[str, Any], found: Found) -> None:
    """Values of the newest reading outside their ideal range. An old reading says nothing about
    now, so the open alerts of this kind are then left alone."""
    reading = db.session.scalar(
        db.select(SensorReading).order_by(SensorReading.recorded_at.desc()).limit(1)
    )
    limit = timedelta(seconds=settings["sensor_stale_seconds"])
    if reading is None or utcnow() - reading.recorded_at > limit:
        found.unknown.add(AlertCode.SENSOR_OUT_OF_RANGE)
        return
    for name in METRICS:
        value = float(getattr(reading, name))
        low, high = settings[f"{name}_min"], settings[f"{name}_max"]
        band = metric_status(value, low, high)
        if band == "in_range":
            continue
        found.conditions.append(
            Condition(
                code=AlertCode.SENSOR_OUT_OF_RANGE,
                key=(AlertCode.SENSOR_OUT_OF_RANGE, name),
                severity=_sensor_severity(name),
                params={"metric": name, "value": value, "min": low, "max": high, "side": band},
                device_id=reading.device_id,
            )
        )


def _sensor_severity(name: MetricName) -> Severity:
    return SEVERITIES[SENSOR_RULES[name]]


def _plant_conditions(found: Found) -> None:
    """Holes whose current class is a deficiency."""
    holes = db.session.scalars(
        db.select(Plant).where(
            Plant.current_class.in_([PlantClass.N_DEFICIENCY, PlantClass.FE_DEFICIENCY])
        )
    )
    for hole in holes:
        assert hole.current_class is not None
        status = hole.current_class.value
        found.conditions.append(
            Condition(
                code=AlertCode.PLANT_DEFICIENCY,
                key=(AlertCode.PLANT_DEFICIENCY, hole.id, status),
                severity=Severity.WARNING,
                params={"status": status},
                plant_id=hole.id,
            )
        )


def _device_conditions(settings: dict[str, Any], found: Found) -> None:
    """A webcam that sends no pictures and a sensor node that sends no readings. A device that is
    switched off on the Devices page, or has never been seen, is not a problem."""
    now = utcnow()
    devices = db.session.scalars(db.select(Device).where(Device.is_active.is_(True)))
    webcam_online = camera_service.is_online()
    limit = timedelta(seconds=settings["sensor_stale_seconds"])
    for device in devices:
        if device.type is DeviceType.WEBCAM and not webcam_online:
            found.conditions.append(
                Condition(
                    code=AlertCode.DEVICE_OFFLINE,
                    key=(AlertCode.DEVICE_OFFLINE, device.id),
                    severity=Severity.CRITICAL,
                    params={"device_type": device.type.value},
                    device_id=device.id,
                )
            )
        elif (
            device.type is DeviceType.SENSOR_NODE
            and device.last_seen_at is not None
            and now - device.last_seen_at > limit
        ):
            found.conditions.append(
                Condition(
                    code=AlertCode.SENSOR_STALE,
                    key=(AlertCode.SENSOR_STALE, device.id),
                    severity=Severity.WARNING,
                    params={"stale_seconds": settings["sensor_stale_seconds"]},
                    device_id=device.id,
                )
            )


def sync_alerts(throttle: bool = False) -> None:
    """Open an alert for each new condition and close the alerts whose condition cleared.

    With `throttle`, a call that comes less than `SYNC_EVERY` seconds after the last one does
    nothing: the sensor endpoint uses this, as it is called every few seconds."""
    global _last_sync
    with _lock:
        if throttle and time.monotonic() - _last_sync < SYNC_EVERY:
            return
        _last_sync = time.monotonic()

        settings = get_settings()
        found = Found()
        _sensor_conditions(settings, found)
        _plant_conditions(found)
        _device_conditions(settings, found)

        now = utcnow()
        open_alerts = {
            _alert_key(alert): alert
            for alert in db.session.scalars(db.select(Alert).where(Alert.resolved_at.is_(None)))
        }
        for condition in found.conditions:
            alert = open_alerts.pop(condition.key, None)
            if alert is None:
                db.session.add(
                    Alert(
                        code=condition.code,
                        severity=condition.severity,
                        params=condition.params,
                        plant_id=condition.plant_id,
                        device_id=condition.device_id,
                        created_at=now,
                    )
                )
            elif alert.code is AlertCode.SENSOR_OUT_OF_RANGE and (
                (alert.params or {}).get("side") != condition.params["side"]
            ):
                alert.params = condition.params  # from too low to too high without a pause
        for alert in open_alerts.values():
            if alert.code not in found.unknown:
                alert.resolved_at = now
        db.session.commit()


def _out(alert: Alert, position: int | None, device_code: str | None) -> AlertOut:
    return AlertOut(
        id=alert.id,
        code=alert.code.value,
        severity=alert.severity.value,
        params=alert.params,
        plant_position=position,
        device_code=device_code,
        created_at=alert.created_at,
        resolved_at=alert.resolved_at,
        acknowledged_by=alert.acknowledged_by,
        acknowledged_at=alert.acknowledged_at,
    )


def _conditions(query: AlertsQuery) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if query.state == "open":
        conditions.append(Alert.resolved_at.is_(None))
    elif query.state == "resolved":
        conditions.append(Alert.resolved_at.is_not(None))
    if query.severity is not None:
        conditions.append(Alert.severity == Severity(query.severity))
    if query.from_ is not None:
        conditions.append(Alert.created_at >= to_naive_utc(query.from_))
    if query.to is not None:
        conditions.append(Alert.created_at <= to_naive_utc(query.to))
    return conditions


def _select() -> Select:
    return (
        db.select(Alert, Plant.position, Device.code)
        .outerjoin(Plant, Plant.id == Alert.plant_id)
        .outerjoin(Device, Device.id == Alert.device_id)
    )


def get_alerts(query: AlertsQuery) -> AlertsOut:
    """Alerts, newest first, after a fresh look at the conditions so open ones are current."""
    sync_alerts()
    conditions = _conditions(query)
    total = db.session.scalar(db.select(db.func.count(Alert.id)).where(*conditions)) or 0
    rows = db.session.execute(
        _select()
        .where(*conditions)
        .order_by(Alert.created_at.desc(), Alert.id.desc())
        .limit(query.page_size)
        .offset((query.page - 1) * query.page_size)
    ).all()
    return AlertsOut(
        items=[_out(*row) for row in rows],
        page=query.page,
        page_size=query.page_size,
        total=total,
    )


def acknowledge(alert_id: int, user: User) -> AlertOut:
    """Mark an alert as seen. The first person to do so stays on record."""
    row = db.session.execute(_select().where(Alert.id == alert_id)).first()
    if row is None:
        raise ApiError(404, "not_found", "Alert not found")
    alert = row[0]
    if alert.acknowledged_at is None:
        alert.acknowledged_by = user.id
        alert.acknowledged_at = utcnow()
        db.session.commit()
    return _out(*row)
