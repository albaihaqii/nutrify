"""The vision worker loop, with a fake camera."""

from pathlib import Path

import numpy as np
import pytest
from flask import Flask

from app.errors import ApiError
from app.extensions import db
from app.models import Device, Setting
from app.services import model_registry as registry_service
from app.services.vision import worker as worker_module
from app.services.vision.frame_store import FrameStore
from app.services.vision.result_store import ResultStore
from app.services.vision.worker import VisionWorker


class FakeCamera:
    def __init__(self, can_open: bool = True) -> None:
        self.can_open = can_open
        self.opened = False
        self.frames_left = 1_000_000

    @property
    def is_open(self) -> bool:
        return self.opened

    def open(self) -> bool:
        self.opened = self.can_open
        return self.can_open

    def read(self) -> np.ndarray | None:
        if self.frames_left <= 0:
            return None
        self.frames_left -= 1
        return np.full((36, 64, 3), 200, dtype=np.uint8)

    def release(self) -> None:
        self.opened = False


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture()
def store(app: Flask) -> FrameStore:
    return FrameStore(Path(app.config["STORAGE_DIR"]) / "frames")


def switch(device_id: int, active: bool) -> None:
    """Flip the Devices page switch. The worker drops the session on each check, so look the
    device up again instead of using an object from before."""
    db.session.get(Device, device_id).is_active = active
    db.session.commit()


def make_worker(camera: FakeCamera, store: FrameStore, clock: Clock) -> VisionWorker:
    return VisionWorker(camera, store, clock=clock)


def test_it_opens_the_camera_and_writes_frames(webcam: Device, store: FrameStore) -> None:
    device_id = webcam.id
    camera, clock = FakeCamera(), Clock()
    worker = make_worker(camera, store, clock)

    worker.tick()  # opens the camera
    assert camera.opened
    worker.tick()  # writes a frame
    frame = store.read()
    assert frame is not None
    assert frame.age_seconds < 5

    clock.now = 10  # the next device check notes that the webcam is alive
    worker.tick()
    assert db.session.get(Device, device_id).last_seen_at is not None


def test_it_releases_the_camera_when_the_webcam_is_switched_off(
    webcam: Device, store: FrameStore
) -> None:
    device_id = webcam.id
    camera, clock = FakeCamera(), Clock()
    worker = make_worker(camera, store, clock)
    worker.tick()
    assert camera.opened

    switch(device_id, False)
    clock.now = 10
    worker.tick()
    assert not camera.opened

    switch(device_id, True)
    clock.now = 20
    worker.tick()
    worker.tick()
    assert camera.opened


def test_it_does_nothing_without_a_webcam_device(store: FrameStore, app: Flask) -> None:
    camera = FakeCamera()
    worker = make_worker(camera, store, Clock())
    worker.tick()
    assert not camera.opened
    assert store.read() is None


def test_it_retries_when_the_camera_cannot_be_opened(
    webcam: Device, store: FrameStore, caplog: pytest.LogCaptureFixture
) -> None:
    camera = FakeCamera(can_open=False)
    worker = make_worker(camera, store, Clock())

    assert worker.tick() == worker_module.RETRY_OPEN_EVERY
    worker.tick()
    warnings = [r for r in caplog.records if "Cannot open the webcam" in r.message]
    assert len(warnings) == 1  # logged once, not on every retry

    camera.can_open = True
    worker.tick()
    assert camera.opened


def test_it_reopens_a_camera_that_stopped_answering(webcam: Device, store: FrameStore) -> None:
    camera = FakeCamera()
    worker = make_worker(camera, store, Clock())
    worker.tick()
    camera.frames_left = 0  # unplugged

    for _ in range(worker_module.MAX_FAILED_READS):
        worker.tick()
    assert not camera.opened

    camera.frames_left = 1000  # plugged in again
    worker.tick()
    assert camera.opened


def test_it_logs_the_real_frame_rate(
    webcam: Device, store: FrameStore, caplog: pytest.LogCaptureFixture
) -> None:
    camera, clock = FakeCamera(), Clock()
    worker = make_worker(camera, store, clock)
    caplog.set_level("INFO", logger="nutrify.worker")

    worker.tick()  # opens the camera
    for _ in range(int(worker_module.REPORT_FPS_EVERY * 30) + 5):
        clock.now += 1 / 30
        worker.tick()

    lines = [r.message for r in caplog.records if "frames per second" in r.message]
    assert len(lines) == 1
    assert "30.0" in lines[0] or "29." in lines[0]


# --- analysis ------------------------------------------------------------------------------


@pytest.fixture()
def results(app: Flask) -> ResultStore:
    return ResultStore(Path(app.config["STORAGE_DIR"]) / "frames")


def analysing_worker(store: FrameStore, results: ResultStore, clock: Clock) -> VisionWorker:
    worker = VisionWorker(FakeCamera(), store, results, clock)
    worker.tick()  # opens the camera
    return worker


def test_it_analyses_the_frames_at_the_interval_of_the_settings(
    webcam: Device, store: FrameStore, results: ResultStore
) -> None:
    clock = Clock()
    worker = analysing_worker(store, results, clock)

    worker.tick()
    first = results.read()
    assert first is not None
    assert len(first[0].plants) == 6

    db.session.add(Setting(key="analysis_interval_seconds", value=30))
    db.session.commit()
    clock.now = 2  # the interval of the settings is read at the next device check
    worker.tick()
    clock.now = 2.5
    results.write(first[0].model_copy(update={"model_version": "marker"}))
    worker.tick()
    assert results.read()[0].model_version == "marker"  # not analysed again within 30 seconds

    clock.now = 40
    worker.tick()
    assert results.read()[0].model_version != "marker"


def test_it_keeps_running_when_no_model_has_been_trained(
    webcam: Device,
    store: FrameStore,
    results: ResultStore,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def no_registry() -> dict:
        raise ApiError(404, "not_found", "No model has been trained yet")

    monkeypatch.setattr(registry_service, "load_registry", no_registry)
    clock = Clock()
    worker = analysing_worker(store, results, clock)

    for _ in range(3):
        clock.now += 5
        worker.tick()

    assert store.read() is not None  # frames still flow
    assert results.read() is None
    warnings = [r for r in caplog.records if "Cannot analyse" in r.message]
    assert len(warnings) == 1
