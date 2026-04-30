#!/usr/bin/env python3
"""
Seed the internal universe JSON from research papers and synthesis folders.

Maps Plyknot's own R&D onto its convergence framework:
- Entities = claims, features, design decisions, papers
- Measurers = validation routes (empirical test, implementation, peer review)
- Cracks = unvalidated claims, contradictions, blocking issues
- Openings = unmeasured positions (what we haven't tested)
- Chains = dependency paths through the R&D

Inference levels (how far from raw observation):
  signal      → raw note from a chat or observation
  measurement → structured claim backed by experiment/implementation
  pattern     → repeated validation across contexts
  model       → architectural design validated by implementation
  hypothesis  → untested forward-looking claim

Complexity levels (operational complexity of what's addressed):
  0 → Core primitive (single function, data structure)
  1 → Module (complete .py module, pipeline stage)
  2 → Subsystem (convergence detection, marker passing)
  3 → Paper-level integration (flagship, satellite)
  4 → Cross-domain validation (same claim across papers)
  5 → Strategy / business / product-market fit

Usage:
    python3 seed-internal-universe.py
"""

import json, re
from pathlib import Path
from datetime import date

WORKSPACE = Path(__file__).resolve().parent.parent.parent.parent  # plyknot-workspace/
SYNTHESIS = WORKSPACE / "research" / "notes" / "synthesis"
PAPERS = WORKSPACE / "research" / "papers"
OUT = Path(__file__).parent.parent / "src" / "features" / "universe" / "internal" / "internal-universe.json"

# ── Parse helpers ─────────────────────────────────────────────────────

def parse_frontmatter(text):
    fm = re.match(r'^---\n([\s\S]*?)\n---\n([\s\S]*)', text)
    if not fm:
        return {}, text
    meta = {}
    for line in fm.group(1).split('\n'):
        m = re.match(r'(\w+):\s*(.+)', line)
        if m:
            meta[m.group(1)] = m.group(2).strip()
    return meta, fm.group(2).strip()


def parse_todos(text):
    open_items, done_items = [], []
    for line in text.split('\n'):
        m = re.match(r'^- \[( |x)\]\s*(.+)', line)
        if m:
            (done_items if m.group(1) == 'x' else open_items).append(m.group(2))
    return open_items, done_items


# ── Hand-curated R&D items ────────────────────────────────────────────
# Each item is a claim/feature/design with its lattice position,
# validation status, and dependencies.

