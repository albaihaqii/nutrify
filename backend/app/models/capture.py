"""Stored full-frame snapshots from the webcam."""

from datetime import datetime

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.types import BigIntId, UtcDateTime, utcnow


class Capture(db.Model):
    __tablename__ = "captures"
    __table_args__ = (Index("ix_captures_captured_at", "captured_at"),)

    id: Mapped[int] = mapped_column(BigIntId, primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(BigIntId, ForeignKey("devices.id", ondelete="RESTRICT"))
    image_path: Mapped[str] = mapped_column(String(255))  # relative to storage/snapshots/
    captured_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utcnow)

    def __repr__(self) -> str:
        return f"<Capture {self.id} {self.image_path}>"
