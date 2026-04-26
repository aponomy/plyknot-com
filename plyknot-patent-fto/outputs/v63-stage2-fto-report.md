# v6.3 Stage 2 FTO Sweep — Directed-Subset Coverage Report

Generated: 2026-04-26 00:41:53

## 1. Executive Summary

| Metric | Value |
|--------|-------|
| Total pairs evaluated | 1715 (35 claims × 49 refs) |
| COVERED_BY_PRIOR_ART | 0 (0.0%) |
| PARTIAL_COVERAGE_WITH_LENSING | 0 (0.0%) |
| NOT_COVERED | 1715 (100.0%) |

## 2. Methodology Note

Coverage = fraction of claim predicate units that find a grounded match in the
reference predicate set, measured via directed-subset check on embedding-grounded
entity IDs. Both document sets are IDS analysis summaries (FTO-layer texts), not
verbatim prior-art documents; coverage reflects conceptual vocabulary overlap.
Embedder: character n-gram fallback (no sentence-transformers dependency).
Lensing strain: simulated (blend_delta = 0.10 fixed). Verdict thresholds:
coverage ≥ 0.99 → COVERED; coverage ≥ 0.99 AND blend_delta > 0.6 → PARTIAL_LENSING;
coverage < 1.0 → NOT_COVERED. These scores are informational, not a legal opinion.

## 3. Per-Claim Summary

| Claim | Predicates | Max Coverage | Closest Reference | Status |
|-------|-----------|-------------|-------------------|--------|
| claim 1 | 26 | 0.077 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 2 | 13 | 0.231 | US 9,589,014 B2 | not_covered |
| claim 3 | 6 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 4 | 5 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 5 | 7 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 6 | 11 | 0.091 | US 9,589,014 B2 | not_covered |
| claim 7 | 8 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 8 | 12 | 0.083 | Fahlman 2006 (Scone marker-passing inference) | not_covered |
| claim 8a | 13 | 0.077 | Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER | not_covered |
| claim 9 | 12 | 0.083 | Fahlman 2006 (Scone marker-passing inference) | not_covered |
| claim 10 | 10 | 0.200 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 11 | 4 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 12 | 6 | 0.167 | US 7,962,495 B2 | not_covered |
| claim 13 | 20 | 0.100 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 14 | 10 | 0.100 | US 7,962,495 B2 | not_covered |
| claim 15 | 4 | 0.250 | Fahlman 2006 (Scone marker-passing inference) | not_covered |
| claim 16 | 6 | 0.333 | Esward 2025 (Esward et al. metrology) | not_covered |
| claim 16a | 13 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 17 | 7 | 0.143 | US 7,962,495 B2 | not_covered |
| claim 20 | 6 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 21 | 10 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 22 | 7 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 23 | 9 | 0.111 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 24 | 8 | 0.125 | Rukhin 2019 (Rukhin metrology) | not_covered |
| claim 25 | 5 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 26 | 7 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 27 | 7 | 0.143 | US 7,962,495 B2 | not_covered |
| claim 28 | 5 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 29 | 7 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 30 | 8 | 0.125 | Rukhin 2019 (Rukhin metrology) | not_covered |
| claim 31 | 8 | 0.125 | Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER | not_covered |
| claim 32 | 8 | 0.125 | Fahlman 2006 (Scone marker-passing inference) | not_covered |
| claim 33 | 8 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 34 | 6 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |
| claim 35 | 4 | 0.000 | Rauf 2025 (Gem entity-splitting framework) | not_covered |

## 4. Per-Reference Coverage Reach

References sorted by max coverage across all claims.

