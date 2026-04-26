"""DCOI formula v1 -- reference tests against hand-computed worked examples."""

from datetime import date
import pytest
from plyknot_com.dcoi.formula import compute_dcoi, PredictorInputs


def _make(pid, year, db, vp):
    return PredictorInputs(
        predictor_id=pid,
        publication_date=date(year, 1, 1),
        database_families=frozenset(db),
        variable_patterns=frozenset(vp),
    )


def test_case_1_single_predictor_universe():
    p1 = _make("P1", 2000, {"CRSP"}, {"accruals"})
    assert compute_dcoi(p1, []) == 0.0


def test_case_2_no_overlap():
    p1 = _make("P1", 2000, {"CRSP"}, {"accruals"})
    p2 = _make("P2", 2001, {"Compustat"}, {"asset_growth"})
    assert compute_dcoi(p2, [p1]) == 0.0


def test_case_3_full_overlap():
    p1 = _make("P1", 2000, {"CRSP"}, {"accruals"})
    p2 = _make("P2", 2001, {"CRSP"}, {"accruals"})
    assert compute_dcoi(p2, [p1]) == 1.0


def test_case_4_partial_overlap_multiple_priors():
    p1 = _make("P1", 1995, {"CRSP"}, {"accruals"})
    p2 = _make("P2", 2000, {"CRSP", "Compustat"}, {"accruals", "asset_growth"})
    p3 = _make("P3", 2005, {"Compustat"}, {"asset_growth"})
    assert compute_dcoi(p3, [p1, p2]) == 0.25


def test_case_5_empty_database_family_convention():
    p1 = _make("P1", 2000, set(), {"accruals"})
    p2 = _make("P2", 2001, set(), {"accruals"})
    assert compute_dcoi(p2, [p1]) == 0.5
