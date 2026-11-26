"""Cut the six plant regions out of a frame (docs/ML.md section 3, step 0)."""

from typing import Any

import numpy as np


def crop(frame: np.ndarray, region: dict[str, Any]) -> np.ndarray:
    """The part of the frame inside a region given as fractions of the frame size."""
    height, width = frame.shape[:2]
    left = min(round(region["x"] * width), width - 1)
    top = min(round(region["y"] * height), height - 1)
    right = max(round((region["x"] + region["w"]) * width), left + 1)
    bottom = max(round((region["y"] + region["h"]) * height), top + 1)
    return frame[top:bottom, left:right]
