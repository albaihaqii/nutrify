"""Suggested actions of a fallback rule that an admin has edited."""

from datetime import datetime

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.types import BigIntId, UtcDateTime, utcnow


class AdviceRule(db.Model):
    __tablename__ = "advice_rules"

    code: Mapped[str] = mapped_column(String(50), primary_key=True)
    suggested_actions: Mapped[list] = mapped_column(JSON)  # list of strings
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utcnow, onupdate=utcnow)
    updated_by: Mapped[int | None] = mapped_column(
        BigIntId, ForeignKey("users.id", ondelete="SET NULL")
    )

    def __repr__(self) -> str:
        return f"<AdviceRule {self.code}>"
