"""Helpers shared by API routes."""

from typing import Any, TypeVar

from flask import request
from pydantic import BaseModel

from app.errors import ApiError

ModelT = TypeVar("ModelT", bound=BaseModel)


def get_json_object() -> dict[str, Any]:
    """Return the JSON request body, which must be an object."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(400, "bad_request", "Request body must be a JSON object")
    return data


def load_body(schema: type[ModelT]) -> ModelT:
    """Parse and validate the JSON request body with a Pydantic schema."""
    return schema.model_validate(get_json_object())
