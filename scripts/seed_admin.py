"""Create the initial data: admin user, 6 plants, 2 devices, default settings.

Run from the repository root:

    python scripts/seed_admin.py

Safe to run again: rows that already exist are left unchanged.
"""

import sys
from pathlib import Path

# Make the backend package importable when running from the repository root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from flask import Flask

from app import create_app
from app.extensions import db
from app.models import Device, DeviceType, Plant, Setting, User, UserRole
from app.services.security import generate_api_key, hash_api_key
from app.services.settings_defaults import DEFAULT_SETTINGS

PLANT_COUNT = 6
MIN_PASSWORD_LENGTH = 8
SENSOR_NODE_CODE = "sensor-node-1"
WEBCAM_CODE = "webcam-1"


def seed_admin(app: Flask) -> None:
    name = app.config["ADMIN_NAME"]
    email = app.config["ADMIN_EMAIL"]
    password = app.config["ADMIN_PASSWORD"]

    if db.session.scalar(db.select(User).filter_by(email=email)):
        print(f"[admin]    {email} already exists (password unchanged)")
        return
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"ADMIN_PASSWORD must have at least {MIN_PASSWORD_LENGTH} characters.")

    user = User(name=name, email=email, role=UserRole.ADMIN)
    user.set_password(password)
    db.session.add(user)
    print(f"[admin]    created {email}")


def seed_plants() -> None:
    created = 0
    for position in range(1, PLANT_COUNT + 1):
        if db.session.scalar(db.select(Plant).filter_by(position=position)) is None:
            db.session.add(Plant(position=position))
            created += 1
    print(f"[plants]   {created} created, {PLANT_COUNT - created} already existed")


def seed_devices() -> None:
    sensor = db.session.scalar(db.select(Device).filter_by(code=SENSOR_NODE_CODE))
    if sensor is None:
        api_key = generate_api_key()
        db.session.add(
            Device(
                code=SENSOR_NODE_CODE,
                name="Sensor node 1",
                type=DeviceType.SENSOR_NODE,
                api_key_hash=hash_api_key(api_key),
            )
        )
        print(f"[device]   created {SENSOR_NODE_CODE}")
        print()
        print("    API KEY (shown only once, copy it now):")
        print(f"    {api_key}")
        print()
    else:
        print(f"[device]   {SENSOR_NODE_CODE} already exists (key unchanged)")

    webcam = db.session.scalar(db.select(Device).filter_by(code=WEBCAM_CODE))
    if webcam is None:
        db.session.add(Device(code=WEBCAM_CODE, name="Webcam 1", type=DeviceType.WEBCAM))
        print(f"[device]   created {WEBCAM_CODE}")
    else:
        print(f"[device]   {WEBCAM_CODE} already exists")


def seed_settings() -> None:
    created = 0
    for key, value in DEFAULT_SETTINGS.items():
        if db.session.get(Setting, key) is None:
            db.session.add(Setting(key=key, value=value))
            created += 1
    print(f"[settings] {created} created, {len(DEFAULT_SETTINGS) - created} already existed")


def main() -> None:
    app = create_app()
    with app.app_context():
        seed_admin(app)
        seed_plants()
        seed_devices()
        seed_settings()
        db.session.commit()
    print("Seed finished.")


if __name__ == "__main__":
    main()
