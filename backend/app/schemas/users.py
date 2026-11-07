"""Schemas for the user management endpoints (docs/API.md section 4)."""

from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StringConstraints, field_validator

from app.models import UserRole
from app.schemas.common import UtcDatetime

# Loose email check: something@something.tld without spaces.
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

# Surrounding spaces are removed before the length check, so "   " is rejected.
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: PersonName
    email: str = Field(max_length=255, pattern=EMAIL_PATTERN)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> Any:
        return value.strip().lower() if isinstance(value, str) else value


class UserUpdate(BaseModel):
    """Partial update: only the fields that are sent are changed. The email cannot change."""

    model_config = ConfigDict(extra="forbid")

    name: PersonName | None = None
    role: UserRole | None = None
    is_active: StrictBool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("name", "role", "is_active", "password")
    @classmethod
    def not_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("must not be null")
        return value


class UserAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    last_login_at: UtcDatetime | None = None