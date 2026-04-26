"""McLean-Pontiff decay-magnitude labels loader.

Loads per-predictor decay data transcribed from M-P Table 6.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json


@dataclass(frozen=True)
class DecayLabel:
    predictor_id: str
    in_sample_return: float
    out_of_sample_return: float
    decay_magnitude: float


def _parse_label(raw: dict) -> DecayLabel:
    return DecayLabel(
        predictor_id=raw["id"],
        in_sample_return=raw["in_sample_return"],
        out_of_sample_return=raw["out_of_sample_return"],
        decay_magnitude=raw["decay_magnitude"],
    )


def load_decay_labels(path: Path | None = None) -> dict[str, DecayLabel]:
    """Load decay labels from JSON. Returns dict keyed by predictor_id."""
    if path is None:
        path = Path(__file__).parent / "data" / "decay-labels-v1.json"
    with open(path) as f:
        raw_list = json.load(f)
    return {label.predictor_id: label for label in (_parse_label(r) for r in raw_list)}
