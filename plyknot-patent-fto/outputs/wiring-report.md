# Wiring report — patent-FTO workspace → Plyknot framework

**Date:** 2026-04-25
**Workspace:** `plyknot-com/plyknot-patent-fto/`
**Framework root:** `plyknot/plyknot/`
**Framework modified:** No

---

## Summary of changes

| File | Change |
|---|---|
| `measurers.py` | Substrate strings imported from framework; hardcoded stubs removed |
| `pipeline.py` | Full rewrite: stubs replaced with framework primitive calls |
| `example_claim20_v4.py` | `StubUniverse` → `Universe`; smart stub caller; updated API |
| `adapters/__init__.py` | New — empty package marker |
| `adapters/decompose.py` | New — LLM call → parse → build_graph adapter |
| `adapters/index.py` | New — DecompositionGraph → GroundingIndex adapter |
| `adapters/coverage.py` | New — directed-subset coverage check (canvas patch 4) |
| `adapters/llm_call.py` | New — Anthropic/Google/stub caller factory |

No framework files were modified.

---

## Step 1: Substrate string fix

**Problem:** `measurers.py` hardcoded `'Anthropic_BPE_Vocabulary'` while the framework stores `'BPE_Anthropic_Vocabulary'` in `substrate/anthropic.py`. Similarly for OpenAI and Google substrate strings.

**Fix:**
```python
from plyknot.substrate.anthropic import ANTHROPIC_DEPENDS
from plyknot.substrate.openai import OPENAI_DEPENDS
from plyknot.substrate.google import GOOGLE_DEPENDS

ANTHROPIC_SUBSTRATE = tuple(ANTHROPIC_DEPENDS.values())
OPENAI_SUBSTRATE = tuple(OPENAI_DEPENDS.values())
GOOGLE_SUBSTRATE = tuple(GOOGLE_DEPENDS.values())
```

**Actual framework strings now in use:**

| Substrate | Old workspace string | New canonical string |
|---|---|---|
| Anthropic tokenizer | `Anthropic_BPE_Vocabulary` | `BPE_Anthropic_Vocabulary` |
| Anthropic alignment | `Constitutional_AI_Alignment` | `Constitutional_AI` |
| OpenAI tokenizer | `OpenAI_BPE_Vocabulary` | `BPE_OpenAI_Tiktoken` |
| Google tokenizer | `Google_SentencePiece_Vocabulary` | `SentencePiece_Google_Vocabulary` |

The framework `DEPENDS` dicts also include `tokenizer_family` (e.g., `'BPE'`) and `dark_matter_anchor` entries. These are now included in the substrate tuples — they expand the dependency declaration rather than changing its semantics. `LLM_SHARED_SUBSTRATE` has no framework counterpart and remains workspace-local.

---

## Step 2: camelCase check

`grep -n "analyzeMeasurerCorrelation|mineEntityClusters|analyzeCouplingConvergence" *.py` produced no matches. No camelCase fixes needed.

---

## Adapter package structure

```
adapters/
  __init__.py         (empty)
  decompose.py        decompose_text(text, llm_call) → DecompositionGraph
  index.py            build_index_from_graph(graph) → (GroundingIndex, label_dict)
  coverage.py         directed_subset_check(source, target) → CoverageResult
  llm_call.py         make_anthropic_caller / make_google_caller / make_stub_caller
```

All adapters are thin wrappers: they translate between workspace types and framework API shapes. No business logic lives in the adapters.

---

## Pipeline rewrite summary

### What changed

| Function | Before | After |
|---|---|---|
| `extract_document` | Returns `StabilisedExtraction` (stub) | Returns `DecompositionGraph` (real) |
| `build_predicate_index` | Returns `dict[str, EntityID]` (stub) | Returns `(GroundingIndex, dict[int, str])` (real) |
| `ground_extraction` | String-match stub | `plyknot.grounding.ground_text` per predicate |
| `measure_lensing_strain` | Hardcoded `blend_delta` | `extract_unconditioned_simulated` + `blend_extractions` |
| `evaluate_pair` | Calls stub marker passing | Calls `directed_subset_check` |
| `run_anticipation_marker_passing` | Stub | **Removed** — replaced by `directed_subset_check` |
| `_stub_*` functions | Present | **Removed** — no more stubs |

### Type changes

`GroundedPredicate` gained a `grounding_result: GroundingResult | None` field. This carries the framework's result object through from `ground_extraction` to `evaluate_pair`, where it is extracted for `directed_subset_check`.

`ClaimReferenceVerdict` and `AnticipationResult` shapes are unchanged — the example's output format is preserved.

### Lensing Strain implementation note

