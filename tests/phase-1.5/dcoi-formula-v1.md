# DCOI Formula Specification v1

**Version:** v1
**Date:** 2026-04-26
**Author:** Klas Ehnemark
**Commit:** *(filled at merge)*

**What this version locks:** The DCOI formula, all conventions, and the canonicalization maps below. Any change post-merge becomes v1.x with rationale recorded.

---

## 1. Formula

**Input.** A predictor P has three fields relevant to DCOI:

- `predictor_id` -- unique identifier
- `publication_date` -- date the predictor was introduced
- `database_families` -- set of canonicalized database family names (e.g. {CRSP, Compustat})
- `variable_patterns` -- set of canonicalized variable pattern names (e.g. {accruals, asset_growth})

**Per-pair similarity.** For two predictors P and P':

    sim(P, P') = ( J(db(P), db(P')) + J(vp(P), vp(P')) ) / 2

where J(A, B) = |A intersection B| / |A union B| is the Jaccard index, with J(empty, empty) = 0 by convention.

The two dimensions (database families, variable patterns) are equal-weighted.

**Aggregation across prior predictors.** For predictor P published at date d, let Prior(P) = {P' : publication_date(P') < d}. Define:

    DCOI(P) = mean( { sim(P, P') : P' in Prior(P) } )

with DCOI(P) = 0 when Prior(P) is empty (the first published predictor has no priors and therefore no overlap).

## 2. Input schema

```python
@dataclass(frozen=True)
class PredictorInputs:
    predictor_id: str
    publication_date: date
    database_families: frozenset[str]
    variable_patterns: frozenset[str]
```

**Field descriptions:**

- **predictor_id** -- Unique string identifying the predictor. Typically the lead author's surname plus a short label (e.g. "sloan_accruals"). Assigned during extraction (Stage 2+).
- **publication_date** -- The date the predictor's introducing paper was published. Used solely for chronological ordering to determine Prior(P). Extracted from the predictor's introducing paper.
- **database_families** -- Canonicalized set of data source families used to construct the predictor. Extracted from the data section of the introducing paper, then mapped through DATABASE_FAMILY_CANONICALIZATION.
- **variable_patterns** -- Canonicalized set of variable construction patterns used by the predictor. Extracted from the methodology section of the introducing paper, then mapped through VARIABLE_PATTERN_CANONICALIZATION.

## 3. Conventions

1. **Jaccard on empty sets returns 0.** J(empty, empty) = 0, not undefined, not 1. Rationale: two predictors that both lack database information share no operational substrate; treating the absence of information as perfect overlap would inflate DCOI.

2. **First-published predictor has DCOI = 0.** When Prior(P) is empty, DCOI(P) = 0. The first predictor in chronological order has nothing to overlap with.

3. **Mean over priors, not max.** DCOI aggregates via arithmetic mean across all prior predictors. This measures average overlap with the prior body of work. The reflexive-decay hypothesis is about how much of the predictor's operational substrate is shared with the *literature*, not just with one specific competitor. If Stage 4 fails, "max instead of mean" is not a permitted v1 retuning -- it is a v2 with its own preregistration.

4. **Equal weighting of dimensions.** Database family Jaccard and variable pattern Jaccard contribute equally (weight 0.5 each). v1 has no principled basis for weighting one above the other. What would justify reweighting in v2: calibration against hand-coded ground truth showing one dimension is empirically more informative about decay magnitude.

## 4. Canonicalization

The canonicalization maps are part of the formula. They are constants in `plyknot_com/dcoi/canonicalize.py`, not runtime configuration.

### Database families (v1)

| Family | Mapped variants |
|--------|----------------|
| CRSP | CRSP, CRSP daily returns, CRSP monthly returns, CRSP daily, CRSP monthly, CRSP/Compustat merged |
| Compustat | Compustat, Compustat North America, Compustat Annual, Compustat Quarterly, Compustat Global |
| IBES | IBES, IBES summary file, IBES detail file, I/B/E/S |
| TAQ | TAQ, NYSE TAQ |
| CDS Markit | CDS Markit, Markit CDS |
| 13F holdings | 13F holdings, Thomson Reuters 13F, 13F |
| OptionMetrics | OptionMetrics, OptionMetrics IvyDB |
| Datastream | Datastream, Thomson Datastream, Refinitiv Datastream |

Any string not in the map is canonicalized to itself with a `WARN: uncanonicalized_db` log entry. The warning surfaces unmapped strings during calibration (Stage 3).

### Variable patterns (v1)

| Pattern | Mapped variants |
|---------|----------------|
| accruals | accruals, working_capital_accruals, total_accruals, discretionary_accruals |
| asset_growth | asset_growth, asset_growth_yoy, total_asset_growth |
| momentum | momentum, price_momentum, return_momentum, intermediate_momentum |
| value | book_to_market, book_market, earnings_to_price, ep_ratio |
| profitability | profitability, gross_profitability, operating_profitability, roe, roa |
| investment | investment, capital_expenditure, rd_expenditure |
| size | market_cap, firm_size, market_equity |
| volatility | volatility, idiosyncratic_volatility, return_volatility |
| turnover | turnover, share_turnover, volume_turnover |
| leverage | leverage, debt_to_equity, financial_leverage |
| beta | beta, market_beta, capm_beta |
| earnings_surprise | earnings_surprise, sue, post_earnings_drift |
| short_interest | short_interest, short_ratio, days_to_cover |
| illiquidity | illiquidity, amihud_illiquidity, bid_ask_spread |

Any string not in the map is canonicalized to itself with a `WARN: uncanonicalized_var` log entry. New patterns discovered during calibration are flagged for spec amendment (v1.x).

### Adding new entries

New canonicalization entries are added as spec amendments (v1.1, v1.2, etc.) with rationale recorded. They do not retroactively change any DCOI values already computed -- recomputation is explicit and logged.

## 5. Worked examples

### Case 1 -- Single-predictor universe

- P1: published 2000-01-01, db={CRSP}, vp={accruals}
- Prior(P1) = empty
- **DCOI(P1) = 0.0**

### Case 2 -- Two predictors, no overlap

- P1: published 2000-01-01, db={CRSP}, vp={accruals}
- P2: published 2001-01-01, db={Compustat}, vp={asset_growth}
- Prior(P2) = {P1}
- sim(P2, P1) = (J({Compustat}, {CRSP}) + J({asset_growth}, {accruals})) / 2 = (0 + 0) / 2 = 0
- **DCOI(P2) = 0.0**

### Case 3 -- Full overlap

- P1: published 2000-01-01, db={CRSP}, vp={accruals}
- P2: published 2001-01-01, db={CRSP}, vp={accruals}
- Prior(P2) = {P1}
- sim(P2, P1) = (J({CRSP}, {CRSP}) + J({accruals}, {accruals})) / 2 = (1 + 1) / 2 = 1.0
- **DCOI(P2) = 1.0**

### Case 4 -- Partial overlap, multiple priors

- P1: published 1995-01-01, db={CRSP}, vp={accruals}
- P2: published 2000-01-01, db={CRSP, Compustat}, vp={accruals, asset_growth}
- P3: published 2005-01-01, db={Compustat}, vp={asset_growth}
- Prior(P3) = {P1, P2}
- sim(P3, P1) = (J({Compustat}, {CRSP}) + J({asset_growth}, {accruals})) / 2 = (0 + 0) / 2 = 0
- sim(P3, P2) = (J({Compustat}, {CRSP, Compustat}) + J({asset_growth}, {accruals, asset_growth})) / 2 = (1/2 + 1/2) / 2 = 0.5
- DCOI(P3) = (0 + 0.5) / 2 = **0.25**

### Case 5 -- Empty database family (convention check)

- P1: published 2000-01-01, db=empty, vp={accruals}
- P2: published 2001-01-01, db=empty, vp={accruals}
- Prior(P2) = {P1}
- sim(P2, P1) = (J(empty, empty) + J({accruals}, {accruals})) / 2 = (0 + 1) / 2 = 0.5
- **DCOI(P2) = 0.5**

This pins the convention: Jaccard on two empty sets returns 0, not 1.

## 6. What v1 does not address

- **Time-discounting.** Closer-in-time priors might matter more for predicting decay. v1 treats all priors equally regardless of temporal distance.
- **Predictor direction.** Some predictors share data but go in opposite directions (e.g. long momentum vs. short-term reversal on the same data). v1 ignores direction.
- **Variable-construction depth.** v1 treats variable patterns as flat labels. A richer ontology (e.g. "accruals computed via balance sheet" vs. "accruals computed via cash flow statement") is v2 territory.
- **Weighting by predictor significance.** v1 weighs all prior predictors equally. Weighting by the prior's own significance or citation count is not addressed.
- **Non-Jaccard similarity.** Jaccard is a set similarity measure. Alternatives (e.g. cosine similarity on feature vectors) are not considered in v1.

## 7. Pass/fail criterion for Stage 4

**Preregistered correlation test:**

Spearman rank correlation between DCOI(P) and post-publication decay magnitude across the McLean-Pontiff 97 predictors.

**Threshold:** rho >= 0.3 with p < 0.05 under a 1000-permutation null test.

**Interpretation:**
- **Pass (rho >= 0.3, p < 0.05):** The data-coupling overlap index has predictive power for post-publication decay. Proceed to interpret and publish.
- **Fail (rho < 0.3 or p >= 0.05):** The v1 formula does not capture the decay mechanism at the preregistered threshold. This is a finding about the formula, not a license to retune. A v2 formula requires its own preregistration before any new correlation analysis.

**Decay magnitude definition:** The post-publication decline in predictor returns as reported or derived from McLean and Pontiff (2016). The exact operationalization (e.g. percentage decline in long-short portfolio alpha) is specified in Stage 2 when the predictor registry is built.

---

*End of DCOI formula v1 specification.*
