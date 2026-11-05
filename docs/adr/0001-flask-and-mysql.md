# 0001. Flask and MySQL for the backend

| Field  | Value      |
| ------ | ---------- |
| Status | Accepted   |
| Date   | 2026-11-05 |

## Context

The system needs an HTTP API for the web app and the ESP32, a relational store for readings,
observations, advice, and alerts, and a place to run Python image and machine learning code.

An earlier assignment used FastAPI with synthetic data. For the real system, the development
machine already runs MySQL 8.0 through Laragon, and the project owner wants a conventional,
well-documented stack that is easy to run on Windows.

## Decision

- Backend framework: **Flask 3** with an application factory, blueprints, and a services layer.
- ORM and migrations: **Flask-SQLAlchemy** and **Flask-Migrate** (Alembic).
- Database: **MySQL 8.0**, InnoDB, `utf8mb4`.
- Authentication: **Flask-JWT-Extended**; validation: **Pydantic**; driver: **PyMySQL**.

## Consequences

- The API is synchronous. This is enough for the expected load (one sensor node, a few
  viewers). The MJPEG stream is served by a generator and needs a threaded server.
- Pydantic schemas are written by hand; there is no automatic interactive API documentation, so
  [API](../API.md) is maintained as a document.
- MySQL provides a native `JSON` type, used for rule paths and advice context. It has no native
  partial indexes or array types; none are needed.
- Setup stays simple on Windows because Laragon already provides MySQL.
- The assignment code (FastAPI) is not reused as is; ideas and algorithms are.

## Alternatives considered

| Option             | Why not                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| FastAPI with MySQL | Good fit technically, but the owner chose Flask for familiarity and a simpler mental model |
| Flask with SQLite  | Fewer moving parts, but weaker concurrency for the worker, API, and device writes together |
| PostgreSQL         | Strong choice, but adds an installation when MySQL is already available                    |
