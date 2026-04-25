# Framework API discovery report

**Date:** 2026-04-25
**Framework root:** `/Users/klas.ehnemark/Github/plyknot-workspace/plyknot/plyknot/`
**Importable from workspace:** Yes — `plyknot` resolves via `sys.path` sibling injection.
`/Users/klas.ehnemark/Github/plyknot-workspace/plyknot` is on `sys.path` when Python is run
from the workspace directory. No editable install needed; no `pip install -e .` step required.

---

## Module: predicate_decomposition.py

**No `decompose()` function exists.**

The module is a lower-level toolkit. It provides:

| Name | Signature | Returns | Notes |
|---|---|---|---|
| `parse_decomposition_response` | `(raw: str)` | `list[dict]` | Parses raw LLM JSON output into unit dicts |
| `build_graph` | `(unit_dicts: list[dict], source_text: str)` | `DecompositionGraph` | Constructs the full predicate graph with metrics |
| `decomposition_to_data_entries` | `(graph, target, who, who_has_body, instrument_name)` | `list[DataEntry]` | Bridges graph → coupling map |

Key dataclasses:
- `PredicateUnit(id, unit_type, verb, content, intensity, depends_on, source_text, epistemological_route)`
- `DecompositionGraph(units, edges, observation_count, inference_count, evaluative_count, causal_count, observation_density, max_inference_depth, grounding_ratio, has_empirical_grounding, source_text)`

The LLM prompt is exported as `DECOMPOSITION_PROMPT` (a string). The caller is responsible for
calling the LLM directly and passing the raw response to `parse_decomposition_response()`.

**Notes:** The stubs assume `decompose(text, extractor_id=ext_id)` as a single function.
This does not exist. Wiring requires a local wrapper that: calls the LLM with
`DECOMPOSITION_PROMPT + text`, passes the response to `parse_decomposition_response()`,
then `build_graph()`.

---

## Module: common_ground.py

**No `stabilise()`, `stabilize()`, `reconcile()`, or `merge_extractions()` function exists.**

The module contains:
- `CommonGround` dataclass: `(entity, measurements, convergence_status, n_instruments, n_measurements, depth, related_entities, notes)` with a `to_prompt_summary() -> str` method
- `ClarificationQuestion` dataclass
- `GroundedExtraction` dataclass
- `CG_DATA: dict[int, CommonGround]` — a static registry of pre-populated CommonGround objects for 30 E3 benchmark concepts (electron charge through national identity). These are NOT wired into the patent-FTO use case.

**Notes:** The stubs assume `stabilise(raw_per_extractor, n_orderings=4)` — a function that
takes multiple extractions from different extractor IDs and reconciles them into a stable
predicate set with an extraction-stability score. **This function does not exist anywhere in
the framework.** This is a gap that must be implemented as a local helper in the workspace.
The denoising loop in `guided_extraction.py` is the closest analogue (N re-runs + variance
check) but it operates on text → LLM calls, not on already-completed extraction dicts.

---

## Module: grounding.py

| Name | Signature | Returns | Notes |
|---|---|---|---|
| `build_grounding_index` | `(registry_labels: dict[int, str], model_name: str = 'all-MiniLM-L6-v2')` | `GroundingIndex` | Embeds registry labels; falls back to char n-gram if sentence-transformers absent |
| `ground_token` | `(token: str, index: GroundingIndex, threshold: float = 0.45, ambiguity_gap: float = 0.10, min_threshold: float = 0.40)` | `GroundingResult` | Maps one word/phrase to entities |
| `ground_text` | `(text: str, index: GroundingIndex, threshold: float = 0.45, ambiguity_gap: float = 0.10, extract_phrases: bool = True)` | `list[GroundingResult]` | Extracts phrases, grounds each one |
| `ground_to_common_ground` | `(concept_token, index, universe, threshold=0.45)` | `CommonGround \| None` | Full pipeline: ground → look up coupling map → return CG |
| `extract_with_grounding` | `(text, index, universe, guidance_scale=0.5)` | `tuple[list, list[GroundingResult]]` | Complete CFG extraction with grounding |

Key dataclasses:
- `GroundingIndex(embeddings, labels, model_name, dimension, entry_count)` — built from `dict[int, str]`
- `GroundingResult(token, candidates, top_match, grounded, ambiguous, structural_absence, embedding_model)`
- `GroundingCandidate(entity_id, entity_label, similarity)`