| Reference | Avg Cov | Max Cov | Claims Fully Covered |
|-----------|---------|---------|---------------------|
| Esward 2025 (Esward et al. metrology) | 0.019 | 0.333 | 0 |
| Fahlman 2006 (Scone marker-passing inference) | 0.019 | 0.250 | 0 |
| US 9,589,014 B2 | 0.018 | 0.231 | 0 |
| US 10,180,929 B1 | 0.018 | 0.231 | 0 |
| Rauf 2025 (Gem entity-splitting framework) | 0.014 | 0.200 | 0 |
| US 7,962,495 B2 | 0.029 | 0.167 | 0 |
| Mohr 2022 (CODATA 2022) | 0.005 | 0.154 | 0 |
| Rukhin 2019 (Rukhin metrology) | 0.028 | 0.154 | 0 |
| Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER) | 0.024 | 0.143 | 0 |
| Vrandečić 2014 (Wikidata) | 0.019 | 0.143 | 0 |
| Karelina 2023 (Karelina et al. AF) | 0.019 | 0.143 | 0 |
| Scardino 2023 (Scardino et al. AF) | 0.019 | 0.143 | 0 |
| Terwilliger 2024 (Terwilliger et al. AF) | 0.019 | 0.143 | 0 |
| Schapira 2024 (Schapira et al. AF) | 0.019 | 0.143 | 0 |
| Gunasekaran 2024 (Gunasekaran et al. AF) | 0.019 | 0.143 | 0 |
| Kuncheva 2003 (Kuncheva & Whitaker ensemble) | 0.019 | 0.143 | 0 |
| Kim 2025 (Kim, Garg, Peng, Garg) | 0.019 | 0.143 | 0 |
| Goel 2025 (Goel et al. CAPA) | 0.019 | 0.143 | 0 |
| Hofman 2023 (Hofman et al. pre-registration) | 0.019 | 0.143 | 0 |
| Hall 2022 (GTC metrology) | 0.004 | 0.125 | 0 |
| Jiang 2025 (Jiang et al. "Artificial) | 0.003 | 0.100 | 0 |
| Wood 2023 (Wood et al. Bregman) | 0.003 | 0.100 | 0 |
| Savojardo 2025 (Savojardo et al. AF/ESMFold) | 0.002 | 0.083 | 0 |
| Hýsková 2026 (Hýsková et al. structure-prediction) | 0.002 | 0.083 | 0 |
| JCGM 2008 (JCGM 100:2008 GUM) | 0.002 | 0.077 | 0 |
| Liu 2025 (Liu et al. GATE) | 0.001 | 0.038 | 0 |
| Norvig 1989 (Norvig marker-collision taxonomy) | 0.000 | 0.000 | 0 |
| Cecelski 2022 (Cecelski et al. metrology) | 0.000 | 0.000 | 0 |
| Kusne 2020 (CAMEO autonomous materials) | 0.000 | 0.000 | 0 |
| US 2024/0288467 A1 | 0.000 | 0.000 | 0 |
| US 12,299,022 B2 | 0.000 | 0.000 | 0 |
| US 11,714,792 B2 | 0.000 | 0.000 | 0 |
| W3C 2017 (W3C SOSA/SSN Recommendation) | 0.000 | 0.000 | 0 |
| Haller 2018 (Haller et al. SOSA/SSN) | 0.000 | 0.000 | 0 |
| Baylor 2017 (TFX ML Metadata) | 0.000 | 0.000 | 0 |
| Mitchell 2019 (Model Cards) | 0.000 | 0.000 | 0 |
| Gebru 2021 (Datasheets for Datasets) | 0.000 | 0.000 | 0 |
| Fadini 2026 (Fadini et al. AF/ESMFold) | 0.000 | 0.000 | 0 |
| Fadini 2025 (Fadini et al. Proteins) | 0.000 | 0.000 | 0 |
| Christen 2026 (Christen & Christen record) | 0.000 | 0.000 | 0 |
| Kanarik 2023 (Kanarik et al. autonomous) | 0.000 | 0.000 | 0 |
| Gibbons 2015 (Gibbons et al. mzRefinery) | 0.000 | 0.000 | 0 |
| CN117744455A | 0.000 | 0.000 | 0 |
| Laumann 2025 (Laumann et al. correlated) | 0.000 | 0.000 | 0 |
| Bhowmick 2024 (Bhowmick et al. 2024) | 0.000 | 0.000 | 0 |
| Gallitto 2025 (Gallitto et al. external) | 0.000 | 0.000 | 0 |
| Lundberg 2017 (SHAP) | 0.000 | 0.000 | 0 |
| Kokhlikyan 2009 (Captum) | 0.000 | 0.000 | 0 |
| Eerlings 2026 (DIVERSE) | 0.000 | 0.000 | 0 |

## 5. High-Coverage Pairs (coverage ≥ 0.40)

No pairs with coverage ≥ 0.40.

## 6. Attorney-Review Flags

No pairs flagged for attorney review under current thresholds (coverage ≥ 0.99 AND blend_delta > 0.6).

## 7. Structural-Distinguisher Summary

For the five highest-coverage pairs per claim, the uncovered claim predicates
(structural distinguishers from the prior art) are listed below.

### claim 1

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.077)
  - acquire: physical measurement apparatus acquires at least one measurement record by inter
  - output: apparatus outputs measurement record to storage
  - hold: storage holds a plurality of measurement records, each a directed entry with six
  - record: source tag takes one of two values: first value indicates record produced by phy
  - operate: storage operates on append-only basis: subsequent record with same composite key

**US 9,589,014 B2** (coverage=0.038)
  - acquire: physical measurement apparatus acquires at least one measurement record by inter
  - output: apparatus outputs measurement record to storage
  - hold: storage holds a plurality of measurement records, each a directed entry with six
  - record: source tag takes one of two values: first value indicates record produced by phy
  - operate: storage operates on append-only basis: subsequent record with same composite key

**US 10,180,929 B1** (coverage=0.038)
  - acquire: physical measurement apparatus acquires at least one measurement record by inter
  - output: apparatus outputs measurement record to storage
  - hold: storage holds a plurality of measurement records, each a directed entry with six
  - record: source tag takes one of two values: first value indicates record produced by phy
  - operate: storage operates on append-only basis: subsequent record with same composite key

**Mohr 2022 (CODATA 2022)** (coverage=0.038)
  - acquire: physical measurement apparatus acquires at least one measurement record by inter
  - output: apparatus outputs measurement record to storage
  - hold: storage holds a plurality of measurement records, each a directed entry with six
  - record: source tag takes one of two values: first value indicates record produced by phy
  - operate: storage operates on append-only basis: subsequent record with same composite key

**Liu 2025 (Liu et al. GATE)** (coverage=0.038)
  - acquire: physical measurement apparatus acquires at least one measurement record by inter
  - output: apparatus outputs measurement record to storage
  - hold: storage holds a plurality of measurement records, each a directed entry with six
  - record: source tag takes one of two values: first value indicates record produced by phy
  - operate: storage operates on append-only basis: subsequent record with same composite key

### claim 2

**US 9,589,014 B2** (coverage=0.231)
  - identify: among groups formed by the convergence analyser, a subset of groups in which at 
  - detect: group contains at least one record produced by a physical measurement apparatus
  - detect: convergence analyser has classified the group as converged
  - detect: convergence analyser has classified the group as tension or divergent
  - detect: group contains no record produced by a physical measurement apparatus

**US 10,180,929 B1** (coverage=0.231)
  - identify: among groups formed by the convergence analyser, a subset of groups in which at 
  - detect: group contains at least one record produced by a physical measurement apparatus
  - detect: convergence analyser has classified the group as converged
  - detect: convergence analyser has classified the group as tension or divergent
  - detect: group contains no record produced by a physical measurement apparatus

