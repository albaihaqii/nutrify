"""Classify the six plant regions of a frame (docs/ML.md sections 2.2, 3 and 6).

Each region is cropped and goes through the same pipeline as the training images, then through
the active model. The result of one analysis can flicker, so a `Stabilizer` per plant decides the
status that is shown.
"""

import math
from typing import Any

import numpy as np

from app.models.types import utcnow
from app.schemas.camera import (
    CameraAnalysis,
    ComparatorVote,
    PlantAnalysis,
    PlantStatus,
    RuleStep,
)
from app.services import ml_adapter, prediction
from app.services import model_registry as registry_service
from app.services.vision import roi
from app.services.vision.stabilizer import Stabilizer

# Colourfulness of the leaf (distance from grey in CIELAB). Below it the "leaf" is the white
# pipe, the pot or a shadow: the hole is empty. Plants on the rig photo measure 26 to 33, a bare
# white pipe 13 to 19. A placeholder to confirm with a photo of an empty hole.
MIN_LEAF_CHROMA = 20.0


def _chroma(features: dict[str, float]) -> float:
    return math.hypot(features["Lab_a"], features["Lab_b"])


def _macro_f1(entry: dict[str, Any]) -> float:
    return entry["metrics"]["macro_f1"]


class Analyzer:
    def __init__(self) -> None:
        self._stabilizers: dict[int, Stabilizer] = {}

    def run(self, frame: np.ndarray, settings: dict[str, Any]) -> CameraAnalysis:
        registry = registry_service.load_registry()
        active = registry_service.active_entry(registry)
        preprocessing = ml_adapter.preprocessing(registry_service.ml_dir())
        config = prediction.pipeline_config(preprocessing, active["preprocessing"])
        consensus = bool(settings["consensus_enabled"])
        comparators = (
            [entry for entry in registry["models"] if entry is not active] if consensus else []
        )

        plants = []
        for region in sorted(settings["roi_config"], key=lambda item: item["position"]):
            observation = self._observe(
                roi.crop(frame, region), preprocessing, config, active, comparators
            )
            stabilizer = self._stabilizer(region["position"], settings)
            status, confidence = stabilizer.add(observation.observed, observation.confidence)
            plants.append(
                observation.model_copy(
                    update={
                        "position": region["position"],
                        "status": status,
                        "confidence": confidence,
                    }
                )
            )
        return CameraAnalysis(
            analyzed_at=utcnow(),
            model_version=active["version"],
            consensus=consensus,
            plants=plants,
        )

    def _stabilizer(self, position: int, settings: dict[str, Any]) -> Stabilizer:
        window, votes = settings["stabilizer_window"], settings["stabilizer_min_votes"]
        stabilizer = self._stabilizers.get(position)
        if stabilizer is None:
            stabilizer = self._stabilizers[position] = Stabilizer(window, votes)
        else:
            stabilizer.configure(window, votes)
        return stabilizer

    def _observe(
        self,
        crop: np.ndarray,
        preprocessing: Any,
        config: Any,
        active: dict[str, Any],
        comparators: list[dict[str, Any]],
    ) -> PlantAnalysis:
        """What one region shows in this frame. `position`, `status` and `confidence` are filled
        in by the caller once the stabiliser has voted."""
        result = preprocessing.process_image(crop, config)
        ratio = result.mask_area_ratio
        empty = ratio < config.min_leaf_area_ratio or _chroma(result.features) < MIN_LEAF_CHROMA
        if empty or result.qc_status != preprocessing.QC_OK:
            return self._without_prediction("no_plant" if empty else "needs_check", ratio)

        main = prediction.predict_entry(active, result.features)
        votes = [
            ComparatorVote(
                model_id=registry_service.model_id(entry),
                label=prediction.predict_entry(entry, result.features).label,
            )
            for entry in comparators
        ]
        best = max(comparators, key=_macro_f1, default=None)
        disagrees = best is not None and any(
            vote.model_id == registry_service.model_id(best) and vote.label != main.label
            for vote in votes
        )
        observed: PlantStatus = "needs_check" if disagrees else main.label  # type: ignore[assignment]
        return PlantAnalysis(
            position=0,
            status=None,
            confidence=None if disagrees else round(main.confidence, 4),
            observed=observed,
            predicted=main.label,
            leaf_area_ratio=ratio,
            features={name.lower(): result.features[name] for name in active["features"]},
            rule_path=[RuleStep(**step) for step in main.rule_path],
            comparators=votes,
        )

    @staticmethod
    def _without_prediction(observed: PlantStatus, ratio: float) -> PlantAnalysis:
        return PlantAnalysis(
            position=0,
            status=None,
            confidence=None,
            observed=observed,
            predicted=None,
            leaf_area_ratio=ratio,
            features=None,
            rule_path=[],
            comparators=[],
        )
