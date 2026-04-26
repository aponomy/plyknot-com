# Stage 3 Final Report — Plyknot Patent FTO

**Date:** 2026-04-26
**Claims:** 1–35 (v6.3 ladder)
**IDS references:** 49
**Beams:** patent claims (predict), source code (measure)
  — paper/validation beams deferred to Stage 3.1

---

## Aggregate Findings

**Phase 6 verdict distribution:**
  - MIXED: 1
  - RESISTS_LENS: 1644
  - STRUCTURALLY_ABSENT: 70

**Top §112 enablement risks (claim-does-not-code Shear):**
  *None detected.*

**Top 5 Strategic Shear candidates (code-does-not-claim):**
  - `identifying:groups of (target, property) records that contain at least two recor` — code mass 5.493, divergence 0.333
  - `comprising:system includes claim 29 and claim 30 as components` — code mass 5.493, divergence 0.667
  - `calculate:bekenstein bound computed from radius and energy` — code mass 0.549, divergence 0.314
  - `identifies:the event identifier points to a specific event in the append-only lo` — code mass 0.000, divergence 0.333
  - `classify:convergence analyzer has previously classified the coupling group as di` — code mass 0.000, divergence 0.412

**Top 3 patent cracks (shared mechanism-level FTO threats):**
  - Node `exclude:system does not comprise a separate model-card, mode` — strength 0.640, plyknot chains: ['plyknot_claim_1']
  - Node `perform:all semantic labelling, if performed, is performed e` — strength 0.640, plyknot chains: ['plyknot_claim_1']
  - Node `classify:the group is classified as single instead of conver` — strength 0.640, plyknot chains: ['plyknot_claim_4']

**Structural holes detected:** 0

---

## Per-Claim Analysis

### Claim 1  [YELLOW]
**Phenomenological mass:** 0.2167  (tier=5, conv=0.027, code_measurers=4, predicates=26)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** 4
  - `exclude:system does not comprise a separate model-card, mode` strength=0.640 vs ['ref_v6_2_6']
  - `perform:all semantic labelling, if performed, is performed e` strength=0.640 vs ['ref_v6_1_p6']

### Claim 2  [YELLOW]
**Phenomenological mass:** 0.2067  (tier=5, conv=0.023, code_measurers=5, predicates=13)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 3  [YELLOW]
**Phenomenological mass:** 0.0578  (tier=5, conv=0.017, code_measurers=1, predicates=6)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 4  [YELLOW]
**Phenomenological mass:** 0.0000  (tier=5, conv=0.020, code_measurers=0, predicates=5)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** 1
  - `classify:the group is classified as single instead of conver` strength=0.640 vs ['ref_v6_2_13']

### Claim 5  [YELLOW]
**Phenomenological mass:** 0.3449  (tier=5, conv=0.043, code_measurers=4, predicates=7)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 6  [YELLOW]
**Phenomenological mass:** 0.2521  (tier=5, conv=0.036, code_measurers=3, predicates=11)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** 1
  - `detect:the last physical-interaction record is removed from ` strength=0.512 vs ['ref_v6_1_p6', 'ref_v6_2_2']

### Claim 7  [YELLOW]
**Phenomenological mass:** 0.0000  (tier=5, conv=0.000, code_measurers=0, predicates=8)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 8  [YELLOW]
**Phenomenological mass:** 0.1373  (tier=5, conv=0.025, code_measurers=2, predicates=12)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 9  [YELLOW]
**Phenomenological mass:** 0.1733  (tier=5, conv=0.025, code_measurers=3, predicates=12)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 10  [GREEN]
**Phenomenological mass:** 0.7625  (tier=5, conv=0.110, code_measurers=3, predicates=10)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 11  [GREEN]
**Phenomenological mass:** 1.5106  (tier=5, conv=0.275, code_measurers=2, predicates=4)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 12  [GREEN]
**Phenomenological mass:** 0.6931  (tier=5, conv=0.067, code_measurers=7, predicates=6)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 13  [GREEN]
**Phenomenological mass:** 1.4967  (tier=5, conv=0.130, code_measurers=9, predicates=20)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** 3
  - `storing:acquired record is stored together with further meas` strength=0.640 vs ['ref_v6_2_3']
  - `applying:decomposition is subject to minimum-size, bic-impro` strength=0.640 vs ['ref_v6_1_p9']

