# Stage 3 API Discovery Report

Generated: 2026-04-26
Working directory: `plyknot-com/plyknot-patent-fto/`
(Note: spec references `aponomy/plyknot-com/plyknot-patent-fto/` — stale path. Actual location is `plyknot-com/plyknot-patent-fto/`.)

---

## Pre-flight Summary

| Check | Result |
|---|---|
| `import plyknot` | `/Users/klas.ehnemark/Github/plyknot-workspace/plyknot/plyknot/__init__.py` |
| `outputs/extractions/` | 85 files present |
| `outputs/v63-stage2-pair-verdicts.json` | Present |
| `outputs/v63-stage2-fto-report.md` | Present |
| `outputs/v63-stage2-spot-check.md` | Present |
| Patent v6.2 claim ladder | Present |
| Patent v6.3 additions | Present |
| IDS list | Present |
| `plyknot/*.py` | 38 modules |

All pre-flight checks pass.

---

## 1. `guided_extraction.py`

### `extract_unconditioned`

```python
def extract_unconditioned(
    text: str,
    schema: ExtractionSchema = DEFAULT_SCHEMA,
    model: str = 'claude-haiku-4-5-20251001',
    temperature: float = 0.3,
) -> list[PredicateExtraction]:
```

**Status: VERIFIED.** Matches spec assumptions exactly.

Returns `list[PredicateExtraction]`. Each `PredicateExtraction` has a computed `pattern_id` property:
```python
@property
def pattern_id(self) -> str:
    return f"{self.verb}:{self.content}".lower().replace(' ', '_')
```

### `extract_conditioned`

```python
def extract_conditioned(
    text: str,
    context_anchors: dict[str, float],
    schema: ExtractionSchema = DEFAULT_SCHEMA,
    model: str = 'claude-haiku-4-5-20251001',
    temperature: float = 0.3,
) -> list[PredicateExtraction]:
```

**Status: VERIFIED.** `context_anchors` is `dict[str, float]` as spec assumes. Returns `list[PredicateExtraction]`.

The anchors are formatted into the prompt as:
```
Known measurements about this subject:
  - {key}: {value}
```
They constrain interpretation but do not override what the text says.

### `blend_extractions`

```python
def blend_extractions(
    unconditioned: list[PredicateExtraction],
    conditioned: list[PredicateExtraction],
    guidance_scale: float = 0.5,
) -> list[GuidedValue]:
```

**Status: VERIFIED.** Returns `list[GuidedValue]`. `GuidedValue` has `guidance_delta: float` = `|conditioned - unconditioned|` per `pattern_id`. Spec assumption confirmed.

### Simulated variants

**Status: VERIFIED.**
- `extract_unconditioned_simulated(text, ground_truth, noise_level=0.15)` — exists at line 644.
- `extract_conditioned_simulated(text, context_anchors, ground_truth, noise_level=0.10, anchor_pull=0.3)` — exists at line 673.

### `ExtractionSchema`

**Status: VERIFIED with MISMATCH (minor).** The dataclass exists and custom schemas can be passed.

Default predicate categories: `['see', 'hear', 'feel', 'touch', 'think', 'know', 'want', 'believe', 'say']`.

**Mismatch:** This vocabulary targets human perception text, not patent/technical text. The Stage 2 cached extractions used `DECOMPOSITION_PROMPT` from `predicate_decomposition.py` with categories `observation | inference | evaluative | causal`. The two vocabularies are not identical.

**Effect on Lexical Forcing:** When `context_anchors` are built from Stage 2 claim 1 predicates (e.g. `"know:convergence_across_measurers": 1.0`), those anchors will be present in the conditioned prompt, influencing what cognitive predicates the LLM finds in the prior art text. Both unconditioned and conditioned passes use the same schema, so `blend_extractions` sees compatible inputs. The `guidance_delta` (Lensing Strain) correctly captures how much the claim vocabulary changes what predicates are surfaced.

**Adapter for Step 3a.2:** No adapter needed. Accept that Lexical Forcing operates at the cognitive predicate level. The blend delta is a valid signal even if the vocabulary does not exactly mirror Stage 2's DECOMPOSITION_PROMPT vocabulary.

---

## 2. `predicate_decomposition.py`

### `PredicateUnit`

```python
@dataclass
class PredicateUnit:
    id: str
    unit_type: UnitType         # 'observation'|'inference'|'evaluative'|'causal'
    verb: str
    content: str
    intensity: float = 0.5
    depends_on: list[str] = field(default_factory=list)
    source_text: str = ''
    epistemological_route: str = ''  # 'measure' or 'predict'
```

**Status: `depends_on` EXISTS but type is `list[str]`, NOT `list[int]`.**

The `depends_on` contains local unit IDs like `["u1", "u2"]` — sequential labels assigned within the decomposition of a single document. They are NOT integer registry IDs from the DEP registry.

**Phase 8 adapter:** Use the degenerate fallback as specified. Build a workspace-level integer dictionary that maps predicate strings to unique integers (starting above DEP registry range, e.g. 10000+). Each predicate becomes a single-element `depends` list pointing to its own integer ID. The marker passer detects collisions where two chains activate the same integer node — i.e., where two claims/references share the same predicate target. See Section 5 (Adapter Code) below.

---

## 3. `marker_passing.py`

### `MarkerSource`

```python
@dataclass
class MarkerSource:
    label: str
    chain_entity: str
    type: str               # 'crack' | 'solid'
    complexity_levels: set[int]
    initial_strength: float
    seed_deps: list[int]
```

**Status: VERIFIED.** All 6 fields confirmed with correct types. `seed_deps` is `list[int]`.

### `run_custom_marker_passing`