Thresholds:
- Default confidence threshold: `0.45`
- Ambiguity gap: `0.10` (two candidates within this gap → ambiguous)
- Hard floor: `0.40` (below → structural absence)

Embedding strategy: uses `sentence-transformers/all-MiniLM-L6-v2` if available; falls back
to character n-gram TF-IDF with no external dependencies.

**Notes:**
1. **`build_index_from_extractions` does not exist.** The stubs call
   `grounding.build_index_from_extractions(claim_extractions)`. The real function is
   `build_grounding_index(registry_labels: dict[int, str])`. The wiring step must build
   the `dict[int, str]` from the extraction's predicate set before calling it.
2. `ground_text(p, predicate_index)` is called in the stubs where `p` is a predicate string —
   this is consistent with the real API since `ground_text` takes a string first.

---

## Module: guided_extraction.py

| Name | Signature | Returns | Notes |
|---|---|---|---|
| `extract_unconditioned` | `(text: str, schema: ExtractionSchema = DEFAULT_SCHEMA, model: str = 'claude-haiku-4-5-20251001', temperature: float = 0.3)` | `list[PredicateExtraction]` | Unconditional LLM extraction |
| `extract_conditioned` | `(text: str, context_anchors: dict[str, float], schema: ExtractionSchema = DEFAULT_SCHEMA, model: str = ..., temperature: float = 0.3)` | `list[PredicateExtraction]` | Conditioned on known measurements |
| `blend_extractions` | `(unconditioned: list[PredicateExtraction], conditioned: list[PredicateExtraction], guidance_scale: float = 0.5)` | `list[GuidedValue]` | CFG blend |
| `run_denoising_loop` | `(text, who, context, context_anchors, who_has_body=True, guidance_scale=0.5, schema=DEFAULT_SCHEMA, model=..., n_reruns=3, convergence_threshold=0.08, max_resolution='sentence', temperature=0.3)` | `DenoiseResult` | Full iterative denoising |

`context_anchors` format: `dict[str, float]` — keys are free-form strings like
`"entity_name:property"`, values are known measurement values (0.0–1.0).

`ExtractionSchema.predicate_categories` defaults to:
`['see', 'hear', 'feel', 'touch', 'think', 'know', 'want', 'believe', 'say']`

**Notes:** API matches v4 assumptions closely. Simulated variants
(`extract_unconditioned_simulated`, `extract_conditioned_simulated`) exist for testing
without API calls — useful for patent-FTO testing.

---

## Module: marker_passing.py

| Name | Signature | Returns | Notes |
|---|---|---|---|
| `run_marker_passing` | `(chains: list[InferenceChain], config: MarkerPassingConfig \| None = None)` | `MarkerPassingResult` | Standard BFS propagation |
| `run_custom_marker_passing` | `(chains: list[InferenceChain], sources: list[MarkerSource], config: MarkerPassingConfig \| None = None)` | `dict` | Custom seed sources |

`run_custom_marker_passing` returns a plain `dict`:
```python
{'activations': dict[int, list[MarkerActivation]], 'collisions': list[MarkerCollision]}
```

`MarkerPassingResult` fields:
- `.crack_connections: list[MarkerCollision]`
- `.openings: list[MarkerCollision]`
- `.activations: dict[int, list[MarkerActivation]]`
- `.nodes_visited: int`
- `.max_hops_reached: int`
- `.cross_level_count: int`

`MarkerSource(label, chain_entity, type, complexity_levels, initial_strength, seed_deps: list[int])`
— seed_deps are **integer registry IDs**, not entity IDs or predicate dataclasses.

`InferenceChain` and `InferenceStep` are from `plyknot.inference`.

`MarkerPassingConfig(decay=0.8, max_hops=5, activation_threshold=0.01, collision_threshold=0.01)`

Coverage is readable from:
- `result.nodes_visited` — total nodes activated
- `result.openings` — list of MarkerCollision (each has `.node`, `.strength`, `.source_count`, `.paths`)
- `result.crack_connections` — shared-cause collisions

**Notes:** The stubs call `run_custom_marker_passing(seed_deps, sources, ...)` with `seed_deps`
as the first argument. The real signature is `(chains, sources, config)` where `chains` is
`list[InferenceChain]`. The patent-FTO use case operates on predicate graphs, not
`InferenceChain` objects — this is a significant structural mismatch. Adapter code is needed.

---

## Module: discovery.py

**`find_openings()` does not exist as a standalone function.**

Openings are returned inside `MarkerPassingResult.openings` from `run_marker_passing()`.

