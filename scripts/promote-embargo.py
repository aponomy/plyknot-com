#!/usr/bin/env python3
"""Daily embargo promotion.

Walks universe-private/ and finds entries where embargo.until <= today.
For each, opens an atomic pair of PRs:
  1. Against plyknot-com: removes the entry from universe-private/
  2. Against plyknot/universe: adds the entry (minus embargo block) to public

Both PRs reference each other by URL. Neither merges alone.
The Archivist confirms both are green, then merges both in the same minute.
If either fails schema validation, both are closed with a comment.
"""

import json
import glob
import os
import subprocess
import sys
from datetime import date, datetime


UNIVERSE_PRIVATE = "universe-private"
PUBLIC_REPO = "plyknot/universe"
COMMERCIAL_REPO = "plyknot-com"  # or the full org/repo path


def find_promotable_entries() -> list[dict]:
    """Find all entries with embargo.until <= today."""
    today = date.today().isoformat()
    promotable = []

    for pattern in [f"{UNIVERSE_PRIVATE}/**/*.json", f"{UNIVERSE_PRIVATE}/**/*.yaml"]:
        for filepath in glob.glob(pattern, recursive=True):
            try:
                with open(filepath) as f:
                    data = json.load(f)
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue

            embargo = data.get("embargo")
            if embargo and embargo.get("until", "9999-12-31") <= today:
                promotable.append({
                    "filepath": filepath,
                    "data": data,
                    "embargo": embargo,
                })

    return promotable


def strip_embargo(data: dict) -> dict:
    """Return a copy of the entry with the embargo block removed."""
    clean = dict(data)
    clean.pop("embargo", None)
    return clean


def public_path(private_path: str) -> str:
    """Convert a universe-private/ path to its public universe equivalent.

    universe-private/couplings/foo.json -> data/couplings/foo.json
    """
    # Remove the 'universe-private/' prefix and prepend 'data/'
    relative = private_path.removeprefix(f"{UNIVERSE_PRIVATE}/")
    return f"data/{relative}"


def main():
    entries = find_promotable_entries()

    if not entries:
        print("No entries ready for promotion.")
        return

    print(f"Found {len(entries)} entries ready for promotion:")
    for entry in entries:
        print(f"  - {entry['filepath']} (embargo until: {entry['embargo']['until']})")

    # TODO: Implement the atomic PR pair mechanism:
    # 1. Create a branch in plyknot-com removing each entry from universe-private/
    # 2. Create a branch in plyknot/universe adding each entry (minus embargo) to data/
    # 3. Open PRs in both repos referencing each other
    # 4. Wait for CI in both; if either fails, close both with comment
    # 5. Merge both atomically

    print("\n[scaffold] PR creation not yet implemented — entries listed above are ready.")


if __name__ == "__main__":
    main()
