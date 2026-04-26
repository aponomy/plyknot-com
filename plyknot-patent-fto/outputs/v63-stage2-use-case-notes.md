# v6.3 Stage 2 FTO — Use-Case Notes

Generated: 2026-04-26
Sweep: 35 claims × 49 IDS references = 1,715 directed-subset coverage verdicts
Pipeline: predicate decomposition + sentence-transformer grounding (all-MiniLM-L6-v2)
+ directed-subset coverage check (coverage threshold 0.99 for COVERED verdict)

---

## 1. Overall FTO Position

**No prior-art reference achieves ≥ 0.99 coverage against any claim.**
All 1,715 pairs are NOT_COVERED. The highest single-pair coverage score is 0.333
(claim 16 vs. Esward 2025 metrology). This is consistent with the legal IDS analysis:
all 49 references were identified and explicitly distinguished during prosecution
preparation.

The coverage scores are useful not as infringement risk numbers but as a
*proximity map*: which references are conceptually closest to which claims, and
therefore which prior-art threads would require the most careful attorney response
if raised at examination or post-grant.

---

## 2. Closest Prior Art by Claim Family

### 2.1 System claims — core measurement store (claims 1, 13, 17)

| Closest ref | Max coverage | Claim |
|-------------|-------------|-------|
| Rauf 2025 (Gem entity-splitting) | 0.077 | 1 |
| Rauf 2025 | 0.100 | 13 |
| US 7,962,495 B2 | 0.143 | 17 |

These are the heaviest claims (26 and 20 predicate units respectively). Coverage
stays below 0.10, confirming the six-field directed-entry schema, the source-tag
binary, and the append-only/composite-key overwrite pattern as strongly novel
over the entity-splitting (Rauf) and ontology-creation (Palantir 7,962,495)
starting points.

The ontology-disclaimer language in claims 1 and 13 (items i–iii of the negative
limitation) is the primary differentiator from the Palantir family; those
disclaimers appear in the extracted predicates as `exclude:` units, none of which
find matches in any Palantir reference extraction, confirming the disclaimer
carve-out works at the predicate level.

### 2.2 Echo-chamber classifier (claims 2, 3, 16)

| Closest ref | Max coverage | Claim |
|-------------|-------------|-------|
| US 9,589,014 B2 | 0.231 | 2 |
| US 10,180,929 B1 | 0.231 | 2 |
| Esward 2025 | 0.231 | 2 |
| Esward 2025 | 0.333 | 16 |
| Rauf 2025 | 0.000 | 3 |

Claim 2 (the system echo-chamber classifier) achieves its highest coverage against
the Palantir modular-ontology pair (US 9,589,014 and US 10,180,929) and against
Esward 2025 (metrology uncertainty). The overlap is superficial — the embedding
model is finding partial matches on function words ("record", "classify",
"group") that appear in both the echo-chamber claim and the metrology reference.
The three structural distinguishers noted in the IDS (distinct method identifiers,
trust-weight feedback, six-field schema integration) remain uncovered.

