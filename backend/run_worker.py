"""Vision worker entry point: python backend/run_worker.py"""

import logging
import time
from pathlib import Path

from app import create_app
from app.services.vision.frame_store import FrameStore
from app.services.vision.recorder import Recorder
from app.services.vision.result_store import ResultStore
from app.services.vision.webcam import Webcam
from app.services.vision.worker import VisionWorker


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    app = create_app()
    directory = Path(app.config["STORAGE_DIR"]) / "frames"

    with app.app_context():
        worker = VisionWorker(
            Webcam(app.config["CAMERA_INDEX"], app.config["CAMERA_FLIP"]),
            FrameStore(directory),
            ResultStore(directory),
            recorder=Recorder(Path(app.config["STORAGE_DIR"]) / "snapshots"),
        )
        logging.info(
            "Vision worker started (camera %s). Press Ctrl+C to stop.", app.config["CAMERA_INDEX"]
        )
        try:
            while True:
                time.sleep(worker.tick())
        except KeyboardInterrupt:
            pass
        finally:
            worker.close()


if __name__ == "__main__":
    main()