**Esward 2025 (Esward et al. metrology)** (coverage=0.231)
  - detect: group contains at least one record produced by a physical measurement apparatus
  - classify: group is a confirmed echo chamber — convergence among distinct computational mea
  - classify: group is a refuted echo chamber — computational convergence is contradicted by p
  - detect: group contains no record produced by a physical measurement apparatus
  - classify: group is an untested echo chamber — cannot confirm or refute computational conve

**US 7,962,495 B2** (coverage=0.154)
  - identify: among groups formed by the convergence analyser, a subset of groups in which at 
  - detect: group contains at least one record produced by a physical measurement apparatus
  - detect: convergence analyser has classified the group as converged
  - classify: group is a confirmed echo chamber — convergence among distinct computational mea
  - detect: convergence analyser has classified the group as tension or divergent

**Mohr 2022 (CODATA 2022)** (coverage=0.154)
  - identify: among groups formed by the convergence analyser, a subset of groups in which at 
  - detect: group contains at least one record produced by a physical measurement apparatus
  - classify: group is a confirmed echo chamber — convergence among distinct computational mea
  - classify: group is a refuted echo chamber — computational convergence is contradicted by p
  - detect: group contains no record produced by a physical measurement apparatus

### claim 6

**US 9,589,014 B2** (coverage=0.091)
  - record: a group contains at least one record produced by a physical measurement apparatu
  - record: a group contains at least one record produced by a computational measurer
  - measure: the relative-spread measure is computed using all records in the group regardles
  - detect: the group's classification is converged
  - detect: at least one physical-interaction record is present in the group

**US 10,180,929 B1** (coverage=0.091)
  - record: a group contains at least one record produced by a physical measurement apparatu
  - record: a group contains at least one record produced by a computational measurer
  - measure: the relative-spread measure is computed using all records in the group regardles
  - detect: the group's classification is converged
  - detect: at least one physical-interaction record is present in the group

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.000)
  - record: a group contains at least one record produced by a physical measurement apparatu
  - record: a group contains at least one record produced by a computational measurer
  - measure: the relative-spread measure is computed using all records in the group regardles
  - classify: the group is classified under the four-valued classification using the relative-
  - detect: the group's classification is converged

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.000)
  - record: a group contains at least one record produced by a physical measurement apparatu
  - record: a group contains at least one record produced by a computational measurer
  - measure: the relative-spread measure is computed using all records in the group regardles
  - classify: the group is classified under the four-valued classification using the relative-
  - detect: the group's classification is converged

**Norvig 1989 (Norvig marker-collision taxonomy)** (coverage=0.000)
  - record: a group contains at least one record produced by a physical measurement apparatu
  - record: a group contains at least one record produced by a computational measurer
  - measure: the relative-spread measure is computed using all records in the group regardles
  - classify: the group is classified under the four-valued classification using the relative-
  - detect: the group's classification is converged

### claim 8

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.083)
  - identify: a claim dependency — claim 8 depends on claim 7
  - observe: the actor is characterized as an automated control subsystem
  - observe: the automated control subsystem is configured to respond to a feedback signal
  - infer: the feedback signal originates from the system described in claim 7
  - cause: receipt of feedback signal triggers modification of the physical measurement app

**US 7,962,495 B2** (coverage=0.083)
  - identify: a claim dependency — claim 8 depends on claim 7
  - observe: the actor is characterized as an automated control subsystem
  - observe: the automated control subsystem is configured to respond to a feedback signal
  - infer: the feedback signal originates from the system described in claim 7
  - cause: receipt of feedback signal triggers modification of the physical measurement app

**Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER)** (coverage=0.083)
  - identify: a claim dependency — claim 8 depends on claim 7
  - observe: the actor is characterized as an automated control subsystem
  - observe: the automated control subsystem is configured to respond to a feedback signal
  - infer: the feedback signal originates from the system described in claim 7
  - cause: receipt of feedback signal triggers modification of the physical measurement app

**Vrandečić 2014 (Wikidata)** (coverage=0.083)
  - identify: a claim dependency — claim 8 depends on claim 7
  - observe: the actor is characterized as an automated control subsystem
  - observe: the automated control subsystem is configured to respond to a feedback signal
  - infer: the feedback signal originates from the system described in claim 7
  - cause: receipt of feedback signal triggers modification of the physical measurement app

**Karelina 2023 (Karelina et al. AF)** (coverage=0.083)
  - identify: a claim dependency — claim 8 depends on claim 7
  - observe: the actor is characterized as an automated control subsystem
  - observe: the automated control subsystem is configured to respond to a feedback signal
  - infer: the feedback signal originates from the system described in claim 7
  - cause: receipt of feedback signal triggers modification of the physical measurement app

### claim 8a

**Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER)** (coverage=0.077)
  - identify: system identifies a first measurer and a second measurer, each represented as a 
  - observe: each measurer has one or more directed entries written against it by a further m
  - infer: directed entries recording measurer attributes use the same six-field schema as 
  - compute: system computes a first attribute set for the first measurer from its directed e
  - compute: system computes a second attribute set for the second measurer from its directed

**JCGM 2008 (JCGM 100:2008 GUM)** (coverage=0.077)
  - identify: system identifies a first measurer and a second measurer, each represented as a 
  - observe: each measurer has one or more directed entries written against it by a further m
  - infer: directed entries recording measurer attributes use the same six-field schema as 
  - compute: system computes a first attribute set for the first measurer from its directed e
  - compute: system computes a second attribute set for the second measurer from its directed

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.000)
  - identify: system identifies a first measurer and a second measurer, each represented as a 
  - observe: each measurer has one or more directed entries written against it by a further m
  - infer: directed entries recording measurer attributes use the same six-field schema as 
  - compute: system computes a first attribute set for the first measurer from its directed e
  - compute: system computes a second attribute set for the second measurer from its directed

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.000)
  - identify: system identifies a first measurer and a second measurer, each represented as a 
  - observe: each measurer has one or more directed entries written against it by a further m
  - infer: directed entries recording measurer attributes use the same six-field schema as 
  - compute: system computes a first attribute set for the first measurer from its directed e
  - compute: system computes a second attribute set for the second measurer from its directed

