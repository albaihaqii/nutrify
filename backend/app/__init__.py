"""Nutrify backend application factory."""

from flask import Flask

from .config import Config
from .errors import register_error_handlers
from .extensions import cors, db, jwt, migrate

def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    # Import models so Flask-Migrate can see every table.
    from . import models  # noqa: F401
    from .jwt_callbacks import register_jwt_callbacks

    register_error_handlers(app)
    register_jwt_callbacks()

    from .api import register_blueprints

    register_blueprints(app)

    return app