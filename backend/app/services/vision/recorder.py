"""Store what the worker sees, for the dashboard, the history and the dataset.

Every `observation_store_interval_seconds`, and at once when the status of a hole changes, the
frame is saved under `storage/snapshots/` and every analysed hole gets one `observations` row that
points to it, together with the sensor values of that moment (docs/Schema.md sections 4.4 to 4.6
and 6). The `plants` rows hold the current status of each hole.
"""

import logging
import time
from collections.abc import Callable
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy.exc import SQLAlchemyError

from app.errors import ApiError
from app.extensions import db
from app.models import Capture, Device, DeviceType, Observation, Plant, PlantClass, QcStatus
from app.models.types import utcnow
from app.schemas.camera import CameraAnalysis, PlantAnalysis
from app.services import sensors
from app.services.plants import status_of

log = logging.getLogger("nutrify.recorder")

CLASSES = {item.value for item in PlantClass}


def qc_status_of(plant: PlantAnalysis) -> QcStatus:
    """The quality flag of a result: `ok` for a class, `no_plant` for an empty hole, `needs_check`
    when the comparators disagree and `invalid_leaf` when the leaf area is out of the limits."""
    if plant.status in CLASSES:
        return QcStatus.OK
    if plant.status == "no_plant":
        return QcStatus.NO_PLANT
    return QcStatus.NEEDS_CHECK if plant.features is not None else QcStatus.INVALID_LEAF


class Recorder:
    def __init__(
        self,
        snapshots: Path,
        clock: Callable[[], float] = time.monotonic,
        on_changes: Callable[[list[tuple[int, int]], dict[str, Any]], object] | None = None,
    ) -> None:
        self._snapshots = snapshots
        self._on_changes = on_changes  # told which holes changed status; None: nobody is
        self._clock = clock
        self._next_store = 0.0
        self._stored: dict[int, str] = {}  # status of each hole at the last store

    def record(self, jpeg: bytes, analysis: CameraAnalysis, settings: dict[str, Any]) -> bool:
        """Store the analysis when it is due or a hole changed status. True when it was stored."""
        plants = [plant for plant in analysis.plants if plant.status is not None]
        changed = any(self._stored.get(plant.position) != plant.status for plant in plants)
        if not plants or not (changed or self._clock() >= self._next_store):
            return False

        self._next_store = self._clock() + settings["observation_store_interval_seconds"]
        try:
            if self._store(jpeg, analysis, plants, settings, track=True) is None:
                return False
        except (SQLAlchemyError, OSError):
            db.session.rollback()
            log.exception("Cannot store the observations; trying again at the next analysis")
            self._next_store = 0.0
            return False
        self._stored = {plant.position: plant.status for plant in plants}  # type: ignore[misc]
        return True

    def capture_now(
        self, jpeg: bytes, analysis: CameraAnalysis, settings: dict[str, Any]
    ) -> Capture | None:
        """Store the moment on request, for the dataset. The holes keep their current status and
        the schedule of `record` is left alone. None when there is nothing to store."""
        plants = [plant for plant in analysis.plants if plant.status is not None]
        if not plants:
            return None
        return self._store(jpeg, analysis, plants, settings, track=False)

    def _store(
        self,
        jpeg: bytes,
        analysis: CameraAnalysis,
        plants: list[PlantAnalysis],
        settings: dict[str, Any],
        *,
        track: bool,
    ) -> Capture | None:
        """Write the snapshot and the rows; `track` also makes them the latest of each hole. None
        when there is no webcam device to attach the snapshot to."""
        device = db.session.scalar(
            db.select(Device).filter_by(type=DeviceType.WEBCAM).order_by(Device.id)
        )
        if device is None:
            return None
        now = utcnow()
        capture = Capture(
            device_id=device.id,
            image_path=self._save(jpeg, now),
            captured_at=now,
            roi_config=settings["roi_config"],
        )
        db.session.add(capture)
        db.session.flush()

        sensor = self._sensor_values()
        changed: list[tuple[int, int]] = []
        for result in plants:
            hole = self._hole(result.position)
            row = self._observation(result, hole, capture, analysis.model_version, sensor, now)
            db.session.add(row)
            db.session.flush()
            if track and self._update_hole(hole, result, row, now):
                changed.append((hole.id, row.id))
        db.session.commit()
        self._tell(changed, settings)
        return capture

    def _tell(self, changed: list[tuple[int, int]], settings: dict[str, Any]) -> None:
        """Pass on the holes that changed status (hole id, observation id). The results are stored
        already: a failure here is logged and never costs a stored observation."""
        if not changed or self._on_changes is None:
            return
        try:
            self._on_changes(changed, settings)
        except Exception:
            log.exception("Cannot pass on the status changes")

    @staticmethod
    def _hole(position: int) -> Plant:
        """The `plants` row of a hole; the six rows are created when they are first needed."""
        hole = db.session.scalar(db.select(Plant).filter_by(position=position))
        if hole is None:
            hole = Plant(position=position)
            db.session.add(hole)
            db.session.flush()
        return hole

    @staticmethod
    def _update_hole(hole: Plant, result: PlantAnalysis, row: Observation, now: datetime) -> bool:
        """Make the row the latest of the hole; `current_since` moves only on a change of status.
        True when the status changed."""
        last = (
            db.session.get(Observation, hole.last_observation_id)
            if hole.last_observation_id
            else None
        )
        changed = status_of(last) != result.status
        if changed:
            hole.current_since = now
        hole.current_class = PlantClass(result.status) if result.status in CLASSES else None
        hole.last_observation_id = row.id
        return changed

    def _save(self, jpeg: bytes, taken_at: datetime) -> str:
        """Write the frame as `YYYY/MM/DD/HHMMSS_ffffff.jpg` and return that path."""
        relative = f"{taken_at:%Y/%m/%d/%H%M%S_%f}.jpg"
        path = self._snapshots / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(jpeg)
        return relative

    @staticmethod
    def _sensor_values() -> dict[str, Decimal | None]:
        """The latest sensor values, or none when they are missing or older than the limit."""
        try:
            latest = sensors.get_latest_reading()
        except ApiError:
            return {"ph": None, "ec": None, "temperature": None}
        if latest.is_stale:
            return {"ph": None, "ec": None, "temperature": None}
        return {
            "ph": Decimal(str(latest.ph.value)),
            "ec": Decimal(str(latest.ec.value)),
            "temperature": Decimal(str(latest.temperature.value)),
        }

    @staticmethod
    def _observation(
        plant: PlantAnalysis,
        hole: Plant,
        capture: Capture,
        model_version: str | None,
        sensor: dict[str, Decimal | None],
        now: datetime,
    ) -> Observation:
        features = plant.features or {}
        stable = PlantClass(plant.status) if plant.status in CLASSES else None
        return Observation(
            plant_id=hole.id,
            capture_id=capture.id,
            observed_at=now,
            mean_r=features.get("mean_r"),
            mean_g=features.get("mean_g"),
            mean_b=features.get("mean_b"),
            leaf_area_ratio=plant.leaf_area_ratio,
            predicted_class=PlantClass(plant.predicted) if plant.predicted else None,
            stable_class=stable,
            confidence=plant.confidence,
            rule_path=[step.model_dump() for step in plant.rule_path] or None,
            qc_status=qc_status_of(plant),
            model_version=model_version,
            ph=sensor["ph"],
            ec=sensor["ec"],
            temperature=sensor["temperature"],
        )
