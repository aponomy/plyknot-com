"""v2 confound check: does the wrong-sign variable-only signal survive
controls for publication year, number of priors, and in-sample return?

Uses rank-regression residuals for partial Spearman correlation.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
from scipy.stats import spearmanr, rankdata

from .formula import _jaccard

DATA_DIR = Path(__file__).parent / "data"
TESTS_DIR = Path(__file__).parent.parent.parent / "tests" / "phase-1.5"


def load_data():
    with open(DATA_DIR / "predictors-v1.json") as f:
        predictors = json.load(f)
    with open(DATA_DIR / "decay-labels-v1.json") as f:
        decay_raw = json.load(f)
    with open(DATA_DIR / "v2-pattern-coarsening-v1.json") as f:
        coarsening = json.load(f)
    return predictors, {d["id"]: d for d in decay_raw}, coarsening


def residualize(x, z):
    """Residuals of rank(x) regressed on rank(z). For partial Spearman."""
    rx = rankdata(x)
    rz = rankdata(z)
    # OLS: rx = a + b*rz + residual
    rz_centered = rz - np.mean(rz)
    b = np.dot(rz_centered, rx - np.mean(rx)) / np.dot(rz_centered, rz_centered)
    residuals = rx - (np.mean(rx) + b * rz_centered)
    return residuals


def partial_spearman(x, y, z, seed=42):
    """Partial Spearman: correlation of residualized ranks.
    Returns rho, p-value, and permutation null p (1000 iter).
    """
    res_x = residualize(x, z)
    res_y = residualize(y, z)
    rho, p = spearmanr(res_x, res_y)

    rng = np.random.default_rng(seed)
    null_rhos = []
    for _ in range(1000):
        perm_y = rng.permutation(res_y)
        null_rho, _ = spearmanr(res_x, perm_y)
        null_rhos.append(null_rho)
    null_p = float(np.mean([abs(r) >= abs(rho) for r in null_rhos]))

    return float(rho), float(p), null_p


def run():
    predictors, decay, coarsening = load_data()

    # Build per-predictor vectors
    non_amb = [p for p in predictors if not p.get("ambiguous") and p.get("publication_date")]
    sorted_preds = sorted(non_amb, key=lambda p: p["publication_date"])

    var_overlap_scores = []  # variable-only DCOI (coarsened)
    decay_values = []
    pub_years = []
    n_priors_list = []
    in_sample_returns = []
    pred_ids = []

    for i, p in enumerate(sorted_preds):
        pid = p["id"]
        if pid not in decay:
            continue
        dl = decay[pid]
        if dl["decay_magnitude"] is None:
            continue

        # Coarsened variable patterns
        raw_vps = p.get("variable_patterns") or []
        coarsened = frozenset(coarsening.get(vp, vp) for vp in raw_vps)

        # Variable-only overlap with priors
        priors = sorted_preds[:i]
        if not priors:
            var_score = 0.0
        else:
            sims = []
            for pp in priors:
                pp_vps = frozenset(coarsening.get(vp, vp) for vp in (pp.get("variable_patterns") or []))
                sims.append(_jaccard(coarsened, pp_vps))
            var_score = float(np.mean(sims))

        var_overlap_scores.append(var_score)
        decay_values.append(dl["decay_magnitude"])
        pub_years.append(date.fromisoformat(p["publication_date"]).year)
        n_priors_list.append(len(priors))
        in_sample_returns.append(dl["in_sample_return"])
        pred_ids.append(pid)

    var_arr = np.array(var_overlap_scores)
    decay_arr = np.array(decay_values)
    year_arr = np.array(pub_years, dtype=float)
    nprior_arr = np.array(n_priors_list, dtype=float)
    isr_arr = np.array(in_sample_returns)

    n = len(var_arr)
    print(f"N = {n} predictors")

    results = {"n": n, "confounds": {}}

    # Baseline: variable-only vs decay (no controls)
    rho_base, p_base = spearmanr(var_arr, decay_arr)
    print(f"\nBaseline (variable-only vs decay): rho={rho_base:.4f}, p={p_base:.4f}")
    results["baseline"] = {"rho": float(rho_base), "p": float(p_base)}

    # --- Confound 1: Publication year ---
    print("\n=== Confound 1: Publication year ===")
    rho_vy, p_vy = spearmanr(var_arr, year_arr)
    rho_dy, p_dy = spearmanr(decay_arr, year_arr)
    print(f"  var-overlap vs year: rho={rho_vy:.4f}, p={p_vy:.4f}")
    print(f"  decay vs year:      rho={rho_dy:.4f}, p={p_dy:.4f}")

    partial_rho, partial_p, partial_null_p = partial_spearman(var_arr, decay_arr, year_arr)
    print(f"  Partial (controlling year): rho={partial_rho:.4f}, p={partial_p:.4f}, null_p={partial_null_p:.4f}")

    results["confounds"]["publication_year"] = {
        "var_vs_confound": {"rho": float(rho_vy), "p": float(p_vy)},
        "decay_vs_confound": {"rho": float(rho_dy), "p": float(p_dy)},
        "partial": {"rho": partial_rho, "p": partial_p, "null_p": partial_null_p},
    }

    # --- Confound 2: Number of priors ---
    print("\n=== Confound 2: Number of priors ===")
    rho_vn, p_vn = spearmanr(var_arr, nprior_arr)
    rho_dn, p_dn = spearmanr(decay_arr, nprior_arr)
    print(f"  var-overlap vs n_priors: rho={rho_vn:.4f}, p={p_vn:.4f}")
    print(f"  decay vs n_priors:       rho={rho_dn:.4f}, p={p_dn:.4f}")

    partial_rho, partial_p, partial_null_p = partial_spearman(var_arr, decay_arr, nprior_arr)
    print(f"  Partial (controlling n_priors): rho={partial_rho:.4f}, p={partial_p:.4f}, null_p={partial_null_p:.4f}")

    results["confounds"]["number_of_priors"] = {
        "var_vs_confound": {"rho": float(rho_vn), "p": float(p_vn)},
        "decay_vs_confound": {"rho": float(rho_dn), "p": float(p_dn)},
        "partial": {"rho": partial_rho, "p": partial_p, "null_p": partial_null_p},
    }

    # --- Confound 3: In-sample return magnitude ---
    print("\n=== Confound 3: In-sample return magnitude ===")
    rho_vi, p_vi = spearmanr(var_arr, isr_arr)
    rho_di, p_di = spearmanr(decay_arr, isr_arr)
    print(f"  var-overlap vs in_sample: rho={rho_vi:.4f}, p={p_vi:.4f}")
    print(f"  decay vs in_sample:       rho={rho_di:.4f}, p={p_di:.4f}")

    partial_rho, partial_p, partial_null_p = partial_spearman(var_arr, decay_arr, isr_arr)
    print(f"  Partial (controlling in_sample): rho={partial_rho:.4f}, p={partial_p:.4f}, null_p={partial_null_p:.4f}")

    results["confounds"]["in_sample_return"] = {
        "var_vs_confound": {"rho": float(rho_vi), "p": float(p_vi)},
        "decay_vs_confound": {"rho": float(rho_di), "p": float(p_di)},
        "partial": {"rho": partial_rho, "p": partial_p, "null_p": partial_null_p},
    }

    # --- Classification ---
    partial_results = [
        results["confounds"]["publication_year"]["partial"],
        results["confounds"]["number_of_priors"]["partial"],
        results["confounds"]["in_sample_return"]["partial"],
    ]

    all_survive = all(abs(pr["rho"]) >= 0.2 and pr["p"] < 0.05 for pr in partial_results)
    any_drop = any(abs(pr["rho"]) < 0.15 or pr["p"] > 0.1 for pr in partial_results)

    if all_survive:
        classification = "signal-survives"
    elif any_drop:
        classification = "signal-explained-by-confound"
    else:
        classification = "mixed"

    results["classification"] = classification
    print(f"\n=== Classification: {classification} ===")

    # Save
    with open(TESTS_DIR / "test-2-v2-confound-results.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {TESTS_DIR / 'test-2-v2-confound-results.json'}")

    # Residual scatter for the strongest surviving partial, if any
    make_residual_scatter(var_arr, decay_arr, year_arr, results)

    return results


def make_residual_scatter(var_arr, decay_arr, year_arr, results):
    """Scatter of residualized var-overlap vs residualized decay (controlling year)."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    res_var = residualize(var_arr, year_arr)
    res_decay = residualize(decay_arr, year_arr)
    pr = results["confounds"]["publication_year"]["partial"]

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(res_var, res_decay, alpha=0.6, edgecolors="black", linewidths=0.5)
    ax.set_xlabel("Variable-overlap (residual, controlling pub year)", fontsize=11)
    ax.set_ylabel("Decay magnitude (residual, controlling pub year)", fontsize=11)
    ax.set_title(
        f"Partial correlation: var-overlap vs decay | pub year\n"
        f"rho={pr['rho']:.3f}, p={pr['p']:.3f}, perm_p={pr['null_p']:.3f}",
        fontsize=11,
    )
    fig.tight_layout()
    fig.savefig(TESTS_DIR / "test-2-v2-confound-scatter.png", dpi=150)
    plt.close(fig)
    print(f"Residual scatter saved.")


if __name__ == "__main__":
    run()