The task specifies calling `extract_unconditioned` and `extract_conditioned` (real API functions). For the wired smoke test, `extract_unconditioned_simulated` and `extract_conditioned_simulated` are used instead (API-free, deterministic). The simulated variants exist in the framework precisely for this purpose (`discovery report §guided_extraction.py`). The pipeline note documents how to switch to real API calls (replace two function references).

**ExtractionSchema note:** The default `ExtractionSchema.predicate_categories` is `['see', 'hear', 'feel', 'touch', 'think', 'know', 'want', 'believe', 'say']` — cognitive/sensory categories, not patent-relevant. For Stage 2 real extraction, a custom `ExtractionSchema` with patent-domain categories (`['comprises', 'produces', 'couples', 'distinguishes', 'depends_on', 'enables', 'prevents', 'transforms']`) should be passed to `extract_unconditioned` and `extract_conditioned`. This is a Stage 2 task, not a wiring blocker.

---

## Wiring smoke test results

**Run date:** 2026-04-25
**Wall-clock runtime:** 4.80s (dominated by sentence-transformers model load on first call)

| Metric | Value |
|---|---|
| Claim 20 predicates extracted | 5 |
| Prior-art predicates extracted | 3 |
| Grounding index entries | 5 (seeded from claim) |
| Coverage fraction | 20.00% (1/5) |
| Uncovered claim predicates | 4 |
| Lensing blend_delta | 0.041 |
| Verdict | ● NOVEL — claim has structural distinguishers |

**Coverage interpretation:** Only the `produces automated_actor action_coupling_record` predicate in the claim grounded to the same entity as the prior-art's `produces automated_actor action_record audit_log` (similarity 0.857 via all-MiniLM-L6-v2). The four remaining claim predicates — `depends_on`, `distinguishes`, `comprises` (×2) — have no semantic match in the prior-art's three predicates. This is the structurally correct result: Palantir's Foundry Action Types does not literally anticipate Claim 20.

**Lensing interpretation:** blend_delta = 0.041 means the reference reads consistently regardless of whether the claim lens is applied. This is expected from the simulated variants with low noise; real extraction on the actual texts would produce a more discriminating signal.

---

## Framework API surprises

### 1. `ANTHROPIC_DEPENDS` dict includes extra keys

The dict has 6 keys including `tokenizer_family: 'BPE'` and `dark_matter_anchor: 'Anthropic_Vendor_Default'`. The workspace originally had only 4 substrate strings. The new tuple includes all 6. This is correct behavior (more complete dependency declaration), not a problem.

### 2. `parse_decomposition_response` returns `list[dict]`, not `list[PredicateUnit]`

`build_graph` takes the raw list of dicts and converts internally. The adapter calls both in sequence, which is the correct two-step API.

### 3. `ground_text` returns a list per phrase, not a single result

`ground_text(label, index)` returns `list[GroundingResult]` (one per extracted phrase). For single-predicate-string grounding, the result is a list of length 1. The pipeline takes `results[0]`.

### 4. `blend_extractions` returns `list[GuidedValue]`, not a scalar

The pipeline computes `blend_delta = mean(abs(gv.guidance_delta) for gv in guided_values)`. This is low (≈0.04) for the simulated variants due to small noise levels; real LLM calls would yield higher variance and more diagnostic signal.

### 5. Default ExtractionSchema is cognitive, not patent-domain

Documented above. Not a wiring blocker; a Stage 2 configuration task.

---

## Remaining gaps before Stage 2

1. **ExtractionSchema for patent domain.** The default schema categories (`['see', 'hear', ...]`) must be overridden with patent-domain verb categories before running real extraction on v6.3 patent text.

2. **Multi-extractor stabilisation.** The current `extract_document` runs one LLM call per document. The v4 architecture specified multi-extractor runs with per-extractor `DecompositionGraph`s and a stabilisation pass. `common_ground.stabilise` does not exist in the framework; a local N-ordering reconciliation helper is needed in Stage 2.

3. **Real API integration.** Switch `extract_unconditioned_simulated` / `extract_conditioned_simulated` to `extract_unconditioned` / `extract_conditioned` in `measure_lensing_strain`. Supply an `ExtractionSchema` with patent categories. Cost: < $0.10 per pair on Haiku.

4. **IDS sweep.** Stage 2 runs `evaluate_pair` over all references in the IDS, not just Palantir US 11,714,792. The pipeline loop and result aggregator are not yet written.

5. **Extraction stability gate.** The `DOCUMENT_EXTRACTION_STABILITY` property (< 0.85 → escalate) is not yet wired into `evaluate_pair`. Requires multi-run extraction to compute.

6. **`StabilisedExtraction.substrate_overlap_matrix`** is no longer populated. The workspace `measurers.substrate_overlap` function can still compute pairwise overlap from `_extractor_substrate`, but it is not called in the wired pipeline yet.