### Claim 14  [YELLOW]
**Phenomenological mass:** 0.0347  (tier=5, conv=0.010, code_measurers=1, predicates=10)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 15  [YELLOW]
**Phenomenological mass:** 0.0866  (tier=5, conv=0.025, code_measurers=1, predicates=4)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 16  [YELLOW]
**Phenomenological mass:** 0.0916  (tier=5, conv=0.017, code_measurers=2, predicates=6)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 46, 'STRUCTURALLY_ABSENT': 2, 'MIXED': 1}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 17  [YELLOW]
**Phenomenological mass:** 0.0000  (tier=5, conv=0.014, code_measurers=0, predicates=7)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** 1
  - `identify:a non-transitory computer-readable medium exists as` strength=0.640 vs ['ref_v6_1_6']

### Claim 18  [YELLOW]
**Phenomenological mass:** 0.0000  (tier=5, conv=0.000, code_measurers=0, predicates=0)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 19  [YELLOW]
**Phenomenological mass:** 0.0000  (tier=5, conv=0.000, code_measurers=0, predicates=0)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 20  [GREEN]
**Phenomenological mass:** 0.6354  (tier=5, conv=0.183, code_measurers=1, predicates=6)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 21  [YELLOW]
**Phenomenological mass:** 0.0347  (tier=5, conv=0.010, code_measurers=1, predicates=10)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 22  [YELLOW]
**Phenomenological mass:** 0.0495  (tier=5, conv=0.014, code_measurers=1, predicates=7)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 23  [GREEN]
**Phenomenological mass:** 0.9242  (tier=5, conv=0.133, code_measurers=3, predicates=9)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 24  [YELLOW]
**Phenomenological mass:** 0.0687  (tier=5, conv=0.013, code_measurers=2, predicates=8)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 25  [YELLOW]
**Phenomenological mass:** 0.1386  (tier=5, conv=0.020, code_measurers=3, predicates=5)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 26  [YELLOW]
**Phenomenological mass:** 0.0990  (tier=5, conv=0.029, code_measurers=1, predicates=7)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** 1
  - `emit:system emits a requisite-variety-deficit event in the a` strength=0.640 vs ['ref_v6_1_1']

### Claim 27  [YELLOW]
**Phenomenological mass:** 0.0000  (tier=5, conv=0.000, code_measurers=0, predicates=7)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 28  [YELLOW]
**Phenomenological mass:** 0.3296  (tier=5, conv=0.060, code_measurers=2, predicates=5)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 29  [YELLOW]
**Phenomenological mass:** 0.0000  (tier=5, conv=0.000, code_measurers=0, predicates=7)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 30  [YELLOW]
**Phenomenological mass:** 0.2599  (tier=5, conv=0.037, code_measurers=3, predicates=8)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 31  [YELLOW]
**Phenomenological mass:** 0.3018  (tier=5, conv=0.037, code_measurers=4, predicates=8)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 32  [YELLOW]
**Phenomenological mass:** 0.0687  (tier=5, conv=0.013, code_measurers=2, predicates=8)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 33  [YELLOW]
**Phenomenological mass:** 0.2599  (tier=5, conv=0.037, code_measurers=3, predicates=8)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 34  [YELLOW]
**Phenomenological mass:** 0.0000  (tier=5, conv=0.000, code_measurers=0, predicates=6)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

### Claim 35  [YELLOW]
**Phenomenological mass:** 0.2747  (tier=5, conv=0.050, code_measurers=2, predicates=4)
**Note:** code beam only (partial mass — Stage 3.1 adds paper/validation)

**FTO verdicts (49 refs):** {'RESISTS_LENS': 47, 'STRUCTURALLY_ABSENT': 2}
**§112 risks for this claim:** *see aggregate list above (claim-level mapping deferred)*
**Patent cracks:** None detected for this claim

---

## Risk Summary: 6 GREEN / 29 YELLOW / 0 RED