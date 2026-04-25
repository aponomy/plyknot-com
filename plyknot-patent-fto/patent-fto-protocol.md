# Patent-FTO protocol

*Synthesis document for the Plyknot patent freedom-to-operate workspace. Captured April 25, 2026, after three rounds of adversarial critique with Gemini sharpened the architecture from a continuous-distance sketch to a structurally grounded boolean-primary measurement model with conditional secondary continuous tests.*

*This document is the single authoritative source for patent-FTO architecture, commercial positioning, and the proof-of-concept argument. General architectural principles that emerged through this work (two-tier measurement, Generator-Measurer Separation, trust-weight refinement for stochastic errors) are documented in `canvas-architecture-design.md` patches and cross-referenced here rather than duplicated.*

## Purpose

Patent prosecution is a measurement-convergence problem. Every claim is a target. Every cited prior-art reference is an instrument that reads on the claim to some degree. Multiple measurers — LLMs across vendor families, embedding models, eventually human attorneys and the PRV examiner — produce coupling entries reporting how strongly each prior-art reference reads on each claim, broken down to per-element granularity.

The patent-FTO workspace at `plyknot-patent-fto/` (in `aponomy/plyknot-com`, private repository) operationalises this. The same `Universe`, `measure()`, `predict()`, `analyzeMeasurerCorrelation()`, and `discovery` machinery that handles physics, structural biology, medical imaging, and computational materials handles patent claims as targets without modification. The patent-domain layer is a thin set of factories, properties, and methods.

Two practical outcomes:

First, the patent application that protects the framework is FTO-cleared *using* the framework. The §4.x specification embodiments lock forward-protection on legal-tech applications under § 8 / EPC Art. 83 enablement at filing time.

Second, "Epistemic FTO" becomes a commercial product line. Other patent applicants in software, ML, and digital-twin spaces — particularly those facing Palantir-adjacent prior-art landscapes — are exactly the customer profile.

## The structural mapping

| Plyknot primitive | Patent-domain analog |
|---|---|
| Entity | Patent claim, prior-art reference, distinguisher passage, or claim element |
| Property | Per-element disclosure status, functional equivalence, eligibility score, antecedent-basis verdict |
| Measurer | LLM with vendor + methodology depends; embedding model; human attorney; PRV examiner |
| `measure()` | Post-extraction verdict on whether reference R discloses element e of claim C |
| `predict()` | Pre-filing FTO claim of novelty before examiner contact |
| `depends` | Substrate components the measurer embodies (tokenizer, alignment, training corpus, methodology) |
| ● Converged | Multi-substrate agreement element is absent or present |
| ◐ Tension | Measurers disagree; highest-leverage attorney-review spot |
| ◆ Crack | All measurers agree the element is disclosed (or functionally equivalent) → must amend |
| ◈ Opening | Element survives both anticipation and obviousness tiers across all references |
| Structural absence | Element is not disclosed in the reference — the primary distinguisher signal |

The mapping is structural, not analogical. Patent prosecution exhibits genuine convergence and divergence across measurers, exhibits echo chambers (within-vendor LLM clustering inflating apparent novelty), exhibits speciation (claim language with multiple structural readings under different extraction prompts), and admits eventual ground truth through examiner verdicts. Same primitives, different domain.

## Measurer panel

The measurer panel is structured around adversarial-persona diversity. Each persona is an `(LLM, methodology framing, RAG retrieval index)` triple. The substrate `depends` declaration records the LLM-vendor substrate (tokenizer, alignment, training corpus) and a higher-level cross-vendor floor:

```
LLM_SHARED_SUBSTRATE = (
    'LLM_General_Internet_Corpus',
    'LLM_Instruction_Following_RLHF',
    'LLM_Common_Crawl_Convergence',
)
```

This floor is critical. Any agreement at *only* this level is recognised as substrate-driven, not as independent confirmation. The within-vendor / cross-vendor structure from Satellite 6 layers on top.

