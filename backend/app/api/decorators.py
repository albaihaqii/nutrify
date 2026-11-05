"""Route decorators for authentication and role checks (docs/API.md section 1.2)."""

from collections.abc import Callable
from functools import wraps
from typing import Any

from flask_jwt_extended import current_user, verify_jwt_in_request

from app.errors import ApiError
from app.models import UserRole

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