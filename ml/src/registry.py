"""Read, build, and write ml/models/registry.json (format in docs/ML.md section 9)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

REQUIRED_ENTRY_KEYS = (
    "version", "algorithm", "role", "trained_at", "artifact", "features", "classes",
    "preprocessing", "dataset", "compute", "metrics",
)


def preprocessing_entry(pipeline: dict, resize: int = 256) -> dict:
    """Registry block from the `pipeline` section of preprocessing_params.json."""
    return {
        "resize": [pipeline.get("resize", resize), pipeline.get("resize", resize)],
        "blur_kernel": pipeline.get("blur_kernel"),
        "segmentation_channel": pipeline.get("segmentation_channel"),
        "threshold": "otsu",
        "component_rule": pipeline.get("component_rule"),
        "min_component_ratio": pipeline.get("min_component_ratio"),
        "morphology": {"kernel": "ellipse", "size": pipeline.get("morphology_size"), "order": ["open", "close"]},
        "min_leaf_area_ratio": pipeline.get("min_leaf_area_ratio"),
        "max_leaf_area_ratio": pipeline.get("max_leaf_area_ratio"),
    }


def metrics_entry(accuracy: float, macro_f1: float, per_class: dict) -> dict:
    return {"accuracy": accuracy, "macro_f1": macro_f1, "per_class": per_class}


def build_entry(
    version: str,
    algorithm: str,
    role: str,
    artifact: str,
    features: list,
    classes: list,
    preprocessing: dict,
    dataset: dict,
    compute: dict,
    metrics: dict,
    trained_at: str,
    extra: Optional[dict] = None,
) -> dict:
    entry = {
        "version": version,
        "algorithm": algorithm,
        "role": role,
        "trained_at": trained_at,
        "artifact": artifact,
        "features": list(features),
        "classes": list(classes),
        "preprocessing": preprocessing,
        "dataset": dataset,
        "compute": compute,
        "metrics": metrics,
    }
    if extra:
        entry.update(extra)
    return entry


def build_registry(active_version: str, entries: list, extra: Optional[dict] = None) -> dict:
    registry = {"active_version": active_version, "models": list(entries)}
    if extra:
        registry.update(extra)
    return registry


def validate_registry(registry: dict, models_dir: Optional[Path] = None) -> list:
    problems = []
    versions = [m.get("version") for m in registry.get("models", [])]
    if len(set(versions)) != len(versions):
        problems.append("versi ganda")
    if registry.get("active_version") not in versions:
        problems.append("active_version tidak ada di daftar model")
    for entry in registry.get("models", []):
        for key in REQUIRED_ENTRY_KEYS:
            if key not in entry:
                problems.append(f"{entry.get('version')}: kunci '{key}' hilang")
        if models_dir is not None and not (Path(models_dir) / entry.get("artifact", "")).exists():
            problems.append(f"{entry.get('version')}: berkas artefak tidak ditemukan")
    return problems


def save_registry(path: Path, registry: dict) -> None:
    Path(path).write_text(json.dumps(registry, indent=2, ensure_ascii=False), encoding="utf-8")


def load_registry(path: Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))
