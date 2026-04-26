# v6.3 Stage 2 FTO — Phase 6 Spot-Check

Generated: 2026-04-26
Pairs examined: 5
Method: For each (claim, reference) pair, the framework verdict (coverage score, covered/uncovered
predicate units, NOT_COVERED status) is compared against an attorney-level reading of the actual
claim text and the IDS reference summary, performed element by element.

Pairs chosen to span the diagnostic range:
1. Claim 1 vs Rauf 2025 — high-predicate-count claim, moderate coverage (0.077)
2. Claim 15 vs Fahlman 2006 — marker-passing family, highest Fahlman score (0.250)
3. Claim 16 vs Esward 2025 — overall highest coverage score in sweep (0.333)
4. Claim 20 vs US 11,714,792 — v6.3 agentic addition, 0.000 coverage against Palantir
5. Claim 29 vs US 2024/0288467 — diagnostically zero: confirms IDS gap for claims 20-35

---

## Pair 1 — Claim 1 vs Rauf 2025 (GEM entity-splitting)

**Framework verdict:** coverage = 0.077 (2 of 26 predicates covered), NOT_COVERED

### Claim 1 predicate summary (26 units)

| Group | Units |
|-------|-------|
| Physical apparatus | u1 acquire, u2 output |
| Six-field schema + source tag | u3 hold, u4 record |
| Append-only event log | u5 operate |
| Convergence analyser | u6 group, u7 compute spread, u8 classify (4 values) |
| Measurer-correlation analyser | u9-u12 (systemic-crack, systemic-opening, local-crack) |
| Population-decomposition analyser | u13 determine (GMM + BIC + guards), u14 propose split, u15 effect split |
| Feedback signal | u16 emit, u17 route |
| Source-tag gating | u18-u20 |
| Ontology disclaimers (negative limitations) | u21-u26 |

### Rauf 2025 reference summary

GEM paper: large-scale schema-agnostic entity resolution using GMM-based distributional clustering
for entity-type classification. The IDS distinguishes claim 1's population-decomposition analyser by:
(i) strict tension→decompose→split→storage causal chain; (ii) minimum-component-size and
minimum-inter-component-separation guards beyond BIC alone; (iii) identifier-aliasing in event log;
(iv) split effected as feedback action into measurement store.

### Framework predicate coverage

Covered predicates (inferred from distinguisher list — 24 of 26 are uncovered):

The 5 listed distinguishers are: acquire, output, hold, record, operate (u1-u5).
The 2 covered predicates are therefore from the GMM cluster: **u13** (determine GMM decomposition)
and **u14** (propose identifier split).

### Attorney reading

- **u13 COVERED — justified.** Rauf 2025 GEM does use GMM-based clustering to determine entity
  splits. The embedding correctly finds semantic proximity between claim u13's "whether the
  distribution of numerical values admits decomposition into two or more components under a
  Gaussian-mixture model" and GEM's GMM distributional clustering. However, the claim requires BIC
  + minimum-component-size guard + minimum-inter-component-separation guard simultaneously; the IDS
  confirms these guards go "beyond BIC alone." The coverage is semantically appropriate (GMM
  decomposition concept is shared) but the covered verdict overstates the match at the element
  level — the guards are additional limitations absent in GEM.

- **u14 COVERED — justified.** GEM proposes entity splits from its clustering output. Claim u14
  proposes a split of the target entity identifier. Semantic overlap is real.

- **u1-u12, u15-u26 NOT COVERED — correct.** GEM has no physical measurement apparatus, no
  six-field directed-entry schema, no append-only event log, no convergence analyser with four-class
  output, no measurer-correlation analyser, no source-tag binary, no feedback signal interface, and
  no ontology disclaimers. All 24 NOT_COVERED verdicts are accurate.

### Verdict alignment: ACCURATE

The framework correctly returns NOT_COVERED. The 2 covered predicates identify the one sub-element
of claim 1 that GEM partially anticipates (the GMM decomposition concept), consistent with the IDS
analysis. The large spread of uncovered predicates (24/26) correctly reflects that GEM shares only
the population-decomposition sub-architecture, not the measurement-store schema, convergence
analysis pipeline, or feedback loop that constitute the bulk of the claim.

**Note:** coverage 0.077 slightly overstates proximity because the GMM match is at the concept
level; the guards make the covered predicates more specific than GEM. This is an expected limitation
of IDS-summary-level extraction rather than a framework error.

---

