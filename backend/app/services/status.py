"""The three status chips of the page header (docs/API.md section 3)."""

from datetime import timedelta

from flask import current_app

from app.extensions import db
from app.models import Advice, AdviceSource, Device, DeviceType
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


def _advisor_online() -> bool:
    """A language model is configured and the newest advice was not a fallback to the rules."""
    if not current_app.config.get("GEMINI_API_KEY"):
        return False
    latest = db.session.scalar(
        db.select(Advice.source).order_by(Advice.created_at.desc(), Advice.id.desc()).limit(1)
    )
    return latest is not AdviceSource.RULES


def get_service_status() -> ServiceStatus:
    return ServiceStatus(
        webcam=camera_service.is_online(),
        sensor=_sensor_online(),
        advisor=_advisor_online(),
        checked_at=utcnow(),
    )