| Name | Signature | Returns | Notes |
|---|---|---|---|
| `find_structural_holes` | `(chains: list[InferenceChain])` | `list[StructuralHole]` | Finds missing intermediate levels |
| `create_llm_agent` | `(u: Universe, name: str, model: str)` | `EntityID` | Creates an LLM measurer entity |
| `record_hypothesis` | `(u, agent_id, target_crack, hypothesis, confidence, reasoning)` | `None` | Records a hypothesis measurement |
| `check_hypothesis_convergence` | `(u, target_crack, hypothesis_name)` | `dict` | Checks convergence of a named hypothesis |
| `render_discovery_report` | `(result: MarkerPassingResult, holes: list[StructuralHole])` | `str` | Pretty-prints the discovery report |

`StructuralHole(from_chain, from_step, to_chain, to_step, missing_level, shared_deps, description)`

**`find_cracks()` does not exist.** Crack connections (○ nodes) are in
`MarkerPassingResult.crack_connections`. These are populated automatically by
`run_marker_passing()` from steps whose `convergence` is `'divergent'` or `'tension'`.

**Notes:** The stubs call `find_openings(result, claim_grounded)` with a result object
and a grounded claim. This function does not exist. The wiring step must read
`result.openings` directly from the `MarkerPassingResult` returned by `run_marker_passing()`.
The second argument `claim_grounded` has no equivalent in the framework API.

---

## Module: universe.py

`Universe` constructor takes no arguments: `Universe()`.

Key methods:

| Method | Signature | Notes |
|---|---|---|
| `create_measurer` | `(nm: str, method: str) -> EntityID` | Creates a measurer; tags it `['observed', 'measurer', method]` |
| `measure` | `(measurer: EntityID, target: EntityID, prop: str, value: float, method: str, sigma: float \| None = None) -> None` | Directed measurement; fires `record_event` |
| `predict` | `(pipeline: EntityID, target: EntityID, prop: str, value: float, method: str, sigma: float \| None = None, inputs: list[str] \| None = None) -> None` | Directed prediction |
| `couple` | `(idA: EntityID, idB: EntityID, prop: str, value: float, method: str, sigma: float \| None = None) -> None` | Symmetric undirected coupling |

**`create_target()` does not exist.** There is no dedicated factory for "target" entities.
All entities in the universe are created via typed factories
(`create_measurer`, `create_massive`, `create_gene`, etc.) or via `_next_id` directly.
To register a patent or claim as a target, use `create_measurer(name, method)` or
increment `u._next_id` manually and assign `u.name[id]` and `u.tags[id]`.

`measure()` parameter order: `(measurer, target, prop, value, method, sigma=None)` —
`sigma` is keyword-optional, all others positional.

---

## Module: analysis.py

| Name | Signature | Returns | Notes |
|---|---|---|---|
| `analyze_measurer_correlation` | `(u: Universe, trust_weights: dict[EntityID, TrustWeight] \| None = None, config: TrustWeightConfig \| None = None)` | `list[MeasurerProfile]` | Substrate-aware convergence analysis |
| `mine_entity_clusters` | `(u: Universe, exclude_properties: set[str] \| None = None)` | `list[EntityCluster]` | Pairwise co-convergence/co-divergence mining |
| `analyze_coupling_convergence` | `(u: Universe, options: dict \| None = None)` | `list[CouplingConvergence]` | Per-(entity, property) convergence |

`MeasurerProfile` fields: `measurerId, measurerName, groups, divergentGroupCount, tensionGroupCount, convergedGroupCount, totalGroupCount, pattern, universalCoDivergence, trust_weight`

`EntityCluster(entities, entityNames, sharedProperties, convergencePattern)` where
`convergencePattern` is `'co-convergent' | 'co-divergent' | 'mixed'`.

The camelCase name `analyzeMeasurerCorrelation` used in the stubs corresponds to
`analyze_measurer_correlation` (snake_case) in the framework.
`mineEntityClusters` → `mine_entity_clusters`.

---

## Directed-subset coverage primitive

- **Exists in framework:** No
- Framework grep for `directed_subset`, `subset_coverage`: no matches
- `asymmetric` appears only in `classifier.py` (unrelated outlier detection context)
- `analysis.py:1297` uses `type='asymmetric-validation'` as an event type string (unrelated)