The minimum panel for a serious pre-filing FTO is six personas:

- `opus-4.7-as-EPO-examiner` — Anthropic substrate, EPO Problem-Solution methodology
- `gemini-2.5-pro-as-EPO-examiner` — Google substrate, same methodology (cross-substrate confirmation on EPO posture)
- `gpt-5-as-USPTO-examiner` — OpenAI substrate, KSR framework (for the parallel USPTO provisional)
- `opus-4.7-as-PRV-examiner` — Anthropic substrate, Swedish PRV practice (primary for the home filing)
- `opus-4.7-as-Palantir-litigation-counsel` — Anthropic substrate, adversarial invalidity posture
- `gemini-2.5-pro-as-Palantir-litigation-counsel` — Google substrate, same posture (cross-substrate confirmation on litigation read)

Embedding measurers (BGE, OpenAI, Cohere) supplement but never render verdicts alone. They are heuristic prioritisation signals for which (element, reference) pairs deserve the rigorous LLM panel.

### RAG retrieval lives in `method`, not `depends`

Per the Gemini-round-3 critique: RAG injection is data-via-context-window, not a different reasoning engine. Two `opus-with-different-RAG` measurements are the same model agreeing with itself across two prompts — not two substrate-independent measurements. The framework's existing `method` field on coupling entries is the correct home for retrieval-grounding identifiers (`epc_guidelines_rag_v1`, `mpep_rag_v1`, etc.). The `depends` declaration stays clean and tracks only architecturally embodied substrate.

The substrate-overlap analysis correctly reports two opus measurements with identical substrate as fully overlapped regardless of which RAG index they used. Methodological diversity through RAG is real and useful, but it is not substrate independence.

## Two-tier verdict structure

Per the Gemini-round-2 critique: anticipation (EPC Art. 54 / § 102) is an all-elements boolean test; obviousness (EPC Art. 56 / § 103) is a continuous functional-equivalence test. Conflating them produces false negatives on obviousness rejections.

The verdict structure is strictly two-tier. (See `canvas-architecture-design.md` patch on two-tier measurement for the general pattern; this is the first concrete instantiation.)

**Tier 1 — Anticipation.** For each (element, reference) pair, every persona answers: "Does this reference disclose this element?" → 0.0 or 1.0. Convergence on 1.0 across the panel = element disclosed. Convergence on 0.0 = element absent. Spread across the panel = ◐ tension on the disclosure question.

A claim is anticipation-safe iff at least one element converges absent across all cited references.

**Tier 2 — Obviousness.** Triggered automatically on every element that survives Tier 1 (i.e., absent literal disclosure, low spread). Each persona answers: "Does this reference disclose something that performs substantially the same function, in substantially the same way, to yield substantially the same result?" → continuous [0.0, 1.0]. Threshold ~0.6 marks the inventive-step boundary; tune via patentombud calibration over time.

A claim is obviousness-safe iff every Tier-1-absent element scores below 0.6 on Tier 2 across the cited reference (or across any combinable subset for KSR-style combination obviousness).

**Verdict aggregation.** Per claim, per cited reference, the system reports: `anticipation_risk` (fraction of elements disclosed), `obviousness_risk` (fraction of absent elements with functional equivalents), distinguisher set (elements absent on both tiers), and tension set (elements at ◐ on either tier). The tension set is the attorney-review priority; the distinguisher set is the load-bearing element list the specification must enable under § 8.

## Generator-Measurer Separation (GMS)

When LLMs are used both to generate claim text (predict) and to evaluate it (measure), their substrate `depends` must be disjoint. This is a hard architectural rule.

Concrete application: repulsive broadening (the inverse-Lensing optimisation that uses prior art as a repulsive anchor to find maximum defensible claim breadth) is split across families. If Opus proposes the broader formulation, only Gemini-Pro and Cohere-embedding measure the distance to cited art. The proposer's substrate never measures its own output.

