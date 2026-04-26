"""
Stage 3a.2 — Extraction script for Lexical Forcing + Code Module extraction.

Runs:
  A) unconditioned + conditioned extraction on all 49 IDS references
     → outputs/stage3-conditioned/{ref_id}.json
  B) DECOMPOSITION_PROMPT extraction on all plyknot/*.py modules
     → outputs/stage3-extractions/code_{module}.json

Saves blend deltas (Lensing Strain) to outputs/stage3-blend-deltas.json.

Call cap: 130. Script stops if cap is reached.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import traceback
from dataclasses import dataclass, asdict
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
WORKSPACE_ROOT = Path(__file__).parent.parent.parent  # plyknot-workspace/
PLYKNOT_SRC    = WORKSPACE_ROOT / "plyknot" / "plyknot"
FTO_DIR        = Path(__file__).parent
OUTPUTS        = FTO_DIR / "outputs"
STAGE2_EXT     = OUTPUTS / "extractions"
STAGE3_COND    = OUTPUTS / "stage3-conditioned"
STAGE3_CODE    = OUTPUTS / "stage3-extractions"
IDS_PATH       = WORKSPACE_ROOT / "research" / "docs" / "patent" / "Plyknot" / "v6.2" / "patent-IDS-list.md"
CLAIM1_PATH    = STAGE2_EXT / "claim_01.json"

STAGE3_COND.mkdir(parents=True, exist_ok=True)
STAGE3_CODE.mkdir(parents=True, exist_ok=True)

# ── Add plyknot to path ────────────────────────────────────────────────────────
sys.path.insert(0, str(WORKSPACE_ROOT / "plyknot"))
sys.path.insert(0, str(FTO_DIR))

from plyknot.guided_extraction import (
    extract_unconditioned, extract_conditioned, blend_extractions,
    ExtractionSchema,
)
from plyknot.predicate_decomposition import DECOMPOSITION_PROMPT
from adapters.llm_call import make_anthropic_caller

# ── Call counter ───────────────────────────────────────────────────────────────
CALL_CAP = 130
_call_count = 0

def _bump_call(n: int = 1) -> None:
    global _call_count
    _call_count += n
    print(f"  [calls: {_call_count}/{CALL_CAP}]")
    if _call_count >= CALL_CAP:
        print(f"\n*** CALL CAP {CALL_CAP} REACHED. Stopping. ***")
        _dump_blend_deltas()
        sys.exit(0)

# ── Haiku caller for DECOMPOSITION_PROMPT ─────────────────────────────────────
_haiku_caller = make_anthropic_caller(model="claude-haiku-4-5-20251001")

def _call_decompose(text: str) -> str:
    """Run DECOMPOSITION_PROMPT extraction. Returns raw JSON string."""
    prompt = DECOMPOSITION_PROMPT + text
    _bump_call()
    return _haiku_caller(prompt)

# ── Build context_anchors from claim 1 vocabulary ─────────────────────────────
def build_claim1_anchors() -> dict[str, float]:
    """Build context_anchors dict from claim 1's predicate vocabulary."""
    with open(CLAIM1_PATH) as f:
        claim1 = json.load(f)
    anchors: dict[str, float] = {}
    for unit in claim1.get("units", []):
        verb    = unit.get("verb", "know").lower().strip()
        content = unit.get("content", "").lower().strip()
        key = f"{verb}:{content}".replace(" ", "_")[:120]
        anchors[key] = 1.0
    print(f"  Built {len(anchors)} context_anchors from claim 1.")
    return anchors

# ── Parse IDS list → {ref_id: section_text} ───────────────────────────────────
def parse_ids_sections() -> dict[str, str]:
    """
    Parse IDS markdown into a dict mapping ref_id → full section text.
    ref_id format: ref_v6_1_1, ref_v6_2_p3, etc.
    """
    raw = IDS_PATH.read_text()
    # Split on section headings like "### v6.1.1 —" or "### v6.2.p1 —"
    # Pattern: ### v{major}.{minor_or_minor.pN} — ...
    sections: dict[str, str] = {}

    # Split on lines starting with "### v"
    parts = re.split(r'\n(?=### v)', raw)
    heading_re = re.compile(
        r'^### (v\d+\.\d+(?:\.\w+)?\.\w+|v\d+\.\d+\.\w+|v\d+\.\d+\.p\d+|v\d+\.\d+\.\d+)'
    )

    for part in parts:
        first_line = part.split('\n', 1)[0].strip()
        # Extract ref key like "v6.1.1" or "v6.2.p3" from "### v6.1.1 — Title"
        m = re.match(r'^### (v[\d]+\.[\d]+(?:\.p\d+)?\.?\d*)', first_line)
        if not m:
            continue
        raw_key = m.group(1).rstrip('.')  # e.g. "v6.1.1" or "v6.2.p3"
        # Normalise to ref_id: replace dots with underscores, lowercase
        ref_id = "ref_" + raw_key.replace(".", "_")
        sections[ref_id] = part.strip()

    return sections


