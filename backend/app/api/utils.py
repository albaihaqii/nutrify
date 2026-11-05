"""Helpers shared by API routes."""

from typing import TypeVar

from flask import request
from pydantic import BaseModel

from app.errors import ApiError

ModelT = TypeVar("ModelT", bound=BaseModel)

def load_body(schema: type[ModelT]) -> ModelT:
    """Parse and validate the JSON request body with a Pydantic schema."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(400, "bad_request", "Request body must be a JSON object")
    return schema.model_validate(data)