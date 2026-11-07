"""Database models. Import every model here so migrations can discover them."""

from app.models.advice import Advice
from app.models.alert import Alert
from app.models.capture import Capture
from app.models.device import Device
from app.models.enums import (
    AdviceSource,
    AdviceTrigger,
    AlertCode,
    DeviceType,
    PlantClass,
    QcStatus,
    Severity,
    UserRole,
)
from app.models.observation import Observation
from app.models.plant import Plant
from app.models.sensor_reading import SensorReading
from app.models.setting import Setting
from app.models.user import User

__all__ = [
    "Advice",
    "AdviceSource",
    "AdviceTrigger",
    "Alert",
    "AlertCode",
    "Capture",
    "Device",
    "DeviceType",
    "Observation",
    "Plant",
    "PlantClass",
    "QcStatus",
    "SensorReading",
    "Setting",
    "Severity",
    "User",
    "UserRole",
]
