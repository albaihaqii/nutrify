"""Camera status, snapshot and stream, and the header status chips."""

import os
import time
from collections.abc import Callable
from pathlib import Path

import cv2
import numpy as np
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Device
from app.models.types import utcnow
from app.services import camera as camera_service
from app.services.vision.frame_store import Frame, FrameStore
from tests.helpers import error_of


def jpeg(width: int = 64, height: int = 36) -> bytes:
    ok, data = cv2.imencode(".jpg", np.full((height, width, 3), 120, dtype=np.uint8))
    assert ok
    return data.tobytes()


@pytest.fixture()
def put_frame(app: Flask) -> Callable[..., None]:
    """Store a frame that is `age` seconds old."""
    store = FrameStore(Path(app.config["STORAGE_DIR"]) / "frames")

    def put(age: float = 0, **size: int) -> None:
        assert store.write(jpeg(**size))
        moment = time.time() - age
        os.utime(Path(app.config["STORAGE_DIR"]) / "frames" / "latest.jpg", (moment, moment))

    return put


# --- status ------------------------------------------------------------------------------


def test_status_is_offline_without_a_frame(client: FlaskClient, viewer_headers: dict) -> None:
    response = client.get("/api/camera/status", headers=viewer_headers)
    assert response.status_code == 200
    assert response.get_json() == {
        "status": "offline",
        "last_frame_at": None,
        "frame_age_seconds": None,
        "resolution": None,
    }


def test_status_is_online_with_a_recent_frame(
    client: FlaskClient, viewer_headers: dict, webcam: Device, put_frame: Callable
) -> None:
    put_frame(age=1, width=1280, height=720)
    body = client.get("/api/camera/status", headers=viewer_headers).get_json()
    assert body["status"] == "online"
    assert body["resolution"] == {"width": 1280, "height": 720}
    assert 0.5 < body["frame_age_seconds"] < 3
    assert body["last_frame_at"].endswith("Z")


def test_status_is_offline_when_the_frame_is_old(
    client: FlaskClient, viewer_headers: dict, webcam: Device, put_frame: Callable
) -> None:
    put_frame(age=30)
    body = client.get("/api/camera/status", headers=viewer_headers).get_json()
    assert body["status"] == "offline"
    assert body["last_frame_at"] is not None
    assert body["resolution"] is None


def test_status_is_offline_when_the_webcam_is_switched_off(
    client: FlaskClient, viewer_headers: dict, webcam: Device, put_frame: Callable
) -> None:
    put_frame(age=1)
    webcam.is_active = False
    db.session.commit()
    assert (
        client.get("/api/camera/status", headers=viewer_headers).get_json()["status"] == "offline"
    )


def test_status_needs_a_login(client: FlaskClient) -> None:
    assert client.get("/api/camera/status").status_code == 401


# --- snapshot and stream -----------------------------------------------------------------


def test_snapshot_returns_the_latest_frame(
    client: FlaskClient, viewer_headers: dict, put_frame: Callable
) -> None:
    put_frame()
    response = client.get("/api/camera/snapshot", headers=viewer_headers)
    assert response.status_code == 200
    assert response.mimetype == "image/jpeg"
    assert response.data == jpeg()


def test_snapshot_is_unavailable_without_a_fresh_frame(
    client: FlaskClient, viewer_headers: dict, put_frame: Callable
) -> None:
    assert client.get("/api/camera/snapshot", headers=viewer_headers).status_code == 503
    put_frame(age=30)
    response = client.get("/api/camera/snapshot", headers=viewer_headers)
    assert response.status_code == 503
    assert error_of(response)["code"] == "service_unavailable"


def test_images_accept_the_token_in_the_query_string(
    client: FlaskClient, viewer_headers: dict, put_frame: Callable
) -> None:
    put_frame()
    token = viewer_headers["Authorization"].removeprefix("Bearer ")
    assert client.get(f"/api/camera/snapshot?token={token}").status_code == 200
    assert client.get("/api/camera/snapshot?token=wrong").status_code == 401
    assert client.get("/api/camera/snapshot").status_code == 401


def test_other_endpoints_do_not_accept_the_query_token(
    client: FlaskClient, viewer_headers: dict
) -> None:
    token = viewer_headers["Authorization"].removeprefix("Bearer ")
    assert client.get(f"/api/camera/status?token={token}").status_code == 401


def test_stream_sends_the_frame_as_a_multipart_part(
    client: FlaskClient, viewer_headers: dict, put_frame: Callable
) -> None:
    put_frame()
    response = client.get("/api/camera/stream", headers=viewer_headers, buffered=False)
    assert response.status_code == 200
    assert response.mimetype == "multipart/x-mixed-replace"
    assert response.mimetype_params["boundary"] == "frame"

    first = next(iter(response.response))
    response.close()
    assert first.startswith(b"--frame\r\nContent-Type: image/jpeg\r\n")
    assert jpeg() in first


def test_stream_is_unavailable_without_a_frame(client: FlaskClient, viewer_headers: dict) -> None:
    assert client.get("/api/camera/stream", headers=viewer_headers).status_code == 503


def test_stream_keeps_going_when_a_read_fails_for_a_moment(monkeypatch: pytest.MonkeyPatch) -> None:
    """On Windows the file cannot be read while the worker replaces it."""
    fresh = Frame(jpeg(), time.time_ns())

    class Store:
        reads = iter([None, None, fresh])

        def read(self) -> Frame | None:
            return next(self.reads)

    monkeypatch.setattr(camera_service, "STREAM_POLL_SECONDS", 0)
    part = next(camera_service.mjpeg_parts(Store()))  # type: ignore[arg-type]
    assert jpeg() in part


def test_stream_ends_when_the_frames_are_old(monkeypatch: pytest.MonkeyPatch) -> None:
    class Store:
        def read(self) -> Frame:
            return Frame(jpeg(), time.time_ns() - 60 * 1_000_000_000)

    monkeypatch.setattr(camera_service, "STREAM_POLL_SECONDS", 0)
    assert list(camera_service.mjpeg_parts(Store())) == []  # type: ignore[arg-type]


# --- header status chips -----------------------------------------------------------------


def test_service_status_follows_the_devices(
    client: FlaskClient,
    viewer_headers: dict,
    webcam: Device,
    sensor_node: tuple[Device, str],
    put_frame: Callable,
) -> None:
    body = client.get("/api/status", headers=viewer_headers).get_json()
    assert (body["webcam"], body["sensor"], body["advisor"]) == (False, False, False)

    put_frame()
    device, _ = sensor_node
    device.last_seen_at = utcnow()
    db.session.commit()
    body = client.get("/api/status", headers=viewer_headers).get_json()
    assert (body["webcam"], body["sensor"]) == (True, True)
    assert body["checked_at"].endswith("Z")


def test_service_status_needs_a_login(client: FlaskClient) -> None:
    assert client.get("/api/status").status_code == 401
