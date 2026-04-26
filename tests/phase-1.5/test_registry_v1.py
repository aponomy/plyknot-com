"""McLean-Pontiff predictor registry v1 -- validation tests.

Two modes:
- Partial-fill: when TBD entries exist, most tests skip with a clear message.
- Complete: when no TBD entries remain, all tests are enforced.
"""

from datetime import date
from pathlib import Path
import json
import pytest

from plyknot_com.dcoi.registry import load_registry, load_all_entries
from plyknot_com.dcoi.canonicalize import (
    DATABASE_FAMILY_CANONICALIZATION,
    VARIABLE_PATTERN_CANONICALIZATION,
)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "plyknot_com" / "dcoi" / "data"
PREDICTORS_PATH = DATA_DIR / "predictors-v1.json"
ADDITIONS_PATH = DATA_DIR / "canonicalization-additions-v1.json"


def _filled_predictors():
    return load_registry(PREDICTORS_PATH)


def _all_entries():
    return load_all_entries(PREDICTORS_PATH)


def _is_registry_complete():
    entries = _all_entries()
    return all(p.is_filled for p in entries) and len(entries) == 97


def _load_additions():
    with open(ADDITIONS_PATH) as f:
        return json.load(f)


def _canonical_db_values():
    """All canonical database family names: v1 map values + additions values."""
    values = set(DATABASE_FAMILY_CANONICALIZATION.values())
    additions = _load_additions()
    values.update(additions.get("database_family_additions", {}).values())
    return values


def _canonical_var_values():
    """All canonical variable pattern names: v1 map values + additions values."""
    values = set(VARIABLE_PATTERN_CANONICALIZATION.values())
    additions = _load_additions()
    values.update(additions.get("variable_pattern_additions", {}).values())
    return values


_complete = pytest.mark.skipif(
    not _is_registry_complete(),
    reason="Registry not yet complete -- TBD entries remain",
)


# --- Tests that always run ---


def test_json_loads_without_error():
    """The predictors JSON file is valid and parseable."""
    entries = _all_entries()
    assert len(entries) == 97


def test_mclean_pontiff_indices_present():
    """All 97 indices 1..97 are present in the raw file."""
    entries = _all_entries()
    indices = {p.mclean_pontiff_index for p in entries}
    assert indices == set(range(1, 98))


# --- Tests that require complete registry ---


@_complete
def test_registry_has_97_filled_entries():
    """When all entries are filled (no TBDs), exactly 97 predictors."""
    filled = _filled_predictors()
    assert len(filled) == 97


@_complete
def test_predictor_ids_unique():
    """No duplicate ids."""
    filled = _filled_predictors()
    ids = [p.id for p in filled]
    assert len(ids) == len(set(ids)), f"Duplicate ids: {[x for x in ids if ids.count(x) > 1]}"


@_complete
def test_publication_dates_consistent_with_year():
    """publication_date.year matches original_paper.year (or year-1 for working papers)."""
    filled = _filled_predictors()
    mismatches = []
    for p in filled:
        if p.publication_date and p.original_paper.year:
            diff = abs(p.publication_date.year - p.original_paper.year)
            if diff > 1:
                mismatches.append(
                    f"{p.id}: pub_date={p.publication_date}, paper_year={p.original_paper.year}"
                )
    assert not mismatches, f"Date/year mismatches:\n" + "\n".join(mismatches)


@_complete
def test_no_future_publication_dates():
    """All publication_date entries are before today."""
    filled = _filled_predictors()
    today = date.today()
    future = [p.id for p in filled if p.publication_date and p.publication_date > today]
    assert not future, f"Future publication dates: {future}"


@_complete
def test_database_families_canonicalized():
    """Every entry in database_families is a canonical value from the
    v1 map or from canonicalization-additions-v1.json."""
    filled = _filled_predictors()
    allowed = _canonical_db_values()
    violations = []
    for p in filled:
        for db in p.database_families:
            if db not in allowed:
                violations.append(f"{p.id}: {db!r}")
    assert not violations, f"Uncanonicalized database families:\n" + "\n".join(violations)


@_complete
def test_variable_patterns_canonicalized():
    """Every entry in variable_patterns is a canonical value from the
    v1 map or from canonicalization-additions-v1.json."""
    filled = _filled_predictors()
    allowed = _canonical_var_values()
    violations = []
    for p in filled:
        for vp in p.variable_patterns:
            if vp not in allowed:
                violations.append(f"{p.id}: {vp!r}")
    assert not violations, f"Uncanonicalized variable patterns:\n" + "\n".join(violations)


@_complete
def test_doi_or_url_present():
    """Each non-ambiguous predictor should have a DOI or URL. Warns for missing."""
    filled = _filled_predictors()
    missing = [p.id for p in filled
               if not p.original_paper.doi and not p.original_paper.url and not p.ambiguous]
    # Warn but don't fail — LLM extraction may not know all DOIs
    if missing:
        import warnings
        warnings.warn(f"{len(missing)} non-ambiguous predictors lack DOI/URL: {missing}")


@_complete
def test_to_dcoi_inputs_round_trip():
    """Predictor.to_dcoi_inputs() produces a valid PredictorInputs the formula accepts."""
    from plyknot_com.dcoi.formula import compute_dcoi

    filled = _filled_predictors()
    # Skip predictors with null publication_date (ambiguous/incomplete)
    convertible = [p for p in filled if p.publication_date is not None]
    inputs = [p.to_dcoi_inputs() for p in convertible]
    assert len(inputs) >= 90, f"Too few convertible predictors: {len(inputs)}"
    # Run DCOI on the last predictor with all prior as a smoke test
    last = max(inputs, key=lambda x: x.publication_date)
    priors = [i for i in inputs if i.publication_date < last.publication_date]
    result = compute_dcoi(last, priors)
    assert 0.0 <= result <= 1.0
