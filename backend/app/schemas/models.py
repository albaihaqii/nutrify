"""Schemas for the model endpoints (docs/API.md section 10)."""

from typing import Any, Literal

from pydantic import BaseModel, Field

ModelRole = Literal["primary", "comparator"]


class ModelMetrics(BaseModel):
    """Macro averages over the three classes, from 0 to 1."""

    accuracy: float
    precision: float
    recall: float
    f1: float


class ModelSummary(BaseModel):
    id: str
    version: str
    role: ModelRole
    metrics: ModelMetrics


class ModelReport(BaseModel):
    active_version: str
    trained_at: str
    test_size: int
    features: list[str]
    classes: list[str]
    models: list[ModelSummary]
    confusion: list[list[int]] | None


class ModelTree(BaseModel):
    version: str
    root: dict[str, Any]


class Comparator(BaseModel):
    model_id: str
    label: str = Field(serialization_alias="class")


class PredictionOut(BaseModel):
    label: str = Field(serialization_alias="class")
    confidence: float
    features: dict[str, float]
    mask_area_ratio: float
    comparators: list[Comparator]
