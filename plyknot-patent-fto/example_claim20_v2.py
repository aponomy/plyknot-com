"""
v6.3 Claim 20 vs Palantir US 11,714,792 — boolean all-elements version.

This example replaces the continuous-distance verdict with the boolean
all-elements test that Gemini's critique correctly identified as the
primitive. Each claim element is decomposed into its own entity, each
LLM persona measures disclosure status per element, and the verdict
is rendered by the structural-absence pattern: at least one element
absent across the cited reference = claim is novel against that
reference.

Continuous metrics (semantic distance, embedding distance) become
prioritisation heuristics, not verdicts.

Adversarial personas replace vanilla LLM measurers as the primary
measurement panel. Each persona carries methodology depends in
addition to LLM-vendor depends, so substrate-correctness extends
beyond tokenizer/alignment family to legal-methodology framing.
"""

from __future__ import annotations


# Stub Universe (as in example_claim20.py)
class StubUniverse:
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
            idA: int = 0
            idB: int = 0
        e = Entry(measurer, target, prop, value, method, sigma)
        e.idA = measurer
        e.idB = target
        self.couplings[f'{measurer}->{target}:{prop}'] = e


from entities import (
    create_claim, create_prior_art,
    ClaimMetadata, PriorArtMetadata,
)
from measurers import register_measurer
from claim_elements import (
    decompose_claim, ClaimDecomposition, ElementProperties,
    measure_element_disclosure,
)
from adversarial_personas import ADVERSARIAL_PERSONAS


def main():
    universe = StubUniverse()

    # ── Step 1: Register the claim and decompose into elements ────────

    claim_20_id = create_claim(universe, ClaimMetadata(
        claim_number=20,
        kind='dependent',
        parent_claim_number=1,
        text='The system of claim 1, wherein the source tag '
             'distinguishes a third value indicating an action '
             'coupling record produced by an automated actor, the '
             'action coupling record comprising a structured pointer '
             'to the modified state of the dependency graph or the '
             'acquisition apparatus.',
        spec_section_refs=['§4.16', '§4.17'],
    ))

    decomposition = decompose_claim(
        20,
        'The system of claim 1, wherein the source tag distinguishes '
        'a third value indicating an action coupling record produced '
        'by an automated actor, the action coupling record comprising '
        'a structured pointer to the modified state of the dependency '
        'graph or the acquisition apparatus.',
    )

    # Each element becomes a first-class entity in the universe
    element_ids = {}
    for elem in decomposition.elements:
        if not hasattr(universe, '_next_id'):
            universe._next_id = 0
        eid = universe._next_id
        universe._next_id += 1
        universe.name[eid] = f'claim_20_element_{elem.element_index}'
        universe.tags[eid] = ['observed', 'claim_element',
                              f'claim_{elem.claim_number}',
                              f'idx_{elem.element_index}']
        element_ids[elem.element_index] = eid

    print(f'Decomposed Claim 20 into {len(decomposition.elements)} '
          'elements:')
    for elem in decomposition.elements:
        print(f'  [{elem.element_index}] ({elem.kind}) {elem.text[:60]}...')
    print()

    # ── Step 2: Register the prior-art reference ──────────────────────

    palantir_id = create_prior_art(universe, PriorArtMetadata(
        identifier='US 11,714,792 B2',
        kind='granted_patent',
        priority_date='2022-08-15',
        title='Continuation of Foundry dynamic-ontology family',
        cited_in_ids=True,
        extracted_mechanism=(
            'Foundry Action Types: server-side verbs that mutate '
            'ontology objects with semantic types assigned at schema-'
            'definition time. Action records are written to a Foundry-'
            'internal audit log keyed by ontology-object identifier.'
        ),
    ))

    # ── Step 3: Register the adversarial-persona measurer panel ──────

    persona_ids = [register_measurer(universe, p)
                   for p in ADVERSARIAL_PERSONAS]
    print(f'Registered {len(persona_ids)} adversarial-persona measurers:')
    for pid, spec in zip(persona_ids, ADVERSARIAL_PERSONAS):
        print(f'  [{pid}] {spec.name}')
    print()

    # ── Step 4: Measure per-element disclosure ────────────────────────

    print('Running per-element disclosure measurements...')
    for elem in decomposition.elements:
        measure_element_disclosure(
            universe,
            element=elem,
            element_entity_id=element_ids[elem.element_index],
            reference_id=palantir_id,
            llm_measurer_ids=persona_ids,
        )

    print(f'Wrote {len(universe.couplings)} coupling entries '
          f'({len(decomposition.elements)} elements × '
          f'{len(persona_ids)} personas).')
    print()

    # ── Step 5: Aggregate and render the all-elements verdict ─────────

    print('═' * 72)
    print(f'CLAIM {decomposition.claim_number} '
          f'× US 11,714,792 B2 — ALL-ELEMENTS DISCLOSURE')
    print('═' * 72)

    disclosure_map: dict[tuple[int, int], float] = {}

    for elem in decomposition.elements:
        elem_id = element_ids[elem.element_index]
        prop = (f'{ElementProperties.DISCLOSED_IN_REFERENCE}'
                f'@ref={palantir_id}')

        scores = [
            entry.value for entry in universe.couplings.values()
            if entry.target == elem_id and entry.property == prop
        ]
        if not scores:
            mean = None
            verdict_glyph = '?'
        else:
            mean = sum(scores) / len(scores)
            disclosure_map[(elem.element_index, palantir_id)] = mean
            if mean >= 0.7:
                verdict_glyph = '◆ disclosed'
            elif mean <= 0.3:
                verdict_glyph = '○ ABSENT'
            else:
                verdict_glyph = '◐ tension'

        print(f'  [{elem.element_index}] {verdict_glyph:<14} '
              f'(mean={mean if mean is None else f"{mean:.2f}":<5}) '
              f'{elem.text[:50]}...')
    print()

    # ── Step 6: Render the verdict using structural absence ──────────

    anticipated = decomposition.all_elements_anticipated_by(
        palantir_id, disclosure_map, threshold=0.5)
    absent_elems = decomposition.absent_elements(
        palantir_id, disclosure_map, threshold=0.5)

    print('─' * 72)
    if anticipated:
        print('VERDICT: ◆ CRACK — every element disclosed. Claim is '
              'anticipated by US 11,714,792 B2. AMEND BEFORE FILING.')
    else:
        print(f'VERDICT: ● CLAIM IS NOVEL against US 11,714,792 B2.')
        print(f'         {len(absent_elems)} element(s) absent in the '
              'reference.')
        print()
        print('  Distinguisher set (these are the load-bearing elements '
              'the spec must enable):')
        for e in absent_elems:
            print(f'    [{e.element_index}] {e.structural_predicate}')
            print(f'         "{e.text[:60]}..."')
    print('─' * 72)
    print()
    print('Note: this is the boolean all-elements verdict. Continuous '
          'metrics (semantic distance,\nembedding distance) become '
          'prioritisation heuristics for which (element, reference)\n'
          'pairs deserve the most rigorous LLM-persona measurement '
          'panel — not the verdict\nitself.')


if __name__ == '__main__':
    main()