def extract_ref_id_from_heading(line: str) -> str | None:
    """Alternative: parse ref IDs from '### v6.1.1 —' style headings."""
    m = re.match(r'^### (v\d+\.\d+(?:\.p\d+)?(?:\.\d+)?)', line)
    if not m:
        return None
    raw = m.group(1)
    return "ref_" + raw.replace(".", "_")


def parse_ids_sections_v2() -> dict[str, str]:
    """More robust IDS section parser."""
    text = IDS_PATH.read_text()
    lines = text.split("\n")
    sections: dict[str, str] = {}
    current_id: str | None = None
    current_lines: list[str] = []

    for line in lines:
        if line.startswith("### v"):
            # Save previous
            if current_id and current_lines:
                sections[current_id] = "\n".join(current_lines).strip()
            current_id = extract_ref_id_from_heading(line)
            current_lines = [line]
        elif line.startswith("---") and current_id:
            if current_lines:
                sections[current_id] = "\n".join(current_lines).strip()
            current_id = None
            current_lines = []
        else:
            if current_id is not None:
                current_lines.append(line)

    if current_id and current_lines:
        sections[current_id] = "\n".join(current_lines).strip()

    return sections


# ── Lensing Strain tracking ────────────────────────────────────────────────────
_blend_deltas: dict[str, dict] = {}

def _dump_blend_deltas() -> None:
    out = OUTPUTS / "stage3-blend-deltas.json"
    with open(out, "w") as f:
        json.dump(_blend_deltas, f, indent=2)
    print(f"\nBlend deltas saved → {out} ({len(_blend_deltas)} entries)")


# ── Part A: IDS reference extraction (98 calls) ────────────────────────────────

# Custom ExtractionSchema that works for technical text
TECH_SCHEMA = ExtractionSchema(
    predicate_categories=["observe", "detect", "measure", "compute", "classify",
                          "infer", "propose", "distinguish", "require", "implement"],
    intensity_scale="0.0 to 1.0, where 0.0 is absent and 1.0 is fully realised",
    output_format="json",
    version="v0.1-patent",
)

