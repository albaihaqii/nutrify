"""Register all API blueprints under the /api prefix."""

from flask import Flask

from app.api import auth, health

def register_blueprints(app: Flask) -> None:
    app.register_blueprint(health.bp, url_prefix="/api")
    app.register_blueprint(auth.bp, url_prefix="/api/auth")