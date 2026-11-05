"""One analysis result per plant hole, with the exact feature vector used."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.enums import PlantClass, QcStatus, db_enum
from app.models.types import BigIntId, UtcDateTime, utcnow

class Observation(db.Model):
    __tablename__ = "observations"
    __table_args__ = (
        Index("ix_observations_plant_observed", "plant_id", "observed_at"),
        Index("ix_observations_observed_at", "observed_at"),
        Index("ix_observations_capture_id", "capture_id"),
        Index("ix_observations_label_class", "label_class"),
    )

    id: Mapped[int] = mapped_column(BigIntId, primary_key=True, autoincrement=True)
    plant_id: Mapped[int] = mapped_column(
        BigIntId, ForeignKey("plants.id", ondelete="RESTRICT")
    )
    capture_id: Mapped[int | None] = mapped_column(
        BigIntId, ForeignKey("captures.id", ondelete="SET NULL")
    )
    observed_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utcnow)

    # Image features (mean colour of leaf pixels, 0 to 255) and quality value
    mean_r: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    mean_g: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    mean_b: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    leaf_area_ratio: Mapped[Decimal] = mapped_column(Numeric(5, 4))

    # Sensor features used together with the image features
    ph: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    ec: Mapped[Decimal | None] = mapped_column(Numeric(5, 3))
    temperature: Mapped[Decimal | None] = mapped_column(Numeric(4, 1))

    # Model output
    predicted_class: Mapped[PlantClass | None] = mapped_column(
        db_enum(PlantClass, "plant_class")
    )
    stable_class: Mapped[PlantClass | None] = mapped_column(
        db_enum(PlantClass, "plant_class")
    )
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    rule_path: Mapped[list | None] = mapped_column(JSON)
    qc_status: Mapped[QcStatus] = mapped_column(
        db_enum(QcStatus, "qc_status"), default=QcStatus.OK
    )
    model_version: Mapped[str | None] = mapped_column(String(50))

    # Manual ground-truth label (used for the dataset)
    label_class: Mapped[PlantClass | None] = mapped_column(
        db_enum(PlantClass, "plant_class")
    )
    labeled_by: Mapped[int | None] = mapped_column(
        BigIntId, ForeignKey("users.id", ondelete="SET NULL")
    )
    labeled_at: Mapped[datetime | None] = mapped_column(UtcDateTime)

    def __repr__(self) -> str:
        return f"<Observation {self.id} plant={self.plant_id}>"