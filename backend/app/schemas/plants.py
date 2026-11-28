"""Schemas for the plant, observation and dashboard endpoints (docs/API.md sections 6 and 7)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UtcDatetime

# The status of a hole in the words of GET /camera/analysis.
PlantStatusCode = Literal["normal", "n_deficiency", "fe_deficiency", "needs_check", "no_plant"]
PlantClassCode = Literal["normal", "n_deficiency", "fe_deficiency"]
QcStatusCode = Literal["ok", "invalid_leaf", "no_plant", "stale_sensor", "needs_check"]


class LastObservation(BaseModel):
    id: int
    observed_at: UtcDatetime
    confidence: float | None
    qc_status: QcStatusCode


class PlantOut(BaseModel):
    position: int
    status: PlantStatusCode | None
    current_class: PlantClassCode | None
    current_since: UtcDatetime | None
    last_observation: LastObservation | None


class PlantsOut(BaseModel):
    items: list[PlantOut]


class ObservationFeatures(BaseModel):
    mean_r: float | None
    mean_g: float | None
    mean_b: float | None
    leaf_area_ratio: float
    ph: float | None
    ec: float | None
    temperature: float | None


class ObservationOut(BaseModel):
    id: int
    plant_position: int
    observed_at: UtcDatetime
    status: PlantStatusCode
    features: ObservationFeatures
    predicted_class: PlantClassCode | None
    stable_class: PlantClassCode | None
    confidence: float | None
    rule_path: list[dict] | None
    qc_status: QcStatusCode
    model_version: str | None
    label_class: PlantClassCode | None
    has_image: bool


class ObservationFilters(BaseModel):
    """Filters shared by the observation list and its export. Unknown parameters are ignored."""

    model_config = ConfigDict(extra="ignore")

    plant: int | None = Field(default=None, ge=1, le=6)
    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None
    status: PlantStatusCode | None = None


class ObservationsQuery(ObservationFilters):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class ObservationsOut(BaseModel):
    items: list[ObservationOut]
    page: int
    page_size: int
    total: int


class ExportRow(BaseModel):
    observed_at: UtcDatetime
    plant_position: int
    status: PlantStatusCode
    confidence: float | None
    ph: float | None
    ec: float | None
    temperature: float | None


class ObservationsExport(BaseModel):
    items: list[ExportRow]


class StatusChange(BaseModel):
    """One stretch of time in which a hole kept the same status."""

    since: UtcDatetime
    status: PlantStatusCode
    confidence: float | None


class PlantDetailOut(BaseModel):
    position: int
    status: PlantStatusCode
    current_class: PlantClassCode | None
    current_since: UtcDatetime | None
    latest_observation: ObservationOut
    status_history: list[StatusChange]


class DailyConditionsQuery(BaseModel):
    """Query string of GET /dashboard/daily-conditions: `days` days of 24 hours from `from`."""

    from_: datetime = Field(alias="from")
    days: int = Field(default=7, ge=1, le=31)


class DailyCondition(BaseModel):
    """Holes per status at the end of one day; holes with no result that day are not counted."""

    start: UtcDatetime
    normal: int
    n_deficiency: int
    fe_deficiency: int
    needs_check: int


class DailyConditionsOut(BaseModel):
    items: list[DailyCondition]