The framework already has the substrate-overlap calculation; GMS just enforces a constraint on which measurers participate in any predict-and-measure-with-LLM pipeline. Violations are detected by the same machinery that handles echo-chamber detection. (See `canvas-architecture-design.md` patch on Generator-Measurer Separation for the general formulation.)

## Trust-weight handling for stochastic errors

LLM hallucinations on dense legal text are often stochastic — prompt-position-dependent, sampling-dependent, token-boundary-dependent. Naive trust-weight updating against stochastic errors collapses all measurer trust toward zero over time. Five-layer fix:

1. **Decompose disagreement before updating.** Every disclosure measurement is N-resampled (default N=5) at different temperatures and seeds. Within-measurer variance becomes σ. Trust updates fire only on persistent disagreement after resampling absorbs the stochastic component.

2. **Per-property and per-element-class trust, never global.** Opus carries different trust on "anticipation against software-claim references" than on "obviousness on chemical-compound elements." The submission-architecture per-property MAD envelope already supports this; the patent-FTO layer just registers element-class as the property dimension.

3. **Trust floors prevent collapse.** Configurable per-measurer (default 0.2). Below the floor, the persona still contributes to the convergence pattern as a tie-breaker but no longer to the primary verdict. Disagreement from a low-trust persona with high-trust personas is itself diagnostic.

4. **The verdict is the convergence pattern, not any one measurer.** Six personas converging on absence is a structural fact even if every individual trust score is 0.5. Trust modulates edge cases; convergence renders verdicts.

5. **Failed calibration escalates automatically.** When trust on a property class cannot converge, that class is escalated to the patentombud as ◐ tension requiring human review. Honest failure mode: the framework identifies what it cannot reliably handle.

(See `canvas-architecture-design.md` patch on trust-weight refinement for the general formulation. The five-layer structure is the resolution to the stochastic-vs-systematic distinction Gemini correctly identified.)

## Surrogate ground truth

Real ground truth (examiner verdict, court ruling) takes 2-10 years. The framework operates on surrogate ground truths that close the loop on faster timescales:

- **PRV KT-1 search** — 15,000 SEK, 4-8 weeks turnaround. Examiner-quality search output. Calibrates the LLM-persona panel against actual PRV examination practice. Recommended commission timing: post-filing, so the report becomes ammunition for the eventual office-action response.

- **Patentombud 1-2 hour review** — €400-800. High-trust verdict on the small set of ◐ tension elements the framework flags. Becomes the highest-weight measurer in the trust-weight aggregation. Recommended timing: pre-filing, scoped strictly to the framework's tension set.

- **Office-action verdicts** — 12-18 months out. Incremental ground-truth measurements that update calibration over the prosecution window.

The trust-weight loop closes against these surrogates pre-filing, with the actual examiner-verdict update happening at office-action time and beyond. Every office action is a `measure()` entry on the relevant claim elements with the highest-trust measurer in the system.

## Contingent Claim Graph

Patent claims already form a DAG: Claim 2 depends on Claim 1, Claim 5 depends on Claim 2, etc. The framework's `depends` chain machinery maps directly. Combining means the patent-FTO output is not a static clearance report but an interactive dependency graph.

When the framework flags ◐ tension on Claim 1's element 3, the Contingent Claim Graph automatically computes:

- Which dependent claims (5, 7, 12, ...) inherit that tension because they incorporate Claim 1 by reference
- Which dependent claims would survive a successful amendment (because their additional limitations distinguish independent of element 3)
- Which fallback formulations across the dependent ladder preserve the most coverage if element 3 must be amended out
- Which spec passages enable each fallback under § 8 / EPC Art. 83

Output: a pre-computed legal decision tree the patentombud uses to plan amendments before they're needed. If the PRV examiner objects to element 3 in 14 months, the response is already structured.

