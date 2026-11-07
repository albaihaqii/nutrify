"""Types shared by several schemas."""

from datetime import datetime
from typing import Annotated

from pydantic import PlainSerializer


def _format_utc(value: datetime) -> str:
    """Format a naive UTC datetime as ISO 8601 with milliseconds and a trailing Z."""
    return value.strftime("%Y-%m-%dT%H:%M:%S.") + f"{value.microsecond // 1000:03d}Z"


# A datetime stored as naive UTC, serialised as "2026-11-05T02:40:00.000Z".
UtcDatetime = Annotated[datetime, PlainSerializer(_format_utc, return_type=str)]
