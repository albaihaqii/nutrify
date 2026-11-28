"""Alerts: opened and closed from the conditions that hold, listed and acknowledged over the API."""

from collections.abc import Callable
from datetime import timedelta
from decimal import Decimal

import pytest
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Alert, AlertCode, Device, Plant, PlantClass, SensorReading
from app.models.types import utcnow
from app.services import alerts as alert_service
from tests.helpers import error_of


@pytest.fixture()
def put_frame(app: object) -> Callable[[], None]:
    from pathlib import Path

    from app.services.vision.frame_store import FrameStore

    def put() -> None:
        store = FrameStore(Path(app.config["STORAGE_DIR"]) / "frames")  # type: ignore[attr-defined]
        store.write(b"\xff\xd8 frame \xff\xd9")

    return put


def add_reading(device: Device, age_seconds: int = 5, **values: str) -> None:
    merged = {"ph": "6.00", "ec": "1.800", "temperature": "22.0", **values}
    db.session.add(
        SensorReading(
            device_id=device.id,
            ph=Decimal(merged["ph"]),
            ec=Decimal(merged["ec"]),
            tds_ppm=900,
            temperature=Decimal(merged["temperature"]),
            recorded_at=utcnow() - timedelta(seconds=age_seconds),
        )
    )
    device.last_seen_at = utcnow() - timedelta(seconds=age_seconds)
    db.session.commit()


def alerts(state: str = "open") -> list[Alert]:
    query = db.select(Alert).order_by(Alert.id)
    query = query.where(
        Alert.resolved_at.is_(None) if state == "open" else Alert.resolved_at.is_not(None)
    )
    return list(db.session.scalars(query))


def codes() -> list[str]:
    return [alert.code.value for alert in alerts()]


# --- sensors out of range ---------------------------------------------------------------------


def test_a_value_out_of_range_opens_an_alert_at_once(sensor_node: tuple[Device, str]) -> None:
    add_reading(sensor_node[0], ph="7.10")

    alert_service.sync_alerts()

    [alert] = alerts()
    assert alert.code is AlertCode.SENSOR_OUT_OF_RANGE
    assert alert.severity.value == "warning"
    assert alert.params == {"metric": "ph", "value": 7.1, "min": 5.5, "max": 6.5, "side": "high"}
    assert alert.device_id == sensor_node[0].id


def test_every_value_out_of_range_has_its_own_alert(sensor_node: tuple[Device, str]) -> None:
    add_reading(sensor_node[0], ph="7.10", temperature="29.0")

    alert_service.sync_alerts()

    assert sorted(a.params["metric"] for a in alerts()) == ["ph", "temperature"]
    assert {a.params["metric"]: a.severity.value for a in alerts()}["temperature"] == "critical"


def test_the_same_condition_stays_one_alert(sensor_node: tuple[Device, str]) -> None:
    add_reading(sensor_node[0], ph="7.10")

    alert_service.sync_alerts()
    alert_service.sync_alerts()

    assert len(alerts()) == 1


def test_an_alert_closes_when_the_value_is_back_in_range(
    sensor_node: tuple[Device, str],
) -> None:
    add_reading(sensor_node[0], ph="7.10")
    alert_service.sync_alerts()

    add_reading(sensor_node[0], ph="6.00")
    alert_service.sync_alerts()

    assert alerts() == []
    assert len(alerts("resolved")) == 1


def test_a_value_that_comes_back_out_of_range_opens_a_new_alert(
    sensor_node: tuple[Device, str],
) -> None:
    add_reading(sensor_node[0], ph="7.10")
    alert_service.sync_alerts()
    add_reading(sensor_node[0], ph="6.00")
    alert_service.sync_alerts()
    add_reading(sensor_node[0], ph="7.30")
    alert_service.sync_alerts()

    assert len(alerts()) == 1
    assert len(alerts("resolved")) == 1


def test_a_value_that_crosses_to_the_other_side_keeps_its_alert(
    sensor_node: tuple[Device, str],
) -> None:
    add_reading(sensor_node[0], ph="7.10")
    alert_service.sync_alerts()
    add_reading(sensor_node[0], ph="4.50")
    alert_service.sync_alerts()

    [alert] = alerts()
    assert alert.params["side"] == "low"


def test_the_limits_come_from_the_settings(sensor_node: tuple[Device, str]) -> None:
    add_reading(sensor_node[0], ph="7.10")
    alert_service.sync_alerts()
    assert len(alerts()) == 1

    from app.models import Setting

    db.session.add(Setting(key="ph_max", value=7.5))
    db.session.commit()
    alert_service.sync_alerts()

    assert alerts() == []


def test_an_old_reading_neither_opens_nor_closes_these_alerts(
    sensor_node: tuple[Device, str],
) -> None:
    add_reading(sensor_node[0], ph="7.10")
    alert_service.sync_alerts()

    db.session.execute(
        db.update(SensorReading).values(recorded_at=utcnow() - timedelta(minutes=10))
    )
    db.session.commit()
    alert_service.sync_alerts()

    assert "sensor_out_of_range" in codes()  # still open: it is not known to be over


