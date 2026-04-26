# Stage 3 Spot-Check Comparison (vs Stage 2)

Five pairs examined in Stage 2 spot-check, now re-evaluated with Lensing Strain modulation.

## Pair 1: claim_01 × ref_v6_1_1
**Stage 2 status:** not_covered  coverage=0.0769
**Stage 3 verdict:** RESISTS_LENS  coverage=0.0769  Lensing Strain=0.7857
**Thin flag:** True  (n_cond=4 predicates)
**Verdict agreement:** YES (directionally)
**New diagnostics:** Lensing Strain=0.7857 

## Pair 2: claim_09 × ref_v6_1_2
**Stage 2 status:** not_covered  coverage=0.0833
**Stage 3 verdict:** RESISTS_LENS  coverage=0.0833  Lensing Strain=0.68
**Thin flag:** True  (n_cond=2 predicates)
**Verdict agreement:** YES (directionally)
**New diagnostics:** Lensing Strain=0.6800 

## Pair 3: claim_16 × ref_v6_1_p7
**Stage 2 status:** not_covered  coverage=0.3333
**Stage 3 verdict:** MIXED  coverage=0.3333  Lensing Strain=0.75
**Thin flag:** True  (n_cond=1 predicates)

**Pair 3 (Claim 16 / Esward) — thin-extraction check:**
Stage 2 spot-check identified this as a thin-extraction artifact (reference text too sparse for reliable grounding).
Stage 3 thin_flag = TRUE — **mechanically caught**. Framework correctly flags the unreliable score via `thin_extraction_unreliable_score` qualifier.
**Verdict agreement:** YES (directionally)
**New diagnostics:** Lensing Strain=0.7500 

## Pair 4: claim_01 × ref_v6_2_1
**Stage 2 status:** not_covered  coverage=0.0
**Stage 3 verdict:** RESISTS_LENS  coverage=0.0  Lensing Strain=0.9083
**Thin flag:** True  (n_cond=3 predicates)
**Verdict agreement:** YES (directionally)
**New diagnostics:** Lensing Strain=0.9083 

## Pair 5: claim_08 × ref_v6_2_18
**Stage 2 status:** not_covered  coverage=0.0
**Stage 3 verdict:** RESISTS_LENS  coverage=0.0  Lensing Strain=0.5833
**Thin flag:** True  (n_cond=4 predicates)
**Verdict agreement:** YES (directionally)
**New diagnostics:** Lensing Strain=0.5833 
