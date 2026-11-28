"""Schemas for the dataset endpoints (docs/API.md section 8)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DatasetSummaryOut(BaseModel):
    total_observations: int
    labeled: int
    usable: int
    by_class: dict[str, int]
    by_qc_status: dict[str, int]


class ExportQuery(BaseModel):
    """Window of the CSV export. Unknown parameters are ignored."""

    model_config = ConfigDict(extra="ignore")

    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None
