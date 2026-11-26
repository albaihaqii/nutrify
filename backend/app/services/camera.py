"""Camera status, snapshot and live stream, from the frames the vision worker writes.

See docs/API.md section 9.
"""

import time
from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from flask import current_app

from app.errors import ApiError
from app.extensions import db
from app.models import Device, DeviceType
from app.schemas.camera import CameraAnalysis, CameraResolution, CameraStatus
from app.services import settings as settings_service
from app.services.vision.frame_store import Frame, FrameStore
from app.services.vision.result_store import ResultStore

FRAME_STALE_SECONDS = 10  # a frame older than this means the camera is offline
ANALYSIS_STALE_INTERVALS = 3  # an analysis older than this many intervals is not shown
STREAM_POLL_SECONDS = 0.01  # well under one frame at 30 per second
BOUNDARY = "frame"


def frame_store() -> FrameStore:
    return FrameStore(Path(current_app.config["STORAGE_DIR"]) / "frames")


def result_store() -> ResultStore:
    return ResultStore(Path(current_app.config["STORAGE_DIR"]) / "frames")


def is_online() -> bool:
    """True when the webcam device is switched on and its latest frame is recent."""
    age = frame_store().age_seconds()
    if age is None or age > FRAME_STALE_SECONDS:
        return False
    device = db.session.scalar(
        db.select(Device).filter_by(type=DeviceType.WEBCAM, is_active=True).limit(1)
    )
    return device is not None


def _resolution(frame: Frame) -> CameraResolution | None:
    image = cv2.imdecode(np.frombuffer(frame.jpeg, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return None
    height, width = image.shape[:2]
    return CameraResolution(width=width, height=height)


def get_status() -> CameraStatus:
    frame = frame_store().read()
    if frame is None:
        return CameraStatus(
            status="offline", last_frame_at=None, frame_age_seconds=None, resolution=None
        )

    online = is_online()
    taken_at = datetime.fromtimestamp(frame.modified_ns / 1e9, tz=timezone.utc)
    return CameraStatus(
        status="online" if online else "offline",
        last_frame_at=taken_at.replace(tzinfo=None),
        frame_age_seconds=round(frame.age_seconds, 1),
        resolution=_resolution(frame) if online else None,
    )


def get_analysis() -> CameraAnalysis:
    """The latest analysis of the six plants; no plants when the camera is off or the worker has
    stopped analysing."""
    stored = result_store().read()
    if stored is not None and is_online():
        analysis, age = stored
        interval = settings_service.get_settings()["analysis_interval_seconds"]
        if age <= max(FRAME_STALE_SECONDS, ANALYSIS_STALE_INTERVALS * interval):
            return analysis
    return CameraAnalysis(analyzed_at=None, model_version=None, consensus=False, plants=[])


def _fresh_frame() -> Frame:
    frame = frame_store().read()
    if frame is None or frame.age_seconds > FRAME_STALE_SECONDS:
        raise ApiError(503, "service_unavailable", "No camera frame is available")
    return frame


def snapshot() -> bytes:
    return _fresh_frame().jpeg


def stream() -> Iterator[bytes]:
    """MJPEG parts: a new part for every new frame, ending when the frames stop coming."""
    _fresh_frame()  # fail with 503 before the response starts
    return mjpeg_parts(frame_store())


def mjpeg_parts(store: FrameStore) -> Iterator[bytes]:
    sent_ns = 0
    last_read = time.monotonic()
    while time.monotonic() - last_read <= FRAME_STALE_SECONDS:
        # None for a moment while the worker replaces the file (Windows refuses a read then):
        # try again instead of ending the stream, which would freeze the picture in the browser.
        frame = store.read()
        if frame is not None:
            last_read = time.monotonic()
            if frame.age_seconds > FRAME_STALE_SECONDS:
                return
            if frame.modified_ns != sent_ns:
                sent_ns = frame.modified_ns
                header = (
                    f"--{BOUNDARY}\r\nContent-Type: image/jpeg\r\n"
                    f"Content-Length: {len(frame.jpeg)}\r\n\r\n"
                )
                yield header.encode() + frame.jpeg + b"\r\n"
        time.sleep(STREAM_POLL_SECONDS)
