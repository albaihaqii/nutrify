"""Nutrify backend application factory."""

from flask import Flask

from .config import Config
from .extensions import cors, db, jwt, migrate

def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from .api import register_blueprints

    register_blueprints(app)

    # Import models so Flask-Migrate can see every table.
    from app import models  # noqa: F401

    return app