This is a different and better product than "FTO clearance memo." It is the natural product the framework's `depends` graph machinery produces when applied to patent claim structure. Belongs in the workspace as a core feature.

## Self-application: meta-measurement of the architecture

Per the Gemini-round-3 idea: don't write markdown about the critique rounds; ingest them as Plyknot data.

- Target: the Plyknot architecture itself (registered as an entity)
- Property: `architecture.structural_soundness`
- Measurers: Gemini, Claude (each with their own substrate `depends`)
- `measure()` entries: each Gemini critique that identified an architectural weakness, with a value reflecting severity and a method-string capturing the specific flaw
- `predict()` entries: each Claude patch aiming to resolve the identified flaw, with the resolved-reference linking to the original critique

When Gemini identifies a weakness Claude has not yet addressed, the entry sits at ◐ tension on the architecture target. Resolved patches close the tension. Persistent open entries are open architectural cracks.

The framework documents its own evolution through self-application. No additional markdown; the universe data IS the documentation. Light to maintain, structurally honest, and itself a §4.x specification embodiment locking forward-protection on framework-self-audit applications.

Implementation: ~1 hour of work post-campaign to wire the existing critique-and-patch history as actual coupling entries.

## Commercial positioning: Epistemic FTO

The customer profile is patent applicants in software, ML, computational biology, or digital-twin spaces facing Palantir-adjacent prior-art landscapes. Specifically: applicants whose claims describe ontology-mediated, action-recording, or measurement-aggregating systems, where the existing Foundry/Palantir patent portfolio constitutes a real freedom-to-operate threat.

The deliverable is not a clearance memo. It is:

- A multi-substrate per-element disclosure matrix across all cited prior art
- A two-tier verdict per claim (anticipation + obviousness)
- A Contingent Claim Graph showing fallback paths for each tension element
- A targeted patentombud-review recommendation list (the ◐ tension elements only)
- A repulsive-broadening optimisation per element showing the breadth ceiling against cited art

The framework does not replace the attorney. It concentrates attorney hours on the genuinely hard cases, specifies the precise question the attorney needs to answer, and bounds the broadening choices pre-filing. The framework's outputs become the attorney's working brief.

Pricing model (to refine post-launch): per-application engagement, scoped by claim count and prior-art reference count. Margin comes from the framework producing ~80% of the analytical work that currently occupies associate-level attorney time at €200-400/hour. The framework charges €5,000-15,000 per application and routes the patentombud's 1-2 hours of senior attorney time to the genuinely hard spots only.

Differentiation from existing patent-FTO services: existing services produce memos; the framework produces a structured coupling map that can be queried, updated as new prior art surfaces, and used directly during prosecution to generate office-action responses. The structured output is the moat.

## Proof-of-concept argument

The Plyknot patent application is the framework's first commercial-grade self-application. The argument:

- Pre-filing, the framework produces a per-element disclosure matrix and Contingent Claim Graph for the v6.3 35-claim ladder against the ~50-reference IDS landscape.
- The patentombud session is scoped only to the ◐ tension elements the framework flags. The session's outputs (the attorney's verdicts on those elements) are themselves logged as `measure()` entries and update the framework's trust-weight calibration.
- Over the 12-24 month prosecution window, every office-action verdict is logged as the highest-trust ground-truth measurement on the claims it touches.
- At grant (or final rejection), the framework's pre-filing predictions are validated against the actual prosecution outcome.

The validation criterion: of the elements the framework flagged as ◐ tension pre-filing, what fraction did the examiner actually object to during prosecution? If high (>0.7), the framework is correctly identifying the genuinely hard cases. If low (<0.3), the framework is identifying the wrong cases and the methodology needs refinement before commercial launch.

The framework's own commercial viability is on the line. This is a stronger demonstration than any scientific-domain validation because the failure mode is concrete and consequential. If the framework's pre-filing FTO map predicts the actual examiner objections, that is publishable in a legal-technology venue and pitches itself to customers.