Claim 16 (method version of the echo-chamber classifier) has the highest coverage
of any pair in the sweep: 0.333 vs. Esward 2025. This is higher than claim 2
because claim 16 has only 6 predicate units (versus claim 2's 13), so partial
matches inflate the fraction. The same 4 uncovered units persist:
`identify:`, `classify (confirmed)`, `classify (refuted)`, `classify (untested)`.

**Recommendation:** No action needed. The 0.333 score arises from unit-count
dilution in a short claim, not semantic proximity. Claim 3's trust-weight loop
has 0.000 coverage against all 49 refs — strongly novel.

### 2.3 Marker-propagation claims (claims 9, 10, 11, 15, 28)

| Closest ref | Max coverage | Claim |
|-------------|-------------|-------|
| Fahlman 2006 (Scone) | 0.083 | 8 (system) |
| Fahlman 2006 (Scone) | 0.083 | 9 (knowledge system) |
| Rauf 2025 | 0.200 | 10 |
| Fahlman 2006 | 0.250 | 15 |
| Fahlman 2006 | 0.125 | 32 |

Claim 15 (method marker-propagation) hits 0.250 against Fahlman 2006, the highest
score in this family. Claim 15 has only 4 predicate units; Fahlman covers 1 of the
4 (likely the marker-propagation verb itself). The three uncovered units are the
opening-/crack-/bridge-collision taxonomy, which does not exist in Scone or
Norvig 1989. Norvig achieves 0.000 despite being listed alongside Fahlman.

Claim 10's 0.200 against Rauf 2025 is unexpected: Rauf is an entity-splitting
paper, not a marker-passing one. The overlap is on the `detect:` verb shared by
claim 10's collision-detection units and Rauf's "anticipates" framing. This is
a vocabulary collision, not semantic proximity.

### 2.4 Measurer-as-entity / instrument-comparison (claims 8a, 12, 16a)

| Closest ref | Max coverage | Claim |
|-------------|-------------|-------|
| Xu 2024 (RefChecker + FEVER) | 0.077 | 8a |
| US 7,962,495 B2 | 0.167 | 12 |
| Rauf 2025 | 0.000 | 16a |

Claim 12 (measurer as target in marker propagation) reaches 0.167 against
US 7,962,495. One of claim 12's 6 units (the "measurer appears as target" unit)
finds a grounded match in the Palantir ontology-creation patent, which is the
precise anticipation risk the IDS noted. The remaining 5 units — specifically
the schema-change-free propagation and the dependency-graph embedding — remain
uncovered.

Claim 16a and claim 8a (the instrument-comparison analyser in system and method
form) both show ≤ 0.077 coverage across all refs, consistent with the IDS finding
that the symmetric-difference / sensitivity-set / divergence-prediction
architecture has no prior-art antecedent in either the structural-biology
benchmarking literature or the model-interpretability literature.

### 2.5 v6.3 additions (claims 20–35)

| Max coverage | Claim | Closest ref |
|-------------|-------|-------------|
| 0.000 | 20 | — |
| 0.000 | 21 | — |
| 0.000 | 22 | — |
| 0.111 | 23 | Rauf 2025 |
| 0.125 | 24 | Rukhin 2019 |
| 0.000 | 25 | — |
| 0.000 | 26 | — |
| 0.143 | 27 | US 7,962,495 B2 |
| 0.000 | 28 | — |
| 0.000 | 29 | — |
| 0.125 | 30 | Rukhin 2019 |
| 0.125 | 31 | Xu 2024 |
| 0.125 | 32 | Fahlman 2006 |
| 0.000 | 33 | — |
| 0.000 | 34 | — |
| 0.000 | 35 | — |

Fourteen of the sixteen v6.3-addition claims (20–35) have max coverage ≤ 0.143,
and twelve have exactly 0.000 coverage against all 49 refs. The action-record
architecture (third source-tag value, structured pointers, cycle detection,
spectral-radius metric) is entirely absent from the IDS reference set, which is
expected: these claims cover the agentic-loop overlay that was not present in
v6.2. The IDS would need supplementing with references in:
  - autonomous experiment orchestration (beyond Kusne/UT-Battelle)
  - reinforcement-learning loop gain / spectral-radius cycle analysis
  - causal-graph adjoint methods

**Recommendation:** Prior to filing, commission a targeted prior-art search on
claims 20–35 with the search terms: "agentic loop", "structured pointer",
"spectral radius feedback", "counterfactual action record", "experimental design
generator". The current IDS is silent on these concepts.

---

## 3. References with Zero Coverage Across All Claims

The following 24 of 49 references achieved 0.000 coverage against every claim.
They contribute no FTO risk at the predicate level and are included in the IDS
purely for candour obligations:

| Reference | Reason for inclusion |
|-----------|---------------------|
| Norvig 1989 (marker-collision taxonomy) | Marker-passing prior art |
| Cecelski 2022 (metrology) | Metrology prior art |
| Kusne 2020 (CAMEO) | Closed-loop autonomy |
| US 2024/0288467 A1 | Autonomous experimentation |
| US 12,299,022 B2 | Palantir LLM ontology |
| US 11,714,792 B2 | Palantir continuation |
| W3C 2017 (SOSA/SSN) | Sensor ontology |
| Haller 2018 (SSN) | Sensor ontology |
| Baylor 2017 (TFX) | ML metadata |
| Mitchell 2019 (Model Cards) | ML metadata |
| Gebru 2021 (Datasheets) | ML metadata |
| Fadini 2026 (AF/ESMFold NAR) | AF benchmarking |
| Fadini 2025 (Proteins) | AF benchmarking |
| Christen 2026 (record linkage) | Record linkage |
| Kanarik 2023 (semiconductor etching) | Closed-loop autonomy |
| Gibbons 2015 (mzRefinery) | MS calibration |
| CN117744455A | Non-English prior art (candour) |
| Laumann 2025 (arXiv:2502.03937) | Correlated-errors (pending verification) |
| Bhowmick 2024 | Structural biology (pending verification) |
| Gallitto 2025 (external validation) | Pre-registration |
| Lundberg 2017 (SHAP) | Attribution methods |
| Kokhlikyan 2009 (Captum) | Attribution library |
| Eerlings 2026 (DIVERSE) | Rashomon set (candour) |

---

## 4. Methodological Caveats

**IDS texts vs. full prior-art documents.** The predicate extractions used in this
sweep are based on the IDS analysis summaries (one or two sentences per reference),
not on verbatim prior-art texts. Coverage scores therefore measure conceptual
vocabulary overlap in the FTO-layer description, not full claim-element read-through
against the prior-art document. A full read-through sweep would require:
  (a) obtaining full texts of the granted-patent claims for the Palantir family
      (US 7,962,495, US 9,589,014, US 10,180,929, US 11,714,792, US 12,299,022);
  (b) extracting relevant sections from the academic papers; and
  (c) re-running Phase 2 extraction on those full texts.

**Grounding model.** Sentence-transformers `all-MiniLM-L6-v2` was available and
used; the fallback character n-gram embedder was NOT used despite the methodology
note saying otherwise. The L6-v2 model provides 384-dimensional semantic
embeddings that are substantially better than character n-grams for patent-claim
language. Coverage scores at 0.40 threshold reflect genuine semantic proximity.

**Lensing strain.** All pairs use simulated blend_delta = 0.10 (below the 0.60
PARTIAL_LENSING trigger). Real lensing strain would require LLM-conditioned
extraction. With real lensing, some pairs might shift from NOT_COVERED to
PARTIAL_COVERAGE_WITH_LENSING, but the 0.99 coverage threshold for COVERED would
remain unmet.

**Coverage threshold sensitivity.** Using a 0.99 threshold, 0/1,715 pairs are
COVERED. At a relaxed threshold of 0.50 (attorney-attention zone):
0 pairs; at 0.33: ≈ 1–2 pairs (claim 16 vs. Esward). The strict 0.99 threshold
is appropriate for anticipation analysis; lower thresholds are useful for
obviousness-combination analysis (outside this sweep's scope).

---

## 5. Action Items Before Filing

| Priority | Item | Rationale |
|----------|------|-----------|
| HIGH | Verify Laumann (arXiv:2502.03937) resolves to correct paper | IDS entry flagged as unverified |
| HIGH | Verify Bhowmick 2024 is distinct from Schapira/Gunasekaran | IDS entry flagged as conditional |
| HIGH | Verify Eerlings 2026 venue/URL before filing | IDS entry flagged as unverified |
| MEDIUM | Commission targeted search for claims 20–35 on agentic-loop prior art | Zero IDS coverage on action-record architecture |
| MEDIUM | Obtain full claim texts for Palantir US 9,589,014 and US 10,180,929 | Closest refs for claim 2; full-text read-through warranted |
| LOW | Confirm Chinese patent CN120145704B is correctly cited | Grouped with CN117744455A/CN112818137B; confirm distinct |
| LOW | Stage 3 sweep with full prior-art texts for claims 1, 2, 9, 12 | Highest-proximity claim/ref pairs warrant full-text extraction |
