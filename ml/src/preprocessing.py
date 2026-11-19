"""Image preprocessing pipeline of Nutrify.

The same functions are used by the training notebooks and by the live vision worker, so the
features seen in training and at runtime are computed identically (docs/ML.md, section 3).

Pipeline (one plant per image):

    1. resize          256 x 256, area interpolation
    2. gaussian blur   5 x 5, used for segmentation only
    3. CIELAB          8-bit OpenCV scale, converted back to physical units for features
    4. threshold       Otsu on one colour channel (default: a*)
    5. morphology      opening, then closing, 5 x 5 ellipse, then select blobs (see component_rule)
    6. segmentation    mask applied to the resized, unblurred image
    7. contour         largest contour and bounding box (visual check, not a feature)
    8. colour features mean R, G, B and mean L*, a*, b* over mask pixels only
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import numpy as np

CLASS_CODES = ("normal", "n_deficiency", "fe_deficiency")
SEGMENTATION_CHANNELS = ("a", "b", "chroma")
COMPONENT_RULES = ("largest", "relative")

FEATURES_A1 = ("Mean_R", "Mean_G", "Mean_B")
FEATURES_A2 = FEATURES_A1 + ("Lab_L", "Lab_a", "Lab_b")

QC_OK = "ok"
QC_INVALID_LEAF = "invalid_leaf"


@dataclass(frozen=True)
class PipelineConfig:
    """Parameters of the pipeline. They are stored in the model registry."""

    resize: int = 256
    blur_kernel: int = 5
    morphology_size: int = 5
    segmentation_channel: str = "a"
    component_rule: str = "largest"
    min_component_ratio: float = 0.05
    min_leaf_area_ratio: float = 0.0
    max_leaf_area_ratio: float = 1.0

    def __post_init__(self) -> None:
        if self.segmentation_channel not in SEGMENTATION_CHANNELS:
            raise ValueError(f"segmentation_channel must be one of {SEGMENTATION_CHANNELS}")
        if self.component_rule not in COMPONENT_RULES:
            raise ValueError(f"component_rule must be one of {COMPONENT_RULES}")
        if not 0.0 <= self.min_component_ratio <= 1.0:
            raise ValueError("min_component_ratio must be between 0 and 1")
        if self.blur_kernel % 2 == 0 or self.morphology_size % 2 == 0:
            raise ValueError("blur_kernel and morphology_size must be odd")

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PipelineResult:
    """Output of one run of the pipeline."""

    features: dict[str, float]
    mask_area_ratio: float
    threshold: int
    qc_status: str
    steps: dict[str, np.ndarray] | None = None


# ---------------------------------------------------------------------------
# Reading
# ---------------------------------------------------------------------------


def read_image_bgr(path: str | Path) -> np.ndarray:
    """Read an image as a BGR uint8 array. Works with non-ASCII Windows paths."""
    data = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Cannot decode image: {path}")
    return image


# ---------------------------------------------------------------------------
# Steps 1 to 3
# ---------------------------------------------------------------------------


def resize_square(bgr: np.ndarray, size: int) -> np.ndarray:
    """Step 1: resize to size x size with area interpolation."""
    return cv2.resize(bgr, (size, size), interpolation=cv2.INTER_AREA)


def gaussian_blur(bgr: np.ndarray, kernel: int) -> np.ndarray:
    """Step 2: Gaussian blur. Sigma is derived from the kernel size (OpenCV sigma = 0)."""
    return cv2.GaussianBlur(bgr, (kernel, kernel), 0)


def to_lab_uint8(bgr: np.ndarray) -> np.ndarray:
    """Step 3: BGR to CIELAB in the 8-bit OpenCV scale (L*255/100, a+128, b+128)."""
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)


def lab_uint8_to_physical(lab8: np.ndarray) -> np.ndarray:
    """Convert OpenCV 8-bit Lab to physical units: L* in 0..100, a* and b* centred on 0."""
    lab = lab8.astype(np.float32)
    lab[..., 0] = lab[..., 0] * 100.0 / 255.0
    lab[..., 1] -= 128.0
    lab[..., 2] -= 128.0
    return lab


# ---------------------------------------------------------------------------
# Step 4: Otsu threshold
# ---------------------------------------------------------------------------


def otsu_threshold(channel: np.ndarray) -> int:
    """Otsu threshold of an 8-bit channel, implemented from the histogram.

    Maximises the between-class variance  w0 * w1 * (mu0 - mu1)^2.
    Pixels with a value <= threshold belong to class 0, the others to class 1.
    """
    if channel.dtype != np.uint8:
        raise ValueError("otsu_threshold expects a uint8 channel")
    histogram = np.bincount(channel.ravel(), minlength=256).astype(np.float64)
    total = histogram.sum()
    levels = np.arange(256, dtype=np.float64)

    weight0 = np.cumsum(histogram) / total
    cumulative_mean = np.cumsum(histogram * levels) / total
    total_mean = cumulative_mean[-1]

    with np.errstate(divide="ignore", invalid="ignore"):
        between = (total_mean * weight0 - cumulative_mean) ** 2 / (weight0 * (1.0 - weight0))

    if np.all(np.isnan(between)):
        return int(channel.flat[0])
    return int(np.nanargmax(between))


def segmentation_values(lab8: np.ndarray, channel: str) -> tuple[np.ndarray, bool]:
    """Pick the 8-bit values that Otsu is applied to.

    Returns the values and whether the leaf is the HIGH class.
    - "a": a* channel; green leaf has a low a*, so the leaf is the low class.
    - "b": b* channel; green and yellow leaf have a high b*, background is near zero.
    - "chroma": sqrt(a*^2 + b*^2); coloured leaf is high, grey and white background is low.
    """
    if channel == "a":
        return lab8[..., 1], False
    if channel == "b":
        return lab8[..., 2], True
    if channel == "chroma":
        a = lab8[..., 1].astype(np.float32) - 128.0
        b = lab8[..., 2].astype(np.float32) - 128.0
        chroma = np.clip(np.rint(np.sqrt(a * a + b * b)), 0, 255).astype(np.uint8)
        return chroma, True
    raise ValueError(f"Unknown segmentation channel: {channel}")


def threshold_mask(values: np.ndarray, leaf_is_high: bool) -> tuple[np.ndarray, int]:
    """Step 4: binary mask (1 = leaf) from Otsu's threshold. Returns the mask and the threshold."""
    threshold = otsu_threshold(values)
    leaf = values > threshold if leaf_is_high else values <= threshold
    return leaf.astype(np.uint8), threshold


