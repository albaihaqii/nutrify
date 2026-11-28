"""What an advisor receives and returns (docs/Architecture.md section 4.5).

The advisor never decides the class of a plant: the context holds the class that the vision
pipeline already decided, the sensor values and the ideal ranges. It only writes the advice.
"""

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

from app.models import AdviceSource, AdviceTrigger, Severity

MetricName = Literal["ph", "ec", "temperature"]
METRICS: tuple[MetricName, ...] = ("ph", "ec", "temperature")
MetricBand = Literal["low", "in_range", "high"]


@dataclass(frozen=True)
class MetricFact:
    value: float
    band: MetricBand
    minimum: float
    maximum: float

    def as_json(self) -> dict[str, Any]:
        return {"value": self.value, "band": self.band, "min": self.minimum, "max": self.maximum}


@dataclass(frozen=True)
class AdviceContext:
    """The facts of one piece of advice."""

    trigger: AdviceTrigger
    # `plant_status`: the hole and its status (n_deficiency, fe_deficiency or needs_check).
    plant_position: int | None = None
    status: str | None = None
    confidence: float | None = None
    # `sensor_range`: the measurement that stayed out of its range.
    focus: MetricName | None = None
    # The latest fresh sensor values; empty when there are none.
    metrics: dict[MetricName, MetricFact] = field(default_factory=dict)

    def as_json(self) -> dict[str, Any]:
        return {
            "trigger": self.trigger.value,
            "plant_position": self.plant_position,
            "status": self.status,
            "confidence": self.confidence,
            "focus": self.focus,
            "metrics": {name: fact.as_json() for name, fact in self.metrics.items()},
        }

    def cache_key(self) -> str:
        """Same status and same sensor bands give the same key (docs/Architecture.md 4.5)."""
        bands = ",".join(
            f"{name}={self.metrics[name].band}" for name in METRICS if name in self.metrics
        )
        if self.trigger is AdviceTrigger.SENSOR_RANGE:
            assert self.focus is not None
            return f"sensor_range:{self.focus}:{self.metrics[self.focus].band}:{bands}"
        return f"plant_status:{self.status}:{bands}"


@dataclass(frozen=True)
class AdviceDraft:
    summary: str
    likely_causes: list[str]
    suggested_actions: list[str]
    severity: Severity
    source: AdviceSource
    provider: str | None = None
    model_name: str | None = None


class Advisor(Protocol):
    def advise(self, context: AdviceContext) -> AdviceDraft: ...
