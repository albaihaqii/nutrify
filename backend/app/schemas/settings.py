"""Validation of the settings table (docs/API.md section 14)."""

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationInfo,
    field_validator,
    model_validator,
)

NUMBER_OF_PLANTS = 6
_TOLERANCE = 1e-9


class RoiRegion(BaseModel):
    """One plant hole, as fractions (0 to 1) of the frame width and height."""

    model_config = ConfigDict(strict=True, extra="forbid")

    position: int = Field(ge=1, le=NUMBER_OF_PLANTS)
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    w: float = Field(gt=0, le=1)
    h: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def inside_frame(self) -> "RoiRegion":
        if self.x + self.w > 1 + _TOLERANCE or self.y + self.h > 1 + _TOLERANCE:
            raise ValueError("region must be inside the frame")
        return self


class SettingsValues(BaseModel):
    """Every setting with its valid range. Used to validate the merged result of an update."""

    model_config = ConfigDict(strict=True, extra="forbid")

    ph_min: float = Field(ge=0, le=14)
    ph_max: float = Field(ge=0, le=14)
    ec_min: float = Field(ge=0, le=10)
    ec_max: float = Field(ge=0, le=10)
    temperature_min: float = Field(ge=-5, le=60)
    temperature_max: float = Field(ge=-5, le=60)
    analysis_interval_seconds: int = Field(ge=1, le=3600)
    observation_store_interval_seconds: int = Field(ge=1, le=86400)
    stabilizer_window: int = Field(ge=1, le=50)
    stabilizer_min_votes: int = Field(ge=1, le=50)
    sensor_stale_seconds: int = Field(ge=10, le=3600)
    consensus_enabled: bool
    roi_config: list[RoiRegion] = Field(min_length=NUMBER_OF_PLANTS, max_length=NUMBER_OF_PLANTS)

    @field_validator("ph_max", "ec_max", "temperature_max")
    @classmethod
    def max_above_min(cls, value: float, info: ValidationInfo) -> float:
        min_name = (info.field_name or "").replace("_max", "_min")
        minimum = info.data.get(min_name)
        if minimum is not None and value <= minimum:
            raise ValueError(f"must be greater than {min_name}")
        return value

    @field_validator("stabilizer_min_votes")
    @classmethod
    def votes_within_window(cls, value: int, info: ValidationInfo) -> int:
        window = info.data.get("stabilizer_window")
        if window is not None and value > window:
            raise ValueError("must not be greater than stabilizer_window")
        return value

    @field_validator("roi_config")
    @classmethod
    def positions_are_unique(cls, regions: list[RoiRegion]) -> list[RoiRegion]:
        if sorted(region.position for region in regions) != list(range(1, NUMBER_OF_PLANTS + 1)):
            raise ValueError("positions must be 1 to 6, each used exactly once")
        return regions
