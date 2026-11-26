"""Keep a plant's status from flickering (docs/ML.md section 6.3).

Every analysis gives one result per plant. The status shown changes only when another result
has at least `min_votes` of the last `window` results.
"""

from collections import Counter, deque


class Stabilizer:
    def __init__(self, window: int, min_votes: int) -> None:
        self._results: deque[tuple[str, float | None]] = deque(maxlen=window)
        self._min_votes = min_votes
        self._status: str | None = None

    def configure(self, window: int, min_votes: int) -> None:
        """Adopt new settings and keep the recent results."""
        self._results = deque(self._results, maxlen=window)
        self._min_votes = min_votes

    def add(self, status: str, confidence: float | None) -> tuple[str | None, float | None]:
        """Add a result. Returns the stable status, or None before any result won enough
        votes, with the confidence of the latest result that agrees with it."""
        self._results.append((status, confidence))
        votes = Counter(result for result, _ in self._results)
        top = max(votes.values())
        leaders = [result for result, count in votes.items() if count == top]
        if top >= self._min_votes and self._status not in leaders:
            # a tie keeps the current status; otherwise the newest of the leaders wins
            self._status = next(
                result for result, _ in reversed(self._results) if result in leaders
            )
        return self._status, self._latest_confidence()

    def _latest_confidence(self) -> float | None:
        for result, confidence in reversed(self._results):
            if result == self._status:
                return confidence
        return None