# ---------------------------------------------------------------------------
# Step 5: morphology
# ---------------------------------------------------------------------------


def open_close(mask: np.ndarray, size: int) -> np.ndarray:
    """Step 5a: opening, then closing, with an elliptical kernel."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))
    opened = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    return cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)


def select_components(mask: np.ndarray, rule: str = "largest", min_ratio: float = 0.05) -> np.ndarray:
    """Step 5b: choose which connected blobs are leaf.

    - "largest": keep only the largest blob.
    - "relative": keep every blob whose area is at least `min_ratio` times the largest blob.
    """
    if rule not in COMPONENT_RULES:
        raise ValueError(f"rule must be one of {COMPONENT_RULES}")
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if count <= 1:
        return np.zeros_like(mask)
    areas = stats[1:, cv2.CC_STAT_AREA]
    if rule == "largest":
        keep = [1 + int(np.argmax(areas))]
    else:
        keep = [1 + i for i, area in enumerate(areas) if area >= min_ratio * areas.max()]
    return np.isin(labels, keep).astype(np.uint8)


def clean_mask(
    mask: np.ndarray, size: int, rule: str = "largest", min_ratio: float = 0.05
) -> np.ndarray:
    """Step 5: opening, closing, then blob selection."""
    return select_components(open_close(mask, size), rule, min_ratio)


# ---------------------------------------------------------------------------
# Steps 6 and 7
# ---------------------------------------------------------------------------


def apply_mask(bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Step 6: keep leaf pixels, set the rest to black."""
    return bgr * mask[..., None]


