"""The advice endpoints (docs/API.md section 11)."""

from collections.abc import Callable
from datetime import timedelta
from decimal import Decimal

import pytest
from flask.testing import FlaskClient

from app.extensions import db
from app.models import (
    Advice,
    AdviceSource,
    AdviceTrigger,
    Device,
    Observation,
    Plant,
    PlantClass,
    QcStatus,
    SensorReading,
    Severity,
)
from app.models.types import utcnow
from app.services.advisor.rules import DEFAULT_ACTIONS, RULE_CODES
from tests.helpers import error_of


@pytest.fixture()
def add_advice(app: object) -> Callable[..., Advice]:
    def factory(
        position: int | None = 3,
        source: AdviceSource = AdviceSource.RULES,
        trigger: AdviceTrigger | None = None,
        age_minutes: int = 0,
        summary: str = "Ringkasan",
    ) -> Advice:
        plant_id = None
        if position is not None:
            plant = db.session.scalar(db.select(Plant).filter_by(position=position))
            if plant is None:
                plant = Plant(position=position)
                db.session.add(plant)
                db.session.flush()
            plant_id = plant.id
        row = Advice(
            created_at=utcnow() - timedelta(minutes=age_minutes),
            trigger=trigger
            or (AdviceTrigger.PLANT_STATUS if position else AdviceTrigger.SENSOR_RANGE),
            plant_id=plant_id,
            plant_class=PlantClass.N_DEFICIENCY if position else None,
            severity=Severity.WARNING,
            summary=summary,
            likely_causes=["Sebab"],
            suggested_actions=["Aksi"],
            source=source,
            provider="gemini" if source is AdviceSource.LLM else None,
            model_name="gemini-3.5-flash-lite" if source is AdviceSource.LLM else None,
            context={},
            cache_key="k",
        )
        db.session.add(row)
        db.session.commit()
        return row

    return factory


# --- GET /advice ------------------------------------------------------------------------------


def test_the_list_is_newest_first_with_the_item_shape(
    client: FlaskClient, viewer_headers: dict, add_advice: Callable[..., Advice]
) -> None:
    add_advice(age_minutes=10, summary="Lama")
    add_advice(source=AdviceSource.LLM, summary="Baru")

    body = client.get("/api/advice", headers=viewer_headers).get_json()

    assert body["total"] == 2
    assert [item["summary"] for item in body["items"]] == ["Baru", "Lama"]
    assert set(body["items"][0]) == {
        "id",
        "created_at",
        "trigger",
        "plant_position",
        "plant_class",
        "severity",
        "summary",
        "likely_causes",
        "suggested_actions",
        "source",
        "provider",
        "model_name",
    }
    assert body["items"][0]["source"] == "llm"
    assert body["items"][0]["provider"] == "gemini"
    assert body["items"][1]["model_name"] is None
    assert body["items"][0]["plant_position"] == 3


def test_the_tank_has_no_plant_position(
    client: FlaskClient, viewer_headers: dict, add_advice: Callable[..., Advice]
) -> None:
    add_advice(position=None)

    item = client.get("/api/advice", headers=viewer_headers).get_json()["items"][0]

    assert item["plant_position"] is None
    assert item["plant_class"] is None
    assert item["trigger"] == "sensor_range"


def test_the_list_can_be_filtered(
    client: FlaskClient, viewer_headers: dict, add_advice: Callable[..., Advice]
) -> None:
    add_advice(position=3, source=AdviceSource.LLM)
    add_advice(position=5)
    add_advice(position=None, age_minutes=120)

    def total(query: str) -> int:
        return client.get(f"/api/advice?{query}", headers=viewer_headers).get_json()["total"]

    assert total("source=llm") == 1
    assert total("source=rules") == 2
    assert total("plant=5") == 1
    assert total("trigger=sensor_range") == 1
    start = (utcnow() - timedelta(minutes=60)).strftime("%Y-%m-%dT%H:%M:%SZ")
    assert total(f"from={start}") == 2


def test_the_list_is_paged(
    client: FlaskClient, viewer_headers: dict, add_advice: Callable[..., Advice]
) -> None:
    for minutes in range(5):
        add_advice(age_minutes=minutes)

    body = client.get("/api/advice?page=2&page_size=2", headers=viewer_headers).get_json()

    assert (body["page"], body["page_size"], body["total"], len(body["items"])) == (2, 2, 5, 2)


@pytest.mark.parametrize("query", ["source=gemini", "plant=7", "trigger=x", "page=0"])
def test_a_bad_filter_is_rejected(client: FlaskClient, viewer_headers: dict, query: str) -> None:
    response = client.get(f"/api/advice?{query}", headers=viewer_headers)

    assert response.status_code == 422
    assert error_of(response)["code"] == "validation_error"


