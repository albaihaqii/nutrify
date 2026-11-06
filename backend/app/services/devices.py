"""Device management: listing, creating, updating, and rotating API keys."""

from datetime import datetime
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.errors import ApiError
from app.extensions import db
from app.models import Device, DeviceType
from app.models.types import utcnow
from app.schemas.devices import DeviceOut, DeviceStatus
from app.services.security import generate_api_key, hash_api_key
from app.services.settings import get_settings


def device_status(device: Device, stale_seconds: int, now: datetime) -> DeviceStatus:
    """online when seen within stale_seconds, offline when older, never_seen when never."""
    if device.last_seen_at is None:
        return "never_seen"
    age = (now - device.last_seen_at).total_seconds()
    return "online" if age <= stale_seconds else "offline"


def to_out(device: Device, stale_seconds: int, now: datetime) -> DeviceOut:
    return DeviceOut(
        id=device.id,
        code=device.code,
        name=device.name,
        type=device.type,
        firmware_version=device.firmware_version,
        last_seen_at=device.last_seen_at,
        is_active=device.is_active,
        status=device_status(device, stale_seconds, now),
    )


def get_device(device_id: int) -> Device:
    device = db.session.get(Device, device_id)
    if device is None:
        raise ApiError(404, "not_found", "Device not found")
    return device


def list_devices() -> list[DeviceOut]:
    stale_seconds = get_settings()["sensor_stale_seconds"]
    now = utcnow()
    devices = db.session.scalars(db.select(Device).order_by(Device.id))
    return [to_out(device, stale_seconds, now) for device in devices]


def get_device_out(device_id: int) -> DeviceOut:
    device = get_device(device_id)
    return to_out(device, get_settings()["sensor_stale_seconds"], utcnow())


def _duplicate_code_error() -> ApiError:
    return ApiError(409, "conflict", "A device with this code already exists", {"field": "code"})


def create_device(code: str, name: str, device_type: DeviceType) -> tuple[Device, str | None]:
    """Create a device. Only sensor nodes get an API key (returned once, stored hashed)."""
    if db.session.scalar(db.select(Device).filter_by(code=code)):
        raise _duplicate_code_error()

    api_key = generate_api_key() if device_type == DeviceType.SENSOR_NODE else None
    device = Device(
        code=code,
        name=name,
        type=device_type,
        api_key_hash=hash_api_key(api_key) if api_key else None,
    )
    db.session.add(device)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise _duplicate_code_error() from None
    return device, api_key


def update_device(device_id: int, changes: dict[str, Any]) -> Device:
    device = get_device(device_id)
    for field, value in changes.items():
        setattr(device, field, value)
    db.session.commit()
    return device


def rotate_key(device_id: int) -> tuple[Device, str]:
    """Replace the device key. The old key stops working immediately."""
    device = get_device(device_id)
    if device.type != DeviceType.SENSOR_NODE:
        raise ApiError(422, "validation_error", "This device does not use an API key")
    api_key = generate_api_key()
    device.api_key_hash = hash_api_key(api_key)
    db.session.commit()
    return device, api_key