# --- a sensor that goes quiet -----------------------------------------------------------------


def test_a_sensor_that_stops_sending_opens_a_stale_alert(sensor_node: tuple[Device, str]) -> None:
    add_reading(sensor_node[0], age_seconds=600)

    alert_service.sync_alerts()

    assert codes() == ["sensor_stale"]
    assert alerts()[0].params == {"stale_seconds": 120}


def test_a_sensor_that_sends_again_closes_the_stale_alert(
    sensor_node: tuple[Device, str],
) -> None:
    add_reading(sensor_node[0], age_seconds=600)
    alert_service.sync_alerts()

    add_reading(sensor_node[0], age_seconds=1)
    alert_service.sync_alerts()

    assert alerts() == []


def test_a_sensor_that_never_sent_anything_is_not_stale(sensor_node: tuple[Device, str]) -> None:
    alert_service.sync_alerts()

    assert alerts() == []


def test_a_sensor_that_is_switched_off_is_not_stale(sensor_node: tuple[Device, str]) -> None:
    add_reading(sensor_node[0], age_seconds=600)
    sensor_node[0].is_active = False
    db.session.commit()

    alert_service.sync_alerts()

    assert alerts() == []


# --- the webcam -------------------------------------------------------------------------------


def test_a_webcam_without_pictures_opens_an_offline_alert(webcam: Device) -> None:
    alert_service.sync_alerts()

    [alert] = alerts()
    assert alert.code is AlertCode.DEVICE_OFFLINE
    assert alert.severity.value == "critical"
    assert alert.device_id == webcam.id


def test_a_webcam_with_pictures_has_no_alert(webcam: Device, put_frame: Callable) -> None:
    put_frame()

    alert_service.sync_alerts()

    assert alerts() == []


def test_a_webcam_that_comes_back_closes_the_alert(webcam: Device, put_frame: Callable) -> None:
    alert_service.sync_alerts()
    put_frame()
    alert_service.sync_alerts()

    assert alerts() == []


def test_a_webcam_that_is_switched_off_is_not_an_alert(webcam: Device) -> None:
    webcam.is_active = False
    db.session.commit()

    alert_service.sync_alerts()

    assert alerts() == []


# --- plants -----------------------------------------------------------------------------------


def add_plant(position: int, current: PlantClass | None) -> Plant:
    plant = Plant(position=position, current_class=current)
    db.session.add(plant)
    db.session.commit()
    return plant


def test_a_deficient_hole_opens_an_alert(app: object) -> None:
    hole = add_plant(3, PlantClass.N_DEFICIENCY)
    add_plant(4, PlantClass.NORMAL)
    add_plant(5, None)

    alert_service.sync_alerts()

    [alert] = alerts()
    assert alert.code is AlertCode.PLANT_DEFICIENCY
    assert alert.plant_id == hole.id
    assert alert.params == {"status": "n_deficiency"}
    assert alert.severity.value == "warning"


def test_a_hole_that_recovers_closes_its_alert(app: object) -> None:
    hole = add_plant(3, PlantClass.FE_DEFICIENCY)
    alert_service.sync_alerts()

    hole.current_class = PlantClass.NORMAL
    db.session.commit()
    alert_service.sync_alerts()

    assert alerts() == []


def test_a_hole_that_changes_deficiency_gets_a_new_alert(app: object) -> None:
    hole = add_plant(3, PlantClass.N_DEFICIENCY)
    alert_service.sync_alerts()

    hole.current_class = PlantClass.FE_DEFICIENCY
    db.session.commit()
    alert_service.sync_alerts()

    assert [a.params["status"] for a in alerts()] == ["fe_deficiency"]
    assert [a.params["status"] for a in alerts("resolved")] == ["n_deficiency"]


# --- the endpoints ----------------------------------------------------------------------------


def test_the_list_holds_the_open_alerts_with_their_names(
    client: FlaskClient, viewer_headers: dict, sensor_node: tuple[Device, str]
) -> None:
    add_reading(sensor_node[0], ph="7.10")
    add_plant(3, PlantClass.N_DEFICIENCY)

    body = client.get("/api/alerts", headers=viewer_headers).get_json()

    assert body["total"] == 2
    by_code = {item["code"]: item for item in body["items"]}
    assert set(by_code) == {"sensor_out_of_range", "plant_deficiency"}
    assert by_code["plant_deficiency"]["plant_position"] == 3
    assert by_code["plant_deficiency"]["device_code"] is None
    assert by_code["sensor_out_of_range"]["device_code"] == "sensor-node-1"
    assert by_code["sensor_out_of_range"]["plant_position"] is None
    assert set(by_code["plant_deficiency"]) == {
        "id",
        "code",
        "severity",
        "params",
        "plant_position",
        "device_code",
        "created_at",
        "resolved_at",
        "acknowledged_by",
        "acknowledged_at",
    }