**Norvig 1989 (Norvig marker-collision taxonomy)** (coverage=0.000)
  - identify: system identifies a first measurer and a second measurer, each represented as a 
  - observe: each measurer has one or more directed entries written against it by a further m
  - infer: directed entries recording measurer attributes use the same six-field schema as 
  - compute: system computes a first attribute set for the first measurer from its directed e
  - compute: system computes a second attribute set for the second measurer from its directed

### claim 9

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.083)
  - comprising: system includes a vocabulary store holding an operational-mechanism vocabulary w
  - carries: each identifier carries a Boolean admissibility flag with two possible values
  - indicating: first flag value indicates identifier names a physical or computational mechanis
  - indicating: second flag value indicates identifier names a theoretical commitment about real
  - configured to reject: vocabulary store rejects at insertion time any identifier whose admissibility fl

**Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER)** (coverage=0.083)
  - comprising: system includes a vocabulary store holding an operational-mechanism vocabulary w
  - carries: each identifier carries a Boolean admissibility flag with two possible values
  - indicating: first flag value indicates identifier names a physical or computational mechanis
  - indicating: second flag value indicates identifier names a theoretical commitment about real
  - configured to reject: vocabulary store rejects at insertion time any identifier whose admissibility fl

**Vrandečić 2014 (Wikidata)** (coverage=0.083)
  - comprising: system includes a vocabulary store holding an operational-mechanism vocabulary w
  - carries: each identifier carries a Boolean admissibility flag with two possible values
  - indicating: first flag value indicates identifier names a physical or computational mechanis
  - indicating: second flag value indicates identifier names a theoretical commitment about real
  - configured to reject: vocabulary store rejects at insertion time any identifier whose admissibility fl

**Karelina 2023 (Karelina et al. AF)** (coverage=0.083)
  - comprising: system includes a vocabulary store holding an operational-mechanism vocabulary w
  - carries: each identifier carries a Boolean admissibility flag with two possible values
  - indicating: first flag value indicates identifier names a physical or computational mechanis
  - indicating: second flag value indicates identifier names a theoretical commitment about real
  - configured to reject: vocabulary store rejects at insertion time any identifier whose admissibility fl

**Scardino 2023 (Scardino et al. AF)** (coverage=0.083)
  - comprising: system includes a vocabulary store holding an operational-mechanism vocabulary w
  - carries: each identifier carries a Boolean admissibility flag with two possible values
  - indicating: first flag value indicates identifier names a physical or computational mechanis
  - indicating: second flag value indicates identifier names a theoretical commitment about real
  - configured to reject: vocabulary store rejects at insertion time any identifier whose admissibility fl

### claim 10

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.200)
  - assign: each inference step receives a marker taking one of at least two structurally di
  - propagate: markers are propagated along edges of a graph where nodes are admissible operati
  - decay: marker intensity diminishes by a per-hop decay factor as propagation proceeds al
  - detect: a collision event occurs at a shared operational-mechanism identifier where mark
  - classify: collision is an opening-collision when all contributing markers are of the first

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.000)
  - assign: each inference step receives a marker taking one of at least two structurally di
  - distinguish: first form is assigned to steps annotated as converged
  - distinguish: second form is assigned to steps annotated as divergent or tension
  - propagate: markers are propagated along edges of a graph where nodes are admissible operati
  - decay: marker intensity diminishes by a per-hop decay factor as propagation proceeds al

**Norvig 1989 (Norvig marker-collision taxonomy)** (coverage=0.000)
  - assign: each inference step receives a marker taking one of at least two structurally di
  - distinguish: first form is assigned to steps annotated as converged
  - distinguish: second form is assigned to steps annotated as divergent or tension
  - propagate: markers are propagated along edges of a graph where nodes are admissible operati
  - decay: marker intensity diminishes by a per-hop decay factor as propagation proceeds al

**US 7,962,495 B2** (coverage=0.000)
  - assign: each inference step receives a marker taking one of at least two structurally di
  - distinguish: first form is assigned to steps annotated as converged
  - distinguish: second form is assigned to steps annotated as divergent or tension
  - propagate: markers are propagated along edges of a graph where nodes are admissible operati
  - decay: marker intensity diminishes by a per-hop decay factor as propagation proceeds al

**US 9,589,014 B2** (coverage=0.000)
  - assign: each inference step receives a marker taking one of at least two structurally di
  - distinguish: first form is assigned to steps annotated as converged
  - distinguish: second form is assigned to steps annotated as divergent or tension
  - propagate: markers are propagated along edges of a graph where nodes are admissible operati
  - decay: marker intensity diminishes by a per-hop decay factor as propagation proceeds al

### claim 12

**US 7,962,495 B2** (coverage=0.167)
  - drawn: measurer entities are drawn from the same identifier space as target entities
  - is representable: a measurer entity is representable as the target of an inference step produced b
  - is configured: marker-propagation analyser is configured to propagate markers through inference
  - appears: propagation occurs when a measurer appears as target in an inference step
  - requires: propagation proceeds without schema change to the storage

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.000)
  - holds: storage holds a plurality of measurer entities
  - drawn: measurer entities are drawn from the same identifier space as target entities
  - is representable: a measurer entity is representable as the target of an inference step produced b
  - is configured: marker-propagation analyser is configured to propagate markers through inference
  - appears: propagation occurs when a measurer appears as target in an inference step

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.000)
  - holds: storage holds a plurality of measurer entities
  - drawn: measurer entities are drawn from the same identifier space as target entities
  - is representable: a measurer entity is representable as the target of an inference step produced b
  - is configured: marker-propagation analyser is configured to propagate markers through inference
  - appears: propagation occurs when a measurer appears as target in an inference step

