"""Register all API blueprints under the /api prefix."""

from flask import Flask

from app.api import auth, camera, devices, health, models, sensors, settings, status, users


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(health.bp, url_prefix="/api")
    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(settings.bp, url_prefix="/api/settings")
    app.register_blueprint(camera.bp, url_prefix="/api/camera")
    app.register_blueprint(devices.bp, url_prefix="/api/devices")
    app.register_blueprint(models.bp, url_prefix="/api/models")
    app.register_blueprint(sensors.bp, url_prefix="/api/sensor-readings")
    app.register_blueprint(status.bp, url_prefix="/api")
    app.register_blueprint(users.bp, url_prefix="/api/users")