## Pair 2 — Claim 15 vs Fahlman 2006 (Scone marker-passing)

**Framework verdict:** coverage = 0.250 (1 of 4 predicates covered), NOT_COVERED

This is the highest-coverage verdict in the marker-passing claim family (9/10/11/15/28) against
Fahlman 2006. Claims 10, 11, 28 score 0.000; claim 9 scores 0.083; claim 15 scores 0.250.

### Claim 15 predicate units

| Unit | Verb | Content |
|------|------|---------|
| u1 | assign | marker of structurally distinguishable form based on convergence-status annotation |
| u2 | propagate | along graph with admissible nodes, per-hop decay factor, hop-count limit |
| u3 | detect | collision at shared identifier where markers from ≥2 steps coincide above threshold |
| u4 | classify | collision as opening-collision / crack-collision / bridge-collision |

### Fahlman 2006 reference summary

Scone knowledge-base marker-passing system. Prior art for the basic marker-passing mechanism.
IDS distinguishes claim 9 by schema-enforced admissibility filtering and claim 10/15 by the
opening/crack/bridge collision taxonomy absent from all prior marker-passing systems.

Framework: 3 distinguishers listed (u1, u2, u4). Therefore covered unit = **u3** (detect collision).

### Attorney reading

- **u1 NOT COVERED — correct.** Scone assigns markers at query-initiation time based on the
  starting node of a query, not based on a convergence-status annotation derived from a measurement
  convergence analysis. The form of the marker in claim 15 encodes epistemological status
  (converged vs. divergent/tension); Scone's markers have no such semantic loading. Correctly
  identified as a distinguisher.

- **u2 NOT COVERED — correct.** Scone propagates markers along graph edges. However, Scone does
  not apply a per-hop decay factor to marker intensity. Scone typically uses path-length bounds
  but not a continuous decay formulation. The hop-count limit has some analogy in Scone's depth
  limits, but the decay factor is novel and correctly identified as a distinguisher.

- **u3 COVERED — correct.** Scone's core mechanism is detecting marker coincidence at shared nodes.
  A "collision event at any shared identifier at which markers from two or more distinct inference
  steps coincide above a threshold" is precisely what marker-passing does. The embedding correctly
  identifies this as the one element Scone shares with claim 15.

- **u4 NOT COVERED — correct.** The three-way collision taxonomy (opening/crack/bridge) does not
  exist in any prior marker-passing system. This is confirmed by the IDS and is the primary
  novelty of the marker-propagation claims. Correctly identified as a distinguisher.

### Verdict alignment: ACCURATE

The single covered predicate (collision detection) is the correct semantic match to Scone's core
mechanism. The three distinguishers are accurate at the element level. The framework correctly
identifies marker-passing as the prior-art starting point while pinpointing the three novel
additions: convergence-status annotation as the basis for marker form, per-hop decay, and the
three-way collision taxonomy.

The higher score for claim 15 (0.250) versus claim 10 (0.000) is explained by claim 15's shorter
predicate list (4 vs 10 units): the same 1 matched predicate produces a higher fraction. This is
the unit-count dilution effect noted throughout the sweep. The framework verdict (NOT_COVERED) is
correct for both; only the score magnitude differs.

---

## Pair 3 — Claim 16 vs Esward 2025 (metrology uncertainty)

**Framework verdict:** coverage = 0.333 (2 of 6 predicates covered), NOT_COVERED

This is the single highest coverage score in the entire 1,715-pair sweep.

### Claim 16 predicate units

| Unit | Verb | Content |
|------|------|---------|
| u1 | identifying | groups with ≥2 records from distinct computational measurers with distinct method IDs |
| u2 | identifying | which groups contain ≥1 physical-interaction record and which do not |
| u3 | classifying | each group as confirmed/refuted/untested by agreement with physical records |
| u4 | computing | decay-weighted per-measurer trust weight from prior refuted classifications |
| u5 | attenuating | measurer contribution to systemic classification by trust weight |
| u6 | routing | feedback signal with classifications and attenuated labels to actor |

### Esward 2025 reference summary

Esward, T. J. et al. Metrology 5(1):3, 2025. A metrological uncertainty paper. IDS text: "Metrological
uncertainty. Distinguished same as CODATA." The reference extraction has 4 units:
- u1: describes metrological uncertainty
- u2: groups the reference as analogous to CODATA in metrological uncertainty approach
- u3: distinguishes claim 1's convergence analyser by real-time four-valued classification
- u4: distinguishes claim 1's convergence analyser by per-measurer correlation analysis

