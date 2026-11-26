"""Cropping the regions, the stabiliser, the analyzer and the analysis endpoint."""

import os
import time
from pathlib import Path

import cv2
import numpy as np
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.models import Device
from app.schemas.camera import CameraAnalysis
from app.services import prediction
from app.services.prediction import Prediction
from app.services.settings_defaults import DEFAULT_ROI_CONFIG, DEFAULT_SETTINGS
from app.services.vision import roi
from app.services.vision.analyzer import Analyzer
from app.services.vision.frame_store import FrameStore
from app.services.vision.result_store import RESULT_FILE, ResultStore
from app.services.vision.stabilizer import Stabilizer

CLASSES = {"normal", "n_deficiency", "fe_deficiency"}


def frame_with_plants(positions: set[int]) -> np.ndarray:
    """A white 1280 x 720 frame with a green leaf in the middle of the given regions."""
    frame = np.full((720, 1280, 3), 235, dtype=np.uint8)
    for region in DEFAULT_ROI_CONFIG:
        if region["position"] in positions:
            centre = (
                round((region["x"] + region["w"] / 2) * 1280),
                round((region["y"] + region["h"] / 2) * 720),
            )
            axes = (round(region["w"] * 1280 * 0.3), round(region["h"] * 720 * 0.3))
            cv2.ellipse(frame, centre, axes, 0, 0, 360, (45, 140, 60), -1)
    return frame


def settings(**changes: object) -> dict:
    return {**DEFAULT_SETTINGS, **changes}


# --- roi -----------------------------------------------------------------------------------


def test_crop_follows_the_fractions_of_the_frame() -> None:
    frame = np.zeros((100, 200, 3), dtype=np.uint8)
    part = roi.crop(frame, {"x": 0.25, "y": 0.5, "w": 0.5, "h": 0.25})
    assert part.shape[:2] == (25, 100)


def test_crop_is_never_empty() -> None:
    frame = np.zeros((100, 200, 3), dtype=np.uint8)
    assert roi.crop(frame, {"x": 1.0, "y": 1.0, "w": 0.001, "h": 0.001}).size > 0


# --- stabiliser ---------------------------------------------------------------------------


def test_stabiliser_waits_for_enough_votes() -> None:
    stabilizer = Stabilizer(window=3, min_votes=2)
    assert stabilizer.add("normal", 0.9) == (None, None)
    assert stabilizer.add("normal", 0.8) == ("normal", 0.8)


def test_stabiliser_changes_when_the_new_status_has_enough_votes() -> None:
    stabilizer = Stabilizer(window=3, min_votes=2)
    for _ in range(3):
        stabilizer.add("normal", 0.9)
    assert stabilizer.add("n_deficiency", 0.7)[0] == "normal"  # one vote is a flicker
    assert stabilizer.add("n_deficiency", 0.6) == ("n_deficiency", 0.6)


def test_stabiliser_keeps_the_status_on_a_tie() -> None:
    stabilizer = Stabilizer(window=4, min_votes=2)
    for status in ("normal", "normal", "n_deficiency"):
        stabilizer.add(status, None)
    assert stabilizer.add("n_deficiency", None)[0] == "normal"


def test_stabiliser_adopts_new_settings_and_keeps_its_results() -> None:
    stabilizer = Stabilizer(window=5, min_votes=3)
    for _ in range(3):
        stabilizer.add("normal", None)
    stabilizer.configure(window=3, min_votes=2)
    assert stabilizer.add("normal", None)[0] == "normal"


# --- analyzer -----------------------------------------------------------------------------


def test_empty_holes_are_not_detected(app: Flask) -> None:
    analysis = Analyzer().run(frame_with_plants(set()), settings())
    assert [plant.observed for plant in analysis.plants] == ["no_plant"] * 6
    assert all(plant.features is None and plant.rule_path == [] for plant in analysis.plants)
    assert all(plant.predicted is None for plant in analysis.plants)


def test_plants_get_a_class_and_the_rule_that_decided_it(app: Flask) -> None:
    analyzer = Analyzer()
    config = settings(stabilizer_window=1, stabilizer_min_votes=1)
    analysis = analyzer.run(frame_with_plants({1, 2, 3, 4, 5}), config)

    assert [plant.position for plant in analysis.plants] == [1, 2, 3, 4, 5, 6]
    for plant in analysis.plants[:5]:
        assert plant.status in CLASSES and plant.status == plant.observed
        assert 0 < plant.confidence <= 1
        assert set(plant.features) == {"mean_r", "mean_g", "mean_b"}
        assert plant.rule_path
    assert analysis.plants[5].status == "no_plant"
    assert analysis.model_version == "c45-0.1.0"
    assert analysis.consensus is False


def test_the_status_waits_for_the_votes_of_the_stabiliser(app: Flask) -> None:
    analyzer = Analyzer()
    frame = frame_with_plants({1})
    assert analyzer.run(frame, settings()).plants[0].status is None
    assert analyzer.run(frame, settings()).plants[0].status in CLASSES


