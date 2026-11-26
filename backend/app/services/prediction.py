"""Classify one plant image with the active model and the comparators (docs/API.md section 10).

Nothing is stored. The image goes through the same pipeline as the training images
(`ml/src/preprocessing.py`), configured from the registry entry of the active model.
"""

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import cv2
import joblib
import numpy as np

from app.errors import ApiError
from app.schemas.models import Comparator, PredictionOut
from app.services import ml_adapter
from app.services import model_registry as registry_service
from app.services.model_registry import Entry


@dataclass(frozen=True)
class Prediction:
    label: str
    confidence: float
    rule_path: list[dict[str, Any]] = field(default_factory=list)  # the tree only


@lru_cache(maxsize=8)
def _tree(path: Path, modified: int) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=8)
def _estimator(path: Path, modified: int) -> Any:
    # A .joblib file can run code when loaded: only files from ml/models/ are ever loaded.
    return joblib.load(path)


def _softmax(scores: np.ndarray) -> np.ndarray:
    shifted = np.exp(scores - scores.max())
    return shifted / shifted.sum()


def _predict_tree(entry: Entry, values: dict[str, float]) -> Prediction:
    path = registry_service.artifact_path(entry)
    payload = _tree(path, path.stat().st_mtime_ns)
    result = ml_adapter.c45(registry_service.ml_dir()).predict_from_dict(payload, values)
    rule_path = [{**step, "feature": step["feature"].lower()} for step in result["rule_path"]]
    return Prediction(result["predicted_class"], float(result["confidence"]), rule_path)


def _predict_sklearn(entry: Entry, values: dict[str, float]) -> Prediction:
    path = registry_service.artifact_path(entry)
    estimator = _estimator(path, path.stat().st_mtime_ns)
    row = np.array([[values[name] for name in entry["features"]]], dtype=float)
    if hasattr(estimator, "predict_proba"):
        scores = estimator.predict_proba(row)[0]
    else:  # SVM: decision values, turned into shares that add up to 1
        scores = _softmax(estimator.decision_function(row)[0])
    best = int(np.argmax(scores))
    return Prediction(str(estimator.classes_[best]), float(scores[best]))


def predict_entry(entry: Entry, values: dict[str, float]) -> Prediction:
    if entry["algorithm"] == "c45":
        return _predict_tree(entry, values)
    return _predict_sklearn(entry, values)


def pipeline_config(preprocessing: Any, settings: dict[str, Any]) -> Any:
    return preprocessing.PipelineConfig(
        resize=settings["resize"][0],
        blur_kernel=settings["blur_kernel"],
        morphology_size=settings["morphology"]["size"],
        segmentation_channel=settings["segmentation_channel"],
        component_rule=settings["component_rule"],
        min_component_ratio=settings["min_component_ratio"],
        min_leaf_area_ratio=settings["min_leaf_area_ratio"],
        max_leaf_area_ratio=settings["max_leaf_area_ratio"],
    )


def _decode(data: bytes) -> np.ndarray:
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ApiError(
            422, "validation_error", "image: cannot be decoded as an image", {"field": "image"}
        )
    return image


def predict_image(data: bytes) -> PredictionOut:
    registry = registry_service.load_registry()
    active = registry_service.active_entry(registry)
    preprocessing = ml_adapter.preprocessing(registry_service.ml_dir())

    result = preprocessing.process_image(
        _decode(data), pipeline_config(preprocessing, active["preprocessing"])
    )
    if result.qc_status != preprocessing.QC_OK:
        raise ApiError(422, "invalid_leaf", "No leaf could be found in the image")

    main = predict_entry(active, result.features)
    comparators = [
        Comparator(
            model_id=registry_service.model_id(entry),
            label=predict_entry(entry, result.features).label,
        )
        for entry in registry["models"]
        if entry is not active
    ]
    return PredictionOut(
        label=main.label,
        confidence=round(main.confidence, 4),
        features={name.lower(): result.features[name] for name in active["features"]},
        mask_area_ratio=result.mask_area_ratio,
        comparators=comparators,
    )
