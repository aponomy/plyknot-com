"""Test 2 diagnostic — inspect the data shape.

Produces numbers, plots, and markdown sections for the diagnostic report.
No formula changes. No new correlations. Pure data inspection.
"""

import json
import random
from collections import Counter
from itertools import combinations
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

DATA_DIR = Path(__file__).resolve().parent.parent / "plyknot_com" / "dcoi" / "data"
OUT_DIR = Path(__file__).resolve().parent.parent / "tests" / "phase-1.5" / "diagnostic"
RESULTS_PATH = Path(__file__).resolve().parent.parent / "tests" / "phase-1.5" / "test-2-correlation-results.json"


def load_data():
    with open(DATA_DIR / "predictors-v1.json") as f:
        predictors = json.load(f)
    with open(DATA_DIR / "decay-labels-v1.json") as f:
        decay_labels = json.load(f)
    with open(RESULTS_PATH) as f:
        correlation_results = json.load(f)
    return predictors, decay_labels, correlation_results


def jaccard(a, b):
    a, b = set(a), set(b)
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def run():
    predictors, decay_labels, corr = load_data()
    decay_by_id = {d["id"]: d for d in decay_labels}

    non_ambiguous = [p for p in predictors if not p.get("ambiguous", False)]
    ambiguous = [p for p in predictors if p.get("ambiguous", False)]
    print(f"Total: {len(predictors)}, Non-ambiguous: {len(non_ambiguous)}, Ambiguous: {len(ambiguous)}")

    report = {}

    # === 1. Database-family distribution ===
    db_counter = Counter()
    db_set_counter = Counter()
    for p in non_ambiguous:
        dbs = tuple(sorted(p.get("database_families") or []))
        db_set_counter[dbs] += 1
        for db in dbs:
            db_counter[db] += 1

    report["db_family_counts"] = dict(db_counter.most_common())
    report["db_set_counts"] = {str(k): v for k, v in db_set_counter.most_common()}
    report["largest_db_bucket"] = db_set_counter.most_common(1)[0]
    report["n_distinct_db_sets"] = len(db_set_counter)

    # Plot
    fig, ax = plt.subplots(figsize=(10, 5))
    families = [k for k, v in db_counter.most_common()]
    counts = [v for k, v in db_counter.most_common()]
    ax.barh(families[::-1], counts[::-1])
    ax.set_xlabel("Number of predictors")
    ax.set_title("Database family frequency (79 non-ambiguous predictors)")
    fig.tight_layout()
    fig.savefig(OUT_DIR / "db-family-distribution.png", dpi=150)
    plt.close(fig)

    # === 2. Variable-pattern distribution ===
    var_counter = Counter()
    var_set_counter = Counter()
    for p in non_ambiguous:
        vps = tuple(sorted(p.get("variable_patterns") or []))
        var_set_counter[vps] += 1
        for vp in vps:
            var_counter[vp] += 1

    report["var_pattern_counts"] = dict(var_counter.most_common())
    report["var_set_counts"] = {str(k): v for k, v in var_set_counter.most_common(20)}
    report["largest_var_bucket"] = var_set_counter.most_common(1)[0]
    report["n_distinct_var_sets"] = len(var_set_counter)

    # How many other predictors share at least one pattern?
    shared_pattern_counts = []
    for i, p in enumerate(non_ambiguous):
        vps_i = set(p.get("variable_patterns") or [])
        sharing = 0
        for j, q in enumerate(non_ambiguous):
            if i == j:
                continue
            vps_j = set(q.get("variable_patterns") or [])
            if vps_i & vps_j:
                sharing += 1
        shared_pattern_counts.append(sharing)
    report["shared_pattern_stats"] = {
        "min": min(shared_pattern_counts),
        "max": max(shared_pattern_counts),
        "mean": round(np.mean(shared_pattern_counts), 1),
        "median": round(float(np.median(shared_pattern_counts)), 1),
    }

    fig, ax = plt.subplots(figsize=(12, 6))
    top_vars = var_counter.most_common(25)
    vnames = [k for k, v in top_vars]
    vcounts = [v for k, v in top_vars]
    ax.barh(vnames[::-1], vcounts[::-1])
    ax.set_xlabel("Number of predictors")
    ax.set_title("Variable pattern frequency — top 25 (79 non-ambiguous)")
    fig.tight_layout()
    fig.savefig(OUT_DIR / "variable-pattern-distribution.png", dpi=150)
    plt.close(fig)

    # === 3. Pairwise overlap distribution ===
    db_jaccards = []
    var_jaccards = []
    for p1, p2 in combinations(non_ambiguous, 2):
        db1 = p1.get("database_families") or []
        db2 = p2.get("database_families") or []
        var1 = p1.get("variable_patterns") or []
        var2 = p2.get("variable_patterns") or []
        db_jaccards.append(jaccard(db1, db2))
        var_jaccards.append(jaccard(var1, var2))

    db_j = np.array(db_jaccards)
    var_j = np.array(var_jaccards)
    n_pairs = len(db_jaccards)

    report["pairwise"] = {
        "n_pairs": n_pairs,
        "db_jaccard_zero_frac": round(float(np.mean(db_j == 0)), 4),
        "db_jaccard_one_frac": round(float(np.mean(db_j == 1)), 4),
        "db_jaccard_mean": round(float(np.mean(db_j)), 4),
        "db_jaccard_median": round(float(np.median(db_j)), 4),
        "var_jaccard_zero_frac": round(float(np.mean(var_j == 0)), 4),
        "var_jaccard_one_frac": round(float(np.mean(var_j == 1)), 4),
        "var_jaccard_mean": round(float(np.mean(var_j)), 4),
        "var_jaccard_median": round(float(np.median(var_j)), 4),
    }

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    axes[0].hist(db_j, bins=30, edgecolor="black", alpha=0.7)
    axes[0].set_title(f"Pairwise DB Jaccard (n={n_pairs})")
    axes[0].set_xlabel("Jaccard index")
    axes[0].set_ylabel("Count")
    axes[1].hist(var_j, bins=30, edgecolor="black", alpha=0.7)
    axes[1].set_title(f"Pairwise Variable-Pattern Jaccard (n={n_pairs})")
    axes[1].set_xlabel("Jaccard index")
    fig.tight_layout()
    fig.savefig(OUT_DIR / "pairwise-db-jaccard.png", dpi=150)
    plt.close(fig)

    # Separate var plot
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(var_j, bins=30, edgecolor="black", alpha=0.7)
    ax.set_title(f"Pairwise Variable-Pattern Jaccard (n={n_pairs})")
    ax.set_xlabel("Jaccard index")
    ax.set_ylabel("Count")
    fig.tight_layout()
    fig.savefig(OUT_DIR / "pairwise-var-jaccard.png", dpi=150)
    plt.close(fig)

    # === 4. DCOI score distribution ===
    scores = corr["all_scores"]
    dcoi_vals = np.array([s["dcoi"] for s in scores])

    report["dcoi"] = {
        "min": round(float(np.min(dcoi_vals)), 4),
        "max": round(float(np.max(dcoi_vals)), 4),
        "mean": round(float(np.mean(dcoi_vals)), 4),
        "median": round(float(np.median(dcoi_vals)), 4),
        "std": round(float(np.std(dcoi_vals)), 4),
        "n_zero": int(np.sum(dcoi_vals == 0)),
        "n_gte_half": int(np.sum(dcoi_vals >= 0.5)),
    }

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(dcoi_vals, bins=25, edgecolor="black", alpha=0.7)
    ax.set_title(f"DCOI Score Distribution (n={len(dcoi_vals)})")
    ax.set_xlabel("DCOI score")
    ax.set_ylabel("Count")
    ax.axvline(x=np.median(dcoi_vals), color="red", linestyle="--", label=f"median={np.median(dcoi_vals):.3f}")
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUT_DIR / "dcoi-distribution.png", dpi=150)
    plt.close(fig)

    # === 5. Decay distribution ===
    decay_vals = np.array([s["decay"] for s in scores])

    report["decay"] = {
        "min": round(float(np.min(decay_vals)), 4),
        "max": round(float(np.max(decay_vals)), 4),
        "mean": round(float(np.mean(decay_vals)), 4),
        "median": round(float(np.median(decay_vals)), 4),
        "std": round(float(np.std(decay_vals)), 4),
    }

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(decay_vals, bins=25, edgecolor="black", alpha=0.7)
    ax.set_title(f"Decay Magnitude Distribution (n={len(decay_vals)})")
    ax.set_xlabel("Decay magnitude")
    ax.set_ylabel("Count")
    ax.axvline(x=np.median(decay_vals), color="red", linestyle="--", label=f"median={np.median(decay_vals):.3f}")
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUT_DIR / "decay-distribution.png", dpi=150)
    plt.close(fig)

    # === 6. Ambiguous entries ===
    report["ambiguous_entries"] = ambiguous

    # === 7. Spot-check 5 random non-ambiguous ===
    rng = random.Random(42)
    spot_check = rng.sample(non_ambiguous, 5)
    report["spot_check"] = spot_check

    # === Print summary ===
    print("\n=== Database families ===")
    for fam, count in db_counter.most_common():
        print(f"  {fam}: {count}")
    print(f"\n  Distinct db-set combinations: {len(db_set_counter)}")
    print(f"  Largest bucket: {report['largest_db_bucket']}")

    print("\n=== Variable patterns (top 15) ===")
    for pat, count in var_counter.most_common(15):
        print(f"  {pat}: {count}")
    print(f"\n  Distinct var-set combinations: {len(var_set_counter)}")
    print(f"  Largest bucket: {report['largest_var_bucket']}")
    print(f"  Shared-pattern stats: {report['shared_pattern_stats']}")

    print("\n=== Pairwise overlap ===")
    pw = report["pairwise"]
    print(f"  {n_pairs} pairs")
    print(f"  DB Jaccard:  zero={pw['db_jaccard_zero_frac']:.1%}, one={pw['db_jaccard_one_frac']:.1%}, mean={pw['db_jaccard_mean']:.4f}, median={pw['db_jaccard_median']:.4f}")
    print(f"  Var Jaccard: zero={pw['var_jaccard_zero_frac']:.1%}, one={pw['var_jaccard_one_frac']:.1%}, mean={pw['var_jaccard_mean']:.4f}, median={pw['var_jaccard_median']:.4f}")

    print("\n=== DCOI scores ===")
    d = report["dcoi"]
    print(f"  Range: [{d['min']}, {d['max']}], mean={d['mean']}, median={d['median']}, std={d['std']}")
    print(f"  DCOI=0: {d['n_zero']}/79, DCOI>=0.5: {d['n_gte_half']}/79")

    print("\n=== Decay magnitudes ===")
    dd = report["decay"]
    print(f"  Range: [{dd['min']}, {dd['max']}], mean={dd['mean']}, median={dd['median']}, std={dd['std']}")

    print("\n=== Spot-check 5 predictors ===")
    for p in spot_check:
        print(f"  {p['id']}: db={p.get('database_families')}, vp={p.get('variable_patterns')}")

    # Save raw report data
    with open(OUT_DIR / "diagnostic-data.json", "w") as f:
        json.dump(report, f, indent=2, default=str)

    return report


if __name__ == "__main__":
    run()
