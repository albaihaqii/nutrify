"""C4.5 decision tree implemented from scratch.

Training uses NumPy. Prediction from an exported tree uses only the Python standard library
(`predict_from_dict`), so the backend can run it without scikit-learn.

Convention: a split sends a sample left when ``value <= threshold`` and right otherwise.
"""

from __future__ import annotations

import copy
import math
from dataclasses import dataclass
from statistics import NormalDist
from typing import Optional, Sequence

import numpy as np

EPS = 1e-12
PRUNE_TOLERANCE = 0.1
TREE_FORMAT = "c45-tree"
TREE_FORMAT_VERSION = 1


def entropy_from_counts(counts: np.ndarray) -> float:
    """H(S) in bits from (weighted) class counts."""
    counts = np.asarray(counts, dtype=float)
    total = counts.sum()
    if total <= 0:
        return 0.0
    p = counts[counts > 0] / total
    return float(-(p * np.log2(p)).sum())


def _entropy_rows(counts: np.ndarray) -> np.ndarray:
    total = counts.sum(axis=1, keepdims=True)
    with np.errstate(divide="ignore", invalid="ignore"):
        p = np.where(total > 0, counts / total, 0.0)
        logs = np.where(p > 0, np.log2(np.where(p > 0, p, 1.0)), 0.0)
    return -(p * logs).sum(axis=1)


def split_info_from_sizes(sizes: Sequence[float]) -> float:
    """SplitInfo in bits from the (weighted) sizes of the branches."""
    sizes = np.asarray(sizes, dtype=float)
    total = sizes.sum()
    if total <= 0:
        return 0.0
    p = sizes[sizes > 0] / total
    return float(-(p * np.log2(p)).sum())


def add_errors(n: float, errors: float, confidence_factor: float) -> float:
    """Extra errors of the pessimistic estimate (upper confidence limit minus observed errors).

    Port of the binomial upper-limit approximation used by Quinlan's C4.5 (function AddErrs).
    """
    if n <= 0:
        return 0.0
    if errors < 1e-6:
        return n * (1.0 - confidence_factor ** (1.0 / n))
    if errors < 0.9999:
        base = n * (1.0 - confidence_factor ** (1.0 / n))
        return base + errors * (add_errors(n, 1.0, confidence_factor) - base)
    if errors + 0.5 >= n:
        return 0.67 * (n - errors)
    z = NormalDist().inv_cdf(1.0 - confidence_factor)
    z2 = z * z
    shifted = errors + 0.5
    upper = (shifted + z2 / 2.0 + math.sqrt(z2 * (shifted * (1.0 - shifted / n) + z2 / 4.0))) / (n + z2)
    return n * upper - errors


def pessimistic_errors(n: float, errors: float, confidence_factor: float) -> float:
    return errors + add_errors(n, errors, confidence_factor)


@dataclass
class Node:
    counts: np.ndarray
    weighted_counts: np.ndarray
    depth: int
    feature: Optional[int] = None
    threshold: Optional[float] = None
    gain: Optional[float] = None
    gain_ratio: Optional[float] = None
    left: Optional["Node"] = None
    right: Optional["Node"] = None

    @property
    def is_leaf(self) -> bool:
        return self.left is None

    @property
    def n(self) -> int:
        return int(self.counts.sum())

    @property
    def prediction(self) -> int:
        return int(np.argmax(self.weighted_counts))

    @property
    def errors(self) -> int:
        return int(self.counts.sum() - self.counts[self.prediction])


