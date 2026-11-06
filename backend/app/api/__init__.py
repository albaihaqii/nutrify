"""Register all API blueprints under the /api prefix."""

from flask import Flask

from app.api import auth, devices, health, settings


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(health.bp, url_prefix="/api")
    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(settings.bp, url_prefix="/api/settings")
    app.register_blueprint(devices.bp, url_prefix="/api/devices")