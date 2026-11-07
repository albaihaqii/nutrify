"""Helpers for device API keys."""

import hashlib
import secrets

API_KEY_PREFIX = "nfy_"


def generate_api_key() -> str:
    """Create a new random device key. Shown once, never stored in plain text."""
    return API_KEY_PREFIX + secrets.token_urlsafe(32)


def hash_api_key(key: str) -> str:
    """SHA-256 hash of a device key.

    The key is long and random, so a fast hash is safe here, and it lets the
    backend find the device by hash. Passwords are different: they use a slow
    salted hash (see User.set_password).
    """
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