def test_the_list_can_show_resolved_alerts_and_filter(
    client: FlaskClient, viewer_headers: dict, sensor_node: tuple[Device, str]
) -> None:
    add_reading(sensor_node[0], ph="7.10", temperature="29.0")
    client.get("/api/alerts", headers=viewer_headers)
    add_reading(sensor_node[0], ph="6.00", temperature="29.0")

    def total(query: str) -> int:
        return client.get(f"/api/alerts?{query}", headers=viewer_headers).get_json()["total"]

    assert total("state=open") == 1
    assert total("state=resolved") == 1
    assert total("state=all") == 2
    assert total("state=all&severity=critical") == 1
    assert total("state=all&severity=info") == 0
    start = (utcnow() + timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    assert total(f"state=all&from={start}") == 0


def test_the_list_is_newest_first_and_paged(
    client: FlaskClient, viewer_headers: dict, sensor_node: tuple[Device, str]
) -> None:
    add_reading(sensor_node[0], ph="7.10", ec="2.500", temperature="29.0")

    body = client.get("/api/alerts?page=2&page_size=2", headers=viewer_headers).get_json()

    assert (body["page"], body["page_size"], body["total"], len(body["items"])) == (2, 2, 3, 1)


@pytest.mark.parametrize("query", ["state=x", "severity=high", "page=0", "page_size=500"])
def test_a_bad_filter_is_rejected(client: FlaskClient, viewer_headers: dict, query: str) -> None:
    response = client.get(f"/api/alerts?{query}", headers=viewer_headers)

    assert response.status_code == 422
    assert error_of(response)["code"] == "validation_error"


def test_the_list_needs_a_login(client: FlaskClient) -> None:
    assert client.get("/api/alerts").status_code == 401


def test_a_viewer_acknowledges_an_alert(
    client: FlaskClient, viewer_headers: dict, viewer: object, sensor_node: tuple[Device, str]
) -> None:
    add_reading(sensor_node[0], ph="7.10")
    [item] = client.get("/api/alerts", headers=viewer_headers).get_json()["items"]

    response = client.post(f"/api/alerts/{item['id']}/acknowledge", headers=viewer_headers)

    assert response.status_code == 200
    body = response.get_json()
    assert body["acknowledged_by"] == viewer.id  # type: ignore[attr-defined]
    assert body["acknowledged_at"] is not None
    assert body["device_code"] == "sensor-node-1"


def test_the_first_acknowledgement_stays_on_record(
    client: FlaskClient,
    viewer_headers: dict,
    admin_headers: dict,
    viewer: object,
    sensor_node: tuple[Device, str],
) -> None:
    add_reading(sensor_node[0], ph="7.10")
    [item] = client.get("/api/alerts", headers=viewer_headers).get_json()["items"]
    client.post(f"/api/alerts/{item['id']}/acknowledge", headers=viewer_headers)

    body = client.post(f"/api/alerts/{item['id']}/acknowledge", headers=admin_headers).get_json()

    assert body["acknowledged_by"] == viewer.id  # type: ignore[attr-defined]


def test_an_unknown_alert_is_not_found(client: FlaskClient, viewer_headers: dict) -> None:
    response = client.post("/api/alerts/999/acknowledge", headers=viewer_headers)

    assert response.status_code == 404
    assert error_of(response)["code"] == "not_found"


def test_acknowledging_needs_a_login(client: FlaskClient) -> None:
    assert client.post("/api/alerts/1/acknowledge").status_code == 401


# --- when the sensor sends data ---------------------------------------------------------------


def test_a_reading_from_the_sensor_opens_the_alert(
    client: FlaskClient, sensor_node: tuple[Device, str]
) -> None:
    alert_service._last_sync = float("-inf")
    _, key = sensor_node

    response = client.post(
        "/api/sensor-readings",
        json={"ph": 7.2, "ec": 1.8, "temperature": 22.0},
        headers={"X-API-Key": key},
    )

    assert response.status_code == 201
    assert codes() == ["sensor_out_of_range"]


def test_syncing_that_is_asked_for_too_soon_is_skipped(
    client: FlaskClient, sensor_node: tuple[Device, str]
) -> None:
    alert_service._last_sync = float("-inf")
    _, key = sensor_node
    headers = {"X-API-Key": key}
    client.post(
        "/api/sensor-readings", json={"ph": 6.0, "ec": 1.8, "temperature": 22.0}, headers=headers
    )

    client.post(
        "/api/sensor-readings", json={"ph": 7.2, "ec": 1.8, "temperature": 22.0}, headers=headers
    )

    assert codes() == []


def test_a_failing_sync_does_not_fail_the_reading(
    client: FlaskClient, sensor_node: tuple[Device, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(throttle: bool = False) -> None:
        raise RuntimeError("boom")

    monkeypatch.setattr(alert_service, "sync_alerts", broken)
    _, key = sensor_node

    response = client.post(
        "/api/sensor-readings",
        json={"ph": 6.0, "ec": 1.8, "temperature": 22.0},
        headers={"X-API-Key": key},
    )

    assert response.status_code == 201