def find_leaf_contour(mask: np.ndarray):
    """Step 7: largest external contour and its bounding box (x, y, w, h)."""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None, None
    contour = max(contours, key=cv2.contourArea)
    return contour, cv2.boundingRect(contour)


def draw_contour_overlay(bgr: np.ndarray, contour, box) -> np.ndarray:
    """Draw the contour and the bounding box on a copy of the image."""
    overlay = bgr.copy()
    if contour is not None:
        cv2.drawContours(overlay, [contour], -1, (0, 0, 255), 2)
        x, y, w, h = box
        cv2.rectangle(overlay, (x, y), (x + w, y + h), (255, 0, 0), 2)
    return overlay


# ---------------------------------------------------------------------------
# Step 8: colour features
# ---------------------------------------------------------------------------


def extract_features(bgr: np.ndarray, lab8: np.ndarray, mask: np.ndarray) -> dict[str, float]:
    """Step 8: mean colour over mask pixels only, rounded to one decimal.

    `bgr` and `lab8` must come from the resized, UNBLURRED image.
    """
    leaf = mask.astype(bool)
    if not leaf.any():
        return {name: float("nan") for name in FEATURES_A2}

    mean_bgr = bgr[leaf].mean(axis=0)
    mean_lab = lab_uint8_to_physical(lab8)[leaf].mean(axis=0)
    values = {
        "Mean_R": mean_bgr[2],
        "Mean_G": mean_bgr[1],
        "Mean_B": mean_bgr[0],
        "Lab_L": mean_lab[0],
        "Lab_a": mean_lab[1],
        "Lab_b": mean_lab[2],
    }
    return {name: round(float(value), 1) for name, value in values.items()}


# ---------------------------------------------------------------------------
# Quality control and the full pipeline
# ---------------------------------------------------------------------------


def qc_status(mask_area_ratio: float, config: PipelineConfig) -> str:
    """`invalid_leaf` when the leaf area ratio is outside the configured limits."""
    if not np.isfinite(mask_area_ratio) or mask_area_ratio <= 0.0:
        return QC_INVALID_LEAF
    if mask_area_ratio < config.min_leaf_area_ratio or mask_area_ratio > config.max_leaf_area_ratio:
        return QC_INVALID_LEAF
    return QC_OK


def segment(resized: np.ndarray, config: PipelineConfig) -> tuple[np.ndarray, int, dict[str, np.ndarray]]:
    """Steps 2 to 5: blur, Lab, Otsu, morphology. Returns the clean mask, the threshold, and
    the intermediate images."""
    blurred = gaussian_blur(resized, config.blur_kernel)
    lab_blurred = to_lab_uint8(blurred)
    values, leaf_is_high = segmentation_values(lab_blurred, config.segmentation_channel)
    raw_mask, threshold = threshold_mask(values, leaf_is_high)
    mask = clean_mask(raw_mask, config.morphology_size, config.component_rule, config.min_component_ratio)
    steps = {
        "blurred": blurred,
        "lab_blurred": lab_blurred,
        "segmentation_values": values,
        "raw_mask": raw_mask,
        "mask": mask,
    }
    return mask, threshold, steps


def process_image(
    bgr: np.ndarray, config: PipelineConfig, keep_steps: bool = False
) -> PipelineResult:
    """Run the whole pipeline on one plant image (BGR, uint8)."""
    resized = resize_square(bgr, config.resize)
    mask, threshold, steps = segment(resized, config)

    lab_sharp = to_lab_uint8(resized)
    features = extract_features(resized, lab_sharp, mask)
    ratio = float(mask.mean())
    status = qc_status(ratio, config)

    kept = None
    if keep_steps:
        contour, box = find_leaf_contour(mask)
        kept = {
            "resized": resized,
            "segmented": apply_mask(resized, mask),
            "overlay": draw_contour_overlay(resized, contour, box),
            "box": box,
            **steps,
        }
    return PipelineResult(
        features=features,
        mask_area_ratio=round(ratio, 4),
        threshold=threshold,
        qc_status=status,
        steps=kept,
    )
