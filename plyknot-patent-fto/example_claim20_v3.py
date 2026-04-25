"""
v6.3 Claim 20 vs Palantir US 11,714,792 — v3 with two-tier obviousness
test and repulsive-broadening optimization.

Improvements over v2:

  - Tier 2 functional-equivalence measurement runs automatically on
    elements that survive Tier 1 (anticipation). Captures § 103 / Art.
    56 obviousness, not just literal anticipation.

  - Repulsive broadening loop runs after the verdict to find the
    maximum legally defensible formulation of each load-bearing
    distinguisher element. Output goes into spec drafting.

  - Verdict reports anticipation risk AND obviousness risk separately,
    matching examiner workflow.
"""

from __future__ import annotations


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
from claim_elements import decompose_claim
from adversarial_personas import ADVERSARIAL_PERSONAS
from obviousness import run_two_tier_panel
from repulsive_broadening import (
    repulsive_broaden, BroadeningConfig,
    _stub_propose_broader, _stub_measure_distance,
)


def main():
    universe = StubUniverse()

    # ── Setup ──────────────────────────────────────────────────────────

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

    decomposition = decompose_claim(20, '')

    element_ids = {}
    for elem in decomposition.elements:
        eid = universe._next_id
        universe._next_id += 1
        universe.name[eid] = f'claim_20_element_{elem.element_index}'
        universe.tags[eid] = ['observed', 'claim_element']
        element_ids[elem.element_index] = eid

    palantir_id = create_prior_art(universe, PriorArtMetadata(
        identifier='US 11,714,792 B2',
        kind='granted_patent',
        priority_date='2022-08-15',
        title='Foundry continuation',
        cited_in_ids=True,
        extracted_mechanism=(
            'Foundry Action Types: server-side verbs that mutate '
            'ontology objects; action records keyed by ontology-object '
            'identifier in an internal audit log.'
        ),
    ))

    persona_ids = [register_measurer(universe, p)
                   for p in ADVERSARIAL_PERSONAS]

    # ── Tier 1 + Tier 2 measurement ────────────────────────────────────

    print('═' * 76)
    print('TWO-TIER MEASUREMENT: Claim 20 × US 11,714,792 B2')
    print('═' * 76)

    verdict = run_two_tier_panel(
        universe,
        decomposition=decomposition,
        element_entity_ids=element_ids,
        reference_id=palantir_id,
        reference_identifier='US 11,714,792 B2',
        tier_1_personas=persona_ids,
        tier_2_personas=persona_ids,
    )

    # ── Per-element verdict rendering ──────────────────────────────────

    print()
    print('Per-element verdicts:')
    print('─' * 76)
    for ev in verdict.element_verdicts:
        elem = next(e for e in decomposition.elements
                    if e.element_index == ev.element_index)

        glyph = {
            'literal-disclosure-converged': '◆ DISCLOSED',
            'literal-disclosure-tension': '◐ tension-T1',
            'literal-absent-equivalent-converged': '◆ EQUIVALENT',
            'literal-absent-equivalent-tension': '◐ tension-T2',
            'literal-absent-equivalent-safe': '○ DISTINGUISHER',
        }.get(ev.status, '?')

        print(f'  [{ev.element_index}] {glyph:<20} '
              f'T1={ev.literal_disclosure_score:.2f} '
              f'σ={ev.literal_disclosure_sigma:.2f}',
              end='')
        if ev.functional_equivalence_score is not None:
            print(f'  T2={ev.functional_equivalence_score:.2f} '
                  f'σ={ev.functional_equivalence_sigma:.2f}', end='')
        print()
        print(f'        "{elem.text[:64]}..."')
    print('─' * 76)

    # ── Aggregate verdict ──────────────────────────────────────────────

    print()
    print('Aggregate:')
    print(f'  Anticipation risk (§ 102 / Art. 54): '
          f'{verdict.anticipation_risk:.0%}')
    print(f'  Obviousness risk  (§ 103 / Art. 56): '
          f'{verdict.obviousness_risk:.0%}')
    print(f'  Distinguisher elements:               '
          f'{len(verdict.distinguishers)}')
    print(f'  Tension elements (attorney review):   '
          f'{len(verdict.needs_attorney_review)}')

    if verdict.anticipation_risk >= 1.0:
        print()
        print('  VERDICT: ◆ ANTICIPATED. AMEND BEFORE FILING.')
    elif verdict.obviousness_risk >= 0.5:
        print()
        print('  VERDICT: ◐ OBVIOUSNESS-VULNERABLE. Some elements')
        print('           survive anticipation but have functional')
        print('           equivalents in the cited reference.')
        print('           Patentombud review on the equivalent elements.')
    elif verdict.needs_attorney_review:
        print()
        print('  VERDICT: ◐ TENSION. Element measurements at ◐ require')
        print('           patentombud review before filing.')
    else:
        print()
        print('  VERDICT: ● CLEAN. Multi-substrate convergence on')
        print('           novelty AND non-obviousness.')

    # ── Repulsive broadening on a load-bearing distinguisher ───────────

    print()
    print('═' * 76)
    print('REPULSIVE BROADENING: maximum defensible formulation')
    print('═' * 76)

    # Broaden tension elements — that is where breadth matters most,
    # because broadening can push the element OUT of tension.
    tension_or_distinguisher = (verdict.needs_attorney_review
                                + verdict.distinguishers)
    if tension_or_distinguisher:
        target_idx = tension_or_distinguisher[0].element_index
        target_elem = next(
            (e for e in decomposition.elements
             if e.element_index == target_idx),
            None,
        )
        if target_elem and target_elem.element_index == 3:
            cited_references = {
                'US 11,714,792 B2': (
                    'Foundry Action Types ontology object mutation '
                    'audit-log keyed records'
                ),
                'US 12,299,022 B2': (
                    'Foundry post-2022 continuation property-type '
                    'registry'
                ),
            }
            result = repulsive_broaden(
                element=target_elem,
                cited_references=cited_references,
                propose_broader=_stub_propose_broader,
                measure_distance=_stub_measure_distance,
                config=BroadeningConfig(
                    safety_threshold=0.35, max_iterations=4),
            )

            print()
            print(f'Element {target_elem.element_index}: '
                  f'{target_elem.structural_predicate}')
            print()
            print('  Original:')
            print(f'    "{result.original_text[:70]}..."')
            print()
            print('  Broadening trajectory:')
            for step in result.distance_trajectory:
                min_dist = min(step['distances'].values())
                stop_marker = (' ← STOPS HERE'
                               if min_dist < 0.35 else '')
                print(f'    iter {step["iteration"]}: '
                      f'min_distance={min_dist:.2f}{stop_marker}')
            print()
            print('  Maximum defensible formulation:')
            print(f'    "{result.final_text[:70]}..."')
            print()
            if result.blocking_reference:
                print(f'  Blocked by: {result.blocking_reference}')
                print('  This is the reference that constrains how '
                      'broad element 3 can be drafted.')
            else:
                print('  Iteration cap reached — element could be '
                      'broadened further.')

    print()
    print('═' * 76)
    print('NOTE ON TRUST CALIBRATION (per Gemini critique #3):')
    print('  Stochastic LLM errors are absorbed into σ via N-resampling.')
    print('  Trust updates fire only on persistent disagreement after')
    print('  resampling. Trust weights are per-property and per-element-')
    print('  class, never global. A trust floor (default 0.2) preserves')
    print('  every measurer as a tie-breaker in the convergence pattern.')
    print('  Persistent stochastic divergence on a property class is')
    print('  itself the signal: that class escalates to patentombud')
    print('  review automatically.')
    print('═' * 76)


if __name__ == '__main__':
    main()
