"""Read and update the settings table (docs/API.md section 14)."""

from typing import Any

from app.extensions import db
from app.models import Setting, User
from app.schemas.settings import SettingsValues
from app.services.settings_defaults import DEFAULT_SETTINGS


def get_settings() -> dict[str, Any]:
    """All settings. A key without a row falls back to its default value."""
    stored = {row.key: row.value for row in db.session.scalars(db.select(Setting))}
    return {key: stored.get(key, default) for key, default in DEFAULT_SETTINGS.items()}


def update_settings(patch: dict[str, Any], user: User) -> dict[str, Any]:
    """Apply a partial update.

    The merged result is validated as a whole (so rules such as min < max hold even
    when only one side is sent). Nothing is saved when validation fails.
    """
    merged = {**get_settings(), **patch}
    validated = SettingsValues.model_validate(merged).model_dump(mode="json")

    for key in patch:
        row = db.session.get(Setting, key)
        if row is None:
            row = Setting(key=key, value=validated[key])
            db.session.add(row)
        else:
            row.value = validated[key]
        row.updated_by = user.id
    db.session.commit()
    return get_settings()