## §4.x specification embodiment text (filing-ready prose)

The following paragraphs are drafted for inclusion in the patent specification as concrete embodiments. They lock forward-protection on the patent-FTO application under § 8 / EPC Art. 83 enablement at filing time, without disclosing the commercial product positioning beyond what enablement requires.

> **§4.16(b) — Patent-claim freedom-to-operate analysis embodiment.** In one embodiment, the disclosed system is applied to patent prosecution. Patent claims are registered as target entities. Cited prior-art references are registered as instruments. The convergence analyser classifies groups of measurement records on (claim element, prior-art reference) pairs to produce per-element disclosure verdicts. The measurer-correlation analyser surfaces echo chambers in which language-model measurers sharing tokenizer family and alignment substrate converge on claim novelty assessments while substrate-independent measurers diverge. The marker-propagation analyser traverses the claim-dependency graph to produce a contingent decision tree identifying which dependent claims survive amendment of any given element.

> **§4.16(c) — Generator-Measurer Separation in claim-broadening applications.** In a further embodiment, the disclosed system enforces disjoint substrate dependency between language-model measurers used to generate proposed claim formulations and language-model measurers used to evaluate proposed formulations against cited prior art. The convergence analyser rejects measurement records produced by measurers whose substrate-dependency declaration overlaps with the substrate-dependency declaration of the generator that produced the formulation under evaluation. This separation prevents a single language-model substrate from optimising claim text against its own evaluative blind spots.

> **§4.16(d) — Two-tier disclosure measurement embodiment.** In a further embodiment, the convergence analyser applies a tiered measurement structure to (claim element, reference) pairs. A first-tier measurement records boolean disclosure status. For each element on which first-tier measurements converge on absence, a second-tier measurement records continuous functional-equivalence status against the same reference. The verdict aggregation produces separate anticipation-risk and obviousness-risk metrics, mirroring the legal distinction between strict-rule novelty under EPC Article 54 / 35 USC §102 and obviousness rejection under EPC Article 56 / 35 USC §103.

These three embodiment passages are the minimum required prose for forward-protection. Additional embodiments (Contingent Claim Graph, repulsive broadening, RAG-grounded methodology adaptation) are described in the workspace and can be added to the spec if the patent counsel review surfaces them as load-bearing for examination response.

## What this synthesis explicitly does not cover

- Implementation details of the workspace code (lives in `aponomy/plyknot-com/plyknot-patent-fto/`)
- Patent claim text and ladder structure (lives in `docs/patent/Plyknot/v6.3/`)
- General architectural principles that emerged from this work (canvas-architecture-design.md patches)
- Training-data preparation for the eventual Epistemic FTO product launch (deferred to post-filing)
- The act-verb integration for tracking post-filing reflexive dynamics on the patent itself (deferred until act-verb code lands)

## Cross-references

- **Workspace code:** `aponomy/plyknot-com/plyknot-patent-fto/` — `entities.py`, `measurers.py`, `methods.py`, `claim_elements.py`, `obviousness.py`, `repulsive_broadening.py`, `adversarial_personas.py`, `pipeline.py`
- **Canvas architecture patches:** `canvas-architecture-design.md` (three patches: two-tier measurement, Generator-Measurer Separation, trust-weight refinement for stochastic errors)
- **Patent specification:** `docs/patent/Plyknot/v6.3/patent-specification-v6.3.md` (§4.16(b)-(d) embodiments above)
- **Prior-art landscape:** `docs/patent/Plyknot/v6.3/prior-art-list.md` and IDS spreadsheet
- **Stress-test results:** `docs/patent/Plyknot/v6.3/patent-v6.3-N2-stress-test.md` (per-claim verdicts)
- **Decision history:** git commit log on this synthesis directory and `aponomy/plyknot-com` private repository

The git log and chat transcripts are the decision log for this work. No separate decision-log file is maintained.