**Action required:** Implement `directed_subset_check` as a local helper inside the
workspace (e.g., `patent_fto/coverage.py` per the stub's `framework_function` reference).
The stub at `methods.py:172–173` already acknowledges this: it declares
`framework_function='patent_fto.coverage.directed_subset_check'`, confirming canvas patch 4
was designed to be workspace-local.

---

## Substrate registry

- **Location:** `plyknot/plyknot/substrate/` — a sub-package with `anthropic.py`, `openai.py`, `google.py`, `tokenizers.py`
- **Format:** Plain Python string constants, NOT integer IDs and NOT `DependencyEntry` objects
- **`Anthropic_BPE_Vocabulary`:** The workspace stub (`measurers.py:42`) uses the string
  `'Anthropic_BPE_Vocabulary'`. The framework uses `'BPE_Anthropic_Vocabulary'`
  (different ordering of words) in `substrate/anthropic.py`.
  **These strings do not match.** The workspace stub will need to be updated to use
  `'BPE_Anthropic_Vocabulary'` or import `ANTHROPIC_DEPENDS['tokenizer']` from
  `plyknot.substrate.anthropic`.
- **Integer IDs:** None. Substrate dependencies are string labels only, not registered in
  `DEPENDENCY_REGISTRY` as `DependencyEntry` objects with integer IDs.
- **`substrate_overlap` calculation:** Uses string label comparison, not integer IDs.
  Cross-vendor substrate independence is determined via `plyknot.substrate.tokenizers`:
  `classify_tokenizer(model)` and `substrate_independence_pair(task_type)`.

---

## Wiring blockers

1. **`predicate_decomposition.decompose` does not exist.** Stubs assume a single
   `decompose(text, extractor_id)` entry point. Framework requires a two-step call:
   LLM → `parse_decomposition_response()` → `build_graph()`. A thin local wrapper is needed.

2. **`common_ground.stabilise` does not exist.** This is the most significant gap.
   The stubs treat `stabilise(raw_per_extractor, n_orderings=4)` as a framework function.
   It is not. The closest analogue is `guided_extraction.run_denoising_loop()` (N re-runs +
   variance check on LLM extraction), but `stabilise` as designed operates on
   *already-completed* extraction dicts, not on text. Needs local implementation.

3. **`grounding.build_index_from_extractions` does not exist.** Real function is
   `build_grounding_index(registry_labels: dict[int, str])`. Wiring must build the label
   dict from the extraction's predicate vocabulary before calling it.

4. **`discovery.find_openings` does not exist.** Openings live in
   `MarkerPassingResult.openings`. The pipeline must read them from the result object
   directly; no separate `find_openings` call.

5. **`Universe.create_target` does not exist.** Use `create_measurer(name, method)` or
   manual ID allocation for registering claim/patent entities.

6. **`run_custom_marker_passing` signature mismatch.** Stubs call
   `(seed_deps, sources, ...)`. Real signature is `(chains: list[InferenceChain], sources: list[MarkerSource], ...)`.
   The patent-FTO pipeline works with predicate graphs, not `InferenceChain` objects.
   This requires either an adapter that wraps predicate dicts into `InferenceChain` objects,
   or a local reimplementation of BFS propagation that operates natively on predicate IDs.

7. **`'Anthropic_BPE_Vocabulary'` string mismatch.** Workspace uses `'Anthropic_BPE_Vocabulary'`;
   framework stores it as `'BPE_Anthropic_Vocabulary'`. Will cause silent mismatches in
   any substrate-overlap calculation.

8. **camelCase vs snake_case.** Stubs reference `analyzeMeasurerCorrelation` and
   `mineEntityClusters`; framework exports `analyze_measurer_correlation` and
   `mine_entity_clusters`.

---

## Recommended wiring approach

**Adapter layer** — wrap framework calls in thin adapters inside the workspace.

Direct wiring is not feasible because of blockers 1, 2, and 5 above (missing functions).
Significant rework of `pipeline.py` is not needed because the overall structure maps cleanly
once the adapters exist.

Recommended structure:

```
plyknot-patent-fto/
  patent_fto/          ← new adapter package
    coverage.py        ← directed_subset_check (canvas patch 4, workspace-local)
    decompose.py       ← thin wrapper: LLM call → parse_decomposition_response → build_graph
    stabilise.py       ← local stabilise(): N-ordering reconciliation over completed extractions
    index.py           ← build_index_from_extractions() adapter for grounding.build_grounding_index
```

Each adapter is 20–40 lines. The framework modules themselves need no changes.
Blockers 4, 5, 7, 8 are one-liners in the adapter or direct fixes in the stub files.
