"""Schemas for the sensor reading endpoints (docs/API.md section 5)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import UtcDatetime

MetricStatus = Literal["low", "in_range", "high"]


class ReadingIn(BaseModel):
    """Body sent by the sensor node. Unknown fields are ignored on purpose, so the
    firmware can add its own fields without breaking the API."""

    ph: float = Field(ge=0, le=14)
    ec: float = Field(ge=0, le=10)  # mS/cm
    temperature: float = Field(ge=-5, le=60)  # Celsius; rejects the DS18B20 error value -127
    recorded_at: datetime | None = None
    firmware_version: str | None = Field(default=None, max_length=50)


class ReadingCreated(BaseModel):
    id: int
    tds_ppm: int
    received_at: UtcDatetime


class RangedMetric(BaseModel):
    value: float
    status: MetricStatus
    unit: str | None = None


class TdsMetric(BaseModel):
    value: int


class LatestReading(BaseModel):
    id: int
    recorded_at: UtcDatetime
    received_at: UtcDatetime
    is_stale: bool
    ph: RangedMetric
    ec: RangedMetric
    tds_ppm: TdsMetric
    temperature: RangedMetric