def test_the_list_needs_a_login(client: FlaskClient) -> None:
    assert client.get("/api/advice").status_code == 401


# --- GET /advice/latest -----------------------------------------------------------------------


def test_the_latest_advice_is_the_newest_one(
    client: FlaskClient, viewer_headers: dict, add_advice: Callable[..., Advice]
) -> None:
    add_advice(age_minutes=10, summary="Lama")
    add_advice(summary="Baru")

    body = client.get("/api/advice/latest", headers=viewer_headers).get_json()

    assert body["summary"] == "Baru"


def test_the_latest_advice_can_be_limited_to_a_hole(
    client: FlaskClient, viewer_headers: dict, add_advice: Callable[..., Advice]
) -> None:
    add_advice(position=3, age_minutes=10, summary="Lubang 3")
    add_advice(position=5, summary="Lubang 5")

    body = client.get("/api/advice/latest?plant=3", headers=viewer_headers).get_json()

    assert body["summary"] == "Lubang 3"


def test_there_is_no_latest_advice_before_the_first_one(
    client: FlaskClient, viewer_headers: dict
) -> None:
    response = client.get("/api/advice/latest", headers=viewer_headers)

    assert response.status_code == 404
    assert error_of(response)["code"] == "not_found"


# --- rules ------------------------------------------------------------------------------------


def test_all_six_rules_are_listed_with_their_default_actions(
    client: FlaskClient, viewer_headers: dict
) -> None:
    items = client.get("/api/advice/rules", headers=viewer_headers).get_json()["items"]

    assert [item["code"] for item in items] == list(RULE_CODES)
    assert items[0] == {
        "code": "n_deficiency_in_range",
        "suggested_actions": DEFAULT_ACTIONS["n_deficiency_in_range"],
        "updated_at": None,
        "updated_by": None,
    }


