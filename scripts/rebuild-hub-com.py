#!/usr/bin/env python3
"""Rebuild commercial Hub D1 cache.

Reads universe-private/ and research-private/ deltas, then pushes
the combined state to the commercial Hub's D1 database.

The commercial Hub (hub.plyknot.com) serves embargoed data to
authenticated team members. The public Hub (hub.plyknot.org) is
unaffected — it rebuilds from plyknot/universe only.
"""

import json
import glob
import os
import sys


def load_private_universe() -> list[dict]:
    """Load all entries from universe-private/."""
    entries = []
    for filepath in glob.glob("universe-private/**/*.json", recursive=True):
        try:
            with open(filepath) as f:
                entries.append(json.load(f))
        except (json.JSONDecodeError, UnicodeDecodeError):
            print(f"Warning: could not parse {filepath}", file=sys.stderr)
    return entries


def load_deltas() -> list[dict]:
    """Load all delta records from research-private/."""
    deltas = []
    for filepath in glob.glob("research-private/**/deltas/*.json", recursive=True):
        try:
            with open(filepath) as f:
                deltas.append(json.load(f))
        except (json.JSONDecodeError, UnicodeDecodeError):
            print(f"Warning: could not parse {filepath}", file=sys.stderr)
    return deltas


def main():
    entries = load_private_universe()
    deltas = load_deltas()

    print(f"Loaded {len(entries)} private universe entries")
    print(f"Loaded {len(deltas)} delta records")

    # TODO: Push to commercial D1 via Cloudflare API
    # Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars

    api_token = os.environ.get("CLOUDFLARE_API_TOKEN")
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")

    if not api_token or not account_id:
        print("[scaffold] Cloudflare credentials not set — skipping D1 push.")
        return

    print("[scaffold] D1 push not yet implemented.")


if __name__ == "__main__":
    main()
