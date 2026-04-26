"""
Phase 3-5 runner for v6.3 Stage 2 FTO sweep.

Phases:
  3. Build one GroundingIndex per claim document (35 indexes).
  4. Run 35 x 49 = 1,715 directed-subset coverage verdicts.
  5. Aggregate into:
       outputs/v63-stage2-pair-verdicts.json
       outputs/v63-stage2-fto-report.md

Run from the plyknot-patent-fto directory:
    python3 runners/run_phase3_5.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────
HERE = Path(__file__).parent.parent          # plyknot-patent-fto/
PLYKNOT_SRC = HERE.parent.parent / 'plyknot' # workspace/plyknot/

for p in (str(HERE), str(PLYKNOT_SRC)):
    if p not in sys.path:
        sys.path.insert(0, p)

from plyknot.predicate_decomposition import parse_decomposition_response, build_graph
from adapters.index import build_index_from_graph
from adapters.coverage import directed_subset_check
from pipeline import (
    GroundedPredicate, PredicateExtraction, LensingStrainResult,
    AnticipationResult, ground_extraction, render_verdict,
)

EXTRACTIONS_DIR = HERE / 'outputs' / 'extractions'
OUTPUTS_DIR     = HERE / 'outputs'


# ── Helpers ───────────────────────────────────────────────────────────

def _ts() -> str:
    return datetime.now().strftime('%H:%M:%S')


def load_manifest() -> dict[str, dict]:
    with open(EXTRACTIONS_DIR / '_manifest.json') as f:
        entries = json.load(f)
    return {e['id']: e for e in entries}


def load_graph(doc_id: str):
    """Load extraction JSON and build a DecompositionGraph."""
    path = EXTRACTIONS_DIR / f'{doc_id}.json'
    with open(path) as f:
        data = json.load(f)
    unit_dicts = parse_decomposition_response(json.dumps(data))
    return build_graph(unit_dicts, source_text=doc_id)


# ── Phase 4 core ──────────────────────────────────────────────────────

def evaluate_pair(
    claim_id: str,
    ref_id: str,
    claim_grounded: list,
    claim_gr_results: list,
    ref_graph,
    index,
    manifest: dict,
) -> dict:
    ref_grounded = ground_extraction(None, ref_graph, index)
    ref_gr_results = [
        gp.grounding_result for gp in ref_grounded
        if gp.grounding_result is not None
    ]

    coverage_result = directed_subset_check(claim_gr_results, ref_gr_results)

    # Simulated lensing strain (API-free): fixed low value; all ref texts
    # are IDS analysis summaries that read differently from claim language,
    # so blend_delta is expected low.
    lensing = LensingStrainResult(
        blend_delta=0.1,
        sigma=0.05,
        unconditioned_predicates=[],
        conditioned_predicates=[],
    )

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

    distinguisher_strs = [
        f"{gp.raw.verb}: {gp.raw.subject[:80]}"
        for gp in distinguishers
    ]

    return {
        'claim_id':                  claim_id,
        'ref_id':                    ref_id,
        'claim_label':               manifest[claim_id]['label'],
        'ref_label':                 manifest[ref_id]['label'],
        'coverage':                  round(coverage_result.coverage, 4),
        'covered_count':             len(coverage_result.covered_source_indices),
        'uncovered_count':           len(coverage_result.uncovered_source_indices),
        'total_claim_predicates':    len(claim_grounded),
        'grounded_claim_predicates': len(claim_gr_results),
        'total_ref_predicates':      len(ref_grounded),
        'grounded_ref_predicates':   len(ref_gr_results),
        'blend_delta':               lensing.blend_delta,
        'status':                    status,
        'needs_attorney_review':     needs_review,
        'distinguishers':            distinguisher_strs[:5],
        'distinguisher_count':       len(distinguishers),
    }


# ── Phase 5 report ────────────────────────────────────────────────────

def build_report(
    verdicts: list[dict],
    manifest: dict,
    claim_ids: list[str],
    ref_ids: list[str],
) -> str:
    vm = {(v['claim_id'], v['ref_id']): v for v in verdicts}

    def claim_verdicts(cid):
        return [v for v in verdicts if v['claim_id'] == cid]

    def ref_verdicts(rid):
        return [v for v in verdicts if v['ref_id'] == rid]

    n_total   = len(verdicts)
    n_covered = sum(1 for v in verdicts if v['status'] == 'covered')
    n_partial = sum(1 for v in verdicts if v['status'] == 'partial_coverage_lensing')
    n_not     = sum(1 for v in verdicts if v['status'] == 'not_covered')

    lines: list[str] = []
    a = lines.append

    a('# v6.3 Stage 2 FTO Sweep — Directed-Subset Coverage Report')
    a('')
    a(f'Generated: {datetime.now():%Y-%m-%d %H:%M:%S}')
    a('')
    a('## 1. Executive Summary')
    a('')
    a(f'| Metric | Value |')
    a(f'|--------|-------|')
    a(f'| Total pairs evaluated | {n_total} ({len(claim_ids)} claims × {len(ref_ids)} refs) |')
    a(f'| COVERED_BY_PRIOR_ART | {n_covered} ({100*n_covered/n_total:.1f}%) |')
    a(f'| PARTIAL_COVERAGE_WITH_LENSING | {n_partial} ({100*n_partial/n_total:.1f}%) |')
    a(f'| NOT_COVERED | {n_not} ({100*n_not/n_total:.1f}%) |')
    a('')

    a('## 2. Methodology Note')
    a('')
    a('Coverage = fraction of claim predicate units that find a grounded match in the')
    a('reference predicate set, measured via directed-subset check on embedding-grounded')
    a('entity IDs. Both document sets are IDS analysis summaries (FTO-layer texts), not')
    a('verbatim prior-art documents; coverage reflects conceptual vocabulary overlap.')
    a('Embedder: character n-gram fallback (no sentence-transformers dependency).')
    a('Lensing strain: simulated (blend_delta = 0.10 fixed). Verdict thresholds:')
    a('coverage ≥ 0.99 → COVERED; coverage ≥ 0.99 AND blend_delta > 0.6 → PARTIAL_LENSING;')
    a('coverage < 1.0 → NOT_COVERED. These scores are informational, not a legal opinion.')
    a('')

    a('## 3. Per-Claim Summary')
    a('')
    a('| Claim | Predicates | Max Coverage | Closest Reference | Status |')
    a('|-------|-----------|-------------|-------------------|--------|')

    for cid in claim_ids:
        cvs = claim_verdicts(cid)
        if not cvs:
            continue
        max_cov = max(v['coverage'] for v in cvs)
        closest = max(cvs, key=lambda v: v['coverage'])
        n_pred  = closest['total_claim_predicates']
        a(f"| {manifest[cid]['label']} | {n_pred} | {max_cov:.3f} | {closest['ref_label'][:45]} | {closest['status']} |")

    a('')
    a('## 4. Per-Reference Coverage Reach')
    a('')
    a('References sorted by max coverage across all claims.')
    a('')
    a('| Reference | Avg Cov | Max Cov | Claims Fully Covered |')
    a('|-----------|---------|---------|---------------------|')

    ref_summary = []
    for rid in ref_ids:
        rvs = ref_verdicts(rid)
        if not rvs:
            continue
        avg = sum(v['coverage'] for v in rvs) / len(rvs)
        mx  = max(v['coverage'] for v in rvs)
        nc  = sum(1 for v in rvs if v['status'] == 'covered')
        ref_summary.append((rid, avg, mx, nc))

    for rid, avg, mx, nc in sorted(ref_summary, key=lambda x: -x[2]):
        label = manifest[rid]['label'][:50]
        a(f'| {label} | {avg:.3f} | {mx:.3f} | {nc} |')

    a('')
    a('## 5. High-Coverage Pairs (coverage ≥ 0.40)')
    a('')

    high = sorted([v for v in verdicts if v['coverage'] >= 0.40], key=lambda v: -v['coverage'])
    if high:
        a('| Claim | Reference | Coverage | Status |')
        a('|-------|-----------|---------|--------|')
        for v in high[:80]:
            a(f"| {v['claim_label']} | {v['ref_label'][:45]} | {v['coverage']:.3f} | {v['status']} |")
    else:
        a('No pairs with coverage ≥ 0.40.')

    a('')
    a('## 6. Attorney-Review Flags')
    a('')
    review = [v for v in verdicts if v['needs_attorney_review']]
    if review:
        a('| Claim | Reference | Coverage | Status |')
        a('|-------|-----------|---------|--------|')
        for v in review:
            a(f"| {v['claim_label']} | {v['ref_label'][:45]} | {v['coverage']:.3f} | {v['status']} |")
    else:
        a('No pairs flagged for attorney review under current thresholds (coverage ≥ 0.99 '
          'AND blend_delta > 0.6).')

    a('')
    a('## 7. Structural-Distinguisher Summary')
    a('')
    a('For the five highest-coverage pairs per claim, the uncovered claim predicates')
    a('(structural distinguishers from the prior art) are listed below.')
    a('')

    for cid in claim_ids:
        cvs = sorted(claim_verdicts(cid), key=lambda v: -v['coverage'])[:5]
        if not cvs or cvs[0]['coverage'] < 0.05:
            continue
        a(f"### {manifest[cid]['label']}")
        a('')
        for v in cvs:
            a(f"**{v['ref_label'][:55]}** (coverage={v['coverage']:.3f})")
            if v['distinguishers']:
                for d in v['distinguishers']:
                    a(f'  - {d}')
            else:
                a('  *(all claim predicates matched)*')
            a('')

    return '\n'.join(lines)


# ── Main ──────────────────────────────────────────────────────────────

def run() -> list[dict]:
    print(f'[{_ts()}] Loading manifest...')
    manifest = load_manifest()

    claim_ids = [e['id'] for e in json.load(open(EXTRACTIONS_DIR / '_manifest.json'))
                 if e['id'].startswith('claim_')]
    ref_ids   = [e['id'] for e in json.load(open(EXTRACTIONS_DIR / '_manifest.json'))
                 if e['id'].startswith('ref_')]
    print(f'         {len(claim_ids)} claims, {len(ref_ids)} refs')

    print(f'[{_ts()}] Loading extraction graphs...')
    graphs: dict[str, object] = {}
    for doc_id in claim_ids + ref_ids:
        try:
            graphs[doc_id] = load_graph(doc_id)
        except Exception as exc:
            print(f'  WARN: {doc_id}: {exc}')
    print(f'         Loaded {len(graphs)} graphs')

    print(f'[{_ts()}] Phase 3 — Building grounding indexes ({len(claim_ids)} claims)...')
    indexes     : dict[str, object] = {}
    label_dicts : dict[str, dict]   = {}
    for cid in claim_ids:
        if cid not in graphs:
            continue
        idx, ld = build_index_from_graph(graphs[cid])
        indexes[cid]     = idx
        label_dicts[cid] = ld
    print(f'         Built {len(indexes)} indexes')

    print(f'[{_ts()}] Phase 4 — Running {len(claim_ids) * len(ref_ids)} coverage verdicts...')
    verdicts: list[dict] = []
    total = len(claim_ids) * len(ref_ids)
    done  = 0

    for cid in claim_ids:
        if cid not in indexes:
            done += len(ref_ids)
            continue
        index       = indexes[cid]
        claim_graph = graphs[cid]

        # Ground claim against its own index once, reuse across all refs.
        claim_grounded   = ground_extraction(None, claim_graph, index)
        claim_gr_results = [
            gp.grounding_result for gp in claim_grounded
            if gp.grounding_result is not None
        ]

        for rid in ref_ids:
            if rid not in graphs:
                done += 1
                continue

            v = evaluate_pair(
                cid, rid,
                claim_grounded, claim_gr_results,
                graphs[rid], index, manifest,
            )
            verdicts.append(v)

            done += 1
            if done % 200 == 0:
                print(f'         {done}/{total} ({100*done/total:.0f}%)')

    print(f'         Completed {len(verdicts)} verdicts')

    print(f'[{_ts()}] Phase 5 — Writing outputs...')
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    verdicts_path = OUTPUTS_DIR / 'v63-stage2-pair-verdicts.json'
    with open(verdicts_path, 'w') as f:
        json.dump(verdicts, f, indent=2)
    print(f'         Wrote {len(verdicts)} verdicts → {verdicts_path.name}')

    report      = build_report(verdicts, manifest, claim_ids, ref_ids)
    report_path = OUTPUTS_DIR / 'v63-stage2-fto-report.md'
    with open(report_path, 'w') as f:
        f.write(report)
    print(f'         Wrote report → {report_path.name}')

    print(f'[{_ts()}] Done.')
    return verdicts


if __name__ == '__main__':
    run()
