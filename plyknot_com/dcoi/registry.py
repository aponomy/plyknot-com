"""McLean-Pontiff 97-predictor registry loader.

Loads hand-coded predictor records from JSON. Two modes:
- load_registry(): tolerates TBD entries (for development).
- load_complete_registry(): asserts all 97 entries are filled.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
import json

from .formula import PredictorInputs


@dataclass(frozen=True)
class OriginalPaper:
    doi: str | None
    authors: tuple[str, ...]
    title: str
    year: int | None
    venue: str
    url: str | None = None


@dataclass(frozen=True)
class Predictor:
    id: str
    name: str
    mclean_pontiff_index: int
    original_paper: OriginalPaper
    publication_date: date | None
    database_families: frozenset[str]
    variable_patterns: frozenset[str]
    ambiguous: bool
    notes: str
    source_pdf_path: str | None

    @property
    def is_filled(self) -> bool:
        return self.id != "TBD"

    def to_dcoi_inputs(self) -> PredictorInputs:
        if self.publication_date is None:
            raise ValueError(f"Predictor {self.id} has no publication_date")
        return PredictorInputs(
            predictor_id=self.id,
            publication_date=self.publication_date,
            database_families=self.database_families,
            variable_patterns=self.variable_patterns,
        )


def _parse_predictor(raw: dict) -> Predictor:
    paper = raw["original_paper"]
    pub_date = None
    if raw["publication_date"] is not None:
        pub_date = date.fromisoformat(raw["publication_date"])
    return Predictor(
        id=raw["id"],
        name=raw["name"],
        mclean_pontiff_index=raw["mclean_pontiff_index"],
        original_paper=OriginalPaper(
            doi=paper["doi"],
            authors=tuple(paper["authors"]),
            title=paper["title"],
            year=paper["year"],
            venue=paper["venue"],
            url=paper.get("url"),
        ),
        publication_date=pub_date,
        database_families=frozenset(raw["database_families"] or []),
        variable_patterns=frozenset(raw["variable_patterns"] or []),
        ambiguous=raw["ambiguous"],
        notes=raw["notes"],
        source_pdf_path=raw.get("source_pdf_path"),
    )


def load_registry(path: Path | None = None) -> list[Predictor]:
    """Load predictors from JSON. Skips entries with id='TBD'."""
    if path is None:
        path = Path(__file__).parent / "data" / "predictors-v1.json"
    with open(path) as f:
        raw_list = json.load(f)
    return [_parse_predictor(r) for r in raw_list if r["id"] != "TBD"]


def load_all_entries(path: Path | None = None) -> list[Predictor]:
    """Load all entries including TBD stubs."""
    if path is None:
        path = Path(__file__).parent / "data" / "predictors-v1.json"
    with open(path) as f:
        raw_list = json.load(f)
    return [_parse_predictor(r) for r in raw_list]


def load_complete_registry(path: Path | None = None) -> list[Predictor]:
    """Load 97 predictors and assert all are filled (no TBD entries)."""
    all_entries = load_all_entries(path)
    tbd = [p for p in all_entries if not p.is_filled]
    if tbd:
        indices = [p.mclean_pontiff_index for p in tbd]
        raise ValueError(
            f"{len(tbd)} predictor(s) still TBD: indices {indices}"
        )
    if len(all_entries) != 97:
        raise ValueError(f"Expected 97 entries, got {len(all_entries)}")
    return all_entries
