"""Plant hole: six fixed rows holding the current status of each position."""

from datetime import datetime

from sqlalchemy import ForeignKey, SmallInteger
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.enums import PlantClass, db_enum
from app.models.types import BigIntId, UtcDateTime, utcnow

# TINYINT UNSIGNED on MySQL, SMALLINT elsewhere.
TinyUInt = SmallInteger().with_variant(mysql.TINYINT(unsigned=True), "mysql")


class Plant(db.Model):
    __tablename__ = "plants"

    id: Mapped[int] = mapped_column(BigIntId, primary_key=True, autoincrement=True)
    position: Mapped[int] = mapped_column(TinyUInt, unique=True)  # 1 to 6
    current_class: Mapped[PlantClass | None] = mapped_column(db_enum(PlantClass, "plant_class"))
    current_since: Mapped[datetime | None] = mapped_column(UtcDateTime)
    # plants <-> observations reference each other, so this foreign key is
    # created after both tables exist (use_alter).
    last_observation_id: Mapped[int | None] = mapped_column(
        BigIntId,
        ForeignKey(
            "observations.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_plants_last_observation",
        ),
    )
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utcnow, onupdate=utcnow)

    def __repr__(self) -> str:
        return f"<Plant L{self.position}>"