def split_candidates(
    X: np.ndarray,
    y: np.ndarray,
    weights: np.ndarray,
    n_classes: int,
    min_samples_leaf: int = 1,
) -> list[dict]:
    """Best threshold of every feature (highest gain) with its gain, split info and gain ratio."""
    n, n_features = X.shape
    onehot = np.zeros((n, n_classes))
    onehot[np.arange(n), y] = 1.0
    total_weighted = (onehot * weights[:, None]).sum(axis=0)
    total_weight = total_weighted.sum()
    parent_entropy = entropy_from_counts(total_weighted)

    records = []
    for j in range(n_features):
        order = np.argsort(X[:, j], kind="stable")
        xs = X[order, j]
        cum_count = np.vstack([np.zeros(n_classes), np.cumsum(onehot[order], axis=0)])
        cum_weight = np.vstack([np.zeros(n_classes), np.cumsum(onehot[order] * weights[order, None], axis=0)])

        boundaries = np.nonzero(xs[:-1] < xs[1:])[0]
        if len(boundaries) == 0:
            continue
        ends = np.append(boundaries, n - 1)
        group_counts = np.diff(cum_count[ends + 1], axis=0, prepend=np.zeros((1, n_classes)))

        left_n = boundaries + 1
        right_n = n - left_n
        valid = (left_n >= min_samples_leaf) & (right_n >= min_samples_leaf)
        left_group, right_group = group_counts[:-1], group_counts[1:]
        same_pure = (
            ((left_group > 0).sum(axis=1) == 1)
            & ((right_group > 0).sum(axis=1) == 1)
            & (left_group.argmax(axis=1) == right_group.argmax(axis=1))
        )
        left_w = cum_weight[boundaries + 1]
        right_w = total_weighted - left_w
        w_left, w_right = left_w.sum(axis=1), right_w.sum(axis=1)
        valid &= ~same_pure & (w_left > 0) & (w_right > 0)
        if not valid.any():
            continue
        child_entropy = (w_left * _entropy_rows(left_w) + w_right * _entropy_rows(right_w)) / total_weight
        gains = np.where(valid, parent_entropy - child_entropy, -np.inf)
        t = int(np.argmax(gains))
        end = boundaries[t]
        threshold = (xs[end] + xs[end + 1]) / 2.0
        if threshold >= xs[end + 1]:
            threshold = xs[end]
        info = split_info_from_sizes([w_left[t], w_right[t]])
        best = {
            "feature": j,
            "threshold": float(threshold),
            "gain": float(gains[t]),
            "split_info": float(info),
            "gain_ratio": float(gains[t] / info) if info > EPS else 0.0,
            "left_n": int(left_n[t]),
            "right_n": int(right_n[t]),
        }
        records.append(best)
    return records


def choose_split(records: list[dict], min_gain: float = 1e-7) -> Optional[dict]:
    """Quinlan's rule: among attributes with gain at least the average gain, take the best gain ratio."""
    useful = [r for r in records if r["gain"] > min_gain]
    if not useful:
        return None
    average_gain = float(np.mean([r["gain"] for r in useful]))
    eligible = [r for r in useful if r["gain"] >= average_gain - EPS]
    return max(eligible, key=lambda r: (round(r["gain_ratio"], 12), -r["feature"]))


