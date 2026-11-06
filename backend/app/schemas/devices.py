"""Schemas for the device endpoints (docs/API.md section 13)."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator

from app.models import DeviceType
from app.schemas.common import UtcDatetime

# Lowercase letters, digits, and hyphens; 3 to 50 characters; no hyphen at either end.
DEVICE_CODE_PATTERN = r"^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$"

DeviceStatus = Literal["online", "offline", "never_seen"]


class DeviceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(pattern=DEVICE_CODE_PATTERN)
    name: str = Field(min_length=1, max_length=100)
    type: DeviceType


class DeviceUpdate(BaseModel):
    """Partial update: only the fields that are sent are changed."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: StrictBool | None = None

    @field_validator("name", "is_active")
    @classmethod
    def not_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("must not be null")
        return value


class DeviceOut(BaseModel):
    id: int
    code: str
    name: str
    type: DeviceType
    firmware_version: str | None
    last_seen_at: UtcDatetime | None
    is_active: bool
    status: DeviceStatus


class DeviceKeyOut(BaseModel):
    """Returned when a key is created or rotated. The key is shown only this once."""

    id: int
    code: str
    api_key: str | None