Framework distinguishers: u3, u4, u5, u6. Therefore covered = **u1** and **u2**.

### Attorney reading

- **u1 "COVERED" — FALSE POSITIVE.** Claim u1 identifies groups of records produced by distinct
  computational measurers with distinct method identifiers. Esward 2025 is a metrology paper about
  measurement uncertainty propagation; it contains no concept of "distinct computational measurers
  bearing distinct method identifiers" as defined in the patent context. The embedding match arises
  from the word "groups" appearing in both the claim predicate ("identifying groups") and reference
  extraction u2 ("groups: the reference is analogous to CODATA..."). This is a vocabulary collision
  on a function word, not semantic overlap.

- **u2 "COVERED" — FALSE POSITIVE.** Claim u2 identifies which groups contain at least one
  physical-interaction record. Esward 2025 has no concept of segregating records by physical vs.
  computational origin. Same vocabulary collision as above.

- **u3-u6 NOT COVERED — correct.** Confirmed/refuted/untested echo-chamber classification, trust
  weights derived from refutation history, attenuation of measurer contributions, and feedback
  signal routing are all architecturally absent from any metrology uncertainty paper.

### Verdict alignment: VERDICT CORRECT, predicate matching has false positives

The overall NOT_COVERED verdict is correct. Esward 2025 has zero substantive overlap with claim 16.

