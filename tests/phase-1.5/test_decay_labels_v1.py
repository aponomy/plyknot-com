"""McLean-Pontiff decay labels v1 -- validation tests.

Skipped when decay-labels-v1.json is empty (Klas hasn't filled it yet).
"""

from pathlib import Path
import json
import pytest

from plyknot_com.dcoi.decay_labels import load_decay_labels
from plyknot_com.dcoi.registry import load_registry

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "plyknot_com" / "dcoi" / "data"
PREDICTORS_PATH = DATA_DIR / "predictors-v1.json"
DECAY_PATH = DATA_DIR / "decay-labels-v1.json"


def _has_decay_labels():
    with open(DECAY_PATH) as f:
        return len(json.load(f)) > 0


def _has_complete_registry():
    from plyknot_com.dcoi.registry import load_all_entries
    entries = load_all_entries(PREDICTORS_PATH)
    return all(p.is_filled for p in entries) and len(entries) == 97


_has_labels = pytest.mark.skipif(
    not _has_decay_labels(),
    reason="Decay labels not yet filled",
)

_complete = pytest.mark.skipif(
    not (_has_decay_labels() and _has_complete_registry()),
    reason="Decay labels or registry not yet complete",
)


@_has_labels
def test_decay_labels_load_without_error():
    """The decay labels JSON is valid and parseable."""
    labels = load_decay_labels(DECAY_PATH)
    assert len(labels) > 0


@_complete
def test_decay_labels_match_registry_ids():
    """Every predictor in the registry has a decay label, and vice versa."""
    labels = load_decay_labels(DECAY_PATH)
    registry = load_registry(PREDICTORS_PATH)
    registry_ids = {p.id for p in registry}
    label_ids = set(labels.keys())
    missing_labels = registry_ids - label_ids
    extra_labels = label_ids - registry_ids
    assert not missing_labels, f"Predictors without decay labels: {missing_labels}"
    assert not extra_labels, f"Decay labels without registry entries: {extra_labels}"


@_has_labels
def test_decay_magnitude_matches_computed():
    """Reported decay_magnitude is within 0.01 of (in - out) / in."""
    labels = load_decay_labels(DECAY_PATH)
    mismatches = []
    for pid, label in labels.items():
        if label.in_sample_return == 0:
            continue  # division by zero edge case; flag separately if needed
        computed = (label.in_sample_return - label.out_of_sample_return) / label.in_sample_return
        if abs(computed - label.decay_magnitude) > 0.01:
            mismatches.append(
                f"{pid}: reported={label.decay_magnitude:.4f}, computed={computed:.4f}"
            )
    assert not mismatches, f"Decay magnitude mismatches:\n" + "\n".join(mismatches)


@_has_labels
def test_decay_magnitudes_in_plausible_range():
    """All decay_magnitudes are in [-1.0, 2.0] (allows over-decay and reversal)."""
    labels = load_decay_labels(DECAY_PATH)
    out_of_range = []
    for pid, label in labels.items():
        if not (-1.0 <= label.decay_magnitude <= 2.0):
            out_of_range.append(f"{pid}: {label.decay_magnitude}")
    assert not out_of_range, f"Decay magnitudes out of range:\n" + "\n".join(out_of_range)
