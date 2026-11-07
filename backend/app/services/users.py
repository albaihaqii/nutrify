"""User management for admins: list, create, and update accounts."""

from typing import Any

from sqlalchemy.exc import IntegrityError

from app.errors import ApiError
from app.extensions import db
from app.models import User, UserRole
from app.schemas.users import UserAdminOut


def get_user(user_id: int) -> User:
    user = db.session.get(User, user_id)
    if user is None:
        raise ApiError(404, "not_found", "User not found")
    return user


def list_users() -> list[UserAdminOut]:
    users = db.session.scalars(db.select(User).order_by(User.id))
    return [UserAdminOut.model_validate(user) for user in users]


def _duplicate_email_error() -> ApiError:
    return ApiError(409, "conflict", "A user with this email already exists", {"field": "email"})


def create_user(name: str, email: str, password: str, role: UserRole) -> UserAdminOut:
    if db.session.scalar(db.select(User).filter_by(email=email)):
        raise _duplicate_email_error()

    user = User(name=name, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise _duplicate_email_error() from None
    return UserAdminOut.model_validate(user)


def ensure_own_account_stays_usable(user: User, actor: User, changes: dict[str, Any]) -> None:
    """An admin cannot deactivate or demote their own account (it could lock everyone out)."""
    if user.id != actor.id:
        return
    if changes.get("is_active") is False:
        raise ApiError(
            403, "forbidden", "You cannot deactivate your own account", {"field": "is_active"}
        )
    if "role" in changes and changes["role"] != UserRole.ADMIN:
        raise ApiError(403, "forbidden", "You cannot change your own role", {"field": "role"})


def update_user(user_id: int, changes: dict[str, Any], actor: User) -> UserAdminOut:
    user = get_user(user_id)
    ensure_own_account_stays_usable(user, actor, changes)

    for field, value in changes.items():
        if field == "password":
            user.set_password(value)
        else:
            setattr(user, field, value)
    db.session.commit()
    return UserAdminOut.model_validate(user)