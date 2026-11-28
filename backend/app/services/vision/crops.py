"""The picture of one hole from a stored snapshot: the plain crop and the segmentation overlay."""

from pathlib import Path
from typing import Literal

import cv2
import numpy as np
from flask import current_app

from app.errors import ApiError
from app.extensions import db
from app.models import Capture, Observation, Plant
from app.services import ml_adapter, prediction
from app.services import model_registry as registry_service
from app.services.vision import roi

View = Literal["photo", "segmentation"]
VIEWS = ("photo", "segmentation")
JPEG_QUALITY = 90


def _not_found() -> ApiError:
    return ApiError(404, "not_found", "There is no picture for this observation")


def render(observation_id: int, view: str) -> bytes:
    """JPEG of the hole of an observation, cut out of the frame that was stored with it.

    `photo` is the crop as the camera saw it; `segmentation` is the crop as the model sees it,
    with the outline and the box of the leaf drawn on it.
    """
    if view not in VIEWS:
        raise ApiError(
            422, "validation_error", f"view: must be one of {', '.join(VIEWS)}", {"field": "view"}
        )
    row = db.session.execute(
        db.select(Capture, Plant.position)
        .join(Observation, Observation.capture_id == Capture.id)
        .join(Plant, Plant.id == Observation.plant_id)
        .where(Observation.id == observation_id)
    ).one_or_none()
    if row is None:
        raise _not_found()
    capture, position = row

    path = Path(current_app.config["STORAGE_DIR"]) / "snapshots" / capture.image_path
    try:
        data = np.fromfile(path, dtype=np.uint8)
    except OSError:
        raise _not_found() from None
    frame = cv2.imdecode(data, cv2.IMREAD_COLOR)
    region = next((item for item in capture.roi_config if item["position"] == position), None)
    if frame is None or region is None:
        raise _not_found()

    picture = roi.crop(frame, region)
    if view == "segmentation":
        picture = _segmentation(picture)
    ok, jpeg = cv2.imencode(".jpg", picture, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    if not ok:
        raise _not_found()
    return jpeg.tobytes()


def _segmentation(crop: np.ndarray) -> np.ndarray:
    registry = registry_service.load_registry()
    active = registry_service.active_entry(registry)
    preprocessing = ml_adapter.preprocessing(registry_service.ml_dir())
    config = prediction.pipeline_config(preprocessing, active["preprocessing"])
    return preprocessing.process_image(crop, config, keep_steps=True).steps["overlay"]
