"""Reads `ml/models/registry.json` and the notebook results (docs/ML.md section 9).

The registry is written by the notebooks and is the single source of truth. The active model is
`active_version`; the role of every entry is derived from it, so switching the primary model
means changing that one value.
"""

import csv
import json
from pathlib import Path
from typing import Any

from flask import current_app

from app.errors import ApiError
from app.schemas.models import ModelMetrics, ModelReport, ModelSummary, ModelTree

Entry = dict[str, Any]

# How notebook 07 names the models in `07_test_predictions.csv`.
RESULT_NAMES = {
    "c45": "C4.5",
    "svm": "SVM",
    "naive-bayes": "Naive Bayes",
    "random-forest": "Random Forest",
}
TEST_PREDICTIONS_FILE = "07_test_predictions.csv"


def ml_dir() -> Path:
    return Path(current_app.config["ML_DIR"])


def models_dir() -> Path:
    return ml_dir() / "models"


def model_id(entry: Entry) -> str:
    """API id of a model: `c45`, `svm`, `naive_bayes`, `random_forest`."""
    return entry["algorithm"].replace("-", "_")


def load_registry() -> dict[str, Any]:
    path = models_dir() / "registry.json"
    if not path.is_file():
        raise ApiError(404, "not_found", "No model has been trained yet")
    return json.loads(path.read_text(encoding="utf-8"))


def active_entry(registry: dict[str, Any]) -> Entry:
    for entry in registry["models"]:
        if entry["version"] == registry["active_version"]:
            return entry
    raise ApiError(404, "not_found", "The active model is not in the registry")


def artifact_path(entry: Entry) -> Path:
    """Path of a model file. Only files inside `ml/models/` are ever loaded."""
    name = entry["artifact"]
    if Path(name).name != name:
        raise ApiError(500, "internal_error", "Invalid artifact name in the registry")
    return models_dir() / name


def _metrics(entry: Entry) -> ModelMetrics:
    per_class = entry["metrics"]["per_class"].values()
    count = len(per_class)
    return ModelMetrics(
        accuracy=entry["metrics"]["accuracy"],
        precision=sum(item["precision"] for item in per_class) / count,
        recall=sum(item["recall"] for item in per_class) / count,
        f1=entry["metrics"]["macro_f1"],
    )


def _confusion(entry: Entry) -> list[list[int]] | None:
    """Confusion matrix of a model on the test set: rows are actual, columns predicted."""
    path = ml_dir() / "reports" / "results" / TEST_PREDICTIONS_FILE
    if not path.is_file():
        return None

    classes = entry["classes"]
    matrix = [[0] * len(classes) for _ in classes]
    name = RESULT_NAMES.get(entry["algorithm"])
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["model"] == name:
                matrix[classes.index(row["label"])][classes.index(row["pred"])] += 1
    return matrix if any(any(line) for line in matrix) else None


def get_report() -> ModelReport:
    registry = load_registry()
    active = active_entry(registry)
    # The primary model comes first, the comparators keep the order of the registry.
    ordered = [active, *(entry for entry in registry["models"] if entry is not active)]

    return ModelReport(
        active_version=active["version"],
        trained_at=active["trained_at"],
        test_size=active["dataset"]["test_rows"],
        features=[name.lower() for name in active["features"]],
        classes=active["classes"],
        models=[
            ModelSummary(
                id=model_id(entry),
                version=entry["version"],
                role="primary" if entry is active else "comparator",
                metrics=_metrics(entry),
            )
            for entry in ordered
        ],
        confusion=_confusion(active),
    )


def _tree_node(node: dict[str, Any]) -> dict[str, Any]:
    if node["leaf"]:
        return {
            "class": node["class"],
            "samples": node["samples"],
            "confidence": node["confidence"],
        }
    return {
        "feature": node["feature"].lower(),
        "threshold": node["threshold"],
        "left": _tree_node(node["left"]),
        "right": _tree_node(node["right"]),
    }


def get_tree() -> ModelTree:
    """The exported C4.5 tree. It is the active model when that is C4.5, else the first C4.5."""
    registry = load_registry()
    active = active_entry(registry)
    trees = [entry for entry in registry["models"] if entry["algorithm"] == "c45"]
    entry = active if active["algorithm"] == "c45" else next(iter(trees), None)
    if entry is None:
        raise ApiError(404, "not_found", "No C4.5 model has been trained yet")

    payload = json.loads(artifact_path(entry).read_text(encoding="utf-8"))
    return ModelTree(version=entry["version"], root=_tree_node(payload["tree"]))
