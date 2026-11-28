"""Capturing, labelling and exporting the dataset (docs/API.md sections 7 to 9)."""

from collections.abc import Callable
from decimal import Decimal
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Capture, Device, Observation, Plant, PlantClass, QcStatus
from app.models.types import utcnow
from app.services.vision.frame_store import FrameStore
from app.services.vision.result_store import ResultStore
from tests.helpers import error_of
from tests.test_camera import jpeg
from tests.test_recorder import analysis, six

Add = Callable[..., Observation]


@pytest.fixture()
def add(app: Flask) -> Add:
    """Store one result for a hole; sensor values and a stored picture unless left out."""

    def factory(position: int = 1, **fields: object) -> Observation:
        hole = db.session.scalar(db.select(Plant).filter_by(position=position))
        if hole is None:
            hole = Plant(position=position)
            db.session.add(hole)
            db.session.flush()
        values: dict = {
            "plant_id": hole.id,
            "capture_id": None,
            "observed_at": utcnow(),
            "mean_r": Decimal("92.30"),
            "mean_g": Decimal("103.90"),
            "mean_b": Decimal("53.60"),
            "leaf_area_ratio": Decimal("0.5912"),
            "ph": Decimal("6.15"),
            "ec": Decimal("2.270"),
            "temperature": Decimal("25.6"),
            "qc_status": QcStatus.OK,
        }
        row = Observation(**{**values, **fields})
        db.session.add(row)
        db.session.commit()
        return row

    return factory


def with_picture(app: Flask, webcam: Device) -> int:
    capture = Capture(device_id=webcam.id, image_path="a.jpg", roi_config=[])
    db.session.add(capture)
    db.session.commit()
    return capture.id


# --- POST /camera/captures --------------------------------------------------------------------


@pytest.fixture()
def put_moment(app: Flask) -> Callable[..., None]:
    frames = Path(app.config["STORAGE_DIR"]) / "frames"

    def put(with_analysis: bool = True) -> None:
        assert FrameStore(frames).write(jpeg())
        if with_analysis:
            assert ResultStore(frames).write(analysis(*six()))

    return put


def test_a_capture_stores_the_moment(
    client: FlaskClient, admin_headers: dict, webcam: Device, put_moment: Callable
) -> None:
    put_moment()
    response = client.post("/api/camera/captures", headers=admin_headers)

    assert response.status_code == 201
    body = response.get_json()
    assert body["observations"] == 6
    assert body["captured_at"].endswith("Z")
    assert db.session.get(Capture, body["id"]) is not None
    assert db.session.scalars(db.select(Observation)).all().__len__() == 6


def test_a_capture_leaves_the_holes_alone(
    client: FlaskClient, admin_headers: dict, webcam: Device, put_moment: Callable
) -> None:
    put_moment()
    client.post("/api/camera/captures", headers=admin_headers)
    assert (
        db.session.scalars(db.select(Plant).where(Plant.last_observation_id.is_not(None))).first()
        is None
    )


def test_a_capture_needs_a_fresh_frame_and_an_analysis(
    client: FlaskClient, admin_headers: dict, webcam: Device, put_moment: Callable
) -> None:
    assert client.post("/api/camera/captures", headers=admin_headers).status_code == 503
    put_moment(with_analysis=False)
    response = client.post("/api/camera/captures", headers=admin_headers)
    assert response.status_code == 503
    assert error_of(response)["code"] == "service_unavailable"


def test_only_an_admin_can_capture(client: FlaskClient, viewer_headers: dict) -> None:
    assert client.post("/api/camera/captures", headers=viewer_headers).status_code == 403
    assert client.post("/api/camera/captures").status_code == 401


# --- PATCH /observations/{id}/label -----------------------------------------------------------


