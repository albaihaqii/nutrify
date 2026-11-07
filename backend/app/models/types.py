"""Shared column types and helpers for the database models."""

from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, Integer
from sqlalchemy.dialects import mysql

# BIGINT UNSIGNED on MySQL (matches Schema.md); plain INTEGER on SQLite so
# autoincrement works if tests ever use an in-memory SQLite database.
BigIntId = (
    BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql").with_variant(Integer, "sqlite")
)

# DATETIME(3) on MySQL: millisecond precision. All values are stored in UTC.
UtcDateTime = DateTime().with_variant(mysql.DATETIME(fsp=3), "mysql")


def utcnow() -> datetime:
    """Current time in UTC as a naive datetime (the convention used by the schema)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
