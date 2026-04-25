"""
Patent-FTO properties — text-as-instrument formulation.

Reworked April 25, 2026 after the Gemini round-4 critique correctly
identified that the v1-v3 sketches had Plyknot reading verdicts from
LLM judges rather than ingesting LLM-extracted measurements. Under the
text-as-instrument paradigm (Satellite 2), the LLM is the transducer —
it converts patent text into structured DataEntry objects — and the
Plyknot core does the convergence math.

Properties are recorded at the predicate grain, not at the pair grain.
A claim is a collection of predicate measurements. A prior-art
reference is a collection of predicate measurements. Anticipation is
a directed-subset coverage check across grounded predicate sets, not
a continuous distance score.

The asymmetric coverage rule (correction round 4): the prior art
anticipates the claim iff the claim's predicate set is a subset of
the prior art's predicate set after Common Ground grounding. The
prior art is allowed to contain extra predicates; the claim is not
allowed to contain predicates the prior art lacks.
"""

from __future__ import annotations


class Properties:
    """Predicate-grain properties. Each is recorded as a coupling
    entry where the measurer is the document (claim or prior-art
    reference, treated as an instrument) and the target is the
    extracted predicate-as-entity. Convergence and structural
    absence at this grain is what the framework's existing
    analysers consume.
    """

    # ── Mechanism predicates ─────────────────────────────────────────

    MECHANISM_VERB = 'fto.mechanism.verb'
    """The action a mechanism performs. Extracted from text via
    predicate_decomposition. Value is the grounded EntityID of the
    verb in the predicate index. σ from inter-substrate extraction
    variance under N-resampling.
    """

    MECHANISM_SUBJECT = 'fto.mechanism.subject'
    """The agent of the mechanism (what does the action). Grounded
    EntityID."""

    MECHANISM_OBJECT = 'fto.mechanism.object'
    """The patient of the mechanism (what receives the action).
    Grounded EntityID."""

    MECHANISM_MODIFIER = 'fto.mechanism.modifier'
    """A qualifier on the mechanism (when, how, under what condition).
    Grounded EntityID. Multiple modifiers per mechanism are allowed."""

    MECHANISM_INTENSITY = 'fto.mechanism.intensity'
    """Continuous [0, 1] scalar from predicate decomposition's
    intensity field. Captures qualitative-quantitative claim
    language ('substantially', 'approximately', 'at least'). Used
    by Lensing Strain analysis."""

    # ── Structural predicates ────────────────────────────────────────

    INPUT_TYPE = 'fto.structure.input_type'
    """A type of input the system accepts. Grounded EntityID per
    distinct input."""

    OUTPUT_TYPE = 'fto.structure.output_type'
    """A type of output the system produces. Grounded EntityID."""

    STATE_VARIABLE = 'fto.structure.state_variable'
    """A persistent state variable the system maintains. Grounded
    EntityID."""

    COUPLING = 'fto.structure.coupling'
    """A coupling between two structural elements (input→state,
    state→output, etc.). Recorded as a triple (from, to, type) all
    grounded."""

    # ── Grounding-status properties ──────────────────────────────────

    PREDICATE_GROUNDED = 'fto.grounding.predicate_grounded'
    """Boolean (encoded 0.0 / 1.0). True if a prior-art predicate
    successfully grounded against the claim's predicate index. False
    is structural absence — the predicate exists in the prior art but
    not in the claim's vocabulary, OR the prior art predicate has no
    grounded match in the claim's vocabulary, depending on direction.
    """

    GROUNDING_CONFIDENCE = 'fto.grounding.confidence'
    """Continuous [0, 1] confidence the grounding step assigns when
    matching a predicate to an existing EntityID. Below threshold
    (default 0.6) the grounding is rejected and the predicate becomes
    a new EntityID — recorded as structural absence relative to the
    target index.
    """

    # ── Coverage and Lensing properties ──────────────────────────────

    PREDICATE_COVERAGE = 'fto.coverage.predicate_coverage'
    """Per (claim, reference) directed coverage score. Computed by
    marker passing from prior-art predicates through to the claim's
    predicate dependency graph. Range [0, 1]: 1.0 means every claim
    predicate is reached by at least one prior-art marker (full
    coverage = anticipation candidate); < 1.0 means structural holes
    exist (the unreached predicates are the distinguishers).
    """

    LENSING_BLEND_DELTA = 'fto.lensing.blend_delta'
    """Delta between unconditioned and claim-conditioned extraction of
    the prior-art text, computed via guided_extraction CFG. Range
    [0, 1]: low delta = the prior art reads the same with or without
    the claim's lens (consistent disclosure or consistent absence);
    high delta = the prior art's interpretation contorts to match
    the claim (forced reading, weak disclosure).
    """

    LENSING_STRAIN = 'fto.lensing.strain'
    """Lensing Strain proper: blend_delta normalised by the prior
    art's phenomenological mass (number of independent measurer
    streams asserting the same predicate set). Per canvas-architecture-
    design.md §6.3.
    """

    # ── Document-level properties ────────────────────────────────────

    DOCUMENT_PREDICATE_COUNT = 'fto.document.predicate_count'
    """Number of distinct predicates extracted from the document
    after Common Ground stabilisation. A diagnostic — short prior
    art with low predicate count may not anticipate a long claim
    even when grounded, simply by predicate-set cardinality."""

    DOCUMENT_EXTRACTION_STABILITY = 'fto.document.extraction_stability'
    """Order-independent CG self-correction score. Range [0, 1].
    1.0 = the predicate set is identical across N=4 randomised
    extraction orderings; < 1.0 = the document's predicate set is
    not stable, which makes downstream verdicts unreliable. Below
    threshold (default 0.85) the document escalates to attorney
    review automatically per the trust-weight discipline.
    """


class ConvergenceStatus:
    """Patent-FTO verdict labels. These map onto the framework's
    existing ●/◐/◆/◈ vocabulary but with text-as-instrument
    semantics:
    """

    COVERED_BY_PRIOR_ART = 'covered'
    """The claim's predicate set is fully covered by the prior art's
    grounded predicate set. Anticipation candidate. Must amend.
    Equivalent to ◆ crack.
    """

    NOT_COVERED = 'not_covered'
    """At least one claim predicate is absent from the grounded prior
    art. Structural distinguisher. Equivalent to ● converged-safe.
    """

    PARTIAL_COVERAGE_WITH_LENSING = 'partial_coverage_lensing'
    """Some predicates covered, some absent, but the prior art
    showed high Lensing Strain (forced reading). Mixed signal;
    attorney review priority. Equivalent to ◐ tension.
    """

    COVERED_VIA_OBVIOUSNESS = 'covered_via_obviousness'
    """Tier 1 absent, Tier 2 functional equivalence converged. The
    prior art does not literally cover the claim but a PHOSITA
    would find the absent predicates obvious. § 103 / Art. 56
    rejection candidate.
    """

    INSUFFICIENT_EXTRACTION = 'insufficient_extraction'
    """The document's extraction stability is below threshold; no
    verdict can be rendered. Escalates to attorney review by
    default — the framework's productive failure mode is honest
    escalation, not silent verdict.
    """
