"""Schemas for the alert endpoints (docs/API.md section 12)."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.advice import SeverityCode
from app.schemas.common import UtcDatetime

StateCode = Literal["open", "resolved", "all"]
AlertCodeValue = Literal[
    "sensor_out_of_range", "plant_deficiency", "device_offline", "sensor_stale"
]


class AlertsQuery(BaseModel):
    """Query string of GET /alerts. Unknown parameters are ignored."""

    model_config = ConfigDict(extra="ignore")

    state: StateCode = "open"
    severity: SeverityCode | None = None
    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class AlertOut(BaseModel):
    id: int
    code: AlertCodeValue
    severity: SeverityCode
    params: dict[str, Any] | None
    plant_position: int | None
    device_code: str | None
    created_at: UtcDatetime
    resolved_at: UtcDatetime | None
    acknowledged_by: int | None
    acknowledged_at: UtcDatetime | None


class AlertsOut(BaseModel):
    items: list[AlertOut]
    page: int
    page_size: int
    total: int
