"""Device model: the ESP32 sensor node and the webcam."""

from datetime import datetime

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.enums import DeviceType, db_enum
from app.models.types import BigIntId, UtcDateTime, utcnow

class Device(db.Model):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(BigIntId, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[DeviceType] = mapped_column(db_enum(DeviceType, "device_type"))
    # Hash of the device API key. Indexed because devices are found by key.
    api_key_hash: Mapped[str | None] = mapped_column(String(255), index=True)
    firmware_version: Mapped[str | None] = mapped_column(String(50))
    last_seen_at: Mapped[datetime | None] = mapped_column(UtcDateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utcnow)

    def __repr__(self) -> str:
        return f"<Device {self.code} ({self.type.value})>"