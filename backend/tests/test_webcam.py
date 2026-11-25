import numpy as np
import pytest

from app.services.vision.webcam import Webcam, orient


@pytest.fixture
def frame():
    # 2 rows x 3 columns, each pixel's three channels hold its own number
    return np.repeat(np.arange(6, dtype=np.uint8).reshape(2, 3, 1), 3, axis=2)


def test_none_keeps_the_frame(frame):
    assert np.array_equal(orient(frame, "none"), frame)


def test_horizontal_swaps_left_and_right(frame):
    assert orient(frame, "horizontal")[:, :, 0].tolist() == [[2, 1, 0], [5, 4, 3]]


def test_vertical_swaps_top_and_bottom(frame):
    assert orient(frame, "vertical")[:, :, 0].tolist() == [[3, 4, 5], [0, 1, 2]]


def test_both_rotates_half_a_turn(frame):
    assert orient(frame, "both")[:, :, 0].tolist() == [[5, 4, 3], [2, 1, 0]]


def test_unknown_flip_is_rejected():
    with pytest.raises(ValueError, match="CAMERA_FLIP"):
        Webcam(0, "sideways")