def build_internal_items():
    """Build the internal universe from synthesis + papers.

    Each item has:
      entity  - what is being claimed/built
      steps   - list of (claim, inference_level, complexity, convergence, sigma, depends_on[])
    """
    chains = []

    # ── Core framework claims ──
    chains.append({
        'entity': 'Structural Absence',
        'steps': [
            {'claim': 'Absence in Map = property does not exist (not zero)',
             'level': 'model', 'complexity': 0, 'convergence': 'converged', 'sigma': 0.3,
             'depends': ['ECS architecture']},
            {'claim': 'Works across physics, biology, medical imaging, materials, text',
             'level': 'pattern', 'complexity': 4, 'convergence': 'converged', 'sigma': 0.5,
             'depends': ['Structural Absence']},
        ],
    })

    chains.append({
        'entity': 'measure() / predict()',
        'steps': [
            {'claim': 'Two verbs separate observation from prediction architecturally',
             'level': 'model', 'complexity': 0, 'convergence': 'converged', 'sigma': 0.2,
             'depends': []},
            {'claim': 'Same run_evaluation() call works unchanged across 7 domains',
             'level': 'pattern', 'complexity': 4, 'convergence': 'converged', 'sigma': 0.4,
             'depends': ['measure() / predict()']},
        ],
    })

    chains.append({
        'entity': 'Convergence Detection',
        'steps': [
            {'claim': 'Sigma-tension between measurement distributions detects agreement/disagreement',
             'level': 'measurement', 'complexity': 1, 'convergence': 'converged', 'sigma': 0.3,
             'depends': ['measure() / predict()']},
            {'claim': '25-50% divergence rates across all tested domains',
             'level': 'pattern', 'complexity': 4, 'convergence': 'converged', 'sigma': 0.8,
             'depends': ['Convergence Detection']},
        ],
    })

    chains.append({
        'entity': 'Speciation Detection',
        'steps': [
            {'claim': 'GMM+BIC finds hidden sub-populations in divergent measurements',
             'level': 'measurement', 'complexity': 1, 'convergence': 'converged', 'sigma': 0.4,
             'depends': ['Convergence Detection']},
            {'claim': 'CDK2 DFG four conformational states reproduced exactly',
             'level': 'pattern', 'complexity': 3, 'convergence': 'converged', 'sigma': 0.2,
             'depends': ['Speciation Detection', 'AlphaFold satellite']},
        ],
    })

    chains.append({
        'entity': 'Echo Chamber Guard',
        'steps': [
            {'claim': 'Operational dependency graph discounts convergence from shared sources',
             'level': 'model', 'complexity': 2, 'convergence': 'converged', 'sigma': 0.5,
             'depends': ['Integer dependency graph']},
            {'claim': '754 AlphaFold/ESMFold echo chambers detected',
             'level': 'measurement', 'complexity': 3, 'convergence': 'converged', 'sigma': 0.3,
             'depends': ['Echo Chamber Guard', 'AlphaFold satellite']},
        ],
    })

    chains.append({
        'entity': 'Marker Passing',
        'steps': [
            {'claim': 'Propagates cracks through dependency graph to find shared vulnerabilities',
             'level': 'model', 'complexity': 2, 'convergence': 'converged', 'sigma': 0.4,
             'depends': ['Integer dependency graph']},
            {'claim': 'Recovers cosmological principle blind from 1271 entries, zero false positives',
             'level': 'measurement', 'complexity': 4, 'convergence': 'converged', 'sigma': 0.1,
             'depends': ['Marker Passing']},
        ],
    })

    chains.append({
        'entity': 'Integer Dependency Graph',
        'steps': [
            {'claim': 'depends[] uses integer IDs not strings — no language in the core',
             'level': 'model', 'complexity': 0, 'convergence': 'converged', 'sigma': 0.1,
             'depends': []},
        ],
    })

    # ── Canvas Architecture ──
    chains.append({
        'entity': 'Canvas Architecture',
        'steps': [
            {'claim': 'Three projections: Phenomenological, Operational, Epistemic',
             'level': 'model', 'complexity': 2, 'convergence': 'converged', 'sigma': 0.5,
             'depends': ['Structural Absence', 'Convergence Detection']},
            {'claim': 'Shear detection works (Test 4d: bidirectional same-construct anchors)',
             'level': 'measurement', 'complexity': 2, 'convergence': 'converged', 'sigma': 0.3,
             'depends': ['Canvas Architecture']},
            {'claim': 'Event Horizon breach validated (Experiment C: Perceived Stress)',
             'level': 'measurement', 'complexity': 2, 'convergence': 'converged', 'sigma': 0.4,
             'depends': ['Canvas Architecture']},
            {'claim': 'Fusion detection validated (Experiment D: Hubble constant)',
             'level': 'measurement', 'complexity': 2, 'convergence': 'converged', 'sigma': 0.3,
             'depends': ['Canvas Architecture']},
            {'claim': 'Real LLM drift detection across natural model versions',
             'level': 'hypothesis', 'complexity': 2, 'convergence': 'single', 'sigma': 2.0,
             'depends': ['Canvas Architecture']},
        ],
    })

    # ── Lensing ──
    chains.append({
        'entity': 'Lensing (lens verb)',
        'steps': [
            {'claim': 'lens(target, frame) unifies shear, grounded extraction, correlation, prior-art comparison',
             'level': 'model', 'complexity': 1, 'convergence': 'tension', 'sigma': 1.5,
             'depends': ['Canvas Architecture', 'describe()']},
            {'claim': 'Residue = first-class definition of novelty',
             'level': 'hypothesis', 'complexity': 1, 'convergence': 'single', 'sigma': 2.5,
             'depends': ['Lensing (lens verb)']},
        ],
    })

    # ── Act verb / Cybernetics ──
    chains.append({
        'entity': 'Cybernetics (act verb)',
        'steps': [
            {'claim': 'act() verb for reflexive domains where measurement changes thing measured',
             'level': 'model', 'complexity': 2, 'convergence': 'converged', 'sigma': 0.5,
             'depends': ['measure() / predict()']},
            {'claim': 'Test 1: Ontological Shear on AlphaFold — STRONG PASS',
             'level': 'measurement', 'complexity': 3, 'convergence': 'converged', 'sigma': 0.2,
             'depends': ['Cybernetics (act verb)', 'Speciation Detection']},
            {'claim': 'Test 2v2: DCOI on McLean-Pontiff — STRONG PASS (rho=-0.29, p=0.010)',
             'level': 'measurement', 'complexity': 3, 'convergence': 'converged', 'sigma': 0.4,
             'depends': ['Cybernetics (act verb)']},
            {'claim': 'Patent v6.3 covers combined approach',
             'level': 'signal', 'complexity': 5, 'convergence': 'single', 'sigma': 1.8,
             'depends': ['Cybernetics (act verb)']},
        ],
    })

    # ── Convergence-Independence hypothesis ──
    chains.append({
        'entity': 'Convergence-Independence Hypothesis',
        'steps': [
            {'claim': 'Independent convergence is informative; dependent convergence is not',
             'level': 'hypothesis', 'complexity': 4, 'convergence': 'tension', 'sigma': 1.8,
             'depends': ['Echo Chamber Guard', 'Cybernetics (act verb)']},
            {'claim': 'AI models from shared pipeline = dependent convergence (Test 1 post-hoc)',
             'level': 'measurement', 'complexity': 3, 'convergence': 'converged', 'sigma': 0.6,
             'depends': ['Convergence-Independence Hypothesis']},
            {'claim': 'Human researchers = more independent (Test 2v2 post-hoc)',
             'level': 'measurement', 'complexity': 3, 'convergence': 'tension', 'sigma': 1.2,
             'depends': ['Convergence-Independence Hypothesis']},
            {'claim': 'Holds on a second independent human dataset',
             'level': 'hypothesis', 'complexity': 4, 'convergence': 'single', 'sigma': 3.0,
             'depends': ['Convergence-Independence Hypothesis']},
        ],
    })

    # ── Layer 3 Architecture ──
    chains.append({
        'entity': 'Layer 3 (LLM read-only)',
        'steps': [
            {'claim': 'Three layers: L1 coupling values, L2 deterministic analysis, L3 LLM queries',
             'level': 'model', 'complexity': 2, 'convergence': 'converged', 'sigma': 0.4,
             'depends': ['Structural Absence', 'Convergence Detection']},
            {'claim': 'Read-only L3 keeps coupling map trustworthy',
             'level': 'hypothesis', 'complexity': 2, 'convergence': 'single', 'sigma': 2.0,
             'depends': ['Layer 3 (LLM read-only)']},
            {'claim': 'Literature-tiering routes papers to appropriate canvas layers',
             'level': 'signal', 'complexity': 2, 'convergence': 'single', 'sigma': 2.5,
             'depends': ['Layer 3 (LLM read-only)', 'Canvas Architecture']},
        ],
    })

    # ── Holographic Coupling ──
    chains.append({
        'entity': 'Holographic Coupling',
        'steps': [
            {'claim': 'Entity IS its convergence pattern across substrate-independent measurers',
             'level': 'model', 'complexity': 4, 'convergence': 'converged', 'sigma': 0.5,
             'depends': ['Convergence Detection', 'Canvas Architecture']},
        ],
    })

    # ── Foundation / Worldview ──
    chains.append({
        'entity': 'Foundation (Worldview)',
        'steps': [
            {'claim': 'Fixed-ontology approaches fail through reflexive capture or misalignment',
             'level': 'hypothesis', 'complexity': 5, 'convergence': 'tension', 'sigma': 1.5,
             'depends': []},
            {'claim': 'Test 1: Shear — PASSED, validates speciation against documented biology',
             'level': 'measurement', 'complexity': 3, 'convergence': 'converged', 'sigma': 0.2,
             'depends': ['Foundation (Worldview)', 'Speciation Detection']},
            {'claim': 'Test 2: DCOI — PASSED, validates reflexive-decay claim',
             'level': 'measurement', 'complexity': 3, 'convergence': 'converged', 'sigma': 0.4,
             'depends': ['Foundation (Worldview)', 'Cybernetics (act verb)']},
        ],
    })

    # ── Satellite papers ──
    for name, findings in [
        ('CXR (Satellite 1)', [
            ('0.999 correlation between AI disagreement and radiologist disagreement', 'measurement', 3, 'converged', 0.3),
            ('347 echo chamber cases identified', 'measurement', 3, 'converged', 0.4),
        ]),
        ('Text-as-Sensor (Satellite 2)', [
            ('504 measurements extracted from 100 texts autonomously', 'measurement', 3, 'converged', 0.5),
            ('NSM+Scone decomposition enables text-as-instrument', 'model', 2, 'tension', 1.3),
        ]),
        ('Materials & Pharma (Satellite 3)', [
            ('70.5% DFT cross-database rejection rate', 'measurement', 3, 'converged', 0.3),
            ('Autonomous PMC paper-reading loop works', 'measurement', 2, 'converged', 0.5),
        ]),
        ('AlphaFold (Satellite 4)', [
            ('754 echo chambers across 1069 proteins', 'measurement', 3, 'converged', 0.2),
            ('Backbone converges (Q3 91%), sidechain/binding diverge', 'pattern', 4, 'converged', 0.4),
        ]),
        ('Emergence (Satellite 5)', [
            ('EEVR detects when patterns exceed ontological categories', 'hypothesis', 4, 'single', 2.0),
        ]),
        ('LLM Signifiers (Satellite 6)', [
            ('Tokenizer architecture (not training data) is operative mechanism', 'measurement', 3, 'converged', 0.6),
            ('{Anthropic+OpenAI} vs {Google} does not generalize', 'measurement', 3, 'converged', 0.5),
        ]),
    ]:
        steps = []
        for claim, level, comp, conv, sigma in findings:
            steps.append({'claim': claim, 'level': level, 'complexity': comp,
                         'convergence': conv, 'sigma': sigma,
                         'depends': ['Convergence Detection', 'Echo Chamber Guard']})
        chains.append({'entity': name, 'steps': steps})

    # ── Products (complexity 5 = strategy/business) ──
    for name, claims in [
        ('Echo Chamber Map', [
            ('Public convergence state of science as product', 'signal', 5, 'single', 2.5),
            ('Free tier converts to paid batch API', 'hypothesis', 5, 'single', 3.0),
        ]),
        ('Patent FTO', [
            ('Plyknot framework applies to patent prosecution', 'measurement', 5, 'tension', 1.5),
            ('Smoke test passed: Claim 20 vs Palantir', 'measurement', 2, 'converged', 0.8),
            ('Stage 2 multi-extractor stabilization', 'signal', 2, 'single', 2.5),
        ]),
        ('Concept Distance', [
            ('Two-text concept comparison via Epistemic Canvas', 'hypothesis', 5, 'single', 3.0),
        ]),
        ('Plyknot ML', [
            ('GNN + contrastive learning for core-to-registry alignment', 'hypothesis', 2, 'single', 3.5),
            ('Operationalist inductive bias confers advantage', 'hypothesis', 4, 'single', 3.5),
        ]),
    ]:
        steps = []
        for claim, level, comp, conv, sigma in claims:
            steps.append({'claim': claim, 'level': level, 'complexity': comp,
                         'convergence': conv, 'sigma': sigma, 'depends': []})
        chains.append({'entity': name, 'steps': steps})

    # ── Open research questions (unresolved) ──
    chains.append({
        'entity': 'Consciousness as Instrument',
        'steps': [
            {'claim': 'Consciousness has structural signature: recursive decay stack with sense/act interfaces',
             'level': 'hypothesis', 'complexity': 5, 'convergence': 'single', 'sigma': 4.0,
             'depends': []},
            {'claim': 'Three-system LLM comparison would validate',
             'level': 'hypothesis', 'complexity': 5, 'convergence': 'single', 'sigma': 4.0,
             'depends': ['Consciousness as Instrument']},
        ],
    })

    chains.append({
        'entity': 'NSM Primes',
        'steps': [
            {'claim': '6 candidate primes for measurement-coordination consciousness',
             'level': 'hypothesis', 'complexity': 5, 'convergence': 'single', 'sigma': 4.0,
             'depends': ['Consciousness as Instrument']},
        ],
    })

    return chains


