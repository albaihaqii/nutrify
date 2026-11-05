"""Water measurements sent by the ESP32 sensor node."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.types import BigIntId, UtcDateTime, utcnow

class SensorReading(db.Model):
    __tablename__ = "sensor_readings"
    __table_args__ = (
        Index("ix_sensor_readings_recorded_at", "recorded_at"),
        Index("ix_sensor_readings_device_recorded", "device_id", "recorded_at"),
    )

    id: Mapped[int] = mapped_column(BigIntId, primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(
        BigIntId, ForeignKey("devices.id", ondelete="RESTRICT")
    )
    ph: Mapped[Decimal] = mapped_column(Numeric(4, 2))
    ec: Mapped[Decimal] = mapped_column(Numeric(5, 3))  # mS/cm
    tds_ppm: Mapped[int] = mapped_column(Integer)  # derived: round(ec x 500)
    temperature: Mapped[Decimal] = mapped_column(Numeric(4, 1))  # Celsius
    recorded_at: Mapped[datetime] = mapped_column(UtcDateTime)
    received_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utcnow)

    def __repr__(self) -> str:
        return f"<SensorReading {self.id} pH={self.ph} EC={self.ec}>"