"""Model report, C4.5 tree, and image prediction. They run on the real files in `ml/models/`."""

import io
import json
import shutil
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pytest
from flask import Flask
from flask.testing import FlaskClient

from tests.helpers import error_of

CLASSES = ["normal", "n_deficiency", "fe_deficiency"]
YELLOW_LEAF = (50, 160, 170)  # BGR; a pale yellow-green leaf, C4.5 reads it as n_deficiency


def leaf_image(colour: tuple[int, int, int] | None = YELLOW_LEAF) -> bytes:
    """A grey background with one leaf-coloured ellipse. `None` leaves the background empty."""
    image = np.full((300, 400, 3), 230, np.uint8)
    if colour is not None:
        cv2.ellipse(image, (200, 150), (110, 80), 20, 0, 360, colour, -1)
    return cv2.imencode(".png", image)[1].tobytes()


def upload(client: FlaskClient, headers: dict[str, str], data: bytes | None) -> Any:
    form = {"image": (io.BytesIO(data), "leaf.png")} if data is not None else {}
    return client.post(
        "/api/models/predict", headers=headers, data=form, content_type="multipart/form-data"
    )


@pytest.fixture()
def ml_copy(app: Flask, tmp_path: Path) -> Path:
    """A private copy of the ML workspace, so a test can edit the registry."""
    source = Path(app.config["ML_DIR"])
    shutil.copytree(source / "src", tmp_path / "src")
    shutil.copytree(source / "models", tmp_path / "models")
    results = tmp_path / "reports" / "results"
    results.mkdir(parents=True)
    shutil.copy(source / "reports" / "results" / "07_test_predictions.csv", results)
    app.config["ML_DIR"] = tmp_path
    return tmp_path


def make_active(ml_dir: Path, version: str) -> None:
    path = ml_dir / "models" / "registry.json"
    registry = json.loads(path.read_text(encoding="utf-8"))
    registry["active_version"] = version
    path.write_text(json.dumps(registry), encoding="utf-8")


# --- access ------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path"),
    [("get", "/api/models"), ("get", "/api/models/c45/tree"), ("post", "/api/models/predict")],
)
def test_every_endpoint_needs_a_login(client: FlaskClient, method: str, path: str) -> None:
    assert getattr(client, method)(path).status_code == 401


def test_a_viewer_can_read_the_models(client: FlaskClient, viewer_headers: dict[str, str]) -> None:
    assert client.get("/api/models", headers=viewer_headers).status_code == 200


# --- report ------------------------------------------------------------------------------


