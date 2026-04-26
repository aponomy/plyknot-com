"""v2 correlation: same DCOI formula, coarsened variable patterns.

Applies the v2 pattern coarsening map, recomputes DCOI, and runs
the same Spearman + permutation-null analysis as v1.
Also runs side-diagnostics: variable-only and database-only correlations.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
from scipy.stats import spearmanr

from .formula import PredictorInputs, compute_dcoi, _jaccard

DATA_DIR = Path(__file__).parent / "data"
TESTS_DIR = Path(__file__).parent.parent.parent / "tests" / "phase-1.5"


def load_coarsened_predictors():
    """Load predictors with v2-coarsened variable patterns."""
    with open(DATA_DIR / "predictors-v1.json") as f:
        predictors = json.load(f)
    with open(DATA_DIR / "v2-pattern-coarsening-v1.json") as f:
        coarsening = json.load(f)

    results = []
    for p in predictors:
        if p.get("ambiguous"):
            continue
        if p.get("publication_date") is None:
            continue

        # Coarsen variable patterns
        raw_vps = p.get("variable_patterns") or []
        coarsened_vps = frozenset(coarsening.get(vp, vp) for vp in raw_vps)

        results.append({
            "id": p["id"],
            "publication_date": date.fromisoformat(p["publication_date"]),
            "database_families": frozenset(p.get("database_families") or []),
            "variable_patterns_v1": frozenset(raw_vps),
            "variable_patterns_v2": coarsened_vps,
        })
    return results


def make_inputs(pred, use_v2_patterns=True):
    """Convert to PredictorInputs using v2 or v1 patterns."""
    vps = pred["variable_patterns_v2"] if use_v2_patterns else pred["variable_patterns_v1"]
    return PredictorInputs(
        predictor_id=pred["id"],
        publication_date=pred["publication_date"],
        database_families=pred["database_families"],
        variable_patterns=vps,
    )


def run_correlation(predictors, use_v2_patterns=True, seed=42):
    """Run DCOI-decay Spearman correlation with permutation null test."""
    with open(DATA_DIR / "decay-labels-v1.json") as f:
        decay_raw = json.load(f)
    decay = {d["id"]: d for d in decay_raw}

    sorted_preds = sorted(predictors, key=lambda p: p["publication_date"])

    dcoi_scores = []
    decay_values = []
    pred_ids = []

    for i, p in enumerate(sorted_preds):
        if p["id"] not in decay:
            continue
        dl = decay[p["id"]]
        if dl["decay_magnitude"] is None:
            continue

        priors = sorted_preds[:i]
        prior_inputs = [make_inputs(pp, use_v2_patterns) for pp in priors]
        score = compute_dcoi(make_inputs(p, use_v2_patterns), prior_inputs)
        dcoi_scores.append(score)
        decay_values.append(dl["decay_magnitude"])
        pred_ids.append(p["id"])

    dcoi_arr = np.array(dcoi_scores)
    decay_arr = np.array(decay_values)

    rho, p_value = spearmanr(dcoi_arr, decay_arr)

    rng = np.random.default_rng(seed)
    null_rhos = []
    for _ in range(1000):
        permuted = rng.permutation(decay_arr)
        null_rho, _ = spearmanr(dcoi_arr, permuted)
        null_rhos.append(null_rho)

    null_rhos_arr = np.array(null_rhos)
    null_p = float(np.mean(np.abs(null_rhos_arr) >= abs(rho)))

    return {
        "n": len(dcoi_scores),
        "rho": float(rho),
        "p": float(p_value),
        "null_p": null_p,
        "dcoi_min": float(np.min(dcoi_arr)),
        "dcoi_max": float(np.max(dcoi_arr)),
        "dcoi_mean": float(np.mean(dcoi_arr)),
        "dcoi_median": float(np.median(dcoi_arr)),
        "dcoi_std": float(np.std(dcoi_arr)),
        "scores": list(zip(pred_ids, dcoi_scores, decay_values)),
    }


def run_single_dimension_correlation(predictors, dimension, seed=42):
    """Correlation using only one Jaccard dimension (db or var)."""
    with open(DATA_DIR / "decay-labels-v1.json") as f:
        decay_raw = json.load(f)
    decay = {d["id"]: d for d in decay_raw}

    sorted_preds = sorted(predictors, key=lambda p: p["publication_date"])

    scores = []
    decay_values = []
    pred_ids = []

    for i, p in enumerate(sorted_preds):
        if p["id"] not in decay:
            continue
        dl = decay[p["id"]]
        if dl["decay_magnitude"] is None:
            continue

        priors = sorted_preds[:i]
        if not priors:
            scores.append(0.0)
        else:
            sims = []
            for pp in priors:
                if dimension == "db":
                    j = _jaccard(p["database_families"], pp["database_families"])
                else:
                    j = _jaccard(p["variable_patterns_v2"], pp["variable_patterns_v2"])
                sims.append(j)
            scores.append(float(np.mean(sims)))

        decay_values.append(dl["decay_magnitude"])
        pred_ids.append(p["id"])

    scores_arr = np.array(scores)
    decay_arr = np.array(decay_values)

    rho, p_value = spearmanr(scores_arr, decay_arr)

    rng = np.random.default_rng(seed)
    null_rhos = [float(spearmanr(scores_arr, rng.permutation(decay_arr))[0]) for _ in range(1000)]
    null_p = float(np.mean([abs(r) >= abs(rho) for r in null_rhos]))

    return {"rho": float(rho), "p": float(p_value), "null_p": null_p, "n": len(scores)}


def pairwise_jaccard_stats(predictors, use_v2=True):
    """Compute pairwise variable-pattern Jaccard stats (pre/post coarsening)."""
    from itertools import combinations
    zero_count = 0
    total = 0
    for p1, p2 in combinations(predictors, 2):
        key = "variable_patterns_v2" if use_v2 else "variable_patterns_v1"
        j = _jaccard(p1[key], p2[key])
        if j == 0:
            zero_count += 1
        total += 1
    return {"zero_frac": zero_count / total if total else 0, "total_pairs": total}


def make_scatter(scores, output_path, title_extra=""):
    """Generate DCOI vs decay scatter plot."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    dcoi = [s[1] for s in scores]
    decay = [s[2] for s in scores]

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(dcoi, decay, alpha=0.6, edgecolors="black", linewidths=0.5)
    ax.set_xlabel("DCOI Score (v2)", fontsize=12)
    ax.set_ylabel("Decay Magnitude", fontsize=12)
    ax.set_title(f"DCOI v2 vs Decay{title_extra}", fontsize=11)
    ax.axhline(y=0, color="gray", linestyle="--", alpha=0.5)
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)


