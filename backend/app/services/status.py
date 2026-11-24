"""The three status chips of the page header (docs/API.md section 3)."""

from datetime import timedelta

from app.extensions import db
from app.models import Device, DeviceType
from app.models.types import utcnow
from app.schemas.camera import ServiceStatus
from app.services import camera as camera_service
from app.services.settings import get_settings


def _sensor_online() -> bool:
    limit = utcnow() - timedelta(seconds=get_settings()["sensor_stale_seconds"])
    device = db.session.scalar(
        db.select(Device)
        .filter(Device.type == DeviceType.SENSOR_NODE, Device.is_active.is_(True))
        .filter(Device.last_seen_at >= limit)
        .limit(1)
    )
    return device is not None


def get_service_status() -> ServiceStatus:
    return ServiceStatus(
        webcam=camera_service.is_online(),
        sensor=_sensor_online(),
        advisor=False,  # no advisor yet: rules are not built either
        checked_at=utcnow(),
    )