def test_report_lists_the_models_with_c45_as_primary(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    body = client.get("/api/models", headers=viewer_headers).get_json()

    assert body["active_version"] == "c45-0.1.0"
    assert body["classes"] == CLASSES
    assert body["features"] == ["mean_r", "mean_g", "mean_b"]
    assert [model["id"] for model in body["models"]] == [
        "c45",
        "svm",
        "naive_bayes",
        "random_forest",
    ]
    assert [model["role"] for model in body["models"]] == ["primary"] + ["comparator"] * 3
    for model in body["models"]:
        assert set(model["metrics"]) == {"accuracy", "precision", "recall", "f1"}
        assert all(0 <= value <= 1 for value in model["metrics"].values())


def test_confusion_matrix_agrees_with_the_reported_accuracy(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    body = client.get("/api/models", headers=viewer_headers).get_json()
    matrix = body["confusion"]

    total = sum(sum(row) for row in matrix)
    correct = sum(matrix[index][index] for index in range(len(CLASSES)))
    assert total == body["test_size"]
    assert correct / total == pytest.approx(body["models"][0]["metrics"]["accuracy"])


def test_switching_active_version_makes_that_model_primary(
    client: FlaskClient, viewer_headers: dict[str, str], ml_copy: Path
) -> None:
    make_active(ml_copy, "svm-0.1.0")
    body = client.get("/api/models", headers=viewer_headers).get_json()

    assert [(model["id"], model["role"]) for model in body["models"]][:2] == [
        ("svm", "primary"),
        ("c45", "comparator"),
    ]
    matrix = body["confusion"]
    correct = sum(matrix[index][index] for index in range(len(CLASSES)))
    assert correct / sum(map(sum, matrix)) == pytest.approx(
        body["models"][0]["metrics"]["accuracy"]
    )


def test_confusion_is_null_without_the_test_predictions(
    client: FlaskClient, viewer_headers: dict[str, str], ml_copy: Path
) -> None:
    (ml_copy / "reports" / "results" / "07_test_predictions.csv").unlink()
    body = client.get("/api/models", headers=viewer_headers).get_json()
    assert body["confusion"] is None


def test_report_is_404_before_the_first_training(
    client: FlaskClient, viewer_headers: dict[str, str], app: Flask, tmp_path: Path
) -> None:
    app.config["ML_DIR"] = tmp_path
    response = client.get("/api/models", headers=viewer_headers)
    assert response.status_code == 404
    assert error_of(response)["code"] == "not_found"


# --- tree --------------------------------------------------------------------------------


def test_tree_has_splits_and_leaves(client: FlaskClient, viewer_headers: dict[str, str]) -> None:
    body = client.get("/api/models/c45/tree", headers=viewer_headers).get_json()
    assert body["version"] == "c45-0.1.0"

    leaves: list[dict[str, Any]] = []

    def walk(node: dict[str, Any]) -> None:
        if "class" in node:
            leaves.append(node)
            return
        assert node["feature"] in {"mean_r", "mean_g", "mean_b"}
        walk(node["left"])
        walk(node["right"])

    walk(body["root"])
    assert len(leaves) == 5
    assert all(leaf["class"] in CLASSES and 0 < leaf["confidence"] <= 1 for leaf in leaves)
    assert sum(leaf["samples"] for leaf in leaves) == 304  # every training row ends in a leaf


def test_tree_is_still_c45_when_another_model_is_active(
    client: FlaskClient, viewer_headers: dict[str, str], ml_copy: Path
) -> None:
    make_active(ml_copy, "svm-0.1.0")
    body = client.get("/api/models/c45/tree", headers=viewer_headers).get_json()
    assert body["version"] == "c45-0.1.0"


# --- prediction --------------------------------------------------------------------------


def test_prediction_returns_c45_and_the_comparators(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    response = upload(client, viewer_headers, leaf_image())
    assert response.status_code == 200
    body = response.get_json()

    assert body["class"] == "n_deficiency"
    assert 0 < body["confidence"] <= 1
    assert set(body["features"]) == {"mean_r", "mean_g", "mean_b"}
    assert body["features"]["mean_r"] == pytest.approx(170, abs=2)
    assert 0 < body["mask_area_ratio"] < 1
    assert [item["model_id"] for item in body["comparators"]] == [
        "svm",
        "naive_bayes",
        "random_forest",
    ]
    assert all(item["class"] in CLASSES for item in body["comparators"])


def test_prediction_follows_the_active_model(
    client: FlaskClient, viewer_headers: dict[str, str], ml_copy: Path
) -> None:
    make_active(ml_copy, "svm-0.1.0")
    body = upload(client, viewer_headers, leaf_image()).get_json()

    assert body["class"] in CLASSES
    assert [item["model_id"] for item in body["comparators"]] == [
        "c45",
        "naive_bayes",
        "random_forest",
    ]


def test_an_image_without_a_leaf_is_rejected(
    client: FlaskClient, viewer_headers: dict[str, str]
) -> None:
    response = upload(client, viewer_headers, leaf_image(None))
    assert response.status_code == 422
    assert error_of(response)["code"] == "invalid_leaf"


@pytest.mark.parametrize("data", [None, b"", b"this is not an image"])
def test_a_missing_or_broken_file_is_a_validation_error(
    client: FlaskClient, viewer_headers: dict[str, str], data: bytes | None
) -> None:
    response = upload(client, viewer_headers, data)
    assert response.status_code == 422
    error = error_of(response)
    assert error["code"] == "validation_error"
    assert error["details"]["field"] == "image"


def test_a_file_over_the_size_limit_is_refused(
    client: FlaskClient, viewer_headers: dict[str, str], app: Flask
) -> None:
    app.config["MAX_CONTENT_LENGTH"] = 1024
    response = upload(client, viewer_headers, b"x" * 4096)
    assert response.status_code == 413
    assert error_of(response)["code"] == "payload_too_large"
