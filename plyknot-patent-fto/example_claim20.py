"""
Worked example: v6.3 Claim 20 versus Palantir US 11,714,792 B2.

This is the highest-collision spot in the v6.3 stress-test (N2 verdict:
GO-WITH-REVISIONS). It exercises every layer of the patent-FTO
workspace:

  - Claim 20 (the act-verb source-tag dependent claim) gets registered
    as a target.
  - Palantir US 11,714,792 B2 (post-2022 Foundry continuation) gets
    registered as a measurer with its mechanism extracted.
  - The §4.16 distinguishing passage gets registered as a distinguisher.
  - All four LLM measurer families (Anthropic Opus, Anthropic Sonnet,
    Google Gemini, OpenAI GPT-5) measure reads-on.
  - Two embedding measurers add cross-substrate distance signal.
  - The convergence analyser produces a verdict with action
    recommendation.

Run with `python example_claim20.py`. The sketch uses stub LLM
responses — replace `call_llm_reads_on` in pipeline.py with real API
clients to run for real.
"""

from __future__ import annotations

# Universe stub — in production: from plyknot.universe import Universe
class StubUniverse:
    """Minimal Universe stand-in so the sketch runs without the full
    plyknot package installed. Implements just enough of the
    `measure()` / `predict()` / coupling-storage surface that the
    sketch needs."""
    def __init__(self):
        self._next_id = 0
        self.name: dict = {}
        self.tags: dict = {}
        self.couplings: dict = {}

    def measure(self, measurer, target, prop, value, method, sigma=None):
        from dataclasses import dataclass
        @dataclass
        class Entry:
            measurer: int
            target: int
            property: str
            value: float
            method: str
            sigma: float | None
            source: str = 'measurement'
            # idA / idB aliases for compatibility with both existing
            # plyknot CouplingEntry and patent-FTO analysis.
            idA: int = 0
            idB: int = 0
        e = Entry(measurer, target, prop, value, method, sigma)
        e.idA = measurer
        e.idB = target
        key = f'{measurer}->{target}:{prop}'
        self.couplings[key] = e


from entities import (
    create_claim, create_prior_art, create_distinguisher,
    ClaimMetadata, PriorArtMetadata, DistinguisherMetadata,
)
from measurers import (
    LLM_MEASURERS, EMBEDDING_MEASURERS,
    register_measurer,
)
from pipeline import measure_reads_on, analyse_claim


def main():
    universe = StubUniverse()

    # ── Step 1: Register the claim ────────────────────────────────────

    claim_20 = create_claim(universe, ClaimMetadata(
        claim_number=20,
        kind='dependent',
        parent_claim_number=1,
        text=(
            'The system of claim 1, wherein the source tag distinguishes '
            'a third value indicating an action coupling record produced '
            'by an automated actor, the action coupling record comprising '
            'a structured pointer to the modified state of the dependency '
            'graph or the acquisition apparatus.'
        ),
        spec_section_refs=['§4.16', '§4.17'],
    ))

    # ── Step 2: Register the prior-art reference ──────────────────────

    palantir = create_prior_art(universe, PriorArtMetadata(
        identifier='US 11,714,792 B2',
        kind='granted_patent',
        priority_date='2022-08-15',
        title='Continuation of Foundry dynamic-ontology family',
        cited_in_ids=True,
        extracted_mechanism=(
            'Foundry Action Types: server-side verbs that mutate ontology '
            'objects with semantic types assigned at schema-definition '
            'time. Action records are written to a Foundry-internal '
            'audit log keyed by ontology-object identifier; ontology '
            'objects are not integer-IDed in the structurally-addressed '
            'sense — they are resolvable through the schema layer.'
        ),
    ))

    # ── Step 3: Register the §4.16 distinguisher ──────────────────────

    dist_416 = create_distinguisher(universe, DistinguisherMetadata(
        spec_section='§4.16',
        text=(
            'The disclosed system distinguishes from object-type / '
            'property-type registries (e.g., Palantir Foundry Action '
            'Types as cited in US 11,714,792 B2) because the action '
            'coupling record is a directly-addressed entry in the '
            'six-field schema where records carry integer measurer-, '
            'target-, and property-identifiers without any external '
            'object-type registry mediating the address.'
        ),
        supports_claims=[20],
        distinguishes_against=['US 11,714,792 B2',
                               'US 12,299,022 B2',
                               'US 7,962,495 B2'],
    ))

    # ── Step 4: Register the measurer roster ──────────────────────────

    llm_ids = [register_measurer(universe, m) for m in LLM_MEASURERS]
    emb_ids = [register_measurer(universe, m) for m in EMBEDDING_MEASURERS]

    print(f'Registered {len(llm_ids)} LLM measurers and '
          f'{len(emb_ids)} embedding measurers.')
    print()

    # ── Step 5: Run the reads-on measurement panel ────────────────────

    measure_reads_on(
        universe,
        claim_id=claim_20,
        reference_id=palantir,
        llm_measurer_ids=llm_ids,
        embedding_measurer_ids=emb_ids,
    )

    print(f'Wrote {len(universe.couplings)} coupling entries to the '
          'universe.')
    for key in universe.couplings:
        print(f'  {key}')
    print()

    # ── Step 6: Analyse and report ────────────────────────────────────

    verdict = analyse_claim(
        universe,
        claim_id=claim_20,
        reference_ids=[palantir],
    )

    print('═' * 64)
    print(f'CLAIM {verdict.claim_number} FTO VERDICT')
    print('═' * 64)
    print(f'References examined:    {verdict.references_examined}')
    print(f'Cracks ◆:               {len(verdict.cracks)}')
    print(f'Tensions ◐:             {len(verdict.tensions)}')
    print(f'Converged safe ●:       {len(verdict.converged_safe)}')
    print(f'Echo-chamber flags:     {len(verdict.echo_chamber_flags)}')
    print(f'Phenomenological mass:  {verdict.phenomenological_mass}')
    print()
    print(f'RECOMMENDED: {verdict.recommended_action}')
    print()

    if verdict.cracks:
        print('--- Cracks ---')
        for ref, detail in verdict.cracks:
            print(f'  {ref}: {detail}')
    if verdict.tensions:
        print('--- Tensions (review priorities) ---')
        for ref, detail in verdict.tensions:
            print(f'  {ref}: {detail}')
    if verdict.echo_chamber_flags:
        print('--- Echo-chamber flags ---')
        for flag in verdict.echo_chamber_flags:
            print(f'  {flag}')


if __name__ == '__main__':
    main()
