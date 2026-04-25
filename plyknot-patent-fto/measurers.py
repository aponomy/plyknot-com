"""
Patent-FTO measurers — text-as-instrument formulation.

Under text-as-instrument, the LLM is a transducer that converts
patent text into structured predicate extractions. The text itself
is the irreducible measurement source; the LLM is interchangeable
with another LLM in the way a microscope objective is interchangeable
with another. Different LLM substrates run the same extraction; their
outputs are reconciled by Common Ground into a stable predicate set.

This module registers the *extractor* measurers the framework needs.
Each extractor is a (LLM substrate, decoding configuration, prompt
template) triple. Multiple extractors per substrate are useful for
detecting within-substrate stability; multiple substrates are
required for any verdict to claim cross-substrate convergence.

Adversarial personas from the v3 sketch are gone. Persona prompting
under text-as-instrument is just a prompt-template variant; it does
not produce different judgment, only different extraction emphasis.
We retain a single methodology variant per substrate (a `claim_
extraction_v1` template that biases the extractor toward claim-
language conventions like "wherein" and "comprising"), and let
Common Ground stabilise across them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from plyknot.substrate.anthropic import ANTHROPIC_DEPENDS
from plyknot.substrate.openai import OPENAI_DEPENDS
from plyknot.substrate.google import GOOGLE_DEPENDS

EntityID = int


# ── Substrate dependency labels ───────────────────────────────────────
#
# Derived from the framework's canonical substrate dicts so the
# strings here always match the framework's grounding vocabulary.
# LLM_SHARED_SUBSTRATE has no framework counterpart (it describes
# cross-vendor shared training data); kept as a workspace-local tuple.

ANTHROPIC_SUBSTRATE = tuple(ANTHROPIC_DEPENDS.values())
# → ('BPE_Anthropic_Vocabulary', 'BPE', 'Constitutional_AI',
#    'Anthropic_Pretraining_Corpus_Curation', 'Anthropic_RLHF_Corpus',
#    'Anthropic_Vendor_Default')

OPENAI_SUBSTRATE = tuple(OPENAI_DEPENDS.values())
# → ('BPE_OpenAI_Tiktoken', 'BPE', 'OpenAI_RLHF',
#    'OpenAI_Pretraining_Corpus_Curation', 'OpenAI_RLHF_Corpus',
#    'OpenAI_Vendor_Default')

GOOGLE_SUBSTRATE = tuple(GOOGLE_DEPENDS.values())
# → ('SentencePiece_Google_Vocabulary', 'SentencePiece', 'Google_Safety_RLHF',
#    'Google_Pretraining_Corpus_Curation', 'Google_RLHF_Corpus',
#    'Google_Vendor_Default')

LLM_SHARED_SUBSTRATE = (
    'LLM_General_Internet_Corpus',
    'LLM_Instruction_Following_RLHF',
    'LLM_Common_Crawl_Convergence',
)


# ── Extractor specifications ──────────────────────────────────────────

ExtractorKind = Literal['llm_extractor', 'embedding_extractor']


@dataclass
class ExtractorSpec:
    """An extractor is a (substrate, decoding-config, prompt-template)
    triple registered as a measurer in the universe. The extractor's
    job is to convert document text into a list of PredicateExtraction
    DataEntry objects.

    Note: the prompt-template version goes in the `method` field of
    every coupling entry the extractor produces, not in the substrate
    `depends`. This is the canvas-architecture rule about RAG /
    methodology framing being method-domain, not substrate-domain.
    """
    name: str
    kind: ExtractorKind
    substrate_depends: tuple[str, ...]
    """Operational dependency labels the extractor embodies. Two
    extractors with the same substrate are not independent
    measurements regardless of prompt-template differences."""
    prompt_template_version: str
    """Goes in the coupling entry's method field, not in depends."""
    notes: str = ''


# Default extractor roster. The patent-FTO sweep registers these as
# measurers in the universe, then runs each one over each document.

LLM_EXTRACTORS: list[ExtractorSpec] = [
    ExtractorSpec(
        name='opus-4.7-claim-extraction',
        kind='llm_extractor',
        substrate_depends=ANTHROPIC_SUBSTRATE + LLM_SHARED_SUBSTRATE,
        prompt_template_version='claim_extraction_v1.opus',
        notes='Long-context structural extraction; primary on '
              'independent claims and lengthy specifications.',
    ),
    ExtractorSpec(
        name='sonnet-4.6-claim-extraction',
        kind='llm_extractor',
        substrate_depends=ANTHROPIC_SUBSTRATE + LLM_SHARED_SUBSTRATE,
        prompt_template_version='claim_extraction_v1.sonnet',
        notes='Same substrate as opus; useful for within-substrate '
              'stability checks via Common Ground.',
    ),
    ExtractorSpec(
        name='gemini-2.5-pro-claim-extraction',
        kind='llm_extractor',
        substrate_depends=GOOGLE_SUBSTRATE + LLM_SHARED_SUBSTRATE,
        prompt_template_version='claim_extraction_v1.gemini',
        notes='SentencePiece tokenizer; cross-substrate extractor for '
              'convergence checks against Anthropic-substrate '
              'extractions.',
    ),
]


# Embedding extractors are used for grounding-confidence computation
# during the ground_predicate step, not for predicate extraction
# itself. Single-substrate; never reported as independent verdict
# evidence.

EMBEDDING_EXTRACTORS: list[ExtractorSpec] = [
    ExtractorSpec(
        name='bge-large-multilingual',
        kind='embedding_extractor',
        substrate_depends=('BGE_Tokenizer', 'BGE_Training_Corpus'),
        prompt_template_version='embedding_v1',
        notes='Multilingual; useful for Swedish-translated claim '
              'comparison at grant time.',
    ),
    ExtractorSpec(
        name='openai-text-embedding-3-large',
        kind='embedding_extractor',
        substrate_depends=('OpenAI_BPE_Vocabulary',
                           'OpenAI_Pretraining_Corpus_Curation'),
        prompt_template_version='embedding_v1',
        notes='Used in grounding step only; never as a predicate '
              'extractor.',
    ),
]


# ── Registration helper ───────────────────────────────────────────────

def register_extractor(universe, spec: ExtractorSpec) -> EntityID:
    """Create the extractor as a measurer entity in the universe.
    Substrate depends are recorded in the framework's registry per
    canvas §4.2 (algorithmic provenance); echo-chamber detection
    consumes them when assessing whether two extractions of the same
    document are substrate-independent.
    """
    name = spec.name
    method = spec.prompt_template_version
    id_ = universe.create_measurer(name, method)
    universe.tags[id_] = ['observed', 'measurer', spec.kind, spec.name]
    _extractor_substrate[id_] = spec.substrate_depends
    _extractor_specs[id_] = spec
    return id_


_extractor_substrate: dict[EntityID, tuple[str, ...]] = {}
_extractor_specs: dict[EntityID, ExtractorSpec] = {}


def substrate_overlap(a: EntityID, b: EntityID) -> float:
    """Per canvas-architecture-design.md §9.x Generator-Measurer
    Separation. Two extractors with overlap > 0 are not substrate-
    independent. Used to:
      - flag echo-chamber risk in convergence verdicts
      - enforce GMS in any predict-and-measure pipeline (e.g.,
        when the extractor of a claim is also the extractor of the
        prior art being tested)
    """
    sa = set(_extractor_substrate.get(a, ()))
    sb = set(_extractor_substrate.get(b, ()))
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def get_extractor_spec(id_: EntityID) -> ExtractorSpec | None:
    return _extractor_specs.get(id_)
