"""Schemas for the camera endpoints (docs/API.md section 9) and the status chips."""

from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime


class CameraResolution(BaseModel):
    width: int
    height: int


class CameraStatus(BaseModel):
    status: Literal["online", "offline"]
    last_frame_at: UtcDatetime | None
    frame_age_seconds: float | None
    resolution: CameraResolution | None


PlantStatus = Literal["normal", "n_deficiency", "fe_deficiency", "no_plant", "needs_check"]


class RuleStep(BaseModel):
    feature: str
    operator: Literal["<=", ">"]
    threshold: float


class ComparatorVote(BaseModel):
    model_id: str
    label: str


class PlantAnalysis(BaseModel):
    position: int
    status: PlantStatus | None  # after the stabiliser; null until it has enough results
    confidence: float | None
    observed: PlantStatus  # the result of this analysis alone
    predicted: str | None  # the class of the primary model, even when the comparators disagree
    leaf_area_ratio: float
    features: dict[str, float] | None
    rule_path: list[RuleStep]
    comparators: list[ComparatorVote]


class CameraAnalysis(BaseModel):
    analyzed_at: UtcDatetime | None
    model_version: str | None
    consensus: bool
    plants: list[PlantAnalysis]


class ServiceStatus(BaseModel):
    webcam: bool
    sensor: bool
    advisor: bool
    checked_at: UtcDatetime


class CaptureOut(BaseModel):
    id: int
    captured_at: UtcDatetime
    observations: int
