"""
v6.3 Claim 20 vs Palantir US 11,714,792 — text-as-instrument worked example.

Wired to the framework (April 25 2026): StubUniverse replaced with the
real plyknot.universe.Universe; stub LLM responses replaced with a
smart stub caller that returns claim-specific JSON so the pipeline
produces a meaningful (non-trivial) coverage verdict.

Differences from the v4 stub:

  - Real plyknot.universe.Universe() — no more hand-rolled stub.
  - extract_document calls adapters.decompose.decompose_text via the
    stub caller. The stub returns JSON matching
    parse_decomposition_response's expected format.
  - build_predicate_index calls adapters.index.build_index_from_graph
    internally; returns (GroundingIndex, label_dict).
  - evaluate_pair uses adapters.coverage.directed_subset_check for
    Phase 4 (directed-subset coverage replaces marker passing).
  - The same synthetic claim and prior-art texts from the v4 sketch
    are kept to keep the smoke test deterministic and free of API spend.

To use real LLM calls (cost: < $0.10 on Haiku for this single pair):

    from adapters.llm_call import make_anthropic_caller
    llm_caller = make_anthropic_caller(model='claude-haiku-4-5-20251001')
"""

from __future__ import annotations

import json
import time

from plyknot.universe import Universe

from entities import (
    register_claim_document, register_prior_art_document,
    ClaimDocument, PriorArtDocument,
)
from measurers import LLM_EXTRACTORS, register_extractor
from pipeline import (
    extract_document, build_predicate_index, evaluate_pair,
)
from adapters.llm_call import make_stub_caller


# ── Stub LLM responses ────────────────────────────────────────────────
#
# These JSON strings match parse_decomposition_response's expected
# format: {"units": [{"id", "unit_type", "verb", "content",
# "intensity", "depends_on", "source_text", "epistemological_route"}]}
#
# The claim stub has 5 predicates (the Claim 20 elements); the prior-
# art stub has 3 predicates (the Foundry Action Types elements).
# Expected coverage: 1/5 = 0.20 (only "produces actor record" overlaps
# semantically; the three-value source tag, pointer types, and claim
# dependency are absent from the prior art).

_CLAIM_20_STUB_JSON = json.dumps({"units": [
    {
        "id": "u1",
        "unit_type": "observation",
        "verb": "depends_on",
        "content": "system claim_1_system",
        "intensity": 1.0,
        "depends_on": [],
        "source_text": "The system of claim 1",
        "epistemological_route": "direct",
    },
    {
        "id": "u2",
        "unit_type": "observation",
        "verb": "distinguishes",
        "content": "source_tag third_value action_coupling_record",
        "intensity": 1.0,
        "depends_on": ["u1"],
        "source_text": "source tag distinguishes third value indicating action coupling record",
        "epistemological_route": "direct",
    },
    {
        "id": "u3",
        "unit_type": "observation",
        "verb": "produces",
        "content": "automated_actor action_coupling_record",
        "intensity": 1.0,
        "depends_on": ["u2"],
        "source_text": "action coupling record produced by automated actor",
        "epistemological_route": "direct",
    },
    {
        "id": "u4",
        "unit_type": "observation",
        "verb": "comprises",
        "content": "action_coupling_record structured_pointer dependency_graph_state",
        "intensity": 1.0,
        "depends_on": ["u3"],
        "source_text": "action coupling record comprising structured pointer to modified state of dependency graph",
        "epistemological_route": "direct",
    },
    {
        "id": "u5",
        "unit_type": "observation",
        "verb": "comprises",
        "content": "action_coupling_record structured_pointer acquisition_apparatus_state",
        "intensity": 1.0,
        "depends_on": ["u3"],
        "source_text": "structured pointer to acquisition apparatus",
        "epistemological_route": "direct",
    },
]})

_PRIOR_ART_STUB_JSON = json.dumps({"units": [
    {
        "id": "p1",
        "unit_type": "observation",
        "verb": "mutates",
        "content": "action_type ontology_object",
        "intensity": 1.0,
        "depends_on": [],
        "source_text": "Action Types mutate ontology objects with semantic types assigned at schema-definition time",
        "epistemological_route": "direct",
    },
    {
        "id": "p2",
        "unit_type": "observation",
        "verb": "produces",
        "content": "automated_actor action_record audit_log",
        "intensity": 1.0,
        "depends_on": ["p1"],
        "source_text": "action records are written to a Foundry-internal audit log",
        "epistemological_route": "direct",
    },
    {
        "id": "p3",
        "unit_type": "observation",
        "verb": "keys",
        "content": "action_record ontology_object_identifier",
        "intensity": 1.0,
        "depends_on": ["p2"],
        "source_text": "audit log keyed by ontology-object identifier",
        "epistemological_route": "direct",
    },
]})


def _make_patent_stub_caller():
    """Returns a stub caller that routes by prompt content.

    Claim 20 text contains 'action coupling record' or 'source tag';
    prior-art text contains 'Action Types' or 'ontology'.
    """
    def call(prompt: str) -> str:
        if ('Action Types' in prompt
                or 'ontology' in prompt
                or 'Foundry' in prompt
                or 'audit log' in prompt):
            return _PRIOR_ART_STUB_JSON
        return _CLAIM_20_STUB_JSON
    return call


