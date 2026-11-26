"""The latest analysis of the six plants, handed from the vision worker to the API.

Same idea as `frame_store.py`: the worker writes `storage/frames/analysis.json`, replacing the
file atomically, and the API only reads it.
"""

import os
import time
from pathlib import Path

from pydantic import ValidationError

from app.schemas.camera import CameraAnalysis

RESULT_FILE = "analysis.json"


class ResultStore:
    def __init__(self, directory: Path) -> None:
        self._latest = directory / RESULT_FILE
        self._temporary = directory / f"{RESULT_FILE}.tmp"
        directory.mkdir(parents=True, exist_ok=True)

    def write(self, analysis: CameraAnalysis) -> bool:
        """Replace the latest analysis. False when the file is busy: the next one replaces it."""
        self._temporary.write_text(analysis.model_dump_json(), encoding="utf-8")
        try:
            os.replace(self._temporary, self._latest)
        except PermissionError:  # Windows: a reader has the file open at this moment
            return False
        return True

    def read(self) -> tuple[CameraAnalysis, float] | None:
        """The latest analysis and its age in seconds; None when there is none to read."""
        try:
            modified_ns = self._latest.stat().st_mtime_ns
            analysis = CameraAnalysis.model_validate_json(self._latest.read_text(encoding="utf-8"))
        except (OSError, ValidationError):
            return None
        return analysis, (time.time_ns() - modified_ns) / 1e9