def test_an_admin_edits_the_actions_of_a_rule(
    client: FlaskClient, admin_headers: dict, viewer_headers: dict, admin: object
) -> None:
    response = client.put(
        "/api/advice/rules/needs_check",
        json={"suggested_actions": ["  Cek lubang  ", "Foto ulang"]},
        headers=admin_headers,
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["suggested_actions"] == ["Cek lubang", "Foto ulang"]
    assert body["updated_by"] == admin.id
    assert body["updated_at"] is not None

    items = client.get("/api/advice/rules", headers=viewer_headers).get_json()["items"]
    edited = next(item for item in items if item["code"] == "needs_check")
    assert edited["suggested_actions"] == ["Cek lubang", "Foto ulang"]
    assert len([item for item in items if item["updated_at"] is not None]) == 1


def test_an_edit_can_be_edited_again(client: FlaskClient, admin_headers: dict) -> None:
    for actions in (["Satu"], ["Dua", "Tiga"]):
        client.put(
            "/api/advice/rules/fe_deficiency",
            json={"suggested_actions": actions},
            headers=admin_headers,
        )

    items = client.get("/api/advice/rules", headers=admin_headers).get_json()["items"]
    assert next(item for item in items if item["code"] == "fe_deficiency")["suggested_actions"] == [
        "Dua",
        "Tiga",
    ]


@pytest.mark.parametrize(
    "actions",
    [[], ["a"] * 6, ["   "], [""], ["x" * 301], "Periksa", [1], None],
)
def test_invalid_actions_are_rejected(
    client: FlaskClient, admin_headers: dict, actions: object
) -> None:
    response = client.put(
        "/api/advice/rules/needs_check", json={"suggested_actions": actions}, headers=admin_headers
    )

    assert response.status_code == 422
    assert error_of(response)["code"] == "validation_error"


def test_an_action_of_300_characters_is_accepted(client: FlaskClient, admin_headers: dict) -> None:
    response = client.put(
        "/api/advice/rules/needs_check",
        json={"suggested_actions": ["x" * 300]},
        headers=admin_headers,
    )

    assert response.status_code == 200


def test_an_unknown_rule_is_not_found(client: FlaskClient, admin_headers: dict) -> None:
    response = client.put(
        "/api/advice/rules/nope", json={"suggested_actions": ["a"]}, headers=admin_headers
    )

    assert response.status_code == 404
    assert error_of(response)["code"] == "not_found"


def test_a_viewer_cannot_edit_a_rule(client: FlaskClient, viewer_headers: dict) -> None:
    response = client.put(
        "/api/advice/rules/needs_check", json={"suggested_actions": ["a"]}, headers=viewer_headers
    )

    assert response.status_code == 403


def test_an_edit_applies_to_the_next_advice(
    client: FlaskClient, admin_headers: dict, add_observation: Callable[..., Observation]
) -> None:
    client.put(
        "/api/advice/rules/n_deficiency_in_range",
        json={"suggested_actions": ["Tambah nutrisi"]},
        headers=admin_headers,
    )
    add_observation(3, PlantClass.N_DEFICIENCY)

    body = client.post(
        "/api/advice/generate", json={"trigger": "plant_status", "plant": 3}, headers=admin_headers
    ).get_json()

    assert body["suggested_actions"] == ["Tambah nutrisi"]


# --- POST /advice/generate --------------------------------------------------------------------


@pytest.fixture()
def add_observation(app: object, webcam: Device) -> Callable[..., Observation]:
    def factory(
        position: int, stable: PlantClass | None, qc: QcStatus = QcStatus.OK
    ) -> Observation:
        plant = db.session.scalar(db.select(Plant).filter_by(position=position))
        if plant is None:
            plant = Plant(position=position)
            db.session.add(plant)
            db.session.flush()
        row = Observation(
            plant_id=plant.id,
            observed_at=utcnow(),
            mean_r=90,
            mean_g=100,
            mean_b=50,
            leaf_area_ratio=0.2,
            stable_class=stable,
            qc_status=qc,
            confidence=0.9,
            ph=Decimal("6.0"),
            ec=Decimal("1.8"),
            temperature=Decimal("22.0"),
        )
        db.session.add(row)
        db.session.flush()
        plant.last_observation_id = row.id
        db.session.commit()
        return row

    return factory


def generate(client: FlaskClient, headers: dict, **body: object):
    return client.post("/api/advice/generate", json=body, headers=headers)


def test_advice_is_generated_for_a_hole(
    client: FlaskClient, admin_headers: dict, add_observation: Callable[..., Observation]
) -> None:
    add_observation(3, PlantClass.N_DEFICIENCY)

    response = generate(client, admin_headers, trigger="plant_status", plant=3)

    assert response.status_code == 201
    body = response.get_json()
    assert body["plant_position"] == 3
    assert body["source"] == "rules"
    assert body["trigger"] == "plant_status"
    assert db.session.scalar(db.select(db.func.count(Advice.id))) == 1


def test_a_hole_without_a_problem_gets_no_advice(
    client: FlaskClient, admin_headers: dict, add_observation: Callable[..., Observation]
) -> None:
    add_observation(3, PlantClass.NORMAL)

    response = generate(client, admin_headers, trigger="plant_status", plant=3)

    assert response.status_code == 422


def test_a_hole_without_results_is_not_found(client: FlaskClient, admin_headers: dict) -> None:
    response = generate(client, admin_headers, trigger="plant_status", plant=3)

    assert response.status_code == 404


def test_advice_is_generated_for_a_sensor_out_of_range(
    client: FlaskClient, admin_headers: dict, sensor_node: tuple[Device, str]
) -> None:
    db.session.add(
        SensorReading(
            device_id=sensor_node[0].id,
            ph=Decimal("7.2"),
            ec=Decimal("1.8"),
            tds_ppm=900,
            temperature=Decimal("22.0"),
            recorded_at=utcnow(),
        )
    )
    db.session.commit()

    response = generate(client, admin_headers, trigger="sensor_range")

    assert response.status_code == 201
    body = response.get_json()
    assert body["plant_position"] is None
    assert body["summary"].startswith("pH 7,2 di atas")


def test_no_sensor_advice_while_every_value_is_in_range(
    client: FlaskClient, admin_headers: dict
) -> None:
    assert generate(client, admin_headers, trigger="sensor_range").status_code == 422


def test_a_second_request_within_a_minute_is_limited(
    client: FlaskClient, admin_headers: dict, add_observation: Callable[..., Observation]
) -> None:
    add_observation(3, PlantClass.N_DEFICIENCY)
    add_observation(4, PlantClass.FE_DEFICIENCY)
    generate(client, admin_headers, trigger="plant_status", plant=3)

    limited = generate(client, admin_headers, trigger="plant_status", plant=3)
    other = generate(client, admin_headers, trigger="plant_status", plant=4)

    assert limited.status_code == 429
    assert error_of(limited)["code"] == "rate_limited"
    assert other.status_code == 201


@pytest.mark.parametrize(
    "body",
    [
        {"trigger": "plant_status"},
        {"trigger": "plant_status", "plant": 9},
        {"trigger": "sensor_range", "plant": 3},
        {"trigger": "other"},
        {},
    ],
)
def test_a_bad_request_is_rejected(client: FlaskClient, admin_headers: dict, body: dict) -> None:
    assert client.post("/api/advice/generate", json=body, headers=admin_headers).status_code == 422


def test_a_viewer_cannot_generate_advice(client: FlaskClient, viewer_headers: dict) -> None:
    response = generate(client, viewer_headers, trigger="sensor_range")

    assert response.status_code == 403