def test_an_admin_labels_a_result(
    client: FlaskClient, admin_headers: dict, admin, add: Add
) -> None:
    row = add()
    response = client.patch(
        f"/api/observations/{row.id}/label",
        json={"label_class": "n_deficiency"},
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["label_class"] == "n_deficiency"
    assert row.label_class is PlantClass.N_DEFICIENCY
    assert row.labeled_by == admin.id
    assert row.labeled_at is not None


def test_a_label_is_cleared_with_null(client: FlaskClient, admin_headers: dict, add: Add) -> None:
    row = add(label_class=PlantClass.NORMAL, labeled_at=utcnow())
    response = client.patch(
        f"/api/observations/{row.id}/label", json={"label_class": None}, headers=admin_headers
    )

    assert response.get_json()["label_class"] is None
    assert row.label_class is None
    assert row.labeled_by is None
    assert row.labeled_at is None


def test_a_label_must_be_a_class(client: FlaskClient, admin_headers: dict, add: Add) -> None:
    row = add()
    for body in ({"label_class": "rotten"}, {}, {"label_class": "normal", "x": 1}):
        response = client.patch(
            f"/api/observations/{row.id}/label", json=body, headers=admin_headers
        )
        assert response.status_code == 422, body


def test_labelling_needs_an_admin_and_a_result(
    client: FlaskClient, admin_headers: dict, viewer_headers: dict, add: Add
) -> None:
    row = add()
    body = {"label_class": "normal"}
    assert (
        client.patch(
            f"/api/observations/{row.id}/label", json=body, headers=viewer_headers
        ).status_code
        == 403
    )
    assert client.patch(f"/api/observations/{row.id}/label", json=body).status_code == 401
    missing = client.patch("/api/observations/999/label", json=body, headers=admin_headers)
    assert missing.status_code == 404


# --- GET /observations?label=&labelable= ------------------------------------------------------


def test_results_are_filtered_by_label(client: FlaskClient, viewer_headers: dict, add: Add) -> None:
    labeled = add(label_class=PlantClass.NORMAL)
    unlabeled = add()

    def ids(query: str) -> set[int]:
        body = client.get(f"/api/observations?{query}", headers=viewer_headers).get_json()
        return {item["id"] for item in body["items"]}

    assert ids("label=labeled") == {labeled.id}
    assert ids("label=unlabeled") == {unlabeled.id}
    assert ids("") == {labeled.id, unlabeled.id}


def test_labelable_results_have_a_picture_and_a_plant(
    app: Flask, client: FlaskClient, viewer_headers: dict, webcam: Device, add: Add
) -> None:
    capture_id = with_picture(app, webcam)
    keep = add(capture_id=capture_id)
    add()  # no stored picture
    add(capture_id=capture_id, qc_status=QcStatus.NO_PLANT, mean_r=None, mean_g=None, mean_b=None)

    body = client.get("/api/observations?labelable=true", headers=viewer_headers).get_json()
    assert [item["id"] for item in body["items"]] == [keep.id]


# --- GET /dataset/summary ---------------------------------------------------------------------


def test_the_summary_of_an_empty_dataset(client: FlaskClient, viewer_headers: dict) -> None:
    response = client.get("/api/dataset/summary", headers=viewer_headers)
    assert response.get_json() == {
        "total_observations": 0,
        "labeled": 0,
        "usable": 0,
        "by_class": {"normal": 0, "n_deficiency": 0, "fe_deficiency": 0},
        "by_qc_status": {
            "ok": 0,
            "invalid_leaf": 0,
            "no_plant": 0,
            "stale_sensor": 0,
            "needs_check": 0,
        },
    }


def test_the_summary_counts_what_can_be_trained_on(
    client: FlaskClient, viewer_headers: dict, add: Add
) -> None:
    add(label_class=PlantClass.NORMAL)
    add(label_class=PlantClass.NORMAL)
    add(label_class=PlantClass.FE_DEFICIENCY)
    add(label_class=PlantClass.N_DEFICIENCY, ph=None)  # labelled, but no sensor values
    add(qc_status=QcStatus.NEEDS_CHECK)
    add(qc_status=QcStatus.NO_PLANT, mean_r=None, mean_g=None, mean_b=None, ph=None)
    add()

    body = client.get("/api/dataset/summary", headers=viewer_headers).get_json()

    assert body["total_observations"] == 7
    assert body["labeled"] == 4
    assert body["usable"] == 3
    assert body["by_class"] == {"normal": 2, "n_deficiency": 0, "fe_deficiency": 1}
    assert body["by_qc_status"] == {
        "ok": 4,
        "invalid_leaf": 0,
        "no_plant": 1,
        "stale_sensor": 1,
        "needs_check": 1,
    }


def test_the_summary_needs_a_login(client: FlaskClient) -> None:
    assert client.get("/api/dataset/summary").status_code == 401


# --- GET /dataset/export ----------------------------------------------------------------------


def test_the_export_holds_the_usable_rows(
    client: FlaskClient, admin_headers: dict, add: Add
) -> None:
    row = add(label_class=PlantClass.FE_DEFICIENCY)
    add()  # not labelled
    add(label_class=PlantClass.NORMAL, ph=None)  # no sensor values

    response = client.get("/api/dataset/export", headers=admin_headers)

    assert response.status_code == 200
    assert response.mimetype == "text/csv"
    assert response.headers["Content-Disposition"].startswith(
        'attachment; filename="nutrify-dataset-'
    )
    lines = response.get_data(as_text=True).splitlines()
    assert (
        lines[0]
        == "Mean_R,Mean_G,Mean_B,pH,EC,Temperature,label,observation_id,plant_position,observed_at"
    )
    assert len(lines) == 2
    assert lines[1].startswith(f"92.30,103.90,53.60,6.15,2.270,25.6,fe_deficiency,{row.id},1,")
    assert lines[1].endswith("Z")


def test_the_export_is_limited_to_a_window(
    client: FlaskClient, admin_headers: dict, add: Add
) -> None:
    add(label_class=PlantClass.NORMAL, observed_at=utcnow().replace(year=2020))
    keep = add(label_class=PlantClass.NORMAL)

    lines = (
        client.get("/api/dataset/export?from=2025-01-01T00:00:00Z", headers=admin_headers)
        .get_data(as_text=True)
        .splitlines()
    )

    assert len(lines) == 2
    assert f",{keep.id}," in lines[1]


def test_the_export_is_for_admins(client: FlaskClient, viewer_headers: dict) -> None:
    assert client.get("/api/dataset/export", headers=viewer_headers).status_code == 403
    assert client.get("/api/dataset/export").status_code == 401
