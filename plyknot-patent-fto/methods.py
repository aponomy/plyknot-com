"""
Patent-FTO methods — text-as-instrument formulation.

Methods correspond to operations in the actual Plyknot pipeline, not
to per-pair LLM judgments. Each method is named after the framework
function it invokes:

  - predicate_decomposition_v1 → plyknot.predicate_decomposition
  - guided_extraction_unconditioned_v1 → plyknot.guided_extraction
        with empty context_anchors
  - guided_extraction_conditioned_v1 → plyknot.guided_extraction
        with the claim's predicate set as context_anchors
  - common_ground_stabilisation_v1 → plyknot.common_ground
        order-randomised re-extraction with N=4 orderings
  - ground_predicate_v1 → plyknot.grounding.ground_text against an
        existing predicate index
  - marker_passing_anticipation_v1 → plyknot.marker_passing
        with claim predicates as seed_deps and prior-art predicates
        as MarkerSource

The LLM is the transducer inside each extraction step, not a verdict-
producing agent. Different LLM substrates run the same extraction;
their outputs are aggregated by Common Ground into a stable predicate
set per document.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Method:
    identifier: str
    framework_function: str
    description: str
    output_format: str
    version: str


# ── Extraction methods (LLM as transducer) ────────────────────────────

PREDICATE_DECOMPOSITION_V1 = Method(
    identifier='extract.predicate_decomposition.v1',
    framework_function='plyknot.predicate_decomposition.decompose',
    description=(
        'Run predicate decomposition on the document text. Produces '
        'a list of PredicateExtraction records (verb, subject, '
        'object, modifiers, intensity). The LLM is a transducer; '
        'multiple LLM substrates run the same decomposition and the '
        'outputs are reconciled by Common Ground.'
    ),
    output_format='list[PredicateExtraction]',
    version='2026-04-25',
)


GUIDED_EXTRACTION_UNCONDITIONED_V1 = Method(
    identifier='extract.guided_unconditioned.v1',
    framework_function='plyknot.guided_extraction.extract_unconditioned',
    description=(
        'Run guided_extraction with empty context_anchors. Returns '
        'the predicate extraction the LLM produces from the text '
        'alone. For a prior-art document this is the natural reading.'
    ),
    output_format='ExtractionResult{predicates: list, sigma: float}',
    version='2026-04-25',
)


GUIDED_EXTRACTION_CONDITIONED_V1 = Method(
    identifier='extract.guided_conditioned.v1',
    framework_function='plyknot.guided_extraction.extract_conditioned',
    description=(
        'Run guided_extraction with the claim`s predicate set as '
        'context_anchors. Returns the predicate extraction the LLM '
        'produces from the text *as if reading it through the claim`s '
        'lens*. Compared against the unconditioned extraction to '
        'compute Lensing blend delta.'
    ),
    output_format='ExtractionResult{predicates: list, sigma: float}',
    version='2026-04-25',
)


COMMON_GROUND_STABILISATION_V1 = Method(
    identifier='extract.common_ground.v1',
    framework_function='plyknot.common_ground.stabilise',
    description=(
        'Run extraction across N=4 randomised orderings of the same '
        'document chunks; reconcile predicate sets via order-'
        'independent Common Ground self-correction. Output is the '
        'stabilised predicate set plus an extraction-stability score '
        'in [0, 1]. Below 0.85 stability, the document is escalated '
        'to attorney review automatically.'
    ),
    output_format='StabilisedExtraction{predicates: list, stability: float}',
    version='2026-04-25',
)


# ── Grounding methods (predicate index lookup) ────────────────────────

GROUND_PREDICATE_V1 = Method(
    identifier='ground.predicate.v1',
    framework_function='plyknot.grounding.ground_text',
    description=(
        'Ground a predicate extraction against an existing predicate '
        'index. Returns either an existing EntityID (the predicate '
        'matched to a known concept above grounding-confidence '
        'threshold) or None (the predicate is structurally absent '
        'from the index — the central distinguisher signal under '
        'text-as-instrument).'
    ),
    output_format='GroundingResult{entity_id: int|None, confidence: float}',
    version='2026-04-25',
)


GROUND_TO_COMMON_GROUND_V1 = Method(
    identifier='ground.common_ground.v1',
    framework_function='plyknot.grounding.ground_to_common_ground',
    description=(
        'Ground multiple extractions of the same text into a shared '
        'Common Ground predicate set. Used during the multi-substrate '
        'extraction phase to ensure Anthropic-substrate and Google-'
        'substrate extractions of the same document land in the same '
        'predicate vocabulary.'
    ),
    output_format='CommonGroundResult{predicate_set: list, alignment: dict}',
    version='2026-04-25',
)


# ── Coverage and Lensing methods ──────────────────────────────────────

MARKER_PASSING_ANTICIPATION_V1 = Method(
    identifier='analyse.marker_passing.anticipation.v1',
    framework_function='plyknot.marker_passing.run_custom_marker_passing',
    description=(
        'Run marker passing with the claim`s predicate set as '
        'seed_deps and a prior-art document`s predicate set as '
        'MarkerSource. Markers propagate through the claim`s '
        'predicate dependency graph. Coverage = fraction of claim '
        'predicates reached by markers from this prior-art source. '
        'Coverage = 1.0 → anticipation candidate; coverage < 1.0 → '
        'structural holes are the distinguishers.'
    ),
    output_format='MarkerPassingResult{coverage: float, '
                  'unreached_predicates: list, collisions: list}',
    version='2026-04-25',
)


LENSING_BLEND_DELTA_V1 = Method(
    identifier='analyse.lensing.blend_delta.v1',
    framework_function='plyknot.guided_extraction.blend_extractions',
    description=(
        'Compute the blend delta between unconditioned and claim-'
        'conditioned extraction of the same prior-art document. Low '
        'delta = consistent reading regardless of frame; high delta '
        '= the prior art`s interpretation contorts to match the '
        'claim. Per canvas-architecture-design.md §6.3, this is the '
        'Lensing Strain mechanism in patent-FTO domain.'
    ),
    output_format='BlendDeltaResult{delta: float, sigma: float}',
    version='2026-04-25',
)


DIRECTED_SUBSET_COVERAGE_V1 = Method(
    identifier='analyse.directed_subset.v1',
    framework_function='patent_fto.coverage.directed_subset_check',
    description=(
        'For (claim, reference) pair: check that every grounded '
        'predicate in the claim has a converged match in the prior-'
        'art`s grounded predicate set. The check is asymmetric: the '
        'prior art is allowed to contain predicates the claim lacks, '
        'but the claim cannot contain predicates the prior art '
        'lacks. Returns coverage fraction and the list of un-covered '
        'claim predicates (the distinguisher set).'
    ),
    output_format='SubsetCheckResult{coverage: float, '
                  'uncovered_predicates: list, covered_predicates: list}',
    version='2026-04-25',
)


# ── Method registry helper ────────────────────────────────────────────

ALL_METHODS = [
    PREDICATE_DECOMPOSITION_V1,
    GUIDED_EXTRACTION_UNCONDITIONED_V1,
    GUIDED_EXTRACTION_CONDITIONED_V1,
    COMMON_GROUND_STABILISATION_V1,
    GROUND_PREDICATE_V1,
    GROUND_TO_COMMON_GROUND_V1,
    MARKER_PASSING_ANTICIPATION_V1,
    LENSING_BLEND_DELTA_V1,
    DIRECTED_SUBSET_COVERAGE_V1,
]


def get_method(identifier: str) -> Method | None:
    for m in ALL_METHODS:
        if m.identifier == identifier:
            return m
    return None
