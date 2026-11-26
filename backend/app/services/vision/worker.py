"""The vision worker loop: keeps the latest webcam frame in `storage/frames/`.

Runs as its own process (`backend/run_worker.py`) because only one program can open the webcam
(docs/Architecture.md section 3). The Webcam device on the Devices page switches it: while it is
off, the camera is released and no frames are written, so the webcam chip turns offline.
"""

import logging
import time
from collections.abc import Callable
from typing import Protocol

import cv2
import numpy as np
from sqlalchemy.exc import SQLAlchemyError

from app.errors import ApiError
from app.extensions import db
from app.models import Device, DeviceType
from app.models.types import utcnow
from app.services import settings as settings_service
from app.services.settings_defaults import DEFAULT_SETTINGS
from app.services.vision.analyzer import Analyzer
from app.services.vision.frame_store import FrameStore
from app.services.vision.result_store import ResultStore

log = logging.getLogger("nutrify.worker")

REPORT_FPS_EVERY = 5.0  # seconds between the frame rate lines in the log
JPEG_QUALITY = 80
NO_DEVICE = "No webcam device yet: add one on the Devices page"
CHECK_DEVICE_EVERY = 2.0  # seconds between reads of the Devices page switch
RETRY_OPEN_EVERY = 3.0
MAX_FAILED_READS = 30  # about two seconds of silence: treat the camera as unplugged


class FrameSource(Protocol):
    @property
    def is_open(self) -> bool: ...
    def open(self) -> bool: ...
    def read(self) -> np.ndarray | None: ...
    def release(self) -> None: ...


class VisionWorker:
    def __init__(
        self,
        source: FrameSource,
        store: FrameStore,
        results: ResultStore | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._source = source
        self._store = store
        self._results = results  # None: only keep the latest frame, do not analyse it
        self._analyzer = Analyzer()
        self._settings: dict = dict(DEFAULT_SETTINGS)
        self._next_analysis = 0.0
        self._clock = clock
        self._active = False
        self._next_check = 0.0
        self._failed_reads = 0
        self._wrote_frame = False
        self._counted_frames = 0
        self._counting_since = clock()
        self._spent = {"read": 0.0, "encode": 0.0, "write": 0.0}  # seconds since the last report
        self._last_warning: str | None = None  # a problem is logged once, not every few seconds

    def tick(self) -> float:
        """Do one step of work. Returns how many seconds to wait before the next one."""
        if self._clock() >= self._next_check:
            self._check_device()
            self._next_check = self._clock() + CHECK_DEVICE_EVERY

        if not self._active:
            self._release("The webcam is switched off on the Devices page")
            return CHECK_DEVICE_EVERY / 2
        if not self._source.is_open:
            return self._open()
        return self._grab()

    def close(self) -> None:
        self._release("Worker stopped")

    def _check_device(self) -> None:
        """Read the switch of the webcam device, note that it is alive, and reload the settings
        (the analysis interval, the stabiliser and the six regions can change while running)."""
        try:
            db.session.remove()  # a fresh transaction, so a change made by the API is seen
            device = db.session.scalar(
                db.select(Device).filter_by(type=DeviceType.WEBCAM).order_by(Device.id)
            )
            self._active = device is not None and device.is_active
            if device is not None and self._active and self._wrote_frame:
                device.last_seen_at = utcnow()
                self._wrote_frame = False
            db.session.commit()
            self._settings = settings_service.get_settings()
        except SQLAlchemyError:
            db.session.rollback()
            log.exception("Cannot reach the database; keeping the last known switch state")
            return

        if device is None:
            self._warn_once(NO_DEVICE)
        elif self._last_warning == NO_DEVICE:
            self._last_warning = None

    def _open(self) -> float:
        if self._source.open():
            self._failed_reads = 0
            self._last_warning = None
            self._restart_count()
            log.info("Webcam opened")
            return 0.0
        self._warn_once("Cannot open the webcam: check the cable and close other apps using it")
        return RETRY_OPEN_EVERY

    def _warn_once(self, message: str) -> None:
        if message != self._last_warning:
            self._last_warning = message
            log.warning(message)

    def _grab(self) -> float:
        """Read, encode and store one frame. The camera paces the loop: a read waits for it."""
        read_at = self._clock()
        frame = self._source.read()
        if frame is None:
            self._failed_reads += 1
            if self._failed_reads >= MAX_FAILED_READS:
                self._release("The webcam stopped answering")
            return 0.05

        self._failed_reads = 0
        encode_at = self._clock()
        ok, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        write_at = self._clock()
        if ok and self._store.write(jpeg.tobytes()):
            self._wrote_frame = True
            done_at = self._clock()
            self._spent["read"] += encode_at - read_at
            self._spent["encode"] += write_at - encode_at
            self._spent["write"] += done_at - write_at
            self._count_frame()
        if self._results is not None and self._clock() >= self._next_analysis:
            self._analyze(frame, self._results)
        return 0.0

    def _analyze(self, frame: np.ndarray, results: ResultStore) -> None:
        """Classify the six regions of this frame and hand the result to the API."""
        self._next_analysis = self._clock() + self._settings["analysis_interval_seconds"]
        try:
            analysis = self._analyzer.run(frame, self._settings)
        except ApiError as error:  # no trained model yet: the live view stays without labels
            self._warn_once(f"Cannot analyse: {error.message}")
            return
        results.write(analysis)

    def _restart_count(self) -> None:
        self._counted_frames = 0
        self._counting_since = self._clock()
        self._spent = dict.fromkeys(self._spent, 0.0)

    def _count_frame(self) -> None:
        """Log the real frame rate now and then: the frames that reach the web."""
        self._counted_frames += 1
        elapsed = self._clock() - self._counting_since
        if elapsed >= REPORT_FPS_EVERY:
            frames = self._counted_frames
            log.info(
                "Webcam: %.1f frames per second (per frame: read %.0f ms, encode %.0f ms, "
                "write %.0f ms)",
                frames / elapsed,
                1000 * self._spent["read"] / frames,
                1000 * self._spent["encode"] / frames,
                1000 * self._spent["write"] / frames,
            )
            self._restart_count()

    def _release(self, reason: str) -> None:
        if self._source.is_open:
            self._source.release()
            log.info("%s: camera released", reason)
