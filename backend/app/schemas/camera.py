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


class ServiceStatus(BaseModel):
    webcam: bool
    sensor: bool
    advisor: bool
    checked_at: UtcDatetime
