"""Find the webcam and save one test frame, before the camera worker is run.

Usage: python scripts/check_camera.py [index ...]  (without an index, cameras 0 to 3 are tried)
Close every app that uses the webcam first (Windows Camera, browser tabs): only one program
can open it at a time.
"""

import sys
import tempfile
import time
from pathlib import Path

import cv2

BACKEND = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
WIDTH, HEIGHT = 1280, 720
WARM_UP_FRAMES = 15  # the first frames are dark while auto exposure settles
MEASURED_FRAMES = 60  # frames read to measure the speed of the camera itself


def _format_of(capture: cv2.VideoCapture) -> str:
    """The pixel format the camera sends: MJPG is fast, YUY2 is limited to about 10 fps at 720p."""
    code = int(capture.get(cv2.CAP_PROP_FOURCC))
    return "".join(chr((code >> (8 * position)) & 0xFF) for position in range(4))


def main() -> None:
    indexes = [int(arg) for arg in sys.argv[1:]] or range(4)
    found = False
    for index in indexes:
        capture = cv2.VideoCapture(index, BACKEND)
        capture.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
        capture.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        capture.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        frame = None
        for _ in range(WARM_UP_FRAMES):
            ok, frame = capture.read()
            if not ok:
                frame = None
                break

        speed = ""
        if frame is not None:
            started = time.perf_counter()
            for _ in range(MEASURED_FRAMES):
                capture.read()
            fps = MEASURED_FRAMES / (time.perf_counter() - started)
            speed = f", {_format_of(capture)}, {fps:.1f} fps"
        capture.release()

        if frame is None:
            print(f"camera {index}: not available")
            continue

        found = True
        path = Path(tempfile.gettempdir()) / f"nutrify-camera-{index}.jpg"
        cv2.imwrite(str(path), frame)
        height, width = frame.shape[:2]
        print(f"camera {index}: OK, {width}x{height}{speed}, test frame saved to {path}")

    if not found:
        print("No camera could be read. Check the USB cable and close other apps using it.")


if __name__ == "__main__":
    main()
