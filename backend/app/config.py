"""Application configuration, read from environment variables (backend/.env)."""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)

    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ORIGINS = _split_csv(os.environ.get("CORS_ORIGINS", "http://localhost:5173"))

    # The ML workspace: registry.json, model files, and the code shared with the notebooks.
    ML_DIR = Path(os.environ.get("ML_DIR", BASE_DIR.parent / "ml"))
    # Frames, snapshots and other runtime files (not committed).
    STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", BASE_DIR.parent / "storage"))
    # Which webcam the vision worker opens: `python scripts/check_camera.py` lists them.
    CAMERA_INDEX = int(os.environ.get("CAMERA_INDEX", "0"))
    # Mirror the picture: none, horizontal (left-right), vertical (up-down) or both.
    CAMERA_FLIP = os.environ.get("CAMERA_FLIP", "none")
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # largest accepted upload, in bytes

    ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin")
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nutrify.id")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
