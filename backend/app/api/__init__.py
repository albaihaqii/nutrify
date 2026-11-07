"""Register all API blueprints under the /api prefix."""

from flask import Flask

from app.api import auth, devices, health, sensors, settings, users


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(health.bp, url_prefix="/api")
    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(settings.bp, url_prefix="/api/settings")
    app.register_blueprint(devices.bp, url_prefix="/api/devices")
    app.register_blueprint(sensors.bp, url_prefix="/api/sensor-readings")
    app.register_blueprint(users.bp, url_prefix="/api/users")
