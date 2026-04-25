# plyknot-patent-fto

Patent freedom-to-operate analysis built on top of the Plyknot framework.
The patent application becomes the proof-of-concept that Plyknot's
measurement-convergence machinery generalises to legal-technology.

## Architectural premise

Patent prosecution is a measurement-convergence problem. Every claim is a
target. Every prior-art reference is an instrument that *reads on* the claim
to some degree. Multiple measurers (LLMs across vendor families, embedding
models, eventually human attorneys) produce coupling entries reporting how
strongly each prior-art reference reads on each claim.

The same primitives apply:

- `measure()` — a measurer produces a fact about a claim's distance from a
  reference (post-extraction reading-on score, post-comparison embedding
  distance).
- `predict()` — a pre-filing FTO claim of novelty, before examiner contact.
  Becomes a `measure()` once the examiner verdict lands.
- `depends` — declares the mechanism each measurer embodies (tokenizer
  family, alignment method, training corpus). Surfaces echo chambers when
  measurers sharing substrate converge while substrate-independent measurers
  diverge.
- Convergence analysis — claim X is `● converged-safe` against reference Y
  when measurers from at least two independent substrate families agree the
  reading-on distance is high.
- Cracks (◆) — measurers agree the claim reads on the reference. Must amend
  before filing.
- Tension (◐) — measurers disagree. Highest-leverage attorney-review spot.
- Speciation — claim text has two distinct structural readings under
  different extraction prompts. Examiner-attack vector.

## Layout

```
plyknot-patent-fto/
├── README.md             — this file
├── entities.py           — claim / prior-art / distinguisher factories
├── properties.py         — property string constants for the patent domain
├── measurers.py          — LLM and embedding measurer registration with
│                           substrate-correct depends declarations (wired)
├── methods.py            — method identifiers (extraction prompts, etc.)
├── pipeline.py           — measure-and-analyse driver (wired, stubs removed)
├── adapters/
│   ├── __init__.py       — package marker
│   ├── decompose.py      — LLM call → parse → build_graph adapter
│   ├── index.py          — DecompositionGraph → GroundingIndex adapter
│   ├── coverage.py       — directed-subset coverage check (canvas patch 4)
│   └── llm_call.py       — Anthropic/Google/stub caller factory
├── example_claim20_v4.py — worked example: v6.3 Claim 20 vs Palantir
│                           US 11,714,792 (wired, smoke test passes)
└── outputs/
    ├── framework-api-discovery.md   — API surface notes from wiring
    └── wiring-report.md             — Stage 1 completion report (2026-04-25)
```

## Reusing the existing framework

This workspace does *not* reimplement Plyknot. It reuses:

- `plyknot.universe.Universe` as the coupling map host
- `plyknot.universe.measure()` / `predict()` as the writing API
- `plyknot.analysis.analyze_measurer_correlation()` for echo-chamber detection
- `plyknot.discovery` for crack/opening surfacing
- `plyknot.grounding.ground_text` for predicate grounding
- `plyknot.describe.extract_unconditioned_simulated` / `extract_conditioned_simulated` for lensing strain

The patent-domain layer is a thin set of factories, properties, methods,
and adapters that translate between workspace types and framework API shapes.
No business logic lives in the adapters.

## Current state — Stage 1 complete (2026-04-25)

All stubs removed. Framework is wired throughout. Smoke test passes:
- Claim 20 vs Palantir US 11,714,792: 4.80s runtime, 5 predicates extracted,
  coverage 20% (1/5), lensing blend_delta=0.041, verdict: ● NOVEL.
- Extractors are simulated (API-free). Real LLM calls produce more discriminating signal.

**Substrate strings corrected** — `measurers.py` now imports from `plyknot.substrate.*`:

| Substrate | Old stub string | Canonical string |
|-----------|----------------|-----------------|
| Anthropic tokenizer | `Anthropic_BPE_Vocabulary` | `BPE_Anthropic_Vocabulary` |
| Anthropic alignment | `Constitutional_AI_Alignment` | `Constitutional_AI` |
| OpenAI tokenizer | `OpenAI_BPE_Vocabulary` | `BPE_OpenAI_Tiktoken` |
| Google tokenizer | `Google_SentencePiece_Vocabulary` | `SentencePiece_Google_Vocabulary` |

## Stage 2 — remaining before production run

1. **ExtractionSchema for patent domain** — override default cognitive categories with `['comprises', 'produces', 'couples', 'distinguishes', 'depends_on', 'enables', 'prevents', 'transforms']`
2. **Real API integration** — swap `extract_unconditioned_simulated` → `extract_unconditioned` in `measure_lensing_strain`
3. **IDS sweep** — extend evaluation loop over all ~20 IDS references with result aggregator
4. **Multi-extractor stabilisation** — N-ordering reconciliation helper for `StabilisedExtraction`
5. **Extraction stability gate** — wire `DOCUMENT_EXTRACTION_STABILITY` into `evaluate_pair`
6. **`substrate_overlap_matrix`** — restore population in `StabilisedExtraction`

See `outputs/wiring-report.md` for full diagnosis and `research/notes/synthesis/Patent-fto/Todo.md` for ranked task list.

## How this is the proof-of-concept

The patent application that protects the framework is FTO-cleared using the
framework. The §4.x specification embodiments include the patent-as-
instrument application explicitly, locking forward-protection on the legal-
tech use case under § 8 / EPC Art. 83 enablement. The N2 stress-test
re-runs with the framework's own outputs as supporting evidence.
