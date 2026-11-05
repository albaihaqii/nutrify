"""Uniform JSON error responses (see docs/API.md section 1.3)."""

import logging
from typing import Any

from flask import Flask, Response, jsonify
from pydantic import ValidationError
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)

HTTP_ERROR_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    422: "validation_error",
    429: "rate_limited",
}

class ApiError(Exception):
    """An error that is returned to the client as a JSON error response."""

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details

def error_response(
    status: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> tuple[Response, int]:
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return jsonify(body), status


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError) -> tuple[Response, int]:
        return error_response(error.status, error.code, error.message, error.details)

    @app.errorhandler(ValidationError)
    def handle_validation_error(error: ValidationError) -> tuple[Response, int]:
        first = error.errors()[0]
        field = ".".join(str(part) for part in first["loc"])
        message = f"{field}: {first['msg']}" if field else first["msg"]
        return error_response(422, "validation_error", message, {"field": field})

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException) -> tuple[Response, int]:
        status = error.code or 500
        code = HTTP_ERROR_CODES.get(status, "http_error")
        return error_response(status, code, error.description or error.name)

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception) -> tuple[Response, int]:
        logger.exception("Unhandled error: %s", error)
        return error_response(500, "internal_error", "Unexpected server error")