#!/usr/bin/env python3
"""Cross-repo PR opener for manual migration of entries to the public universe.

Unlike promote-embargo.py (which runs on a schedule for date-gated entries),
this script is used for manual promotion of entries that are ready to go
public outside the embargo mechanism — e.g., entries that were never
embargoed, or entries whose embargo was lifted early by decision.

Usage:
    python scripts/migrate-to-public.py universe-private/couplings/foo.json
"""

import argparse
import json
import os
import sys


def strip_embargo(data: dict) -> dict:
    """Return a copy of the entry with the embargo block removed."""
    clean = dict(data)
    clean.pop("embargo", None)
    return clean


def public_path(private_path: str) -> str:
    """Convert a universe-private/ path to its public universe equivalent."""
    relative = private_path.removeprefix("universe-private/")
    return f"data/{relative}"


def main():
    parser = argparse.ArgumentParser(description="Migrate entries to public universe")
    parser.add_argument("files", nargs="+", help="Paths to universe-private/ entries to migrate")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without acting")
    args = parser.parse_args()

    for filepath in args.files:
        if not filepath.startswith("universe-private/"):
            print(f"Skipping {filepath}: not in universe-private/", file=sys.stderr)
            continue

        try:
            with open(filepath) as f:
                data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Error reading {filepath}: {e}", file=sys.stderr)
            continue

        clean = strip_embargo(data)
        target = public_path(filepath)

        if args.dry_run:
            print(f"Would migrate: {filepath} -> plyknot/universe/{target}")
            print(f"  Embargo removed: {'embargo' in data}")
        else:
            # TODO: Open cross-repo PR pair via gh CLI
            print(f"[scaffold] Migration not yet implemented for {filepath}")


if __name__ == "__main__":
    main()