```python
def run_custom_marker_passing(
    chains: list[InferenceChain],
    sources: list[MarkerSource],
    config: MarkerPassingConfig | None = None,
) -> dict:
    ...
    return {'activations': activations, 'collisions': collisions}
```

**Status: VERIFIED.** Returns `{'activations': dict[int, list[MarkerActivation]], 'collisions': list[MarkerCollision]}`. Matches spec.

---

## 4. `discovery.py`

### `find_structural_holes`

```python
def find_structural_holes(chains: list[InferenceChain]) -> list[StructuralHole]:
```

**Status: VERIFIED.** Signature matches. Returns `list[StructuralHole]`.

`StructuralHole` has fields: `from_chain`, `from_step`, `to_chain`, `to_step`, `missing_level`, `shared_deps`, `description`.

### `MarkerPassingResult`

**Status: VERIFIED.**

```python
@dataclass
class MarkerPassingResult:
    crack_connections: list[MarkerCollision]
    openings: list[MarkerCollision]
    activations: dict[int, list[MarkerActivation]]
    nodes_visited: int
    max_hops_reached: int
    cross_level_count: int
```

Both `crack_connections` and `openings` fields confirmed.

---

## 5. `monitors.py`

### `check_shear`

```python
def check_shear(
    entity_id: int,
    universe: Universe,
    shear_threshold: float = 0.3,
) -> TransitionDetected | None:
```

**Status: VERIFIED.** Signature matches spec exactly. Returns `TransitionDetected | None`.

**Behavior note:** Returns the FIRST shear detected on an entity (first property with divergence ≥ threshold). For Phase 7, call once per target predicate entity; collect all non-None results. This is correct usage — one entity-id per call.

`TransitionDetected.details` contains `measurementMean` and `predictionMean` for directional classification (Phase 7 Shear direction logic).

---

## 6. `analysis.py`

### `analyze_coupling_convergence`

```python
@detector
def analyze_coupling_convergence(
    u: Universe,
    options: dict | None = None,
) -> list[CouplingConvergence]:
    source_filter = (options or {}).get('sourceFilter')
```

**Status: VERIFIED.** `options={'sourceFilter': 'measurement'}` and `options={'sourceFilter': 'prediction'}` both supported. Combined pass uses `options=None`.

---

## 7. CRITICAL MISMATCH: `InferenceStep` validates against fixed DEP registry

**This is the only mismatch that requires explicit adapter code.**

`InferenceStep.__post_init__` calls `_validate_depends_are_operational(depends)`, which looks up each integer in the `DEPENDENCY_REGISTRY`. That registry contains exactly 69 entries — all physics and biology mechanism identifiers (DEP.LORENTZ_FORCE_LAW = 1 through DEP.EVOFORMER_ARCHITECTURE = 69).

Patent claim predicates are NOT in this registry. Constructing `InferenceStep` objects with arbitrary integer IDs (from a workspace predicate mapping) will raise `ValueError: Inference step depends on unknown dependency ID`.

Additionally, `InferenceStep` requires fields `measurements: list[Measurement]` and `challenge_cost: str` which the spec's Phase 8 construction code does not supply.

**Adapter (workspace-only, no framework modification):**

```python
# In Stage 3 workspace script — do NOT modify inference.py

def make_patent_step(claim_text, level, convergence, dep_ids):
    """Construct InferenceStep bypassing DEP registry validation.

    Used only for patent claim / prior art chains where deps are
    workspace-assigned integer IDs, not DEP registry entries.
    """
    from plyknot.inference import InferenceStep
    step = object.__new__(InferenceStep)
    step.claim = claim_text
    step.level = level
    step.complexity_level = 5          # all patent claims = social/linguistic level
    step.measurements = []             # patent claims have no measurement objects
    step.convergence = convergence
    step.depends = dep_ids             # workspace integers, not DEP constants
    step.challenge_cost = ''
    step.sigma_tension = None
    return step


# Workspace predicate integer registry (above DEP range 1-69)
_PREDICATE_INT_REGISTRY: dict[str, int] = {}
_PREDICATE_INT_COUNTER = 10000

def predicate_to_int(predicate_string: str) -> int:
    """Assign a stable integer ID to a predicate string for marker passing."""
    global _PREDICATE_INT_COUNTER
    if predicate_string not in _PREDICATE_INT_REGISTRY:
        _PREDICATE_INT_REGISTRY[predicate_string] = _PREDICATE_INT_COUNTER
        _PREDICATE_INT_COUNTER += 1
    return _PREDICATE_INT_REGISTRY[predicate_string]
```

The marker passer (`_build_dependency_index`, `_propagate`, `_detect_collisions`) only uses integers to match nodes — it does not call `lookup_dependency`. The bypass is safe.

---

## 8. `InferenceStep` level assignment for patent claims

`InferenceStep.level` must be one of `'signal' | 'measurement' | 'pattern' | 'model' | 'hypothesis'`.

For patent claims, use the following mapping based on `PredicateUnit.unit_type`:
- `observation` → `'measurement'`
- `inference` → `'model'`
- `evaluative` → `'hypothesis'`
- `causal` → `'pattern'`

`complexity_level = 5` for all (social/linguistic level per spec).

---

## Decision: Verified, proceed with adapters

All primitives needed by Stage 3 are present. No primitive is missing. Three minor adapters are needed in workspace code:

| Adapter | Location | Size |
|---|---|---|
| `make_patent_step()` — bypass `InferenceStep.__post_init__` | Stage 3 script | ~15 lines |
| `predicate_to_int()` — workspace integer registry for predicate strings | Stage 3 script | ~10 lines |
| Custom `ExtractionSchema` for guided extraction (optional) | Stage 3 script | ~5 lines |

None modifies framework code. All are self-contained in the Stage 3 workspace script.

**Proceed to Step 3a.2.**