def run_ref_extractions(anchors: dict[str, float], sections: dict[str, str]) -> None:
    """Run unconditioned + conditioned extraction on all 49 IDS references."""

    # Canonical ref IDs expected
    MANDATORY_IDS = (
        [f"ref_v6_1_{i}" for i in range(1, 12)] +
        [f"ref_v6_2_{i}" for i in range(1, 20)]
    )
    PRUDENT_IDS = (
        [f"ref_v6_1_p{i}" for i in range(1, 13)] +
        [f"ref_v6_2_p{i}" for i in range(1, 8)]
    )
    ALL_REF_IDS = MANDATORY_IDS + PRUDENT_IDS

    print(f"\n=== Part A: IDS reference extractions ({len(ALL_REF_IDS)} references) ===")

    for ref_id in ALL_REF_IDS:
        cache_path = STAGE3_COND / f"{ref_id}.json"

        if cache_path.exists():
            print(f"  [CACHE HIT] {ref_id}")
            try:
                cached = json.loads(cache_path.read_text())
                _blend_deltas[ref_id] = {
                    "lensing_strain": cached.get("lensing_strain", 0.0),
                    "n_uncond": cached.get("n_uncond", 0),
                    "n_cond": cached.get("n_cond", 0),
                    "n_blend": cached.get("n_blend", 0),
                    "thin_flag": cached.get("thin_flag", False),
                    "cached": True,
                }
            except Exception:
                pass
            continue

        # Get section text for this reference
        ref_text = sections.get(ref_id)
        if not ref_text:
            print(f"  [WARN] No text for {ref_id} — skipping")
            _blend_deltas[ref_id] = {
                "lensing_strain": 0.0, "n_uncond": 0, "n_cond": 0,
                "n_blend": 0, "thin_flag": True, "error": "no_text_found",
            }
            continue

        print(f"\n  Processing {ref_id}...")
        print(f"  Text length: {len(ref_text)} chars")

        result = {
            "ref_id": ref_id,
            "text_length": len(ref_text),
            "unconditioned_raw": None,
            "conditioned_raw": None,
            "blend_values": [],
            "lensing_strain": 0.0,
            "n_uncond": 0,
            "n_cond": 0,
            "n_blend": 0,
            "thin_flag": False,
            "error": None,
        }

        try:
            # Unconditioned pass
            print(f"    Running extract_unconditioned...")
            unc_extractions = extract_unconditioned(ref_text, schema=TECH_SCHEMA)
            _bump_call()
            result["unconditioned_raw"] = [
                {"verb": e.verb, "type": e.predicate_type, "content": e.content,
                 "intensity": e.intensity, "pattern_id": e.pattern_id}
                for e in unc_extractions
            ]
            result["n_uncond"] = len(unc_extractions)
            print(f"    → {len(unc_extractions)} unconditioned predicates")

        except Exception as ex:
            result["error"] = f"unconditioned_failed: {ex}"
            print(f"    [ERROR] unconditioned: {ex}")
            cache_path.write_text(json.dumps(result, indent=2))
            _blend_deltas[ref_id] = {
                "lensing_strain": 0.0, "n_uncond": 0, "n_cond": 0,
                "n_blend": 0, "thin_flag": True, "error": result["error"],
            }
            continue

        try:
            # Conditioned pass
            print(f"    Running extract_conditioned...")
            cond_extractions = extract_conditioned(ref_text, context_anchors=anchors,
                                                    schema=TECH_SCHEMA)
            _bump_call()
            result["conditioned_raw"] = [
                {"verb": e.verb, "type": e.predicate_type, "content": e.content,
                 "intensity": e.intensity, "pattern_id": e.pattern_id}
                for e in cond_extractions
            ]
            result["n_cond"] = len(cond_extractions)
            print(f"    → {len(cond_extractions)} conditioned predicates")

        except Exception as ex:
            result["error"] = f"conditioned_failed: {ex}"
            print(f"    [ERROR] conditioned: {ex}")
            cache_path.write_text(json.dumps(result, indent=2))
            _blend_deltas[ref_id] = {
                "lensing_strain": 0.0, "n_uncond": result["n_uncond"], "n_cond": 0,
                "n_blend": 0, "thin_flag": True, "error": result["error"],
            }
            continue

        # Blend
        unc_exts = [type('E', (), {
            'verb': d['verb'], 'predicate_type': d['type'],
            'content': d['content'], 'intensity': d['intensity'],
            'pattern_id': d['pattern_id'],
        })() for d in result["unconditioned_raw"]]
        cond_exts = [type('E', (), {
            'verb': d['verb'], 'predicate_type': d['type'],
            'content': d['content'], 'intensity': d['intensity'],
            'pattern_id': d['pattern_id'],
        })() for d in result["conditioned_raw"]]

        try:
            blend_vals = blend_extractions(unc_exts, cond_exts, guidance_scale=0.5)
            result["blend_values"] = [
                {"property_id": gv.property_id,
                 "unconditioned": gv.unconditioned,
                 "conditioned": gv.conditioned,
                 "guided": gv.guided,
                 "guidance_delta": gv.guidance_delta}
                for gv in blend_vals
            ]
            result["n_blend"] = len(blend_vals)

            if blend_vals:
                strain = sum(gv.guidance_delta for gv in blend_vals) / len(blend_vals)
            else:
                strain = 0.0
            result["lensing_strain"] = strain

            # Thin-extraction flag: fewer than 5 conditioned predicates
            thin = len(cond_exts) < 5
            result["thin_flag"] = thin

            print(f"    → Lensing Strain: {strain:.4f}  (blend pts: {len(blend_vals)}, thin: {thin})")

        except Exception as ex:
            result["error"] = f"blend_failed: {ex}"
            print(f"    [ERROR] blend: {ex}")

        # Save (raw already mutated, save final result)
        cache_path.write_text(json.dumps(result, indent=2))

        _blend_deltas[ref_id] = {
            "lensing_strain": result["lensing_strain"],
            "n_uncond": result["n_uncond"],
            "n_cond": result["n_cond"],
            "n_blend": result["n_blend"],
            "thin_flag": result["thin_flag"],
            "error": result.get("error"),
        }


