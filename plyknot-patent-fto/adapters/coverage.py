"""
Adapter: directed-subset coverage check (canvas patch 4).

Patent-FTO anticipation rule: the prior art covers the claim iff
every grounded predicate in the claim is matched by some grounded
predicate in the prior art. The check is asymmetric — the prior
art is allowed to have extra predicates the claim lacks.

This is workspace-local because canvas patch 4 has not been
absorbed into the framework. If the patent-FTO sweep produces
useful verdicts, this primitive becomes a candidate for
promotion into plyknot/analysis.py later.
"""

from __future__ import annotations
from dataclasses import dataclass

from plyknot.grounding import GroundingResult


@dataclass
class CoverageResult:
    """Result of the directed-subset check."""
    coverage: float
    """Fraction of source predicates covered by target predicates,
    in [0, 1]. 1.0 = full anticipation candidate; < 1.0 = the
    uncovered source predicates ARE the structural distinguishers."""
    covered_source_indices: list[int]
    uncovered_source_indices: list[int]
    """Indices into the source's predicate list. Uncovered = the
    legal distinguisher set."""


def directed_subset_check(
    source_grounded: list[GroundingResult],
    target_grounded: list[GroundingResult],
    require_grounded: bool = True,
) -> CoverageResult:
    """Compute directed coverage: does every source predicate find
    a grounded match in the target?

    `source_grounded`: the claim's grounded predicates.
    `target_grounded`: the prior-art reference's grounded predicates.

    A source predicate is `covered` iff it grounded successfully
    AND the target's grounded predicate set contains at least one
    GroundingResult whose `top_match` equals the source's
    `top_match`.

    A source predicate that did not ground (structural absence)
    is treated as `uncovered` — the predicate is not in the
    shared vocabulary and therefore cannot be matched in the
    target's grounded set either.
    """
    target_grounded_ids: set[int] = set()
    for tgr in target_grounded:
        if tgr.grounded and tgr.top_match is not None:
            target_grounded_ids.add(tgr.top_match)

    covered: list[int] = []
    uncovered: list[int] = []

    for i, sgr in enumerate(source_grounded):
        if not sgr.grounded or sgr.top_match is None:
            uncovered.append(i)
            continue
        if sgr.top_match in target_grounded_ids:
            covered.append(i)
        else:
            uncovered.append(i)

    total = len(source_grounded)
    coverage = len(covered) / total if total > 0 else 0.0

    return CoverageResult(
        coverage=coverage,
        covered_source_indices=covered,
        uncovered_source_indices=uncovered,
    )
