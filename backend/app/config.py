"""Application configuration loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Config:
    """Base configuration. Required variables raise KeyError when missing."""

    SECRET_KEY = os.environ["SECRET_KEY"]
    JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
    SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = _split_csv(os.environ.get("CORS_ORIGINS", ""))