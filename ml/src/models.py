"""scikit-learn comparators (SVM, Gaussian Naive Bayes, Random Forest) behind one small interface.

Every model exposes ``fit(X, y, feature_names, classes)``, ``predict`` and ``predict_scores`` so the
shared evaluation code treats C4.5 and the comparators the same way. Scaling is part of the SVM
pipeline and is fitted on the training rows only.
"""

from __future__ import annotations

from typing import Callable, Optional, Sequence

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

SEED = 42


def balanced_sample_weight(y) -> np.ndarray:
    y = np.asarray(y)
    labels, counts = np.unique(y, return_counts=True)
    weight = {label: len(y) / (len(labels) * count) for label, count in zip(labels, counts)}
    return np.array([weight[v] for v in y], dtype=float)


class SklearnClassifier:
    def __init__(
        self,
        make_estimator: Callable[[], object],
        score_method: str = "predict_proba",
        balanced_weights_step: Optional[str] = None,
        use_balanced_sample_weight: bool = False,
    ):
        self.make_estimator = make_estimator
        self.score_method = score_method
        self.balanced_weights_step = balanced_weights_step
        self.use_balanced_sample_weight = use_balanced_sample_weight
        self.estimator = None

    def fit(self, X, y, feature_names: Sequence[str], classes: Sequence[str]) -> "SklearnClassifier":
        self.feature_names = list(feature_names)
        self.classes = list(classes)
        self.estimator = self.make_estimator()
        kwargs = {}
        if self.use_balanced_sample_weight:
            key = "sample_weight" if self.balanced_weights_step is None else f"{self.balanced_weights_step}__sample_weight"
            kwargs[key] = balanced_sample_weight(y)
        self.estimator.fit(np.asarray(X, dtype=float), np.asarray(y), **kwargs)
        fitted = list(self.estimator.classes_)
        self._order = [fitted.index(c) for c in self.classes]
        return self

    def predict(self, X) -> np.ndarray:
        return self.estimator.predict(np.asarray(X, dtype=float))

    def predict_scores(self, X) -> np.ndarray:
        raw = getattr(self.estimator, self.score_method)(np.asarray(X, dtype=float))
        return np.asarray(raw)[:, self._order]


# ------------------------------------------------------------------ SVM
def build_svm(kernel: str, C: float, gamma: Optional[float] = None, class_weight: Optional[str] = "balanced", max_iter: int = -1):
    svc = SVC(
        kernel=kernel,
        C=C,
        gamma="scale" if kernel == "linear" or gamma is None else gamma,
        degree=3,
        coef0=1.0,
        class_weight=class_weight,
        decision_function_shape="ovr",
        max_iter=max_iter,
        random_state=SEED,
    )
    return Pipeline([("scaler", StandardScaler()), ("svc", svc)])


def svm_model(params: dict, max_iter: int = -1) -> SklearnClassifier:
    return SklearnClassifier(lambda: build_svm(max_iter=max_iter, **params), score_method="decision_function")


def svm_support_counts(model: SklearnClassifier) -> dict:
    svc = model.estimator.named_steps["svc"]
    counts = dict(zip(svc.classes_, (int(v) for v in svc.n_support_)))
    return {"n_support_total": int(svc.n_support_.sum()), **{f"n_support_{c}": counts[c] for c in model.classes}}


# ------------------------------------------------------------------ Gaussian Naive Bayes
def naive_bayes_model(params: dict) -> SklearnClassifier:
    return SklearnClassifier(
        lambda: GaussianNB(**params), score_method="predict_proba", use_balanced_sample_weight=True
    )


# ------------------------------------------------------------------ Random Forest
def build_random_forest(
    n_estimators: int,
    max_depth: Optional[int] = None,
    min_samples_leaf: int = 1,
    class_weight: Optional[str] = "balanced",
    oob_score: bool = False,
    n_jobs: int = 1,
):
    return RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_leaf=min_samples_leaf,
        criterion="gini",
        max_features="sqrt",
        bootstrap=True,
        class_weight=class_weight,
        oob_score=oob_score,
        n_jobs=n_jobs,
        random_state=SEED,
    )


def random_forest_model(params: dict, oob_score: bool = False) -> SklearnClassifier:
    return SklearnClassifier(lambda: build_random_forest(oob_score=oob_score, **params), score_method="predict_proba")