# ── Part B: Code module extractions (~37 calls) ────────────────────────────────

SKIP_MODULES = {"__init__", "__pycache__"}


def run_code_extractions() -> None:
    """Run DECOMPOSITION_PROMPT extraction on all plyknot source modules."""
    modules = sorted([
        p.stem for p in PLYKNOT_SRC.glob("*.py")
        if p.stem not in SKIP_MODULES and not p.stem.startswith("_")
    ])
    print(f"\n=== Part B: Code module extractions ({len(modules)} modules) ===")

    for mod_name in modules:
        cache_path = STAGE3_CODE / f"code_{mod_name}.json"
        if cache_path.exists():
            print(f"  [CACHE HIT] {mod_name}")
            continue

        mod_path = PLYKNOT_SRC / f"{mod_name}.py"
        if not mod_path.exists():
            print(f"  [WARN] Module file not found: {mod_path}")
            continue

        source_text = mod_path.read_text()
        print(f"\n  Extracting {mod_name} ({len(source_text)} chars)...")

        # Truncate very large modules to ~12000 chars (Haiku context is fine but
        # we cap prompt size for reliability)
        if len(source_text) > 12000:
            source_text = source_text[:12000] + "\n# [TRUNCATED]"
            print(f"    (truncated to 12000 chars)")

        result = {
            "module": mod_name,
            "source_length": len(mod_path.read_text()),
            "extracted_length": len(source_text),
            "raw_response": None,
            "units": [],
            "n_units": 0,
            "error": None,
        }

        try:
            raw = _call_decompose(source_text)
            result["raw_response"] = raw

            # Parse
            from plyknot.predicate_decomposition import parse_decomposition_response, build_graph
            unit_dicts = parse_decomposition_response(raw)
            graph = build_graph(unit_dicts, source_text[:200])

            result["units"] = [
                {"id": u.id, "type": u.unit_type, "verb": u.verb,
                 "content": u.content, "intensity": u.intensity,
                 "depends_on": u.depends_on,
                 "epistemological_route": u.epistemological_route}
                for u in graph.units
            ]
            result["n_units"] = len(graph.units)
            result["observation_density"] = graph.observation_density
            result["grounding_ratio"] = graph.grounding_ratio
            print(f"    → {len(graph.units)} units (obs_density={graph.observation_density:.2f})")

        except Exception as ex:
            result["error"] = str(ex)
            print(f"    [ERROR] {ex}")

        cache_path.write_text(json.dumps(result, indent=2))


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=== Stage 3a.2 — Lexical Forcing + Code Module Extraction ===")
    print(f"Call cap: {CALL_CAP}")
    print(f"Workspace: {FTO_DIR}")
    print()

    # Build context anchors from claim 1
    print("Building context_anchors from claim 1 vocabulary...")
    anchors = build_claim1_anchors()

    # Parse IDS sections
    print("Parsing IDS reference sections...")
    sections = parse_ids_sections_v2()
    print(f"  Parsed {len(sections)} reference sections: {sorted(sections.keys())[:5]}...")

    # Part A: reference extractions
    run_ref_extractions(anchors, sections)

    # Save blend deltas after Part A (in case Part B hits cap)
    _dump_blend_deltas()

    # Part B: code extractions
    run_code_extractions()

    # Final save
    _dump_blend_deltas()

    print("\n=== Stage 3a.2 COMPLETE ===")
    print(f"Total API calls: {_call_count}")
    print(f"Blend deltas computed: {len(_blend_deltas)}")

    # Summary statistics
    strains = [v["lensing_strain"] for v in _blend_deltas.values()
               if v.get("lensing_strain") is not None]
    if strains:
        high = sum(1 for s in strains if s >= 0.3)
        low  = sum(1 for s in strains if s < 0.3)
        print(f"Lensing Strain distribution: high (≥0.3): {high}, low (<0.3): {low}")
        print(f"Mean strain: {sum(strains)/len(strains):.4f}  "
              f"Max: {max(strains):.4f}  Min: {min(strains):.4f}")

    thin_count = sum(1 for v in _blend_deltas.values() if v.get("thin_flag"))
    errors     = sum(1 for v in _blend_deltas.values() if v.get("error"))
    print(f"Thin extractions: {thin_count}")
    print(f"Errors: {errors}")


if __name__ == "__main__":
    main()