def test_a_plant_taken_away_is_noticed_after_two_analyses(app: Flask) -> None:
    analyzer = Analyzer()
    for _ in range(3):
        analyzer.run(frame_with_plants({1}), settings())
    empty = frame_with_plants(set())
    assert analyzer.run(empty, settings()).plants[0].status in CLASSES
    assert analyzer.run(empty, settings()).plants[0].status == "no_plant"


def fake_predictions(monkeypatch: pytest.MonkeyPatch, svm_label: str) -> None:
    """The tree says normal; the SVM says `svm_label`; the other comparators say normal."""

    def predict(entry: dict, values: dict) -> Prediction:
        label = svm_label if entry["algorithm"] == "svm" else "normal"
        return Prediction(label, 0.9)

    monkeypatch.setattr(prediction, "predict_entry", predict)


def test_comparators_vote_when_consensus_is_on(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_predictions(monkeypatch, svm_label="normal")
    config = settings(consensus_enabled=True, stabilizer_window=1, stabilizer_min_votes=1)
    analysis = Analyzer().run(frame_with_plants({1}), config)

    plant = analysis.plants[0]
    assert analysis.consensus is True
    assert {vote.model_id for vote in plant.comparators} == {"svm", "naive_bayes", "random_forest"}
    assert plant.status == "normal"


def test_a_plant_the_best_comparator_disagrees_on_needs_a_check(
    app: Flask, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_predictions(monkeypatch, svm_label="n_deficiency")
    config = settings(consensus_enabled=True, stabilizer_window=1, stabilizer_min_votes=1)
    plant = Analyzer().run(frame_with_plants({1}), config).plants[0]
    assert plant.status == "needs_check"
    assert plant.confidence is None
    assert plant.predicted == "normal"


def test_comparators_do_not_run_when_consensus_is_off(
    app: Flask, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_predictions(monkeypatch, svm_label="n_deficiency")
    config = settings(stabilizer_window=1, stabilizer_min_votes=1)
    plant = Analyzer().run(frame_with_plants({1}), config).plants[0]
    assert plant.status == "normal"
    assert plant.comparators == []


# --- result store and endpoint -----------------------------------------------------------


@pytest.fixture()
def analysis(app: Flask) -> CameraAnalysis:
    return Analyzer().run(
        frame_with_plants({1}), settings(stabilizer_window=1, stabilizer_min_votes=1)
    )


@pytest.fixture()
def results(app: Flask) -> ResultStore:
    return ResultStore(Path(app.config["STORAGE_DIR"]) / "frames")


def test_the_result_store_returns_what_was_written(
    results: ResultStore, analysis: CameraAnalysis
) -> None:
    assert results.read() is None
    assert results.write(analysis)
    read = results.read()
    assert read is not None
    assert read[0].plants == analysis.plants
    assert read[0].model_version == analysis.model_version
    assert read[1] < 5


def test_the_result_store_ignores_a_broken_file(app: Flask, results: ResultStore) -> None:
    (Path(app.config["STORAGE_DIR"]) / "frames" / RESULT_FILE).write_text("{not json")
    assert results.read() is None


def fresh_frame(app: Flask) -> None:
    store = FrameStore(Path(app.config["STORAGE_DIR"]) / "frames")
    ok, data = cv2.imencode(".jpg", np.full((36, 64, 3), 120, dtype=np.uint8))
    assert ok and store.write(data.tobytes())


def test_the_endpoint_returns_the_latest_analysis(
    app: Flask,
    client: FlaskClient,
    viewer_headers: dict,
    webcam: Device,
    results: ResultStore,
    analysis: CameraAnalysis,
) -> None:
    fresh_frame(app)
    results.write(analysis)
    body = client.get("/api/camera/analysis", headers=viewer_headers).get_json()
    assert body["analyzed_at"].endswith("Z")
    assert body["model_version"] == "c45-0.1.0"
    assert len(body["plants"]) == 6
    assert body["plants"][0]["status"] in CLASSES


def test_the_endpoint_has_no_plants_without_an_analysis(
    app: Flask, client: FlaskClient, viewer_headers: dict, webcam: Device
) -> None:
    fresh_frame(app)
    body = client.get("/api/camera/analysis", headers=viewer_headers).get_json()
    assert body == {"analyzed_at": None, "model_version": None, "consensus": False, "plants": []}


def test_the_endpoint_drops_an_old_analysis(
    app: Flask,
    client: FlaskClient,
    viewer_headers: dict,
    webcam: Device,
    results: ResultStore,
    analysis: CameraAnalysis,
) -> None:
    fresh_frame(app)
    results.write(analysis)
    old = time.time() - 60
    os.utime(Path(app.config["STORAGE_DIR"]) / "frames" / RESULT_FILE, (old, old))
    assert client.get("/api/camera/analysis", headers=viewer_headers).get_json()["plants"] == []


def test_the_endpoint_has_no_plants_while_the_camera_is_off(
    app: Flask,
    client: FlaskClient,
    viewer_headers: dict,
    results: ResultStore,
    analysis: CameraAnalysis,
) -> None:
    results.write(analysis)  # no webcam device, so the camera counts as offline
    assert client.get("/api/camera/analysis", headers=viewer_headers).get_json()["plants"] == []


def test_the_endpoint_needs_a_login(client: FlaskClient) -> None:
    assert client.get("/api/camera/analysis").status_code == 401
