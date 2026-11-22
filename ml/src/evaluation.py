"""Shared evaluation helpers for notebooks 03 to 07 (splits, metrics, curves, plots, timing)."""

from __future__ import annotations

import itertools
import time
from pathlib import Path
from typing import Callable, Iterable, Optional, Sequence

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import (
    auc,
    average_precision_score,
    f1_score,
    precision_recall_curve,
    precision_recall_fscore_support,
    roc_curve,
)
from sklearn.preprocessing import label_binarize

from . import c45

CLASSES = ("normal", "n_deficiency", "fe_deficiency")
CLASS_LABEL_ID = {"normal": "Normal", "n_deficiency": "Defisiensi N", "fe_deficiency": "Defisiensi Fe"}
CLASS_COLORS = {"normal": "#009E73", "n_deficiency": "#E69F00", "fe_deficiency": "#CC79A7"}
FEATURE_SETS = {
    "A1": ["Mean_R", "Mean_G", "Mean_B"],
    "A2": ["Mean_R", "Mean_G", "Mean_B", "Lab_L", "Lab_a", "Lab_b"],
}
FOLD_COLUMNS = ("fold_r1", "fold_r2", "fold_r3")
SEED = 42


# ------------------------------------------------------------------ data
def find_ml_dir(start: Path) -> Path:
    for folder in [start, *start.parents]:
        if (folder / "data" / "processed").exists() and (folder / "notebooks").exists():
            return folder
        if (folder / "ml" / "data" / "processed").exists():
            return folder / "ml"
    raise FileNotFoundError("Folder ml/ tidak ditemukan. Buka notebook ini dari dalam repo Nutrify.")


def load_partition(ml_dir: Path, partition: str) -> pd.DataFrame:
    processed = ml_dir / "data" / "processed"
    features = pd.read_csv(processed / "features.csv")
    splits = pd.read_csv(processed / "splits.csv")
    manifest = pd.read_csv(processed / "manifest.csv")[["image_id", "folder"]]
    frame = features[features["qc_status"] == "ok"].merge(
        splits[["image_id", "partition", *FOLD_COLUMNS]], on="image_id", how="inner"
    )
    frame = frame[frame["partition"] == partition].merge(manifest, on="image_id", how="left")
    for column in FOLD_COLUMNS:
        if partition == "train":
            frame[column] = frame[column].astype(int)
    return frame.reset_index(drop=True)


def iter_folds(frame: pd.DataFrame, fold_column: str):
    folds = frame[fold_column].to_numpy()
    for fold in sorted(np.unique(folds)):
        yield int(fold), np.nonzero(folds != fold)[0], np.nonzero(folds == fold)[0]


# ------------------------------------------------------------------ metrics
def macro_f1(y_true, y_pred) -> float:
    return float(f1_score(y_true, y_pred, labels=list(CLASSES), average="macro", zero_division=0))


def confusion_counts(y_true, y_pred) -> np.ndarray:
    index = {c: i for i, c in enumerate(CLASSES)}
    matrix = np.zeros((len(CLASSES), len(CLASSES)), dtype=int)
    for t, p in zip(y_true, y_pred):
        matrix[index[t], index[p]] += 1
    return matrix


def metrics_table(y_true, y_pred) -> pd.DataFrame:
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=list(CLASSES), zero_division=0
    )
    table = pd.DataFrame(
        {"precision": precision, "recall": recall, "f1": f1, "support": support},
        index=[CLASS_LABEL_ID[c] for c in CLASSES],
    )
    weights = support / support.sum()
    table.loc["Rata-rata makro"] = [precision.mean(), recall.mean(), f1.mean(), support.sum()]
    table.loc["Rata-rata berbobot"] = [(precision * weights).sum(), (recall * weights).sum(), (f1 * weights).sum(), support.sum()]
    table.loc["Akurasi"] = [np.nan, np.nan, float(np.mean(np.asarray(y_true) == np.asarray(y_pred))), support.sum()]
    return table


