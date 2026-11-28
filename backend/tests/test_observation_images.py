"""The picture of a hole, cut out of the stored snapshot."""

from pathlib import Path

import cv2
import numpy as np
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Device, Observation
from app.services.settings_defaults import DEFAULT_ROI_CONFIG, DEFAULT_SETTINGS
from app.services.vision.recorder import Recorder
from tests.test_recorder import analysis, six

WIDTH, HEIGHT = 640, 360


@pytest.fixture()
def stored(app: Flask, webcam: Device) -> Observation:
    """One analysis stored with a real (grey, with a green square in hole 1) frame."""
    frame = np.full((HEIGHT, WIDTH, 3), 235, dtype=np.uint8)
    region = DEFAULT_ROI_CONFIG[0]
    x, y = round(region["x"] * WIDTH), round(region["y"] * HEIGHT)
    cv2.rectangle(frame, (x + 20, y + 20), (x + 60, y + 60), (60, 160, 70), -1)
    _, jpeg = cv2.imencode(".jpg", frame)
    settings = {**DEFAULT_SETTINGS, "observation_store_interval_seconds": 300}
    Recorder(Path(app.config["STORAGE_DIR"]) / "snapshots").record(
        jpeg.tobytes(), analysis(*six()), settings
    )
    return db.session.scalars(db.select(Observation).order_by(Observation.id)).first()


def decode(data: bytes) -> np.ndarray:
    picture = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    assert picture is not None
    return picture


def test_the_photo_is_the_region_of_the_frame(
    client: FlaskClient, viewer_headers: dict[str, str], stored: Observation
) -> None:
    response = client.get(f"/api/observations/{stored.id}/image", headers=viewer_headers)

    assert response.mimetype == "image/jpeg"
    height, width = decode(response.data).shape[:2]
    region = DEFAULT_ROI_CONFIG[0]
    assert abs(width - region["w"] * WIDTH) <= 2
    assert abs(height - region["h"] * HEIGHT) <= 2


def test_the_segmentation_shows_the_outline_of_the_leaf(
    client: FlaskClient, viewer_headers: dict[str, str], stored: Observation
) -> None:
    response = client.get(
        f"/api/observations/{stored.id}/image?view=segmentation", headers=viewer_headers
    )

    picture = decode(response.data)
    assert picture.shape[0] == picture.shape[1]  # the pipeline resizes to a square
    red = (picture[..., 2] > 150) & (picture[..., 1] < 120) & (picture[..., 0] < 120)
    assert red.any()


def test_a_browser_picture_can_log_in_with_a_token_in_the_url(
    client: FlaskClient, admin_headers: dict[str, str], stored: Observation
) -> None:
    token = admin_headers["Authorization"].removeprefix("Bearer ")

    assert client.get(f"/api/observations/{stored.id}/image?token={token}").status_code == 200
    assert client.get(f"/api/observations/{stored.id}/image").status_code == 401


def test_an_unknown_view_is_rejected(
    client: FlaskClient, viewer_headers: dict[str, str], stored: Observation
) -> None:
    response = client.get(f"/api/observations/{stored.id}/image?view=x", headers=viewer_headers)

    assert response.status_code == 422


def test_an_observation_without_a_picture_is_not_found(
    app: Flask,
    client: FlaskClient,
    viewer_headers: dict[str, str],
    stored: Observation,
) -> None:
    for path in (Path(app.config["STORAGE_DIR"]) / "snapshots").rglob("*.jpg"):
        path.unlink()

    assert (
        client.get(f"/api/observations/{stored.id}/image", headers=viewer_headers).status_code
        == 404
    )
    assert client.get("/api/observations/99999/image", headers=viewer_headers).status_code == 404