if __name__ == "__main__":
    predictors = load_coarsened_predictors()
    print(f"Loaded {len(predictors)} non-ambiguous predictors with coarsened patterns")

    # Pre/post coarsening stats
    v1_stats = pairwise_jaccard_stats(predictors, use_v2=False)
    v2_stats = pairwise_jaccard_stats(predictors, use_v2=True)
    print(f"\nPairwise var-Jaccard=0: v1={v1_stats['zero_frac']:.1%}, v2={v2_stats['zero_frac']:.1%}")

    # v2 correlation (coarsened patterns + databases)
    print("\n=== v2 full DCOI correlation ===")
    v2 = run_correlation(predictors, use_v2_patterns=True)
    print(f"  n={v2['n']}, rho={v2['rho']:.4f}, p={v2['p']:.4f}, null_p={v2['null_p']:.4f}")
    print(f"  DCOI range: [{v2['dcoi_min']:.4f}, {v2['dcoi_max']:.4f}], "
          f"median={v2['dcoi_median']:.4f}, std={v2['dcoi_std']:.4f}")

    passes_rho = v2["rho"] >= 0.3
    passes_null = v2["null_p"] < 0.05
    if passes_rho and passes_null:
        outcome = "PASS"
    elif passes_rho or passes_null:
        outcome = "PARTIAL"
    else:
        outcome = "FAIL"
    print(f"  Outcome: {outcome}")

    # v1 for comparison
    print("\n=== v1 full DCOI correlation (for comparison) ===")
    v1 = run_correlation(predictors, use_v2_patterns=False)
    print(f"  n={v1['n']}, rho={v1['rho']:.4f}, p={v1['p']:.4f}, null_p={v1['null_p']:.4f}")

    # Side-diagnostics: variable-only
    print("\n=== Variable-only correlation (v2 patterns) ===")
    var_only = run_single_dimension_correlation(predictors, "var")
    print(f"  rho={var_only['rho']:.4f}, p={var_only['p']:.4f}, null_p={var_only['null_p']:.4f}")

    # Side-diagnostics: database-only
    print("\n=== Database-only correlation ===")
    db_only = run_single_dimension_correlation(predictors, "db")
    print(f"  rho={db_only['rho']:.4f}, p={db_only['p']:.4f}, null_p={db_only['null_p']:.4f}")

    # Save scatter
    make_scatter(v2["scores"], TESTS_DIR / "test-2-v2-scatter.png")
    print(f"\nScatter saved to {TESTS_DIR / 'test-2-v2-scatter.png'}")

    # Save full results
    results = {
        "outcome": outcome,
        "v2_coarsened": {
            "n": v2["n"],
            "rho": v2["rho"],
            "p": v2["p"],
            "null_p": v2["null_p"],
            "dcoi_min": v2["dcoi_min"],
            "dcoi_max": v2["dcoi_max"],
            "dcoi_mean": v2["dcoi_mean"],
            "dcoi_median": v2["dcoi_median"],
            "dcoi_std": v2["dcoi_std"],
        },
        "v1_comparison": {
            "rho": v1["rho"],
            "p": v1["p"],
            "null_p": v1["null_p"],
        },
        "pairwise_var_jaccard_zero": {
            "v1": v1_stats["zero_frac"],
            "v2": v2_stats["zero_frac"],
        },
        "side_diagnostics": {
            "variable_only": var_only,
            "database_only": db_only,
        },
    }
    with open(TESTS_DIR / "test-2-v2-correlation-results.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to {TESTS_DIR / 'test-2-v2-correlation-results.json'}")
