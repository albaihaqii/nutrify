"""The latest webcam frame, handed from the vision worker to the API through `storage/frames/`.

The worker is the only writer and the API is only a reader, so a plain file is enough. The
file is replaced atomically, so a reader never sees half an image.
"""

import os
import time
from dataclasses import dataclass
from pathlib import Path

LATEST_FILE = "latest.jpg"


@dataclass(frozen=True)
class Frame:
    jpeg: bytes
    modified_ns: int

    @property
    def age_seconds(self) -> float:
        return (time.time_ns() - self.modified_ns) / 1e9


class FrameStore:
    def __init__(self, directory: Path) -> None:
        self._latest = directory / LATEST_FILE
        self._temporary = directory / f"{LATEST_FILE}.tmp"
        directory.mkdir(parents=True, exist_ok=True)

    def write(self, jpeg: bytes) -> bool:
        """Replace the latest frame. False when the file is busy: skip this frame."""
        self._temporary.write_bytes(jpeg)
        try:
            os.replace(self._temporary, self._latest)
        except PermissionError:  # Windows: a reader has the file open at this moment
            return False
        return True

    def read(self) -> Frame | None:
        try:
            modified_ns = self._latest.stat().st_mtime_ns
            return Frame(self._latest.read_bytes(), modified_ns)
        except OSError:
            return None

    def age_seconds(self) -> float | None:
        """Age of the latest frame without reading it; None when there is none."""
        try:
            modified_ns = self._latest.stat().st_mtime_ns
        except OSError:
            return None
        return (time.time_ns() - modified_ns) / 1e9
