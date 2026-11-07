"""Schemas for the sensor reading endpoints (docs/API.md section 5)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import UtcDatetime

MetricStatus = Literal["low", "in_range", "high"]
HistoryInterval = Literal["raw", "1m", "5m", "1h"]
HistoryMetric = Literal["ph", "ec", "tds_ppm", "temperature"]


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


class HistoryQuery(BaseModel):
    """Query string of GET /sensor-readings. Unknown parameters are ignored."""

    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None
    interval: HistoryInterval = "5m"
    metric: HistoryMetric | None = None


class HistoryPoint(BaseModel):
    """One chart point. Metrics that were not requested stay None and are left out of the JSON."""

    time: UtcDatetime
    ph: float | None = None
    ec: float | None = None
    tds_ppm: int | None = None
    temperature: float | None = None


class HistoryOut(BaseModel):
    interval: HistoryInterval
    items: list[HistoryPoint]