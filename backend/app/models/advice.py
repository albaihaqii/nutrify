"""Advice shown to users, produced by the LLM advisor or by the fallback rules."""

from datetime import datetime

from sqlalchemy import JSON, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.enums import (
    AdviceSource,
    AdviceTrigger,
    PlantClass,
    Severity,
    db_enum,
)
from app.models.types import BigIntId, UtcDateTime, utcnow


class Advice(db.Model):
    __tablename__ = "advice"
    __table_args__ = (
        Index("ix_advice_created_at", "created_at"),
        Index("ix_advice_plant_created", "plant_id", "created_at"),
        Index("ix_advice_cache_key", "cache_key"),
    )

    id: Mapped[int] = mapped_column(BigIntId, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utcnow)
    trigger: Mapped[AdviceTrigger] = mapped_column(db_enum(AdviceTrigger, "advice_trigger"))
    plant_id: Mapped[int | None] = mapped_column(
        BigIntId, ForeignKey("plants.id", ondelete="SET NULL")
    )
    observation_id: Mapped[int | None] = mapped_column(
        BigIntId, ForeignKey("observations.id", ondelete="SET NULL")
    )
    plant_class: Mapped[PlantClass | None] = mapped_column(db_enum(PlantClass, "plant_class"))
    severity: Mapped[Severity] = mapped_column(db_enum(Severity, "severity"))
    summary: Mapped[str] = mapped_column(Text)
    likely_causes: Mapped[list] = mapped_column(JSON)  # list of strings
    suggested_actions: Mapped[list] = mapped_column(JSON)  # list of strings
    source: Mapped[AdviceSource] = mapped_column(db_enum(AdviceSource, "advice_source"))
    provider: Mapped[str | None] = mapped_column(String(50))
    model_name: Mapped[str | None] = mapped_column(String(100))
    context: Mapped[dict] = mapped_column(JSON)  # facts that were sent to the advisor
    cache_key: Mapped[str | None] = mapped_column(String(128))

    def __repr__(self) -> str:
        return f"<Advice {self.id} {self.source.value} {self.severity.value}>"
