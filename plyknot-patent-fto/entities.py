"""
Patent-FTO entities — text-as-instrument formulation.

Three entity kinds remain (claim, prior-art reference, distinguisher
spec passage), but their role under text-as-instrument is different
from the v3 sketch.

A patent claim is now an *instrument* — a measurement-producing text.
When run through guided_extraction.py, it produces a set of predicate-
extraction DataEntry objects, each becoming a coupling entry in the
universe.

A prior-art reference is also an instrument. Its extracted predicates
populate the same coupling map. The grounding pass routes prior-art
predicates through the claim's predicate index so convergence is
detected on grounded EntityIDs, not on surface form.

A claim element (in the v3 sketch a first-class entity) is now a
predicate-extraction record on the claim instrument. The framework
already has the right machinery for this in `predicate_decomposition.py`.

A distinguisher (§4.x spec passage) remains a target entity for
DISTINGUISHER_STRENGTH measurements computed via Lensing Strain.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

EntityID = int


# ── Document kinds ────────────────────────────────────────────────────

ClaimKind = Literal['independent', 'dependent']
PriorArtKind = Literal['granted_patent', 'application', 'academic_paper',
                       'product_doc', 'standard']


@dataclass
class ClaimDocument:
    """A patent claim treated as a measurement instrument. The full
    text of the claim is the instrument's reading; predicate
    extraction produces the claim's measurements.
    """
    claim_number: int
    kind: ClaimKind
    parent_claim_number: int | None
    text: str
    spec_section_refs: list[str] = field(default_factory=list)


@dataclass
class PriorArtDocument:
    """A cited prior-art reference treated as a measurement instrument.
    Its extracted predicates populate the same coupling map as the
    claims they are tested against.
    """
    identifier: str
    kind: PriorArtKind
    priority_date: str
    title: str
    text: str
    """Full text or relevant excerpt. The patent-FTO pipeline assumes
    the text has been extracted from the original document at IDS-
    construction time. For granted patents, this is the claims-plus-
    abstract section; for academic papers, the relevant body sections.
    The pipeline's verdicts are bounded by the quality of this text.
    """
    cited_in_ids: bool = True


@dataclass
class DistinguisherDocument:
    """A specification passage that distinguishes one or more claims
    from one or more references. Tested via Lensing Strain: extract
    the distinguisher unconditioned, then conditioned on each cited
    reference; the blend delta tells us if the distinguisher language
    holds under prior-art anchoring.
    """
    spec_section: str
    text: str
    supports_claims: list[int]
    distinguishes_against: list[str]


# ── Registration helpers ──────────────────────────────────────────────
#
# These wrap the framework's existing universe.create_measurer pattern
# rather than universe.create_massive. A document is fundamentally a
# measurer — it produces extracted-predicate measurements when fed
# through the extraction pipeline. The measurer/target distinction in
# the directed_key naming is what makes asymmetric anticipation
# verdicts possible: claim-as-target, prior-art-as-measurer is a
# different coupling direction than the reverse, and the framework's
# own analysers already respect direction.

def register_claim_document(universe, doc: ClaimDocument) -> EntityID:
    """Create the claim as a measurer entity in the universe. The
    claim's predicate extractions will be recorded as `measure()`
    calls *from* this entity *to* the predicate-extraction targets.
    """
    name = f'claim_doc:{doc.claim_number}'
    method = f'patent_claim_{doc.kind}'
    id_ = universe.create_measurer(name, method)

    # Registry-tier tags only; never consumed by analysers.
    universe.tags[id_] = ['observed', 'measurer', 'patent_claim',
                          doc.kind, f'claim_{doc.claim_number}']

    _claim_documents[id_] = doc
    return id_


def register_prior_art_document(universe,
                                doc: PriorArtDocument) -> EntityID:
    """Create the prior-art reference as a measurer entity. Its
    predicate extractions will populate the same coupling map and
    be grounded against the claim's predicate index in a separate
    pass.
    """
    name = f'prior_art_doc:{doc.identifier}'
    method = f'prior_art_{doc.kind}'
    id_ = universe.create_measurer(name, method)
    universe.tags[id_] = ['observed', 'measurer', 'patent_reference',
                          doc.kind, doc.identifier]
    _prior_art_documents[id_] = doc
    return id_


def register_distinguisher(universe,
                           doc: DistinguisherDocument) -> EntityID:
    name = f'distinguisher:{doc.spec_section}'
    method = 'spec_passage'
    id_ = universe.create_measurer(name, method)
    universe.tags[id_] = ['observed', 'measurer', 'distinguisher',
                          doc.spec_section]
    _distinguishers[id_] = doc
    return id_


# ── Predicate-as-entity helpers ───────────────────────────────────────
#
# Each unique predicate (after grounding) is a target entity in the
# universe. The framework's existing predicate_decomposition.py and
# grounding.py produce these; this module just gives the patent-FTO
# layer typed handles for them.

def register_predicate_as_target(universe, grounded_label: str,
                                 predicate_kind: str) -> EntityID:
    """Used only at coupling-map initialisation, when seeding the
    predicate index from the claim's first extraction pass. Production
    flow uses ground_text from grounding.py to either reuse an
    existing EntityID or create a new one — never call this directly
    when grounding is available.
    """
    # In production: id_ = universe.create_target(grounded_label,
    #                                             kind='predicate')
    # The patent-FTO layer follows the framework's existing target-
    # creation pattern; we create it here only as a stub.
    if not hasattr(universe, '_next_id'):
        universe._next_id = 0
        universe.name = {}
        universe.tags = {}
    id_ = universe._next_id
    universe._next_id += 1
    universe.name[id_] = grounded_label
    universe.tags[id_] = ['observed', 'predicate', predicate_kind]
    _predicate_kinds[id_] = predicate_kind
    return id_


# ── Side-tables ───────────────────────────────────────────────────────

_claim_documents: dict[EntityID, ClaimDocument] = {}
_prior_art_documents: dict[EntityID, PriorArtDocument] = {}
_distinguishers: dict[EntityID, DistinguisherDocument] = {}
_predicate_kinds: dict[EntityID, str] = {}


def get_claim(id_: EntityID) -> ClaimDocument | None:
    return _claim_documents.get(id_)


def get_prior_art(id_: EntityID) -> PriorArtDocument | None:
    return _prior_art_documents.get(id_)


def get_distinguisher(id_: EntityID) -> DistinguisherDocument | None:
    return _distinguishers.get(id_)


def get_predicate_kind(id_: EntityID) -> str | None:
    return _predicate_kinds.get(id_)