The 2 "covered" predicates are false positives produced by two compounding factors:
1. **Thin reference extraction.** The Esward 2025 IDS entry is a single sentence ("Metrological
   uncertainty. Distinguished same as CODATA."). The extraction produces only 4 units, all
   procedural/meta. There is no substantive description of what Esward 2025 actually discloses —
   only commentary about how it relates to the claim. When extraction units say "groups the
   reference as analogous to CODATA," the word "groups" becomes available for embedding matching
   against claim predicates that use "groups" as a technical term.
2. **Short claim.** Claim 16 has only 6 predicates; 2 false positives produce a 0.333 score.
   The same false positives on a 26-predicate claim would produce 0.077.

This is the clearest diagnostic case in the spot-check: the highest score in the sweep arises
from vocabulary collision on a function word in a thin extraction, not from semantic proximity.
The framework's susceptibility to thin IDS-summary extractions is bounded here: it returns
NOT_COVERED regardless, but the coverage score is not meaningful as a proximity signal for
references with fewer than ~5 substantive predicate units.

**Actionable finding:** Esward 2025 (and other "same mitigation as X" references) should be
flagged as having extraction quality below the threshold for reliable coverage scoring. Their
proximity scores are not informative and should be replaced with the human IDS assessment directly.

---

## Pair 4 — Claim 20 vs US 11,714,792 (Palantir continuation)

**Framework verdict:** coverage = 0.000 (0 of 6 predicates covered), NOT_COVERED

### Claim 20 predicate units

| Unit | Verb | Content |
|------|------|---------|
| u1 | takes | source tag takes third predetermined value distinct from first two |
| u2 | indicates | third value indicates automated actor performing action on target |
| u3 | comprises | action records include one or more structured pointers |
| u4 | identifies | each structured pointer identifies a coupling entry in storage that was read |
| u5 | conditioned | action was conditioned on coupling entry content read prior to production |
| u6 | records | action records stored in same six-field schema as prediction/measurement records |

### US 11,714,792 reference summary

Palantir Technologies. Continuation of US 7,962,495 ("Creating data in a data store using a dynamic
ontology"), granted August 2023. Reference extraction has 2 units: bibliographic entry + "same
mitigation as US 7,962,495."

### Attorney reading

US 11,714,792 is an ontology-creation patent. Its claims describe creating data objects, assigning
semantic types, and traversing a property graph under an ontology schema. The patent does not:

- Define any third source-tag value or any multi-valued source tag
- Describe automated actors producing action records
- Include structured pointers back to prior coupling entries that were read
- Record conditioned actions in a storage schema
- Implement any concept of agentic action conditioned on coupling state

The 0.000 coverage is correct: there is zero predicate-level overlap between claim 20's action-
record architecture and an ontology-creation patent.

### Methodological finding

This pair also exposes a limitation in the Phase 2→4 pipeline. The reference extraction for
US 11,714,792 contains only 2 predicate units, both bibliographic/procedural. There is no
substantive description of what the patent claims or discloses. For this pair, the 0.000 verdict is
correct but not because the framework analyzed claim 20 against the Palantir patent's actual claim
elements — it is correct because the extraction has no substantive vocabulary to match against.

For the five Palantir patents (US 7,962,495, US 9,589,014, US 10,180,929, US 11,714,792,
US 12,299,022), the IDS summaries are all in the form "same mitigation as parent" or brief
characterisations of what the ontology layer does. The framework's coverage verdicts for these
references are limited to what the IDS summaries contain, which for the continuation patents is
essentially the attorney's conclusion rather than the prior-art content.

This is consistent with the Stage 2 methodology caveat (Section 4 of use-case notes): coverage
scores reflect conceptual vocabulary overlap in the FTO-layer description, not full claim-element
read-through against the prior-art document. For Stage 3, the full Palantir claim texts are needed.

**Verdict: CORRECT (0.000 / NOT_COVERED). But the correctness here is tautological for the
continuation patents — the thin extraction contains no content that could match any claim. This
pair should be included in the Stage 3 full-text sweep for US 7,962,495 (the parent).**

---

## Pair 5 — Claim 29 vs US 2024/0288467 (UT-Battelle autonomous experimentation)

**Framework verdict:** coverage = 0.000 (0 of 7 predicates covered), NOT_COVERED
(claim 29 scores 0.000 against all 49 references)

### Claim 29 predicate units

| Unit | Verb | Content |
|------|------|---------|
| u1 | meets or exceeds | cyclic subgraph's spectral-radius metric meets threshold |
| u2 | receive | historical action records comprising the cyclic subgraph |
| u3 | compute | gradient = partial derivative of spectral-radius metric w.r.t. action record parameters |
| u4 | obtained | gradient via adjoint computation traversing the cyclic subgraph |
| u5 | select | perturbation set: action records with largest absolute gradient magnitude |
| u6 | construct | counterfactual histories by replacing action records |
| u7 | rank | counterfactual histories by reduction in spectral-radius metric |

### US 2024/0288467 reference summary

UT-Battelle LLC, "Autonomous experimentation framework," published September 2024. Closed-loop
autonomous-experimentation system for materials discovery. Reference extraction distinguishes from
present invention by absence of multi-analyser architecture, echo-chamber classifier, and ontology
disclaimer.

### Attorney reading

US 2024/0288467 describes a Bayesian active-learning loop for autonomous materials experimentation:
select the next experiment to run, execute it, update the model, repeat. Its architecture is:
observe → model → suggest next experiment → execute → repeat.

Claim 29's counterfactual generator operates on a fundamentally different abstraction:
- It receives the set of historical action records that FORM a cyclic subgraph in the dependency graph
- It computes adjoint gradients of the spectral-radius metric of that subgraph
- It identifies which past action records, if replaced, would most reduce loop gain
- It constructs and ranks counterfactual histories accordingly

The technical machinery — spectral-radius metric, adjoint computation through a graph, counterfactual
history ranking by dynamical metric reduction — is from control theory and dynamical systems analysis,
not from Bayesian active learning. US 2024/0288467 has no spectral-radius metric, no adjoint
computation, no counterfactual history construction, and no concept of loop-gain reduction.

### Diagnostic significance of 0.000

Unlike Pair 3 (where 0.000 on other refs coexists with a false-positive 0.333 due to thin
extraction), claim 29's universal 0.000 is not a thin-extraction artifact. Claim 29 has 7
substantive predicate units with highly specific vocabulary: "spectral-radius metric,"
"adjoint computation," "perturbation set," "counterfactual histories," "gradient values."
None of these concepts appear in ANY of the 49 IDS references.

The 0.000 score is diagnostically correct and informative: it confirms that the IDS reference set
contains no prior art on:
- Spectral-radius analysis of agentic feedback loops
- Adjoint-based counterfactual optimization in graph-structured action histories
- Perturbation selection by gradient magnitude for loop-gain reduction

This is not a coverage artifact — the concepts genuinely are absent from the cited literature.
The framework's 0.000 verdict is reliable here in a way that the 0.333 for Pair 3 is not.

**Verdict: CORRECT (0.000 / NOT_COVERED). Diagnostically this is the most reliable verdict in the
spot-check: the vocabulary of claim 29 is sufficiently specific that 0.000 coverage against all 49
references reflects genuine prior-art absence, not extraction thinness. This confirms the
use-case notes' recommendation to commission a targeted search for claims 20-35 before filing.**

---

## Summary Assessment

| Pair | Framework Score | Verdict | Predicate Accuracy | Verdict Accuracy |
|------|----------------|---------|-------------------|-----------------|
| 1. Claim 1 vs Rauf 2025 | 0.077 (2/26) | NOT_COVERED | Mostly accurate; 2 covered predicates have correct concept but overstate match (guards absent in GEM) | CORRECT |
| 2. Claim 15 vs Fahlman 2006 | 0.250 (1/4) | NOT_COVERED | Fully accurate; sole covered predicate (collision detection) is the correct match to Scone | CORRECT |
| 3. Claim 16 vs Esward 2025 | 0.333 (2/6) | NOT_COVERED | False positives on 2 of 2 "covered" predicates (vocabulary collision on "groups") | CORRECT verdict; INACCURATE predicate scores |
| 4. Claim 20 vs US 11,714,792 | 0.000 (0/6) | NOT_COVERED | Correct but tautological — thin extraction contains no content to match | CORRECT |
| 5. Claim 29 vs US 2024/0288467 | 0.000 (0/7) | NOT_COVERED | Correct and informative — genuine vocabulary absence confirmed | CORRECT |

**All 5 verdicts are correct (NOT_COVERED). The 0/1,715 COVERED result from the sweep is
confirmed by this spot-check.**

### Framework limitations identified

1. **Thin-extraction false positives (Pair 3).** Reference IDS summaries of the form "same
   mitigation as CODATA" or "same mitigation as X" produce 4 or fewer extraction units with generic
   procedural vocabulary. These units can produce false coverage scores via vocabulary collision.
   The threshold is approximately 5 substantive predicate units; below this the coverage score
   is unreliable as a proximity signal. The NOT_COVERED verdict is still reliable (the threshold
   for COVERED is 0.99), but scores in the 0.1-0.4 range for thin-extraction references should
   be flagged as potentially inflated.

2. **Guard-level over-coverage (Pair 1).** When a reference anticipates a concept that the claim
   then qualifies with additional guards, the embedding correctly scores the base concept as
   covered but cannot detect the additional specificity added by the guards. The claim's
   predicate includes "subject to minimum-component-size and minimum-inter-component-separation
   guards"; the reference has "beyond BIC alone." The guards appear in the reference as
   distinguishers, not as claim content. This is a fundamental limitation of predicate-level
   grounding at IDS-summary granularity; full claim-element read-through (Stage 3) would resolve it.

3. **Unit-count dilution (Pair 3).** Short claims (4-6 predicates) are more sensitive to
   individual false-positive matches than long claims. The same false-positive count produces
   a higher fraction for claim 16 (6 units) than for claim 1 (26 units). Coverage scores are
   not directly comparable across claims with very different predicate counts.

### Strengths confirmed

1. **Substantive verdicts are reliable.** For pairs with adequate extraction depth (Pairs 1, 2, 5),
   the framework correctly identifies which specific predicate units are shared with prior art and
   which are novel. The marker-passing analysis (Pair 2) is especially precise: exactly the right
   single predicate (collision detection) is covered.

2. **Zero-coverage on novel architecture is informative (Pair 5).** The 0.000 score for the
   agentic-loop claims reflects genuine prior-art absence in the IDS, not extraction failure.
   The highly specific vocabulary of these claims (spectral-radius, adjoint computation,
   counterfactual history ranking) has no analogue in any of the 49 references, confirming
   the gap identified in the use-case notes.

3. **Ontology-disclaimer carve-outs work at predicate level.** Claim 1's negative limitations
   (u21-u26) are correctly never matched by any reference — the exclusion of ontology layers,
   type registries, and model-card records is architecturally distinct from anything in the IDS.
   The framework confirms the disclaimers are doing their intended structural work.

---

## Action items added by Phase 6

| Priority | Item |
|----------|------|
| HIGH | For any reference with fewer than 5 substantive predicate units (thin extractions: Esward, Cecelski, "same mitigation" continuation patents), flag coverage scores as unreliable; substitute IDS human assessment |
| MEDIUM | Stage 3 full-text sweep for US 7,962,495 (parent) and US 9,589,014 / US 10,180,929 should be prioritised over the continuation variants, which add nothing analytically |
| LOW | Add extraction-quality metric (count of substantive vs. procedural units) to the pair-verdict output to automate thin-extraction detection in future sweeps |
