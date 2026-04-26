"""Spearman correlation between DCOI and post-publication decay,
with 1000-permutation null test.

Preregistered threshold (Stage 1 spec):
  Spearman rho >= 0.3 AND permutation_null_p < 0.05
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from scipy.stats import spearmanr

from .decay_labels import load_decay_labels
from .formula import compute_dcoi
from .registry import load_complete_registry

DATA_DIR = Path(__file__).parent / "data"


def run_correlation(seed: int = 42) -> dict:
    """Run the preregistered DCOI-decay correlation analysis.

    Returns a dict with all results needed for the results document.
    """
    predictors = load_complete_registry(DATA_DIR / "predictors-v1.json")
    decay = load_decay_labels(DATA_DIR / "decay-labels-v1.json")

    # Exclude ambiguous
    non_ambiguous = [p for p in predictors if not p.ambiguous]
    n_excluded = len(predictors) - len(non_ambiguous)

    # Sort by publication date (DCOI requires chronological order)
    predictors_sorted = sorted(non_ambiguous, key=lambda p: p.publication_date)

    dcoi_scores = []
    decay_values = []
    predictor_ids = []
    for i, p in enumerate(predictors_sorted):
        if p.id not in decay:
            continue
        dl = decay[p.id]
        if dl.decay_magnitude is None:
            continue
        priors = predictors_sorted[:i]
        prior_inputs = [pp.to_dcoi_inputs() for pp in priors]
        score = compute_dcoi(p.to_dcoi_inputs(), prior_inputs)
        dcoi_scores.append(score)
        decay_values.append(dl.decay_magnitude)
        predictor_ids.append(p.id)

    dcoi_arr = np.array(dcoi_scores)
    decay_arr = np.array(decay_values)

    rho, p_value = spearmanr(dcoi_arr, decay_arr)

    # Permutation null test
    rng = np.random.default_rng(seed)
    null_rhos = []
    for _ in range(1000):
        permuted = rng.permutation(decay_arr)
        null_rho, _ = spearmanr(dcoi_arr, permuted)
        null_rhos.append(null_rho)

    null_rhos_arr = np.array(null_rhos)
    null_p = float(np.mean(np.abs(null_rhos_arr) >= abs(rho)))

    # Pass/fail
    passes_rho = float(rho) >= 0.3
    passes_null = null_p < 0.05
    if passes_rho and passes_null:
        outcome = "PASS"
    elif passes_rho or passes_null:
        outcome = "PARTIAL"
    else:
        outcome = "FAIL"

    # Top/bottom 5
    ranked = sorted(zip(predictor_ids, dcoi_scores, decay_values),
                    key=lambda x: x[1], reverse=True)
    top5 = ranked[:5]
    bottom5 = ranked[-5:]

    return {
        "outcome": outcome,
        "n_predictors": len(dcoi_scores),
        "n_total": len(predictors),
        "n_excluded_ambiguous": n_excluded,
        "n_excluded_missing_decay": len(non_ambiguous) - len(dcoi_scores),
        "spearman_rho": float(rho),
        "spearman_p": float(p_value),
        "permutation_null_p": null_p,
        "null_distribution_summary": {
            "mean": float(np.mean(null_rhos_arr)),
            "std": float(np.std(null_rhos_arr)),
            "p05": float(np.percentile(null_rhos_arr, 5)),
            "p95": float(np.percentile(null_rhos_arr, 95)),
        },
        "top5_highest_dcoi": [
            {"id": pid, "dcoi": round(d, 4), "decay": round(dec, 4)}
            for pid, d, dec in top5
        ],
        "bottom5_lowest_dcoi": [
            {"id": pid, "dcoi": round(d, 4), "decay": round(dec, 4)}
            for pid, d, dec in bottom5
        ],
        "all_scores": [
            {"id": pid, "dcoi": round(d, 4), "decay": round(dec, 4)}
            for pid, d, dec in zip(predictor_ids, dcoi_scores, decay_values)
        ],
    }


def make_scatter_plot(results: dict, output_path: Path) -> None:
    """Generate DCOI vs decay scatter plot."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    scores = results["all_scores"]
    dcoi = [s["dcoi"] for s in scores]
    decay = [s["decay"] for s in scores]

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(dcoi, decay, alpha=0.6, edgecolors="black", linewidths=0.5)
    ax.set_xlabel("DCOI Score", fontsize=12)
    ax.set_ylabel("Decay Magnitude", fontsize=12)
    ax.set_title(
        f"DCOI vs Post-Publication Decay (n={results['n_predictors']})\n"
        f"Spearman rho={results['spearman_rho']:.3f}, "
        f"perm. p={results['permutation_null_p']:.3f}",
        fontsize=11,
    )
    ax.axhline(y=0, color="gray", linestyle="--", alpha=0.5)
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)


if __name__ == "__main__":
    import json

    print("Running DCOI-decay correlation analysis...")
    results = run_correlation()

    print(f"\n  Outcome: {results['outcome']}")
    print(f"  N predictors: {results['n_predictors']}")
    print(f"  Excluded (ambiguous): {results['n_excluded_ambiguous']}")
    print(f"  Excluded (missing decay): {results['n_excluded_missing_decay']}")
    print(f"  Spearman rho: {results['spearman_rho']:.4f}")
    print(f"  Spearman p: {results['spearman_p']:.4f}")
    print(f"  Permutation null p: {results['permutation_null_p']:.4f}")
    print(f"\n  Null distribution: mean={results['null_distribution_summary']['mean']:.4f}, "
          f"std={results['null_distribution_summary']['std']:.4f}")

    print("\n  Top 5 highest DCOI:")
    for entry in results["top5_highest_dcoi"]:
        print(f"    {entry['id']}: dcoi={entry['dcoi']}, decay={entry['decay']}")

    print("\n  Bottom 5 lowest DCOI:")
    for entry in results["bottom5_lowest_dcoi"]:
        print(f"    {entry['id']}: dcoi={entry['dcoi']}, decay={entry['decay']}")

    # Save results
    results_path = Path(__file__).parent.parent.parent / "tests" / "phase-1.5"
    with open(results_path / "test-2-correlation-results.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n  Results saved to {results_path / 'test-2-correlation-results.json'}")

    # Scatter plot
    scatter_path = results_path / "test-2-scatter.png"
    make_scatter_plot(results, scatter_path)
    print(f"  Scatter plot saved to {scatter_path}")