def bootstrap_group_ci(
    frame: pd.DataFrame,
    metric: Callable[[np.ndarray, np.ndarray], float],
    n_boot: int = 2000,
    level: float = 0.95,
    seed: int = SEED,
    true_column: str = "label",
    pred_column: str = "pred",
) -> dict:
    """Percentile interval from resampling source groups (all rows of a group move together)."""
    rng = np.random.default_rng(seed)
    groups = frame["source_group"].to_numpy()
    unique = np.unique(groups)
    rows_by_group = {g: np.nonzero(groups == g)[0] for g in unique}
    y_true = frame[true_column].to_numpy()
    y_pred = frame[pred_column].to_numpy()
    values = np.empty(n_boot)
    for b in range(n_boot):
        drawn = rng.choice(unique, size=len(unique), replace=True)
        idx = np.concatenate([rows_by_group[g] for g in drawn])
        values[b] = metric(y_true[idx], y_pred[idx])
    alpha = (1.0 - level) / 2.0
    return {
        "estimate": float(metric(y_true, y_pred)),
        "low": float(np.quantile(values, alpha)),
        "high": float(np.quantile(values, 1.0 - alpha)),
        "n_boot": n_boot,
    }


# ------------------------------------------------------------------ C4.5 grid
PRE_DEPTHS = (3, 4, 5, 6, None)
PRE_LEAVES = (2, 5, 10)
CONFIDENCE_FACTORS = (0.05, 0.10, 0.25, 0.40)


def c45_grid() -> pd.DataFrame:
    rows = [{"variant": "unpruned", "max_depth": None, "min_samples_leaf": 1, "confidence_factor": None}]
    for depth, leaf in itertools.product(PRE_DEPTHS, PRE_LEAVES):
        rows.append({"variant": "pre", "max_depth": depth, "min_samples_leaf": leaf, "confidence_factor": None})
    for cf in CONFIDENCE_FACTORS:
        rows.append({"variant": "post", "max_depth": None, "min_samples_leaf": 1, "confidence_factor": cf})
    for depth, leaf, cf in itertools.product(PRE_DEPTHS, PRE_LEAVES, CONFIDENCE_FACTORS):
        rows.append({"variant": "both", "max_depth": depth, "min_samples_leaf": leaf, "confidence_factor": cf})
    return pd.DataFrame(rows)


def tune_c45(
    frame: pd.DataFrame,
    features: Sequence[str],
    grid: pd.DataFrame,
    fold_columns: Sequence[str] = FOLD_COLUMNS,
    class_weight: Optional[str] = "balanced",
) -> pd.DataFrame:
    """Score every grid row on every fold. A tree is grown once per (depth, leaf) and pruned per CF."""
    X = frame[list(features)].to_numpy(dtype=float)
    y = frame["label"].to_numpy()
    shape_keys = grid[["max_depth", "min_samples_leaf"]].drop_duplicates().itertuples(index=False, name=None)
    shape_keys = [(None if pd.isna(d) else int(d), int(l)) for d, l in shape_keys]
    records = []
    for repeat, column in enumerate(fold_columns, start=1):
        for fold, train_idx, val_idx in iter_folds(frame, column):
            for depth, leaf in shape_keys:
                started = time.perf_counter()
                grown = c45.C45Classifier(max_depth=depth, min_samples_leaf=leaf, class_weight=class_weight)
                grown.fit(X[train_idx], y[train_idx], features, CLASSES)
                grow_seconds = time.perf_counter() - started
                rows = grid[
                    (grid["max_depth"].fillna(-1) == (-1 if depth is None else depth)) & (grid["min_samples_leaf"] == leaf)
                ]
                for row in rows.itertuples():
                    cf = None if pd.isna(row.confidence_factor) else float(row.confidence_factor)
                    started = time.perf_counter()
                    model = grown if cf is None else grown.prune(cf)
                    prune_seconds = 0.0 if cf is None else time.perf_counter() - started
                    records.append(
                        {
                            "config_id": int(row.Index),
                            "repeat": repeat,
                            "fold": fold,
                            "val_macro_f1": macro_f1(y[val_idx], model.predict(X[val_idx])),
                            "train_macro_f1": macro_f1(y[train_idx], model.predict(X[train_idx])),
                            "val_accuracy": float(np.mean(model.predict(X[val_idx]) == y[val_idx])),
                            "n_leaves": model.n_leaves,
                            "depth": model.depth,
                            "fit_seconds": grow_seconds + prune_seconds,
                        }
                    )
    return pd.DataFrame(records)


