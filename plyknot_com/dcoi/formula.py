"""DCOI formula v1 — Data-Coupling Overlap Index.

Reference implementation. Pure function, no I/O, no external dependencies.
Locked at v1 per Phase 1.5 empirical test 2, Stage 1 specification.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Sequence


@dataclass(frozen=True)
class PredictorInputs:
    predictor_id: str
    publication_date: date
    database_families: frozenset[str]   # canonicalized; e.g. {"CRSP", "Compustat"}
    variable_patterns: frozenset[str]   # canonicalized; e.g. {"accruals", "asset_growth"}


def _jaccard(a: frozenset, b: frozenset) -> float:
    """Jaccard index. J(empty, empty) = 0 by convention."""
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def _pair_similarity(p1: PredictorInputs, p2: PredictorInputs) -> float:
    """Equal-weighted average of Jaccard over database families and variable patterns."""
    return (_jaccard(p1.database_families, p2.database_families)
            + _jaccard(p1.variable_patterns, p2.variable_patterns)) / 2


def compute_dcoi(
    predictor: PredictorInputs,
    prior_predictors: Sequence[PredictorInputs],
) -> float:
    """Compute DCOI for `predictor` given `prior_predictors`.

    Caller is responsible for ensuring all prior_predictors have
    publication_date strictly earlier than predictor.publication_date.
    The function does NOT filter; it trusts the caller. Filtering is
    the corpus pipeline's job (out of scope for Stage 1).
    """
    if not prior_predictors:
        return 0.0
    total = sum(_pair_similarity(predictor, prior) for prior in prior_predictors)
    return total / len(prior_predictors)
