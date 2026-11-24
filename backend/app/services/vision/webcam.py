"""Open the USB webcam and grab frames (docs/Hardware.md section 6.3)."""

import sys

import cv2
import numpy as np

BACKEND = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
WIDTH, HEIGHT, FPS = 1280, 720, 30
WARM_UP_FRAMES = 15  # the first frames are dark while the camera settles


class Webcam:
    def __init__(self, index: int) -> None:
        self._index = index
        self._capture: cv2.VideoCapture | None = None

    @property
    def is_open(self) -> bool:
        return self._capture is not None

    def open(self) -> bool:
        capture = cv2.VideoCapture(self._index, BACKEND)
        capture.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
        capture.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        capture.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        capture.set(cv2.CAP_PROP_FPS, FPS)

        for _ in range(WARM_UP_FRAMES):
            if not capture.read()[0]:
                capture.release()
                return False
        self._capture = capture
        return True

    def read(self) -> np.ndarray | None:
        """The next frame, or None when the camera stopped answering."""
        if self._capture is None:
            return None
        ok, frame = self._capture.read()
        return frame if ok else None

    def release(self) -> None:
        if self._capture is not None:
            self._capture.release()
            self._capture = None