**Norvig 1989 (Norvig marker-collision taxonomy)** (coverage=0.000)
  - holds: storage holds a plurality of measurer entities
  - drawn: measurer entities are drawn from the same identifier space as target entities
  - is representable: a measurer entity is representable as the target of an inference step produced b
  - is configured: marker-propagation analyser is configured to propagate markers through inference
  - appears: propagation occurs when a measurer appears as target in an inference step

**US 9,589,014 B2** (coverage=0.000)
  - holds: storage holds a plurality of measurer entities
  - drawn: measurer entities are drawn from the same identifier space as target entities
  - is representable: a measurer entity is representable as the target of an inference step produced b
  - is configured: marker-propagation analyser is configured to propagate markers through inference
  - appears: propagation occurs when a measurer appears as target in an inference step

### claim 13

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.100)
  - acquiring: physical measurement apparatus interacts with physical target to obtain at least
  - storing: acquired record is stored together with further measurement records in a storage
  - comprising: each stored record is a directed entry with six fields: producing measurer ident
  - distinguishing: source tag takes one of two predetermined values to distinguish physical-interac
  - grouping: records are grouped by (target, property) pair

**US 9,589,014 B2** (coverage=0.100)
  - acquiring: physical measurement apparatus interacts with physical target to obtain at least
  - storing: acquired record is stored together with further measurement records in a storage
  - comprising: each stored record is a directed entry with six fields: producing measurer ident
  - distinguishing: source tag takes one of two predetermined values to distinguish physical-interac
  - constraining: storage is append-only with composite-key overwrite and an external append-only 

**US 10,180,929 B1** (coverage=0.100)
  - acquiring: physical measurement apparatus interacts with physical target to obtain at least
  - storing: acquired record is stored together with further measurement records in a storage
  - comprising: each stored record is a directed entry with six fields: producing measurer ident
  - distinguishing: source tag takes one of two predetermined values to distinguish physical-interac
  - constraining: storage is append-only with composite-key overwrite and an external append-only 

**Esward 2025 (Esward et al. metrology)** (coverage=0.050)
  - acquiring: physical measurement apparatus interacts with physical target to obtain at least
  - storing: acquired record is stored together with further measurement records in a storage
  - comprising: each stored record is a directed entry with six fields: producing measurer ident
  - distinguishing: source tag takes one of two predetermined values to distinguish physical-interac
  - constraining: storage is append-only with composite-key overwrite and an external append-only 

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.000)
  - acquiring: physical measurement apparatus interacts with physical target to obtain at least
  - storing: acquired record is stored together with further measurement records in a storage
  - comprising: each stored record is a directed entry with six fields: producing measurer ident
  - distinguishing: source tag takes one of two predetermined values to distinguish physical-interac
  - constraining: storage is append-only with composite-key overwrite and an external append-only 

### claim 14

**US 7,962,495 B2** (coverage=0.100)
  - hold: system maintains a vocabulary of language-independent numerical identifiers
  - carry: each identifier carries a Boolean admissibility flag
  - distinguish: flag distinguishes instrument mechanism identifiers from theoretical commitment 
  - reject: system rejects at insertion time any identifier whose flag indicates theoretical
  - hold: system maintains a plurality of inference steps

**Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER)** (coverage=0.100)
  - hold: system maintains a vocabulary of language-independent numerical identifiers
  - carry: each identifier carries a Boolean admissibility flag
  - reject: system rejects at insertion time any identifier whose flag indicates theoretical
  - hold: system maintains a plurality of inference steps
  - comprise: each inference step contains a claim descriptor, a convergence-status annotation

**Jiang 2025 (Jiang et al. "Artificial)** (coverage=0.100)
  - hold: system maintains a vocabulary of language-independent numerical identifiers
  - carry: each identifier carries a Boolean admissibility flag
  - reject: system rejects at insertion time any identifier whose flag indicates theoretical
  - hold: system maintains a plurality of inference steps
  - comprise: each inference step contains a claim descriptor, a convergence-status annotation

**Wood 2023 (Wood et al. Bregman)** (coverage=0.100)
  - hold: system maintains a vocabulary of language-independent numerical identifiers
  - carry: each identifier carries a Boolean admissibility flag
  - distinguish: flag distinguishes instrument mechanism identifiers from theoretical commitment 
  - reject: system rejects at insertion time any identifier whose flag indicates theoretical
  - hold: system maintains a plurality of inference steps

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.000)
  - hold: system maintains a vocabulary of language-independent numerical identifiers
  - carry: each identifier carries a Boolean admissibility flag
  - distinguish: flag distinguishes instrument mechanism identifiers from theoretical commitment 
  - reject: system rejects at insertion time any identifier whose flag indicates theoretical
  - hold: system maintains a plurality of inference steps

### claim 15

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.250)
  - assign: each inference step receives a marker of one of at least two structurally distin
  - propagate: markers are propagated along edges of a graph whose nodes are admissible operati
  - classify: the collision event is classified as an opening-collision, crack-collision, or b

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.000)
  - assign: each inference step receives a marker of one of at least two structurally distin
  - propagate: markers are propagated along edges of a graph whose nodes are admissible operati
  - detect: a collision event is detected at any shared identifier where markers from two or
  - classify: the collision event is classified as an opening-collision, crack-collision, or b

**Norvig 1989 (Norvig marker-collision taxonomy)** (coverage=0.000)
  - assign: each inference step receives a marker of one of at least two structurally distin
  - propagate: markers are propagated along edges of a graph whose nodes are admissible operati
  - detect: a collision event is detected at any shared identifier where markers from two or
  - classify: the collision event is classified as an opening-collision, crack-collision, or b

