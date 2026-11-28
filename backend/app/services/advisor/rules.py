"""The rule-based advisor: six fixed rules with default actions that an admin can edit.

The condition of a rule is fixed here. Only the suggested actions are stored in `advice_rules`
when an admin edits them (docs/Schema.md section 4.10). Each rule gives the same advice for the
same facts, so this is also the fallback when the language model is not available.
"""

from app.extensions import db
from app.models import AdviceRule, AdviceSource, AdviceTrigger, Severity
from app.services.advisor.base import METRICS, AdviceContext, AdviceDraft, MetricFact, MetricName

N_DEFICIENCY = "n_deficiency_in_range"
FE_DEFICIENCY = "fe_deficiency"
PH_OUT_OF_RANGE = "ph_out_of_range"
EC_OUT_OF_RANGE = "ec_out_of_range"
TEMPERATURE_OUT_OF_RANGE = "temperature_out_of_range"
NEEDS_CHECK = "needs_check"

RULE_CODES = (
    N_DEFICIENCY,
    FE_DEFICIENCY,
    PH_OUT_OF_RANGE,
    EC_OUT_OF_RANGE,
    TEMPERATURE_OUT_OF_RANGE,
    NEEDS_CHECK,
)

PLANT_RULES = {
    "n_deficiency": N_DEFICIENCY,
    "fe_deficiency": FE_DEFICIENCY,
    "needs_check": NEEDS_CHECK,
}
SENSOR_RULES: dict[MetricName, str] = {
    "ph": PH_OUT_OF_RANGE,
    "ec": EC_OUT_OF_RANGE,
    "temperature": TEMPERATURE_OUT_OF_RANGE,
}

DEFAULT_ACTIONS: dict[str, list[str]] = {
    N_DEFICIENCY: ["Periksa konsentrasi larutan nutrisi", "Pantau selama 24 jam"],
    FE_DEFICIENCY: ["Periksa pH tandon dan ketersediaan zat besi"],
    PH_OUT_OF_RANGE: ["Periksa kalibrasi sensor", "Sesuaikan pH secara manual"],
    EC_OUT_OF_RANGE: ["Periksa kalibrasi sensor", "Periksa konsentrasi larutan"],
    TEMPERATURE_OUT_OF_RANGE: [
        "Periksa posisi sensor suhu",
        "Lindungi tandon dari panas atau dingin berlebih",
    ],
    NEEDS_CHECK: ["Periksa tanaman langsung", "Ambil snapshot baru"],
}

SEVERITIES = {
    N_DEFICIENCY: Severity.WARNING,
    FE_DEFICIENCY: Severity.WARNING,
    PH_OUT_OF_RANGE: Severity.WARNING,
    EC_OUT_OF_RANGE: Severity.WARNING,
    TEMPERATURE_OUT_OF_RANGE: Severity.CRITICAL,
    NEEDS_CHECK: Severity.INFO,
}

LABELS: dict[MetricName, str] = {"ph": "pH", "ec": "EC", "temperature": "Suhu air"}
UNITS: dict[MetricName, str] = {"ph": "", "ec": " mS/cm", "temperature": " °C"}
DECIMALS: dict[MetricName, int] = {"ph": 1, "ec": 2, "temperature": 1}
SIDES = {"low": "di bawah", "high": "di atas"}


def rule_code(context: AdviceContext) -> str:
    if context.trigger is AdviceTrigger.SENSOR_RANGE:
        assert context.focus is not None
        return SENSOR_RULES[context.focus]
    assert context.status is not None
    return PLANT_RULES[context.status]


def stored_actions(code: str) -> list[str]:
    """The actions of a rule: the admin's edit when there is one, otherwise the default."""
    row = db.session.get(AdviceRule, code)
    return list(row.suggested_actions) if row is not None else list(DEFAULT_ACTIONS[code])


def _number(metric: MetricName, value: float) -> str:
    return f"{value:.{DECIMALS[metric]}f}".replace(".", ",")


def _range(metric: MetricName, fact: MetricFact) -> str:
    low, high = _number(metric, fact.minimum), _number(metric, fact.maximum)
    return f"{low} sampai {high}{UNITS[metric]}"


def _reading(metric: MetricName, fact: MetricFact) -> str:
    """The value, the side and the ideal range."""
    side = SIDES[fact.band]  # type: ignore[index]
    value = _number(metric, fact.value)
    return f"{LABELS[metric]} {value}{UNITS[metric]} {side} rentang ideal {_range(metric, fact)}"


def _out_of_range(context: AdviceContext) -> list[str]:
    return [
        _reading(metric, context.metrics[metric])
        for metric in METRICS
        if metric in context.metrics and context.metrics[metric].band != "in_range"
    ]


def _summary(code: str, context: AdviceContext) -> str:
    hole = context.plant_position
    if code == N_DEFICIENCY:
        return f"Tanaman pada lubang {hole} menunjukkan tanda kekurangan nitrogen."
    if code == FE_DEFICIENCY:
        return f"Tanaman pada lubang {hole} menunjukkan tanda kekurangan zat besi."
    if code == NEEDS_CHECK:
        return f"Status lubang {hole} perlu dicek langsung."
    assert context.focus is not None
    return _reading(context.focus, context.metrics[context.focus]) + "."


def _causes(code: str, context: AdviceContext) -> list[str]:
    if code == N_DEFICIENCY:
        return ["Konsentrasi nitrogen dalam larutan mungkin kurang", *_out_of_range(context)]
    if code == FE_DEFICIENCY:
        ph = context.metrics.get("ph")
        base = (
            "pH tandon yang tinggi membuat zat besi sulit diserap"
            if ph is not None and ph.band == "high"
            else "Zat besi dalam larutan mungkin kurang atau sulit diserap"
        )
        return [base, *_out_of_range(context)]
    if code == NEEDS_CHECK:
        return ["Keyakinan model rendah atau daun tidak terlihat jelas", *_out_of_range(context)]
    assert context.focus is not None
    band = context.metrics[context.focus].band
    if code == PH_OUT_OF_RANGE:
        return ["Sensor belum dikalibrasi atau larutan nutrisi berubah"]
    if code == EC_OUT_OF_RANGE:
        return [
            "Larutan nutrisi terlalu encer" if band == "low" else "Larutan nutrisi terlalu pekat"
        ]
    return [
        "Suhu ruangan rendah"
        if band == "low"
        else "Suhu ruangan tinggi atau tandon terkena sinar matahari"
    ]


class RulesAdvisor:
    def advise(self, context: AdviceContext) -> AdviceDraft:
        code = rule_code(context)
        return AdviceDraft(
            summary=_summary(code, context),
            likely_causes=_causes(code, context),
            suggested_actions=stored_actions(code),
            severity=SEVERITIES[code],
            source=AdviceSource.RULES,
        )