# ── Build output formats ──────────────────────────────────────────────

def build_all():
    chains = build_internal_items()

    # Flatten steps into cracks
    all_cracks = []
    for i, chain in enumerate(chains):
        for j, step in enumerate(chain['steps']):
            crack_id = f'int-{i:03d}-{j:02d}'
            all_cracks.append({
                'crack_id': crack_id,
                'chain': chain['entity'],
                'level': step['level'],
                'complexityLevel': step['complexity'],
                'claim': step['claim'],
                'convergence': step['convergence'],
                'sigmaTension': step['sigma'],
            })

    # Sort: divergent first, then by sigma descending
    conv_order = {'divergent': 0, 'tension': 1, 'single': 2, 'converged': 3}
    all_cracks.sort(key=lambda c: (conv_order.get(c['convergence'], 9), -c['sigmaTension']))

    # Build chain summaries
    chain_summaries = []
    for chain in chains:
        crack_count = len([s for s in chain['steps'] if s['convergence'] in ('divergent', 'tension', 'single')])
        chain_summaries.append({
            'name': chain['entity'],
            'entity': chain['entity'],
            'stepCount': len(chain['steps']),
            'crackCount': crack_count,
        })
    chain_summaries.sort(key=lambda c: -c['crackCount'])

    # Build heatmap
    INFERENCE_LEVELS = ['signal', 'measurement', 'pattern', 'model', 'hypothesis']
    cells = {}
    for inf in INFERENCE_LEVELS:
        for comp in range(6):
            cells[(inf, comp)] = {'total': 0, 'cracked': 0}

    for chain in chains:
        for step in chain['steps']:
            key = (step['level'], step['complexity'])
            if key in cells:
                cells[key]['total'] += 1
                if step['convergence'] in ('divergent', 'tension', 'single'):
                    cells[key]['cracked'] += 1

    heatmap_cells = []
    for (inf, comp), data in cells.items():
        if data['total'] == 0:
            status = 'empty'
        elif data['cracked'] == 0:
            status = 'solid'
        elif data['cracked'] / data['total'] > 0.6:
            status = 'divergent'
        elif data['cracked'] / data['total'] > 0.3:
            status = 'tension'
        else:
            status = 'single'

        heatmap_cells.append({
            'inferenceLevel': inf,
            'complexityLevel': comp,
            'total': data['total'],
            'cracked': data['cracked'],
            'status': status,
        })

    # Stats
    stats = {
        'chainCount': len(chains),
        'couplingCount': sum(len(c['steps']) for c in chains),
        'entityCount': len(chains),
        'crackCount': len([c for c in all_cracks if c['convergence'] in ('divergent', 'tension')]),
    }

    return {
        '_meta': {
            'generated': date.today().isoformat(),
            'description': 'Internal R&D universe — Plyknot research mapped onto its own convergence framework',
        },
        'stats': stats,
        'heatmap': {'cells': heatmap_cells},
        'chains': {'chains': chain_summaries},
        'cracks': {'cracks': all_cracks},
        'inference_chains': chains,  # full chain detail for drill-down
    }


def main():
    data = build_all()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2))
    s = data['stats']
    n_cracks = len([c for c in data['cracks']['cracks'] if c['convergence'] in ('divergent', 'tension')])
    n_single = len([c for c in data['cracks']['cracks'] if c['convergence'] == 'single'])
    n_converged = len([c for c in data['cracks']['cracks'] if c['convergence'] == 'converged'])
    populated = len([c for c in data['heatmap']['cells'] if c['total'] > 0])
    print(f"Internal universe: {s['entityCount']} chains, {s['couplingCount']} steps")
    print(f"  Convergence: {n_converged} converged, {n_cracks} cracked (tension/divergent), {n_single} single-measurer")
    print(f"  Heatmap: {populated}/30 cells populated")
    print(f"  Wrote {OUT}")


if __name__ == '__main__':
    main()