class C45Classifier:
    def __init__(
        self,
        max_depth: Optional[int] = None,
        min_samples_leaf: int = 1,
        confidence_factor: Optional[float] = None,
        class_weight: Optional[str] = None,
        min_gain: float = 1e-7,
    ):
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.confidence_factor = confidence_factor
        self.class_weight = class_weight
        self.min_gain = min_gain
        self.root: Optional[Node] = None

    def get_params(self) -> dict:
        return {
            "max_depth": self.max_depth,
            "min_samples_leaf": self.min_samples_leaf,
            "confidence_factor": self.confidence_factor,
            "class_weight": self.class_weight,
        }

    def fit(self, X, y, feature_names: Sequence[str], classes: Sequence[str]) -> "C45Classifier":
        self.feature_names = list(feature_names)
        self.classes = list(classes)
        self.n_classes = len(self.classes)
        index = {c: i for i, c in enumerate(self.classes)}
        X = np.asarray(X, dtype=float)
        y_idx = np.array([index[v] for v in y], dtype=int)
        counts = np.bincount(y_idx, minlength=self.n_classes).astype(float)
        if self.class_weight == "balanced":
            class_w = np.where(counts > 0, len(y_idx) / (self.n_classes * np.maximum(counts, 1.0)), 0.0)
            weights = class_w[y_idx]
        else:
            weights = np.ones(len(y_idx))
        self.root = self._grow(X, y_idx, weights, 0)
        if self.confidence_factor is not None:
            self.prune(self.confidence_factor, inplace=True)
        return self

    def _grow(self, X: np.ndarray, y: np.ndarray, weights: np.ndarray, depth: int) -> Node:
        counts = np.bincount(y, minlength=self.n_classes).astype(float)
        weighted = np.bincount(y, weights=weights, minlength=self.n_classes)
        node = Node(counts=counts, weighted_counts=weighted, depth=depth)
        n = len(y)
        if (counts > 0).sum() == 1 or n < 2 * self.min_samples_leaf:
            return node
        if self.max_depth is not None and depth >= self.max_depth:
            return node
        best = choose_split(split_candidates(X, y, weights, self.n_classes, self.min_samples_leaf), self.min_gain)
        if best is None:
            return node
        mask = X[:, best["feature"]] <= best["threshold"]
        node.feature = best["feature"]
        node.threshold = best["threshold"]
        node.gain = best["gain"]
        node.gain_ratio = best["gain_ratio"]
        node.left = self._grow(X[mask], y[mask], weights[mask], depth + 1)
        node.right = self._grow(X[~mask], y[~mask], weights[~mask], depth + 1)
        return node

    def prune(self, confidence_factor: float, inplace: bool = False) -> "C45Classifier":
        """Error-based pruning with the pessimistic estimate. Subtree raising is not used."""
        target = self if inplace else copy.deepcopy(self)
        target.confidence_factor = confidence_factor

        def estimate_leaf(node: Node) -> float:
            return pessimistic_errors(node.n, node.errors, confidence_factor)

        def visit(node: Node) -> float:
            if node.is_leaf:
                return estimate_leaf(node)
            subtree = visit(node.left) + visit(node.right)
            as_leaf = estimate_leaf(node)
            if as_leaf <= subtree + PRUNE_TOLERANCE:
                node.left = node.right = None
                node.feature = node.threshold = node.gain = node.gain_ratio = None
                return as_leaf
            return subtree

        visit(target.root)
        return target

    def _leaf(self, row: np.ndarray) -> Node:
        node = self.root
        while not node.is_leaf:
            node = node.left if row[node.feature] <= node.threshold else node.right
        return node

    def predict(self, X) -> np.ndarray:
        X = np.asarray(X, dtype=float)
        return np.array([self.classes[self._leaf(row).prediction] for row in X])

    def predict_proba(self, X) -> np.ndarray:
        """Class shares of the training samples in the reached leaf (purity, not a calibrated probability)."""
        X = np.asarray(X, dtype=float)
        out = np.zeros((len(X), self.n_classes))
        for i, row in enumerate(X):
            leaf = self._leaf(row)
            out[i] = leaf.counts / max(leaf.counts.sum(), 1.0)
        return out

    def leaf_confidence(self, X) -> np.ndarray:
        X = np.asarray(X, dtype=float)
        out = np.zeros(len(X))
        for i, row in enumerate(X):
            leaf = self._leaf(row)
            out[i] = leaf.counts[leaf.prediction] / max(leaf.counts.sum(), 1.0)
        return out

    def _nodes(self) -> list[Node]:
        stack, out = [self.root], []
        while stack:
            node = stack.pop()
            out.append(node)
            if not node.is_leaf:
                stack.extend([node.left, node.right])
        return out

    @property
    def n_leaves(self) -> int:
        return sum(node.is_leaf for node in self._nodes())

    @property
    def n_nodes(self) -> int:
        return len(self._nodes())

    @property
    def depth(self) -> int:
        return max(node.depth for node in self._nodes())

    def rules(self) -> list[dict]:
        """One rule per leaf: ordered conditions from the root, class, samples, confidence."""
        out = []

        def walk(node: Node, conditions: list):
            if node.is_leaf:
                out.append(
                    {
                        "conditions": list(conditions),
                        "class": self.classes[node.prediction],
                        "samples": node.n,
                        "confidence": float(node.counts[node.prediction] / max(node.n, 1)),
                        "distribution": {c: int(node.counts[i]) for i, c in enumerate(self.classes)},
                    }
                )
                return
            name = self.feature_names[node.feature]
            walk(node.left, conditions + [(name, "<=", node.threshold)])
            walk(node.right, conditions + [(name, ">", node.threshold)])

        walk(self.root, [])
        return out

    def to_dict(self, version: str = "", extra: Optional[dict] = None) -> dict:
        def encode(node: Node) -> dict:
            distribution = {c: int(node.counts[i]) for i, c in enumerate(self.classes)}
            if node.is_leaf:
                return {
                    "leaf": True,
                    "class": self.classes[node.prediction],
                    "samples": node.n,
                    "distribution": distribution,
                    "confidence": float(node.counts[node.prediction] / max(node.n, 1)),
                }
            return {
                "leaf": False,
                "feature": self.feature_names[node.feature],
                "threshold": float(node.threshold),
                "gain": float(node.gain),
                "gain_ratio": float(node.gain_ratio),
                "samples": node.n,
                "distribution": distribution,
                "left": encode(node.left),
                "right": encode(node.right),
            }

        payload = {
            "format": TREE_FORMAT,
            "format_version": TREE_FORMAT_VERSION,
            "version": version,
            "features": self.feature_names,
            "classes": self.classes,
            "params": self.get_params(),
            "n_leaves": self.n_leaves,
            "depth": self.depth,
            "tree": encode(self.root),
        }
        if extra:
            payload["meta"] = extra
        return payload


def predict_from_dict(payload: dict, values: dict) -> dict:
    """Classify one sample from an exported tree using only the standard library."""
    node = payload["tree"]
    path = []
    while not node["leaf"]:
        feature, threshold = node["feature"], node["threshold"]
        if values[feature] <= threshold:
            path.append({"feature": feature, "operator": "<=", "threshold": threshold})
            node = node["left"]
        else:
            path.append({"feature": feature, "operator": ">", "threshold": threshold})
            node = node["right"]
    return {
        "predicted_class": node["class"],
        "confidence": node["confidence"],
        "samples": node["samples"],
        "rule_path": path,
    }
