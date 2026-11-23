"""Thin adapter to the ML workspace (docs/ML.md section 10).

The image pipeline and the C4.5 predictor are written once, in `ml/src/`, and used by both the
training notebooks and the backend. This module loads those two files by path, so the backend
never copies the logic and `ml/` does not have to be a package on `sys.path`.
"""

import importlib.util
import sys
from functools import cache
from pathlib import Path
from types import ModuleType


@cache
def _load(ml_dir: Path, name: str) -> ModuleType:
    path = ml_dir / "src" / f"{name}.py"
    module_name = f"nutrify_ml_{name}"
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module  # dataclasses look the module up by name
    spec.loader.exec_module(module)
    return module


def preprocessing(ml_dir: Path) -> ModuleType:
    """`ml/src/preprocessing.py`: the image pipeline (docs/ML.md section 3)."""
    return _load(ml_dir, "preprocessing")


def c45(ml_dir: Path) -> ModuleType:
    """`ml/src/c45.py`: `predict_from_dict` runs an exported tree without scikit-learn."""
    return _load(ml_dir, "c45")
