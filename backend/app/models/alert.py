"""Alerts store a code and parameters; the UI builds the Indonesian message."""

from datetime import datetime

from sqlalchemy import JSON, Boolean, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.enums import AlertCode, Severity, db_enum
from app.models.types import BigIntId, UtcDateTime, utcnow


class Alert(db.Model):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alerts_created_at", "created_at"),
        Index("ix_alerts_resolved_at", "resolved_at"),
    )

    id: Mapped[int] = mapped_column(BigIntId, primary_key=True, autoincrement=True)
    code: Mapped[AlertCode] = mapped_column(db_enum(AlertCode, "alert_code"))
    severity: Mapped[Severity] = mapped_column(db_enum(Severity, "severity"))
    params: Mapped[dict | None] = mapped_column(JSON)
    plant_id: Mapped[int | None] = mapped_column(
        BigIntId, ForeignKey("plants.id", ondelete="SET NULL")
    )
    device_id: Mapped[int | None] = mapped_column(
        BigIntId, ForeignKey("devices.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(UtcDateTime)
    acknowledged_by: Mapped[int | None] = mapped_column(
        BigIntId, ForeignKey("users.id", ondelete="SET NULL")
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(UtcDateTime)
    notified: Mapped[bool] = mapped_column(Boolean, default=False)

    def __repr__(self) -> str:
        return f"<Alert {self.id} {self.code.value}>"
