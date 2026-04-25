"""
Patent-FTO pipeline — wired to framework primitives.

The pipeline calls into Plyknot's existing primitives at every step.
The patent-FTO layer's job is orchestration and result aggregation;
the analytical work is done by:

  - plyknot.predicate_decomposition (claim and prior-art extraction)
    via adapters.decompose
  - plyknot.guided_extraction (CFG conditioned/unconditioned for
    Lensing Strain) — simulated variants used for API-free testing
  - plyknot.grounding (predicate matching against the claim's index)
    via adapters.index and adapters.coverage
  - plyknot.analysis (substrate-aware convergence pattern)

Marker passing has been removed from the per-pair verdict pipeline.
The verdict primitive is directed-subset coverage on grounded predicate
sets (adapters.coverage.directed_subset_check, canvas patch 4).
Marker passing remains available for future cross-claim dependency
analysis but is not part of the per-pair anticipation check.

Pipeline phases:

  Phase 1 — Extraction. Each document is extracted by calling
    decompose_text (LLM call → parse → build_graph). Returns a
    DecompositionGraph per document.

  Phase 2 — Grounding. The claim's DecompositionGraph seeds the
    GroundingIndex. Every extraction is grounded against this index.
    Predicates above threshold reuse existing label IDs; below
    threshold → structural absence.

  Phase 3 — Lensing Strain. For each (claim, reference) pair, run
    guided_extraction extract_unconditioned + extract_conditioned
    with the claim's predicate set as context_anchors over the
    reference text. Compute blend delta.

  Phase 4 — Directed-subset coverage (replaces marker passing).
    Does every claim predicate have a match in the prior-art's
    grounded predicate set? Coverage fraction and uncovered indices
    are the verdict inputs.

  Phase 5 — Verdict aggregation. Directed-subset coverage combined
    with Lensing Strain → per-(claim, reference) verdict label.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from plyknot.predicate_decomposition import DecompositionGraph
from plyknot.grounding import GroundingIndex, GroundingResult

EntityID = int


# ── Workspace types ───────────────────────────────────────────────────
# These are kept for backward-compatibility with the example's output
# format. They wrap framework types for the patent-FTO verdict layer.

@dataclass
class PredicateExtraction:
    """Workspace view of a predicate unit from a DecompositionGraph.
    Created by ground_extraction when converting PredicateUnit →
    workspace type. `subject` holds the PredicateUnit's content;
    `object` is None (the framework does not separate subject/object).
    """
    verb: str
    subject: str
    object: str | None
    modifiers: list[str] = field(default_factory=list)
    intensity: float = 1.0
    source_text_span: tuple[int, int] | None = None


@dataclass
class GroundedPredicate:
    """A predicate after grounding against the claim's predicate index.
    `raw` is the workspace-typed view; `grounding_result` is the
    framework's GroundingResult for use by adapters.coverage.
    """
    raw: PredicateExtraction
    grounded_entity_id: EntityID | None
    grounding_confidence: float
    grounding_result: GroundingResult | None = None


@dataclass
class LensingStrainResult:
    """Output of CFG-blend Lensing Strain measurement."""
    blend_delta: float
    sigma: float
    unconditioned_predicates: list[PredicateExtraction]
    conditioned_predicates: list[PredicateExtraction]


@dataclass
class AnticipationResult:
    """Per (claim, reference) coverage output.
    Populated from CoverageResult; `unreached_claim_predicates` are
    the structural distinguishers."""
    coverage: float
    unreached_claim_predicates: list[GroundedPredicate]
    collisions: list[dict]


@dataclass
class ClaimReferenceVerdict:
    claim_number: int
    reference_identifier: str

    claim_grounded: list[GroundedPredicate]
    reference_grounded: list[GroundedPredicate]

    lensing: LensingStrainResult
    anticipation: AnticipationResult

    status: str = ''
    distinguisher_predicates: list[GroundedPredicate] = field(default_factory=list)
    needs_attorney_review: bool = False


# ── Phase 1 — Extraction ──────────────────────────────────────────────

def extract_document(
    universe,
    document_entity_id: EntityID,
    extractor_ids: list[EntityID],
    llm_call: Callable[[str], str],
) -> DecompositionGraph:
    """Extract predicates from a document via predicate decomposition.

    Calls decompose_text (LLM → parse_decomposition_response →
    build_graph). For multi-extractor runs, call this function once
    per extractor and merge graphs upstream; this function handles
    one extraction pass.

    Returns a DecompositionGraph from the framework.
    """
    from entities import get_claim, get_prior_art
    from adapters.decompose import decompose_text

    claim = get_claim(document_entity_id)
    if claim:
        text = claim.text
    else:
        ref = get_prior_art(document_entity_id)
        if ref:
            text = ref.text
        else:
            raise ValueError(
                f'No document registered for entity {document_entity_id}')

    return decompose_text(text, llm_call)


# ── Phase 2 — Grounding ───────────────────────────────────────────────

def build_predicate_index(
    universe,
    claim_graphs: list[DecompositionGraph],
) -> tuple[GroundingIndex, dict[int, str]]:
    """Seed the predicate grounding index from the claim's predicate
    graph(s). Uses build_index_from_graph which builds an embedding
    index over the graph's predicate units.

    Returns (GroundingIndex, label_dict) where label_dict maps
    integer IDs (starting at 100,000) to canonical predicate strings.
    Multiple graphs are merged by offsetting starting_id.
    """
    from adapters.index import build_index_from_graph

    if not claim_graphs:
        raise ValueError('claim_graphs must not be empty')

    # For multiple claim graphs, build a merged label_dict then build
    # one combined index. Starting IDs are offset per graph.
    merged_labels: dict[int, str] = {}
    offset = 100_000
    for graph in claim_graphs:
        for i, unit in enumerate(graph.units):
            label = f"{unit.verb} {unit.content}".strip()
            merged_labels[offset + i] = label
        offset += 10_000  # leave gap between graphs

    from plyknot.grounding import build_grounding_index
    index = build_grounding_index(merged_labels)
    return index, merged_labels


def ground_extraction(
    universe,
    graph: DecompositionGraph,
    grounding_index: GroundingIndex,
) -> list[GroundedPredicate]:
    """Ground every predicate unit in the graph against the index.

    Calls ground_text per predicate string (verb + content).
    Predicates that match above threshold → grounded_entity_id set to
    the matched label ID; below threshold → grounded_entity_id = None
    (structural absence from the claim's vocabulary).
    """
    from plyknot.grounding import ground_text

    grounded: list[GroundedPredicate] = []
    for unit in graph.units:
        label = f'{unit.verb} {unit.content}'.strip()
        results = ground_text(label, grounding_index)
        gr = results[0] if results else None

        raw_pred = PredicateExtraction(
            verb=unit.verb,
            subject=unit.content,
            object=None,
            modifiers=[],
            intensity=unit.intensity,
        )

        grounded.append(GroundedPredicate(
            raw=raw_pred,
            grounded_entity_id=gr.top_match if gr else None,
            grounding_confidence=(
                gr.candidates[0].similarity
                if (gr and gr.candidates) else 0.0
            ),
            grounding_result=gr,
        ))
    return grounded


# ── Phase 3 — Lensing Strain ──────────────────────────────────────────

def measure_lensing_strain(
    universe,
    reference_text: str,
    claim_predicate_anchors: list[GroundedPredicate],
    extractor_ids: list[EntityID],
) -> LensingStrainResult:
    """Compute CFG-blend Lensing Strain for a (claim, reference) pair.

    Uses extract_unconditioned_simulated and extract_conditioned_simulated
    (API-free variants) for the wired smoke test. The context_anchors
    are built from the claim's grounded predicates.

    blend_delta = mean absolute guidance_delta across GuidedValue list.
    Low delta → reference reads the same with/without claim lens.
    High delta → reference interpretation contorts under claim lens.

    To use real LLM calls, replace the simulated calls with
    extract_unconditioned and extract_conditioned, passing the model
    from one of the registered extractor specs.
    """
    from plyknot.guided_extraction import (
        extract_unconditioned_simulated,
        extract_conditioned_simulated,
        blend_extractions,
    )

    # Build context_anchors from the claim's grounded predicates.
    # Keys: "verb:content"; values: intensity score.
    context_anchors: dict[str, float] = {}
    for gp in claim_predicate_anchors:
        if gp.grounding_result and gp.grounding_result.grounded:
            key = f'{gp.raw.verb}:{gp.raw.subject}'
            context_anchors[key] = gp.raw.intensity

    ground_truth = dict(context_anchors)

    unc = extract_unconditioned_simulated(reference_text, ground_truth)
    cond = extract_conditioned_simulated(
        reference_text, context_anchors, ground_truth)
    guided_values = blend_extractions(unc, cond)

    if guided_values:
        blend_delta = (
            sum(abs(gv.guidance_delta) for gv in guided_values)
            / len(guided_values)
        )
    else:
        blend_delta = 0.0

    return LensingStrainResult(
        blend_delta=blend_delta,
        sigma=0.05,
        unconditioned_predicates=[],
        conditioned_predicates=[],
    )


# ── Phase 4 → Phase 5 — Coverage and verdict ─────────────────────────

def render_verdict(
    claim_grounded: list[GroundedPredicate],
    reference_grounded: list[GroundedPredicate],
    lensing: LensingStrainResult,
    anticipation: AnticipationResult,
) -> tuple[str, list[GroundedPredicate], bool]:
    """Apply the directed-subset rule with Lensing Strain modulation.

    coverage >= 0.99 AND blend_delta < 0.3 → COVERED_BY_PRIOR_ART
    coverage >= 0.99 AND blend_delta > 0.6 → PARTIAL_COVERAGE_WITH_LENSING
    coverage < 1.0  → NOT_COVERED (uncovered predicates are distinguishers)
    """
    distinguishers = anticipation.unreached_claim_predicates

    if anticipation.coverage >= 0.99:
        if lensing.blend_delta < 0.3:
            return ('covered', distinguishers, False)
        else:
            return ('partial_coverage_lensing', distinguishers, True)
    else:
        return ('not_covered', distinguishers, False)


def evaluate_pair(
    universe,
    claim_id: EntityID,
    reference_id: EntityID,
    claim_graph: DecompositionGraph,
    reference_graph: DecompositionGraph,
    grounding_index: GroundingIndex,
    label_dict: dict[int, str],
    extractor_ids: list[EntityID],
) -> ClaimReferenceVerdict:
    """The full per-pair pipeline: ground → lensing → coverage → verdict.

    Phase 2: ground both graphs against the claim's grounding index.
    Phase 3: measure Lensing Strain (simulated CFG blend).
    Phase 4: directed-subset coverage check (replaces marker passing).
    Phase 5: aggregate verdict label.
    """
    from entities import get_claim, get_prior_art
    from adapters.coverage import directed_subset_check

    claim_doc = get_claim(claim_id)
    ref_doc = get_prior_art(reference_id)

    claim_grounded = ground_extraction(universe, claim_graph, grounding_index)
    ref_grounded = ground_extraction(universe, reference_graph, grounding_index)

    lensing = measure_lensing_strain(
        universe,
        reference_text=ref_doc.text if ref_doc else '',
        claim_predicate_anchors=claim_grounded,
        extractor_ids=extractor_ids,
    )

    # Extract GroundingResult objects for the coverage check.
    claim_gr_results = [
        gp.grounding_result for gp in claim_grounded
        if gp.grounding_result is not None
    ]
    ref_gr_results = [
        gp.grounding_result for gp in ref_grounded
        if gp.grounding_result is not None
    ]
    coverage_result = directed_subset_check(claim_gr_results, ref_gr_results)

    # Map coverage indices back to GroundedPredicate objects.
    unreached = [
        claim_grounded[i]
        for i in coverage_result.uncovered_source_indices
        if i < len(claim_grounded)
    ]
    anticipation = AnticipationResult(
        coverage=coverage_result.coverage,
        unreached_claim_predicates=unreached,
        collisions=[],
    )

    status, distinguishers, needs_review = render_verdict(
        claim_grounded, ref_grounded, lensing, anticipation,
    )

    return ClaimReferenceVerdict(
        claim_number=claim_doc.claim_number if claim_doc else -1,
        reference_identifier=ref_doc.identifier if ref_doc else '?',
        claim_grounded=claim_grounded,
        reference_grounded=ref_grounded,
        lensing=lensing,
        anticipation=anticipation,
        status=status,
        distinguisher_predicates=distinguishers,
        needs_attorney_review=needs_review,
    )
