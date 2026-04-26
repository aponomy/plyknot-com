"""v2 variable-pattern coarsening via LLM clustering.

Clusters the ~70 near-unique extracted patterns into 15-25 canonical groups.
The clustering map is explicit JSON, hand-reviewable.
"""

from __future__ import annotations

import json
from pathlib import Path

import anthropic

DATA_DIR = Path(__file__).parent / "data"

CLUSTERING_PROMPT = """\
You are clustering finance variable-construction patterns into a small set
of canonical names. Below is a list of patterns extracted from 79 academic
finance predictors. Group semantically related patterns under a shared
canonical name.

Target: 15-25 canonical clusters.

Rules:
- "accruals", "total_accruals", "operating_accruals", "discretionary_accruals",
  "working_capital_accruals" should all map to "accruals".
- "asset_growth", "total_asset_growth", "asset_growth_yoy" all map to
  "asset_growth".
- "book_to_market", "btm", "book_market_ratio" all map to "book_to_market".
- Pattern names should be short snake_case English nouns describing the
  underlying financial concept, not the specific paper's variable name.
- If a pattern is genuinely unique (no obvious group), keep it as its own
  canonical name with the cleaned-up form.

Output JSON:
{
  "<original_pattern>": "<canonical_pattern>",
  ...
}

One entry per input pattern. Do not omit any. No prose.
"""


def get_all_patterns() -> list[str]:
    """Extract all distinct variable_patterns from non-ambiguous predictors."""
    with open(DATA_DIR / "predictors-v1.json") as f:
        predictors = json.load(f)

    patterns = set()
    for p in predictors:
        if p.get("ambiguous"):
            continue
        for vp in (p.get("variable_patterns") or []):
            patterns.add(vp)
    return sorted(patterns)


def run_clustering(patterns: list[str]) -> dict:
    """Call Haiku to cluster patterns. Returns raw API response."""
    client = anthropic.Anthropic()
    pattern_list = "\n".join(f"- {p}" for p in patterns)

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4000,
        messages=[
            {
                "role": "user",
                "content": f"{CLUSTERING_PROMPT}\n\nPatterns ({len(patterns)} total):\n{pattern_list}",
            }
        ],
    )

    return {
        "model": message.model,
        "input_tokens": message.usage.input_tokens,
        "output_tokens": message.usage.output_tokens,
        "raw_text": message.content[0].text,
        "stop_reason": message.stop_reason,
    }


def parse_clustering(raw_text: str) -> dict[str, str]:
    """Parse clustering JSON from LLM response."""
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines[1:] if not l.strip().startswith("```")]
        text = "\n".join(lines)
    return json.loads(text)


if __name__ == "__main__":
    patterns = get_all_patterns()
    print(f"Input: {len(patterns)} distinct patterns")

    raw = run_clustering(patterns)
    print(f"  Model: {raw['model']}, tokens: {raw['input_tokens']} in, {raw['output_tokens']} out")

    # Save raw
    with open(DATA_DIR / "v2-coarsening-raw.json", "w") as f:
        json.dump(raw, f, indent=2)

    # Parse and save map
    mapping = parse_clustering(raw["raw_text"])
    with open(DATA_DIR / "v2-pattern-coarsening-v1.json", "w") as f:
        json.dump(mapping, f, indent=2)
        f.write("\n")

    # Summary
    canonical = set(mapping.values())
    print(f"  Output: {len(canonical)} canonical clusters")

    from collections import Counter
    cluster_sizes = Counter(mapping.values())
    print(f"\n  Top 10 clusters:")
    for name, count in cluster_sizes.most_common(10):
        print(f"    {name}: {count} patterns")

    # Check all input patterns are covered
    missing = [p for p in patterns if p not in mapping]
    if missing:
        print(f"\n  WARNING: {len(missing)} patterns not in map: {missing}")
    else:
        print(f"\n  All {len(patterns)} patterns covered.")