def summarize_grid(grid: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:
    summary = (
        scores.groupby("config_id")
        .agg(
            val_f1_mean=("val_macro_f1", "mean"),
            val_f1_sd=("val_macro_f1", lambda s: s.std(ddof=1)),
            train_f1_mean=("train_macro_f1", "mean"),
            val_acc_mean=("val_accuracy", "mean"),
            leaves_mean=("n_leaves", "mean"),
            depth_mean=("depth", "mean"),
        )
    )
    return grid.join(summary)


def select_best_config(summary: pd.DataFrame, decimals: int = 4) -> pd.Series:
    """Highest mean validation macro F1; a tie (equal at `decimals`) goes to the tree with fewer leaves."""
    ranked = summary.assign(_f1=summary["val_f1_mean"].round(decimals)).sort_values(
        ["_f1", "leaves_mean"], ascending=[False, True], kind="stable"
    )
    return ranked.iloc[0].drop("_f1")


def params_of(row: pd.Series) -> dict:
    depth = None if pd.isna(row["max_depth"]) else int(row["max_depth"])
    cf = None if pd.isna(row["confidence_factor"]) else float(row["confidence_factor"])
    return {"max_depth": depth, "min_samples_leaf": int(row["min_samples_leaf"]), "confidence_factor": cf}


# ------------------------------------------------------------------ cross-validated predictions
def cross_val_predictions(
    make_model: Callable[[], object],
    frame: pd.DataFrame,
    features: Sequence[str],
    fold_columns: Sequence[str] = FOLD_COLUMNS,
    fit: Optional[Callable] = None,
) -> pd.DataFrame:
    X = frame[list(features)].to_numpy(dtype=float)
    y = frame["label"].to_numpy()
    out = []
    for repeat, column in enumerate(fold_columns, start=1):
        for fold, train_idx, val_idx in iter_folds(frame, column):
            model = make_model()
            if fit is None:
                model.fit(X[train_idx], y[train_idx], features, CLASSES)
            else:
                fit(model, X[train_idx], y[train_idx])
            proba = model.predict_scores(X[val_idx]) if hasattr(model, "predict_scores") else model.predict_proba(X[val_idx])
            part = frame.iloc[val_idx][["image_id", "source_group", "label", "folder"]].copy()
            part["repeat"] = repeat
            part["fold"] = fold
            part["pred"] = model.predict(X[val_idx])
            for i, c in enumerate(CLASSES):
                part[f"score_{c}"] = proba[:, i]
            if hasattr(model, "leaf_confidence"):
                part["confidence"] = model.leaf_confidence(X[val_idx])
            out.append(part)
    return pd.concat(out, ignore_index=True)


def fold_scores(oof: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (repeat, fold), part in oof.groupby(["repeat", "fold"]):
        rows.append(
            {
                "repeat": repeat,
                "fold": fold,
                "macro_f1": macro_f1(part["label"], part["pred"]),
                "accuracy": float(np.mean(part["label"] == part["pred"])),
            }
        )
    return pd.DataFrame(rows)


def learning_curve(
    make_model: Callable[[], object],
    frame: pd.DataFrame,
    features: Sequence[str],
    fold_column: str = "fold_r1",
    fractions: Iterable[float] = (0.2, 0.4, 0.6, 0.8, 1.0),
    seed: int = SEED,
) -> pd.DataFrame:
    """Score against training size, drawing a fraction of the source groups of every class."""
    rng = np.random.default_rng(seed)
    X = frame[list(features)].to_numpy(dtype=float)
    y = frame["label"].to_numpy()
    groups = frame["source_group"].to_numpy()
    rows = []
    for fraction in fractions:
        for fold, train_idx, val_idx in iter_folds(frame, fold_column):
            keep = []
            for c in CLASSES:
                class_groups = np.unique(groups[train_idx][y[train_idx] == c])
                n_keep = max(1, int(np.ceil(fraction * len(class_groups))))
                keep.extend(rng.choice(class_groups, size=n_keep, replace=False))
            sub_idx = train_idx[np.isin(groups[train_idx], keep)]
            model = make_model()
            model.fit(X[sub_idx], y[sub_idx], features, CLASSES)
            rows.append(
                {
                    "fraction": fraction,
                    "fold": fold,
                    "train_files": len(sub_idx),
                    "train_macro_f1": macro_f1(y[sub_idx], model.predict(X[sub_idx])),
                    "val_macro_f1": macro_f1(y[val_idx], model.predict(X[val_idx])),
                }
            )
    return pd.DataFrame(rows)


def permutation_importance(
    make_model: Callable[[], object],
    frame: pd.DataFrame,
    features: Sequence[str],
    fold_column: str = "fold_r1",
    n_repeats: int = 30,
    seed: int = SEED,
) -> pd.DataFrame:
    """Drop in validation macro F1 when one feature is shuffled, averaged over folds and shuffles."""
    rng = np.random.default_rng(seed)
    X = frame[list(features)].to_numpy(dtype=float)
    y = frame["label"].to_numpy()
    rows = []
    for fold, train_idx, val_idx in iter_folds(frame, fold_column):
        model = make_model()
        model.fit(X[train_idx], y[train_idx], features, CLASSES)
        base = macro_f1(y[val_idx], model.predict(X[val_idx]))
        for j, name in enumerate(features):
            drops = []
            for _ in range(n_repeats):
                shuffled = X[val_idx].copy()
                shuffled[:, j] = rng.permutation(shuffled[:, j])
                drops.append(base - macro_f1(y[val_idx], model.predict(shuffled)))
            rows.append({"fold": fold, "feature": name, "drop_mean": float(np.mean(drops))})
    table = pd.DataFrame(rows)
    return table.groupby("feature").agg(importance_mean=("drop_mean", "mean"), importance_sd=("drop_mean", "std")).loc[list(features)]


# ------------------------------------------------------------------ timing
def time_calls(function: Callable[[], object], repeats: int = 10, warmup: int = 1) -> dict:
    for _ in range(warmup):
        function()
    values = []
    for _ in range(repeats):
        started = time.perf_counter()
        function()
        values.append(time.perf_counter() - started)
    values = np.asarray(values)
    return {"mean": float(values.mean()), "sd": float(values.std(ddof=1)) if len(values) > 1 else 0.0, "n": repeats}


def time_single_predictions(predict_one: Callable[[int], object], n_samples: int, repeats: int = 5) -> dict:
    """Milliseconds per sample, predicting one sample at a time (as the live worker does)."""
    per_sample = []
    for _ in range(repeats):
        started = time.perf_counter()
        for i in range(n_samples):
            predict_one(i)
        per_sample.append((time.perf_counter() - started) * 1000.0 / n_samples)
    per_sample = np.asarray(per_sample)
    return {"mean_ms": float(per_sample.mean()), "sd_ms": float(per_sample.std(ddof=1)), "n_samples": n_samples, "repeats": repeats}


# ------------------------------------------------------------------ plots
def plot_confusion(counts: np.ndarray, axes=None, title: str = ""):
    if axes is None:
        _, axes = plt.subplots(1, 2, figsize=(10, 4.2))
    labels = [CLASS_LABEL_ID[c] for c in CLASSES]
    normalized = counts / np.maximum(counts.sum(axis=1, keepdims=True), 1)
    for ax, matrix, fmt, sub in ((axes[0], counts, "d", "Jumlah"), (axes[1], normalized, ".2f", "Dinormalisasi per kelas sebenarnya")):
        image = ax.imshow(matrix, cmap="Blues", vmin=0, vmax=matrix.max() if matrix.max() > 0 else 1)
        ax.set_xticks(range(3), labels, rotation=20)
        ax.set_yticks(range(3), labels)
        ax.set_xlabel("Prediksi")
        ax.set_ylabel("Sebenarnya")
        ax.set_title(f"{title} {sub}".strip())
        threshold = matrix.max() / 2 if matrix.max() > 0 else 0.5
        for i, j in itertools.product(range(3), range(3)):
            ax.text(j, i, format(matrix[i, j], fmt), ha="center", va="center", color="white" if matrix[i, j] > threshold else "black")
    return axes


def curve_data(oof: pd.DataFrame) -> dict:
    y = label_binarize(oof["label"], classes=list(CLASSES))
    scores = oof[[f"score_{c}" for c in CLASSES]].to_numpy()
    out = {}
    for i, c in enumerate(CLASSES):
        fpr, tpr, _ = roc_curve(y[:, i], scores[:, i])
        precision, recall, _ = precision_recall_curve(y[:, i], scores[:, i])
        out[c] = {
            "fpr": fpr, "tpr": tpr, "auc": float(auc(fpr, tpr)),
            "precision": precision, "recall": recall, "ap": float(average_precision_score(y[:, i], scores[:, i])),
            "prevalence": float(y[:, i].mean()),
        }
    return out


def plot_roc_pr(oof: pd.DataFrame, axes=None):
    data = curve_data(oof)
    if axes is None:
        _, axes = plt.subplots(1, 2, figsize=(11, 4.4))
    for c in CLASSES:
        axes[0].plot(data[c]["fpr"], data[c]["tpr"], color=CLASS_COLORS[c], label=f"{CLASS_LABEL_ID[c]} (AUC {data[c]['auc']:.3f})")
        axes[1].plot(data[c]["recall"], data[c]["precision"], color=CLASS_COLORS[c], label=f"{CLASS_LABEL_ID[c]} (AP {data[c]['ap']:.3f})")
        axes[1].axhline(data[c]["prevalence"], color=CLASS_COLORS[c], linestyle=":", linewidth=0.8)
    axes[0].plot([0, 1], [0, 1], color="grey", linestyle="--", linewidth=0.8)
    axes[0].set(xlabel="False positive rate", ylabel="True positive rate", title="ROC satu-lawan-semua")
    axes[1].set(xlabel="Recall", ylabel="Precision", title="Precision-Recall satu-lawan-semua")
    for ax in axes:
        ax.legend(frameon=False, fontsize=8, loc="lower right" if ax is axes[0] else "lower left")
    return data


def _tree_layout(node: dict) -> tuple[dict, int]:
    positions: dict[int, tuple[float, int]] = {}
    counter = itertools.count()

    def walk(n: dict, depth: int) -> float:
        if n["leaf"]:
            x = float(next(counter))
        else:
            x = (walk(n["left"], depth + 1) + walk(n["right"], depth + 1)) / 2.0
        positions[id(n)] = (x, depth)
        return x

    walk(node, 0)
    return positions, max(d for _, d in positions.values())


def plot_tree_diagram(payload: dict, ax=None, class_colors=CLASS_COLORS, label_ids=CLASS_LABEL_ID):
    root = payload["tree"]
    positions, max_depth = _tree_layout(root)
    n_leaves = payload["n_leaves"]
    if ax is None:
        _, ax = plt.subplots(figsize=(max(9.0, 1.15 * n_leaves), 1.7 * (max_depth + 1)))

    def draw(n: dict):
        x, depth = positions[id(n)]
        if n["leaf"]:
            ax.text(
                x, -depth, f"{label_ids[n['class']]}\nn={n['samples']}\nkonf={n['confidence']:.2f}",
                ha="center", va="center", fontsize=7,
                bbox=dict(boxstyle="round,pad=0.25", fc=class_colors[n["class"]], ec="none", alpha=0.85), color="white",
            )
            return
        ax.text(
            x, -depth, f"{n['feature']} <= {n['threshold']:.2f}\nGR={n['gain_ratio']:.2f} n={n['samples']}",
            ha="center", va="center", fontsize=7, bbox=dict(boxstyle="round,pad=0.25", fc="#F2F4F8", ec="#8A94A6"),
        )
        for child, tag in ((n["left"], "ya"), (n["right"], "tidak")):
            cx, cd = positions[id(child)]
            ax.plot([x, cx], [-depth - 0.18, -cd + 0.2], color="#8A94A6", linewidth=0.8, zorder=0)
            ax.text((x + cx) / 2, (-depth - cd) / 2 + 0.05, tag, fontsize=6, color="#5B6573", ha="center")
            draw(child)

    draw(root)
    ax.set_xlim(-0.6, n_leaves - 0.4)
    ax.set_ylim(-max_depth - 0.6, 0.6)
    ax.axis("off")
    return ax


def plot_gallery(errors: pd.DataFrame, raw_dir: Path, max_items: int = 12, columns: int = 4, seed: int = SEED, size: int = 256):
    import cv2

    errors = errors.sample(n=min(max_items, len(errors)), random_state=seed) if len(errors) else errors
    rows = int(np.ceil(max(len(errors), 1) / columns))
    fig, axes = plt.subplots(rows, columns, figsize=(3.0 * columns, 3.2 * rows))
    axes = np.atleast_1d(axes).ravel()
    for ax in axes:
        ax.axis("off")
    for ax, row in zip(axes, errors.itertuples()):
        path = Path(raw_dir) / row.folder / row.image_id
        image = cv2.imread(str(path))
        if image is not None:
            ax.imshow(cv2.cvtColor(cv2.resize(image, (size, size), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB))
        ax.set_title(f"{CLASS_LABEL_ID[row.label]} → {CLASS_LABEL_ID[row.pred]}", fontsize=8)
    fig.tight_layout()
    return fig


# ------------------------------------------------------------------ fast metrics for bootstrap
def fast_macro_f1(y_true, y_pred) -> float:
    matrix = confusion_counts(y_true, y_pred)
    tp = np.diag(matrix).astype(float)
    denominator = matrix.sum(axis=0) + matrix.sum(axis=1)
    return float(np.mean(np.where(denominator > 0, 2.0 * tp / np.maximum(denominator, 1), 0.0)))


def fast_accuracy(y_true, y_pred) -> float:
    return float(np.mean(np.asarray(y_true) == np.asarray(y_pred)))


def fast_recall(label: str) -> Callable:
    def metric(y_true, y_pred) -> float:
        y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
        mask = y_true == label
        return float(np.mean(y_pred[mask] == label)) if mask.any() else float("nan")

    return metric


# ------------------------------------------------------------------ heatmap
def depth_label(value) -> str:
    return "tak terbatas" if value is None or (isinstance(value, float) and np.isnan(value)) else str(int(value))


def plot_heatmap(ax, pivot: pd.DataFrame, title: str, vmin: float, vmax: float, xlabel: str, ylabel: str):
    image = ax.imshow(pivot.to_numpy(dtype=float), cmap="viridis", vmin=vmin, vmax=vmax, aspect="auto")
    ax.set_xticks(range(pivot.shape[1]), [str(c) for c in pivot.columns])
    ax.set_yticks(range(pivot.shape[0]), [str(r) for r in pivot.index])
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_title(title, fontsize=9)
    midpoint = (vmin + vmax) / 2
    for i, j in itertools.product(range(pivot.shape[0]), range(pivot.shape[1])):
        value = pivot.iloc[i, j]
        if not np.isnan(value):
            ax.text(j, i, f"{value:.3f}", ha="center", va="center", fontsize=7, color="white" if value < midpoint else "black")
    return image


# ------------------------------------------------------------------ generic tuning (comparators)
def params_from_row(row: pd.Series, columns: Sequence[str]) -> dict:
    params = {}
    for column in columns:
        value = row[column]
        if value is None or (isinstance(value, float) and np.isnan(value)):
            params[column] = None
        elif isinstance(value, (float, np.floating)) and float(value).is_integer():
            params[column] = int(value)
        elif isinstance(value, np.generic):
            params[column] = value.item()
        else:
            params[column] = value
    return params


def tune_model(
    make_model: Callable[[dict], object],
    grid: pd.DataFrame,
    frame: pd.DataFrame,
    features: Sequence[str],
    fold_columns: Sequence[str] = FOLD_COLUMNS,
    extras: Optional[Callable[[object], dict]] = None,
) -> pd.DataFrame:
    """Score every grid row on every fold. Grid columns are the constructor parameters of the model."""
    X = frame[list(features)].to_numpy(dtype=float)
    y = frame["label"].to_numpy()
    columns = list(grid.columns)
    records = []
    for repeat, column in enumerate(fold_columns, start=1):
        for fold, train_idx, val_idx in iter_folds(frame, column):
            for config_id, row in grid.iterrows():
                model = make_model(params_from_row(row, columns))
                started = time.perf_counter()
                model.fit(X[train_idx], y[train_idx], features, CLASSES)
                fit_seconds = time.perf_counter() - started
                val_pred = model.predict(X[val_idx])
                record = {
                    "config_id": int(config_id),
                    "repeat": repeat,
                    "fold": fold,
                    "val_macro_f1": macro_f1(y[val_idx], val_pred),
                    "train_macro_f1": macro_f1(y[train_idx], model.predict(X[train_idx])),
                    "val_accuracy": float(np.mean(val_pred == y[val_idx])),
                    "fit_seconds": fit_seconds,
                }
                if extras is not None:
                    record.update(extras(model))
                records.append(record)
    return pd.DataFrame(records)


def summarize_tuning(grid: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:
    base = {"config_id", "repeat", "fold", "val_macro_f1", "train_macro_f1", "val_accuracy", "fit_seconds"}
    grouped = scores.groupby("config_id")
    summary = pd.DataFrame(
        {
            "val_f1_mean": grouped["val_macro_f1"].mean(),
            "val_f1_sd": grouped["val_macro_f1"].std(ddof=1),
            "train_f1_mean": grouped["train_macro_f1"].mean(),
            "val_acc_mean": grouped["val_accuracy"].mean(),
            "fit_seconds_mean": grouped["fit_seconds"].mean(),
        }
    )
    for column in scores.columns:
        if column not in base:
            summary[f"{column}_mean"] = grouped[column].mean()
    return grid.join(summary)


def select_best(summary: pd.DataFrame, tie_column: str, decimals: int = 4) -> pd.Series:
    """Highest mean validation macro F1; a tie (equal at `decimals`) goes to the lower `tie_column` value."""
    ranked = summary.assign(_f1=summary["val_f1_mean"].round(decimals)).sort_values(
        ["_f1", tie_column], ascending=[False, True], kind="stable"
    )
    return ranked.iloc[0].drop("_f1")


def load_selected_feature_set(ml_dir: Path) -> str:
    import json

    path = Path(ml_dir) / "reports" / "results" / "03_c45_results.json"
    if not path.exists():
        raise FileNotFoundError("03_c45_results.json tidak ditemukan. Jalankan notebook 03 terlebih dahulu.")
    return json.loads(path.read_text(encoding="utf-8"))["feature_set_decision"]["selected"]


# ------------------------------------------------------------------ decision regions
def top_feature_pair(importance: pd.DataFrame) -> tuple:
    ordered = importance.sort_values("importance_mean", ascending=False).index.tolist()
    return ordered[0], ordered[1]


def plot_decision_regions(model, frame: pd.DataFrame, features: Sequence[str], pair: tuple, ax, resolution: int = 160, title: str = ""):
    """Class regions on a plane of two features; the other features are held at their median."""
    from matplotlib.colors import ListedColormap

    features = list(features)
    j1, j2 = features.index(pair[0]), features.index(pair[1])
    X = frame[features].to_numpy(dtype=float)
    base = np.median(X, axis=0)
    pad1, pad2 = 0.05 * np.ptp(X[:, j1]), 0.05 * np.ptp(X[:, j2])
    xs = np.linspace(X[:, j1].min() - pad1, X[:, j1].max() + pad1, resolution)
    ys = np.linspace(X[:, j2].min() - pad2, X[:, j2].max() + pad2, resolution)
    xx, yy = np.meshgrid(xs, ys)
    points = np.tile(base, (xx.size, 1))
    points[:, j1], points[:, j2] = xx.ravel(), yy.ravel()
    predicted = model.predict(points)
    index = np.array([CLASSES.index(p) for p in predicted]).reshape(xx.shape)
    cmap = ListedColormap([CLASS_COLORS[c] for c in CLASSES])
    ax.pcolormesh(xx, yy, index, cmap=cmap, alpha=0.30, shading="auto", vmin=0, vmax=len(CLASSES) - 1)
    for c in CLASSES:
        mask = frame["label"].to_numpy() == c
        ax.scatter(X[mask, j1], X[mask, j2], s=12, color=CLASS_COLORS[c], edgecolor="white", linewidth=0.3, label=CLASS_LABEL_ID[c])
    ax.set_xlabel(pair[0])
    ax.set_ylabel(pair[1])
    ax.set_title(title, fontsize=9)


# ------------------------------------------------------------------ model comparison (notebook 07)
MODEL_COLORS = {"C4.5": "#1b9e77", "SVM": "#d95f02", "Naive Bayes": "#7570b3", "Random Forest": "#e7298a"}


def score_matrix(model, X) -> np.ndarray:
    return model.predict_scores(X) if hasattr(model, "predict_scores") else model.predict_proba(X)


def paired_bootstrap_difference(
    y_true,
    pred_a,
    pred_b,
    groups,
    metric: Callable[[np.ndarray, np.ndarray], float],
    n_boot: int = 2000,
    level: float = 0.95,
    seed: int = SEED,
) -> dict:
    """metric(A) - metric(B) with the same resampled source groups for both models."""
    rng = np.random.default_rng(seed)
    y_true, pred_a, pred_b, groups = (np.asarray(v) for v in (y_true, pred_a, pred_b, groups))
    unique = np.unique(groups)
    rows_by_group = {g: np.nonzero(groups == g)[0] for g in unique}
    differences = np.empty(n_boot)
    for b in range(n_boot):
        idx = np.concatenate([rows_by_group[g] for g in rng.choice(unique, size=len(unique), replace=True)])
        differences[b] = metric(y_true[idx], pred_a[idx]) - metric(y_true[idx], pred_b[idx])
    alpha = (1.0 - level) / 2.0
    return {
        "estimate": float(metric(y_true, pred_a) - metric(y_true, pred_b)),
        "low": float(np.quantile(differences, alpha)),
        "high": float(np.quantile(differences, 1.0 - alpha)),
        "share_positive": float(np.mean(differences > 0)),
    }


def plot_model_curves(frames: dict):
    """ROC (top) and precision-recall (bottom) per class, one line per model."""
    fig, axes = plt.subplots(2, len(CLASSES), figsize=(5 * len(CLASSES), 8.4))
    rows = []
    for name, frame in frames.items():
        y = label_binarize(frame["label"], classes=list(CLASSES))
        scores = frame[[f"score_{c}" for c in CLASSES]].to_numpy()
        for i, c in enumerate(CLASSES):
            fpr, tpr, _ = roc_curve(y[:, i], scores[:, i])
            precision, recall, _ = precision_recall_curve(y[:, i], scores[:, i])
            roc_auc, ap = float(auc(fpr, tpr)), float(average_precision_score(y[:, i], scores[:, i]))
            axes[0, i].plot(fpr, tpr, color=MODEL_COLORS[name], label=f"{name} (AUC {roc_auc:.3f})")
            axes[1, i].plot(recall, precision, color=MODEL_COLORS[name], label=f"{name} (AP {ap:.3f})")
            rows.append({"model": name, "kelas": CLASS_LABEL_ID[c], "AUC": roc_auc, "AP": ap})
    for i, c in enumerate(CLASSES):
        axes[0, i].plot([0, 1], [0, 1], color="grey", linestyle="--", linewidth=0.8)
        axes[0, i].set(title=f"ROC: {CLASS_LABEL_ID[c]}", xlabel="False positive rate", ylabel="True positive rate")
        axes[1, i].set(title=f"Precision-Recall: {CLASS_LABEL_ID[c]}", xlabel="Recall", ylabel="Precision")
        axes[0, i].legend(frameon=False, fontsize=8, loc="lower right")
        axes[1, i].legend(frameon=False, fontsize=8, loc="lower left")
    fig.tight_layout()
    return fig, pd.DataFrame(rows)
