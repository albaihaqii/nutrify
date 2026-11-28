"""Schemas for the advice endpoints (docs/API.md section 11)."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.schemas.common import UtcDatetime
from app.schemas.plants import PlantClassCode

SourceCode = Literal["llm", "rules"]
TriggerCode = Literal["plant_status", "sensor_range"]
SeverityCode = Literal["info", "warning", "critical"]

MAX_ACTIONS = 5
MAX_ACTION_LENGTH = 300


class AdviceFilters(BaseModel):
    """Filters of the advice list. Unknown parameters are ignored."""

    model_config = ConfigDict(extra="ignore")

    source: SourceCode | None = None
    plant: int | None = Field(default=None, ge=1, le=6)
    trigger: TriggerCode | None = None
    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None


class AdviceQuery(AdviceFilters):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class LatestQuery(BaseModel):
    model_config = ConfigDict(extra="ignore")

    plant: int | None = Field(default=None, ge=1, le=6)


class AdviceOut(BaseModel):
    id: int
    created_at: UtcDatetime
    trigger: TriggerCode
    plant_position: int | None
    plant_class: PlantClassCode | None
    severity: SeverityCode
    summary: str
    likely_causes: list[str]
    suggested_actions: list[str]
    source: SourceCode
    provider: str | None
    model_name: str | None


class AdvicePageOut(BaseModel):
    items: list[AdviceOut]
    page: int
    page_size: int
    total: int


class AdviceRuleOut(BaseModel):
    code: str
    suggested_actions: list[str]
    updated_at: UtcDatetime | None
    updated_by: int | None


class AdviceRulesOut(BaseModel):
    items: list[AdviceRuleOut]


Action = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_ACTION_LENGTH)
]


class RuleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    suggested_actions: list[Action] = Field(min_length=1, max_length=MAX_ACTIONS)


class GenerateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trigger: TriggerCode
    plant: int | None = Field(default=None, ge=1, le=6)

    @model_validator(mode="after")
    def plant_belongs_to_plant_status(self) -> "GenerateIn":
        if self.trigger == "plant_status" and self.plant is None:
            raise ValueError("plant: required for the trigger plant_status")
        if self.trigger == "sensor_range" and self.plant is not None:
            raise ValueError("plant: not allowed for the trigger sensor_range")
        return self