"""Route decorators for authentication and role checks (docs/API.md section 1.2)."""

from collections.abc import Callable
from functools import wraps
from typing import Any

from flask import g, request
from flask_jwt_extended import current_user, verify_jwt_in_request

from app.errors import ApiError
from app.extensions import db
from app.models import Device, UserRole
from app.services.security import hash_api_key


def roles_required(*roles: UserRole) -> Callable:
    """Allow the request only for a logged-in user with one of the given roles."""

    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            verify_jwt_in_request()
            if current_user.role not in roles:
                raise ApiError(403, "forbidden", "You do not have permission to do this")
            return view(*args, **kwargs)

        return wrapper

    return decorator


login_required = roles_required(UserRole.ADMIN, UserRole.VIEWER)
admin_required = roles_required(UserRole.ADMIN)


def device_required(view: Callable) -> Callable:
    """Allow the request only with a valid X-API-Key. The device is stored in g.device."""

    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        api_key = request.headers.get("X-API-Key", "").strip()
        device = None
        if api_key:
            device = db.session.scalar(
                db.select(Device).filter_by(api_key_hash=hash_api_key(api_key), is_active=True)
            )
        if device is None:
            raise ApiError(401, "unauthorized", "Missing or invalid API key")
        g.device = device
        return view(*args, **kwargs)

    return wrapper