def main():
    t_start = time.perf_counter()

    universe = Universe()

    # ── Phase 0 — Document and extractor registration ─────────────────

    claim_20_id = register_claim_document(universe, ClaimDocument(
        claim_number=20,
        kind='dependent',
        parent_claim_number=1,
        text=('The system of claim 1, wherein the source tag '
              'distinguishes a third value indicating an action '
              'coupling record produced by an automated actor, the '
              'action coupling record comprising a structured '
              'pointer to the modified state of the dependency graph '
              'or the acquisition apparatus.'),
        spec_section_refs=['§4.16', '§4.17'],
    ))

    palantir_id = register_prior_art_document(universe, PriorArtDocument(
        identifier='US 11,714,792 B2',
        kind='granted_patent',
        priority_date='2022-08-15',
        title='Foundry Action Types continuation',
        text=('Action Types are first-class server-side verbs that '
              'mutate ontology objects with semantic types assigned '
              'at schema-definition time. Action records are written '
              'to a Foundry-internal audit log keyed by ontology-'
              'object identifier; ontology objects are resolvable '
              'through the schema layer.'),
        cited_in_ids=True,
    ))

    extractor_ids = [register_extractor(universe, e)
                     for e in LLM_EXTRACTORS]

    stub_caller = _make_patent_stub_caller()

    print('═' * 76)
    print('TEXT-AS-INSTRUMENT FTO PIPELINE: Claim 20 × US 11,714,792 B2')
    print('(wired smoke test — framework primitives, stub LLM responses)')
    print('═' * 76)
    print()
    print(f'Registered {len(extractor_ids)} LLM extractors:')
    for eid in extractor_ids:
        print(f'  [{eid}] {universe.name[eid]}')
    print()

    # ── Phase 1 — Extraction ──────────────────────────────────────────

    print('Phase 1: Predicate extraction (predicate_decomposition)')
    print('-' * 76)

    claim_graph = extract_document(
        universe, claim_20_id, extractor_ids, llm_call=stub_caller)
    pa_graph = extract_document(
        universe, palantir_id, extractor_ids, llm_call=stub_caller)

    print(f'  Claim 20:        {len(claim_graph.units)} predicates extracted')
    print(f'  US 11,714,792:   {len(pa_graph.units)} predicates extracted')
    print()

    print('  Claim 20 extracted predicates:')
    for i, u in enumerate(claim_graph.units):
        print(f'    [{i}] ({u.verb}) {u.content}')
    print()
    print('  US 11,714,792 extracted predicates:')
    for i, u in enumerate(pa_graph.units):
        print(f'    [{i}] ({u.verb}) {u.content}')
    print()

    # ── Phase 2 — Grounding ───────────────────────────────────────────

    print('Phase 2: Grounding (index seeded from claim graph)')
    print('-' * 76)

    grounding_index, label_dict = build_predicate_index(
        universe, [claim_graph])
    print(f'  Predicate index seeded: {grounding_index.entry_count} labels')
    print()

    # ── Phases 3-5 — per-pair evaluation ──────────────────────────────

    print('Phases 3-5: Lensing Strain → Coverage → Verdict')
    print('-' * 76)

    verdict = evaluate_pair(
        universe,
        claim_id=claim_20_id,
        reference_id=palantir_id,
        claim_graph=claim_graph,
        reference_graph=pa_graph,
        grounding_index=grounding_index,
        label_dict=label_dict,
        extractor_ids=extractor_ids,
    )

    print()
    print('Lensing Strain:')
    print(f'  blend_delta = {verdict.lensing.blend_delta:.3f} '
          f'(σ={verdict.lensing.sigma:.2f})')
    if verdict.lensing.blend_delta < 0.3:
        print('  → reference reads consistently with or without claim lens')
    elif verdict.lensing.blend_delta > 0.6:
        print('  → reference contorts to match claim (forced reading)')
    else:
        print('  → reference yields somewhat under claim lens')
    print()

    print('Directed-subset coverage (replaces marker passing):')
    print(f'  coverage = {verdict.anticipation.coverage:.2%}')
    print(f'  uncovered claim predicates = '
          f'{len(verdict.anticipation.unreached_claim_predicates)}')
    if verdict.anticipation.unreached_claim_predicates:
        print('  → these are the structural distinguishers:')
        for gp in verdict.anticipation.unreached_claim_predicates:
            gr = gp.grounding_result
            grounded_str = (f'grounded={gr.grounded}'
                            if gr else 'grounded=False')
            print(f'      - ({gp.raw.verb}) {gp.raw.subject}  [{grounded_str}]')
    print()

    t_elapsed = time.perf_counter() - t_start

    print('═' * 76)
    print('VERDICT')
    print('═' * 76)
    glyph_for = {
        'covered': '◆ ANTICIPATED — must amend',
        'partial_coverage_lensing': '◐ TENSION — attorney review',
        'not_covered': '● NOVEL — claim has structural distinguishers',
        'covered_via_obviousness': '◆ obvious under § 103',
        'insufficient_extraction': '? ESCALATE — extraction unreliable',
    }
    print(f'  Status: {glyph_for.get(verdict.status, verdict.status)}')
    print(f'  Distinguisher predicates: '
          f'{len(verdict.distinguisher_predicates)}')
    print(f'  Needs attorney review: {verdict.needs_attorney_review}')
    print()
    print(f'  Reference identifier: {verdict.reference_identifier}')
    print(f'  Wall-clock runtime: {t_elapsed:.2f}s')
    print()
    print('What this verdict tells you:')
    if verdict.status == 'not_covered':
        print('    The cited reference does not literally cover every')
        print('    element the claim recites. The unreached predicates')
        print('    above are the structural distinguishers — they are')
        print('    what makes this claim novel against this reference.')
    elif verdict.status == 'partial_coverage_lensing':
        print('    The reference can be read as covering the claim')
        print('    only by contorting its interpretation. The Lensing')
        print('    Strain measurement detected the forced reading.')
    elif verdict.status == 'covered':
        print('    The reference literally anticipates every element.')
        print('    The claim must be amended.')


if __name__ == '__main__':
    main()