**US 7,962,495 B2** (coverage=0.000)
  - assign: each inference step receives a marker of one of at least two structurally distin
  - propagate: markers are propagated along edges of a graph whose nodes are admissible operati
  - detect: a collision event is detected at any shared identifier where markers from two or
  - classify: the collision event is classified as an opening-collision, crack-collision, or b

**US 9,589,014 B2** (coverage=0.000)
  - assign: each inference step receives a marker of one of at least two structurally distin
  - propagate: markers are propagated along edges of a graph whose nodes are admissible operati
  - detect: a collision event is detected at any shared identifier where markers from two or
  - classify: the collision event is classified as an opening-collision, crack-collision, or b

### claim 16

**Esward 2025 (Esward et al. metrology)** (coverage=0.333)
  - classifying: each such group as confirmed, refuted, or untested based on agreement of computa
  - computing: a decay-weighted per-measurer trust weight derived from prior refuted classifica
  - attenuating: each measurer's contribution to its own systemic classification is reduced by it
  - routing: a feedback signal encoding the classifications and attenuated systemic labels is

**US 9,589,014 B2** (coverage=0.167)
  - identifying: groups of (target, property) records that contain at least two records from dist
  - identifying: among those groups, which contain at least one physical-interaction record and w
  - computing: a decay-weighted per-measurer trust weight derived from prior refuted classifica
  - attenuating: each measurer's contribution to its own systemic classification is reduced by it
  - routing: a feedback signal encoding the classifications and attenuated systemic labels is

**US 10,180,929 B1** (coverage=0.167)
  - identifying: groups of (target, property) records that contain at least two records from dist
  - identifying: among those groups, which contain at least one physical-interaction record and w
  - computing: a decay-weighted per-measurer trust weight derived from prior refuted classifica
  - attenuating: each measurer's contribution to its own systemic classification is reduced by it
  - routing: a feedback signal encoding the classifications and attenuated systemic labels is

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.000)
  - identifying: groups of (target, property) records that contain at least two records from dist
  - identifying: among those groups, which contain at least one physical-interaction record and w
  - classifying: each such group as confirmed, refuted, or untested based on agreement of computa
  - computing: a decay-weighted per-measurer trust weight derived from prior refuted classifica
  - attenuating: each measurer's contribution to its own systemic classification is reduced by it

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.000)
  - identifying: groups of (target, property) records that contain at least two records from dist
  - identifying: among those groups, which contain at least one physical-interaction record and w
  - classifying: each such group as confirmed, refuted, or untested based on agreement of computa
  - computing: a decay-weighted per-measurer trust weight derived from prior refuted classifica
  - attenuating: each measurer's contribution to its own systemic classification is reduced by it

### claim 17

**US 7,962,495 B2** (coverage=0.143)
  - identify: a non-transitory computer-readable medium exists as the claimed subject matter
  - carry: the medium carries instructions
  - cause: execution of instructions by one or more processors causes the processors to per
  - execute: one or more processors execute the carried instructions
  - perform: the processors perform the method of any one of claims 13, 14, 15, 16, or 16a

**Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER)** (coverage=0.143)
  - identify: a non-transitory computer-readable medium exists as the claimed subject matter
  - carry: the medium carries instructions
  - cause: execution of instructions by one or more processors causes the processors to per
  - execute: one or more processors execute the carried instructions
  - perform: the processors perform the method of any one of claims 13, 14, 15, 16, or 16a

**Vrandečić 2014 (Wikidata)** (coverage=0.143)
  - identify: a non-transitory computer-readable medium exists as the claimed subject matter
  - carry: the medium carries instructions
  - cause: execution of instructions by one or more processors causes the processors to per
  - execute: one or more processors execute the carried instructions
  - perform: the processors perform the method of any one of claims 13, 14, 15, 16, or 16a

**Karelina 2023 (Karelina et al. AF)** (coverage=0.143)
  - identify: a non-transitory computer-readable medium exists as the claimed subject matter
  - carry: the medium carries instructions
  - cause: execution of instructions by one or more processors causes the processors to per
  - execute: one or more processors execute the carried instructions
  - perform: the processors perform the method of any one of claims 13, 14, 15, 16, or 16a

**Scardino 2023 (Scardino et al. AF)** (coverage=0.143)
  - identify: a non-transitory computer-readable medium exists as the claimed subject matter
  - carry: the medium carries instructions
  - cause: execution of instructions by one or more processors causes the processors to per
  - execute: one or more processors execute the carried instructions
  - perform: the processors perform the method of any one of claims 13, 14, 15, 16, or 16a

### claim 23

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.111)
  - configured to emit: classifier is designed to produce a dynamical-signature annotation for each qual
  - meets or exceeds: typed cycle annotation indicates spectral-radius metric reaches predetermined th
  - taking: dynamical-signature annotation takes one of at least four predetermined values
  - distinguishing: the four values distinguish between four distinct dynamical signatures
  - characterized by: first signature: measurement records converge toward value predicted by predicti

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.111)
  - configured to emit: classifier is designed to produce a dynamical-signature annotation for each qual
  - meets or exceeds: typed cycle annotation indicates spectral-radius metric reaches predetermined th
  - taking: dynamical-signature annotation takes one of at least four predetermined values
  - distinguishing: the four values distinguish between four distinct dynamical signatures
  - characterized by: first signature: measurement records converge toward value predicted by predicti

**US 7,962,495 B2** (coverage=0.111)
  - configured to emit: classifier is designed to produce a dynamical-signature annotation for each qual
  - meets or exceeds: typed cycle annotation indicates spectral-radius metric reaches predetermined th
  - taking: dynamical-signature annotation takes one of at least four predetermined values
  - distinguishing: the four values distinguish between four distinct dynamical signatures
  - characterized by: first signature: measurement records converge toward value predicted by predicti

**Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER)** (coverage=0.111)
  - configured to emit: classifier is designed to produce a dynamical-signature annotation for each qual
  - meets or exceeds: typed cycle annotation indicates spectral-radius metric reaches predetermined th
  - taking: dynamical-signature annotation takes one of at least four predetermined values
  - distinguishing: the four values distinguish between four distinct dynamical signatures
  - characterized by: first signature: measurement records converge toward value predicted by predicti

**Vrandečić 2014 (Wikidata)** (coverage=0.111)
  - configured to emit: classifier is designed to produce a dynamical-signature annotation for each qual
  - meets or exceeds: typed cycle annotation indicates spectral-radius metric reaches predetermined th
  - taking: dynamical-signature annotation takes one of at least four predetermined values
  - distinguishing: the four values distinguish between four distinct dynamical signatures
  - characterized by: first signature: measurement records converge toward value predicted by predicti

### claim 24

**Rukhin 2019 (Rukhin metrology)** (coverage=0.125)
  - receive: second classifier receives a coupling group of records whose source tag carries 
  - represent: said records represent an adoption of the hypothesis inference step by automated
  - emit: second classifier emits a mode annotation taking one of at least four predetermi
  - characterize: first mode is characterized by absence of systematic convergence or divergence
  - characterize: second mode is characterized by convergence of measurements toward hypothesis pr

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.000)
  - receive: second classifier receives a coupling group of records whose source tag carries 
  - represent: said records represent an adoption of the hypothesis inference step by automated
  - analyze: second classifier analyzes dynamics of convergence of measurement records agains
  - emit: second classifier emits a mode annotation taking one of at least four predetermi
  - characterize: first mode is characterized by absence of systematic convergence or divergence

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.000)
  - receive: second classifier receives a coupling group of records whose source tag carries 
  - represent: said records represent an adoption of the hypothesis inference step by automated
  - analyze: second classifier analyzes dynamics of convergence of measurement records agains
  - emit: second classifier emits a mode annotation taking one of at least four predetermi
  - characterize: first mode is characterized by absence of systematic convergence or divergence

**Norvig 1989 (Norvig marker-collision taxonomy)** (coverage=0.000)
  - receive: second classifier receives a coupling group of records whose source tag carries 
  - represent: said records represent an adoption of the hypothesis inference step by automated
  - analyze: second classifier analyzes dynamics of convergence of measurement records agains
  - emit: second classifier emits a mode annotation taking one of at least four predetermi
  - characterize: first mode is characterized by absence of systematic convergence or divergence

**US 7,962,495 B2** (coverage=0.000)
  - receive: second classifier receives a coupling group of records whose source tag carries 
  - represent: said records represent an adoption of the hypothesis inference step by automated
  - analyze: second classifier analyzes dynamics of convergence of measurement records agains
  - emit: second classifier emits a mode annotation taking one of at least four predetermi
  - characterize: first mode is characterized by absence of systematic convergence or divergence

### claim 27

**US 7,962,495 B2** (coverage=0.143)
  - distinguishes: the typed-absence annotation takes one of at least four predetermined values dis
  - accommodates: storage holds actionability tier annotation for each target entity taking one of
  - indicates: actionability tier annotation indicates the degree to which the target entity is
  - configured: analyzers of claims 1, 22, 24, and 25 are configured to respect typed-absence an
  - configured: analyzers of claims 1, 22, 24, and 25 are configured to respect actionability-ti

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.000)
  - accommodates: storage holds typed-absence annotation for each target entity when no measuremen
  - distinguishes: the typed-absence annotation takes one of at least four predetermined values dis
  - accommodates: storage holds actionability tier annotation for each target entity taking one of
  - indicates: actionability tier annotation indicates the degree to which the target entity is
  - configured: analyzers of claims 1, 22, 24, and 25 are configured to respect typed-absence an

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.000)
  - accommodates: storage holds typed-absence annotation for each target entity when no measuremen
  - distinguishes: the typed-absence annotation takes one of at least four predetermined values dis
  - accommodates: storage holds actionability tier annotation for each target entity taking one of
  - indicates: actionability tier annotation indicates the degree to which the target entity is
  - configured: analyzers of claims 1, 22, 24, and 25 are configured to respect typed-absence an

**Norvig 1989 (Norvig marker-collision taxonomy)** (coverage=0.000)
  - accommodates: storage holds typed-absence annotation for each target entity when no measuremen
  - distinguishes: the typed-absence annotation takes one of at least four predetermined values dis
  - accommodates: storage holds actionability tier annotation for each target entity taking one of
  - indicates: actionability tier annotation indicates the degree to which the target entity is
  - configured: analyzers of claims 1, 22, 24, and 25 are configured to respect typed-absence an

**US 9,589,014 B2** (coverage=0.000)
  - accommodates: storage holds typed-absence annotation for each target entity when no measuremen
  - distinguishes: the typed-absence annotation takes one of at least four predetermined values dis
  - accommodates: storage holds actionability tier annotation for each target entity taking one of
  - indicates: actionability tier annotation indicates the degree to which the target entity is
  - configured: analyzers of claims 1, 22, 24, and 25 are configured to respect typed-absence an

### claim 30

**Rukhin 2019 (Rukhin metrology)** (coverage=0.125)
  - receive: system receives a coupling group that has been classified as divergent or under 
  - enumerate: experimental-design generator enumerates a plurality of candidate measurement ac
  - specify: each candidate measurement action is specified by a proposing automated actor's 
  - compute: predicted uncertainty for each candidate measurement action is computed via the 
  - derive: expected-information-gain value is derived from the reduction in posterior uncer

