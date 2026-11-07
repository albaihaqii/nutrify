"""Enumerations shared by models. Values are the lowercase English codes in Schema.md."""

import enum

from sqlalchemy import Enum


class PlantClass(str, enum.Enum):
    NORMAL = "normal"
    N_DEFICIENCY = "n_deficiency"
    FE_DEFICIENCY = "fe_deficiency"


class QcStatus(str, enum.Enum):
    OK = "ok"
    INVALID_LEAF = "invalid_leaf"
    STALE_SENSOR = "stale_sensor"
    NEEDS_CHECK = "needs_check"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    VIEWER = "viewer"


class DeviceType(str, enum.Enum):
    SENSOR_NODE = "sensor_node"
    WEBCAM = "webcam"


class Severity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AdviceSource(str, enum.Enum):
    LLM = "llm"
    RULES = "rules"


class AdviceTrigger(str, enum.Enum):
    PLANT_STATUS = "plant_status"
    SENSOR_RANGE = "sensor_range"


class AlertCode(str, enum.Enum):
    SENSOR_OUT_OF_RANGE = "sensor_out_of_range"
    PLANT_DEFICIENCY = "plant_deficiency"
    DEVICE_OFFLINE = "device_offline"
    SENSOR_STALE = "sensor_stale"


def db_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    """Database column type that stores the enum *values* (lowercase codes)."""
    return Enum(
        enum_cls,
        name=name,
        values_callable=lambda members: [m.value for m in members],
        validate_strings=True,
    )
