"""Authentication logic: login with throttling, token creation, password change."""

import threading
import time
from collections import deque

from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash, generate_password_hash

from app.errors import ApiError
from app.extensions import db
from app.models import User
from app.models.types import utcnow

MAX_FAILED_ATTEMPTS = 5
THROTTLE_WINDOW_SECONDS = 300

# Compared against when the email is unknown, so an unknown email takes about
# as long as a wrong password and does not reveal which accounts exist.
_DUMMY_HASH = generate_password_hash("not-a-real-password")

class LoginThrottle:
    """Limit failed logins per key. Kept in memory: single process, reset on restart."""

    def __init__(self, max_failures: int, window_seconds: int) -> None:
        self._max_failures = max_failures
        self._window = window_seconds
        self._failures: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _recent(self, key: str, now: float) -> deque[float]:
        attempts = self._failures.get(key)
        if attempts is None:
            return deque()
        while attempts and now - attempts[0] > self._window:
            attempts.popleft()
        if not attempts:
            del self._failures[key]
            return deque()
        return attempts

    def is_blocked(self, key: str) -> bool:
        with self._lock:
            return len(self._recent(key, time.monotonic())) >= self._max_failures

    def record_failure(self, key: str) -> None:
        with self._lock:
            now = time.monotonic()
            attempts = self._recent(key, now)
            attempts.append(now)
            self._failures[key] = attempts

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

login_throttle = LoginThrottle(MAX_FAILED_ATTEMPTS, THROTTLE_WINDOW_SECONDS)

def authenticate(email: str, password: str, client_key: str) -> User:
    """Return the user for valid credentials, or raise an ApiError."""
    throttle_key = f"{client_key}:{email}"
    if login_throttle.is_blocked(throttle_key):
        raise ApiError(429, "rate_limited", "Too many failed login attempts. Try again later.")

    user = db.session.scalar(db.select(User).filter_by(email=email))
    password_ok = check_password_hash(user.password_hash if user else _DUMMY_HASH, password)
    if user is None or not password_ok:
        login_throttle.record_failure(throttle_key)
        raise ApiError(401, "invalid_credentials", "Email or password is incorrect")
    if not user.is_active:
        raise ApiError(403, "forbidden", "This account is inactive")

    login_throttle.reset(throttle_key)
    user.last_login_at = utcnow()
    db.session.commit()
    return user

def issue_token(user: User) -> str:
    """Create an access token. The subject is the user id (as a string)."""
    return create_access_token(identity=str(user.id), additional_claims={"role": user.role.value})

def change_password(user: User, current_password: str, new_password: str) -> None:
    if not user.check_password(current_password):
        raise ApiError(
            422,
            "validation_error",
            "Current password is incorrect",
            {"field": "current_password"},
        )
    user.set_password(new_password)
    db.session.commit()