**Hall 2022 (GTC metrology)** (coverage=0.125)
  - receive: system receives a coupling group that has been classified as divergent or under 
  - classify: convergence analyzer has previously classified the coupling group as divergent o
  - enumerate: experimental-design generator enumerates a plurality of candidate measurement ac
  - specify: each candidate measurement action is specified by a proposing automated actor's 
  - derive: expected-information-gain value is derived from the reduction in posterior uncer

**Rauf 2025 (Gem entity-splitting framework)** (coverage=0.000)
  - receive: system receives a coupling group that has been classified as divergent or under 
  - classify: convergence analyzer has previously classified the coupling group as divergent o
  - enumerate: experimental-design generator enumerates a plurality of candidate measurement ac
  - specify: each candidate measurement action is specified by a proposing automated actor's 
  - compute: predicted uncertainty for each candidate measurement action is computed via the 

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.000)
  - receive: system receives a coupling group that has been classified as divergent or under 
  - classify: convergence analyzer has previously classified the coupling group as divergent o
  - enumerate: experimental-design generator enumerates a plurality of candidate measurement ac
  - specify: each candidate measurement action is specified by a proposing automated actor's 
  - compute: predicted uncertainty for each candidate measurement action is computed via the 

**Norvig 1989 (Norvig marker-collision taxonomy)** (coverage=0.000)
  - receive: system receives a coupling group that has been classified as divergent or under 
  - classify: convergence analyzer has previously classified the coupling group as divergent o
  - enumerate: experimental-design generator enumerates a plurality of candidate measurement ac
  - specify: each candidate measurement action is specified by a proposing automated actor's 
  - compute: predicted uncertainty for each candidate measurement action is computed via the 

### claim 31

**Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER)** (coverage=0.125)
  - emits: ranked list is emitted by counterfactual generator or experimental-design genera
  - filters: ranked list is further filtered by actionability-tier annotation
  - references: candidate action records or candidate counterfactual histories reference target 
  - indicates: actionability-tier annotation indicates non-actionable status for certain target
  - removes: candidate records referencing non-actionable entities are removed from ranked li

**Vrandečić 2014 (Wikidata)** (coverage=0.125)
  - emits: ranked list is emitted by counterfactual generator or experimental-design genera
  - filters: ranked list is further filtered by actionability-tier annotation
  - references: candidate action records or candidate counterfactual histories reference target 
  - indicates: actionability-tier annotation indicates non-actionable status for certain target
  - removes: candidate records referencing non-actionable entities are removed from ranked li

**Karelina 2023 (Karelina et al. AF)** (coverage=0.125)
  - emits: ranked list is emitted by counterfactual generator or experimental-design genera
  - filters: ranked list is further filtered by actionability-tier annotation
  - references: candidate action records or candidate counterfactual histories reference target 
  - indicates: actionability-tier annotation indicates non-actionable status for certain target
  - removes: candidate records referencing non-actionable entities are removed from ranked li

**Scardino 2023 (Scardino et al. AF)** (coverage=0.125)
  - emits: ranked list is emitted by counterfactual generator or experimental-design genera
  - filters: ranked list is further filtered by actionability-tier annotation
  - references: candidate action records or candidate counterfactual histories reference target 
  - indicates: actionability-tier annotation indicates non-actionable status for certain target
  - removes: candidate records referencing non-actionable entities are removed from ranked li

**Terwilliger 2024 (Terwilliger et al. AF)** (coverage=0.125)
  - emits: ranked list is emitted by counterfactual generator or experimental-design genera
  - filters: ranked list is further filtered by actionability-tier annotation
  - references: candidate action records or candidate counterfactual histories reference target 
  - indicates: actionability-tier annotation indicates non-actionable status for certain target
  - removes: candidate records referencing non-actionable entities are removed from ranked li

### claim 32

**Fahlman 2006 (Scone marker-passing inference)** (coverage=0.125)
  - comprising: system further includes a routing component
  - configured: routing component is configured to perform specific operations
  - receive: routing component receives a detected crack or detected cyclic subgraph from con
  - determine: routing component determines dispatch target based on presence or absence of dyn
  - dispatch: detected crack or cyclic subgraph is dispatched to counterfactual generator of c

**US 7,962,495 B2** (coverage=0.125)
  - comprising: system further includes a routing component
  - configured: routing component is configured to perform specific operations
  - receive: routing component receives a detected crack or detected cyclic subgraph from con
  - determine: routing component determines dispatch target based on presence or absence of dyn
  - dispatch: detected crack or cyclic subgraph is dispatched to counterfactual generator of c

**Xu 2024 (Amazon RefChecker and FEVEROUS/FEVER)** (coverage=0.125)
  - comprising: system further includes a routing component
  - configured: routing component is configured to perform specific operations
  - receive: routing component receives a detected crack or detected cyclic subgraph from con
  - determine: routing component determines dispatch target based on presence or absence of dyn
  - dispatch: detected crack or cyclic subgraph is dispatched to counterfactual generator of c

**Vrandečić 2014 (Wikidata)** (coverage=0.125)
  - comprising: system further includes a routing component
  - configured: routing component is configured to perform specific operations
  - receive: routing component receives a detected crack or detected cyclic subgraph from con
  - determine: routing component determines dispatch target based on presence or absence of dyn
  - dispatch: detected crack or cyclic subgraph is dispatched to counterfactual generator of c

**Karelina 2023 (Karelina et al. AF)** (coverage=0.125)
  - comprising: system further includes a routing component
  - configured: routing component is configured to perform specific operations
  - receive: routing component receives a detected crack or detected cyclic subgraph from con
  - determine: routing component determines dispatch target based on presence or absence of dyn
  - dispatch: detected crack or cyclic subgraph is dispatched to counterfactual generator of c
