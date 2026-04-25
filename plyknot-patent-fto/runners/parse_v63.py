"""
Parse v6.3 patent claim ladder and v6.2 IDS into structured documents
for the Stage 2 FTO sweep.

Claim ladder assembly:
  - Claims 1-19 from research/docs/patent/Plyknot/v6.2/patent-claim-ladder-v6.2.md
    (format: **Claim N.** sections separated by '---')
  - Claims 20-35 from research/docs/patent/Plyknot/v6.3/patent-claim-ladder-v6.3-additions.md
    (format: ### Claim N — title, body starting at **N.**, stops before *Hardening* notes)

IDS:
  - research/docs/patent/Plyknot/v6.2/patent-IDS-list.md
    49 entries (30 mandatory + 19 prudent), format: ### v6.N.N — title sections

Source note:
  The v6.3 claim ladder does not exist as a single merged file (yet). The two-file
  structure reflects preservation of v6.2 history + delta additions. This parser
  assembles the full 35-claim ladder at runtime. When 'patent-claim-ladder-v6.3.md'
  is eventually produced by merging the two files, update parse_claim_ladder() to
  accept an optional single-file path.

IDS version note:
  The v6.3 IDS expansion is pre-filing work not yet committed. This run uses the
  v6.2 IDS (49 refs), which is the complete prior-art landscape as of 2026-04-25.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class ClaimDocument:
    claim_id: str     # "1", "8a", "16a", "20", etc.
    document_id: str  # safe filename stem: "claim_01", "claim_08a", "claim_20"
    ordinal: int      # 1-35 sequential
    text: str         # full claim language (no hardening notes for v6.3 claims)


@dataclass
class PriorArtDocument:
    identifier: str   # human-readable: "US 11,714,792 B2", "Rauf 2025 (Gem...)"
    document_id: str  # safe filename stem: "ref_v6_1_1", "ref_v6_2_p3"
    section_id: str   # IDS section id: "v6.1.1", "v6.2.p3"
    category: str     # "A" (US patent), "B" (foreign patent), "C" (NPL)
    text: str         # citation + relevance combined — input to predicate extraction


# ── Helpers ──────────────────────────────────────────────────────────────────

def _safe_doc_id(claim_id: str) -> str:
    """Convert claim_id to a safe filename stem."""
    try:
        n = int(claim_id)
        return f"claim_{n:02d}"
    except ValueError:
        return f"claim_{claim_id}"


def _extract_field(section: str, field_name: str) -> str:
    """Return the value of a '- **FieldName:** value' markdown list entry.

    Handles both '**FieldName:** value' (colon inside bold) and
    '**FieldName**: value' (colon outside bold).
    """
    m = re.search(
        r'\*\*' + re.escape(field_name) + r'[^*\n]*\*\*[:\s]+(.+?)(?=\n\s*-\s*|\n\n|\Z)',
        section, re.DOTALL,
    )
    return m.group(1).strip() if m else ''


def _build_identifier(citation: str, section_id: str, title: str) -> str:
    """Build a short human-readable identifier from a citation string."""
    if not citation:
        return section_id

    # US patent / US publication number (e.g. "7,962,495 B2" or "2024/0288467 A1")
    m = re.search(
        r'U\.S\.\s+Patent\s+(?:(?:Application\s+Publication\s+)?No\.?\s+)?'
        r'([\d,/]+\s+[A-Z][0-9]?)',
        citation,
    )
    if m:
        return 'US ' + m.group(1).strip()

    # Foreign patent: CN, EP, WO, JP
    m = re.search(r'\b(CN\d+[A-Z]?|EP\d+[A-Z]?|WO\d+[A-Z]?|JP\d+[A-Z]?)', citation)
    if m:
        return m.group(1)

    # Non-patent lit: first token (handles "W3C", "JCGM", unicode authors) + year
    author_m = re.match(r'([^\s,;\.]+)', citation)
    year_m = re.search(r'\b((?:19|20)\d{2})\b', citation)
    if author_m and year_m:
        words = title.split()[:4]
        frag = ' '.join(words)
        return f"{author_m.group(1)} {year_m.group(1)} ({frag})" if frag else f"{author_m.group(1)} {year_m.group(1)}"

    return section_id


# ── v6.2 claim parser (claims 1-19) ──────────────────────────────────────────

def _parse_v62_claims(path: str) -> list[ClaimDocument]:
    """Parse claims 1-19 from the v6.2 claim ladder.

    Sections are separated by '---' horizontal rules. A section is a
    claim iff it contains '**Claim N.**' anywhere (not just at the start —
    sections for the first claim of each group begin with a '## header'
    line before the claim text). Non-claim sections (preamble, tables,
    prior-art mitigation matrix) are silently skipped.

    Claim text is extracted starting from the '**Claim N.**' marker so
    section headers are excluded from the text field.
    """
    with open(path) as f:
        content = f.read()

    sections = re.split(r'\n---\n', content)
    claims: list[ClaimDocument] = []
    ordinal = 0

    for section in sections:
        section = section.strip()
        m = re.search(r'\*\*Claim\s+(\d+[a-z]*)\.', section)
        if not m:
            continue
        claim_id = m.group(1)
        # Extract from the claim marker onward (drops any preceding ## header)
        claim_text = section[m.start():].strip()
        ordinal += 1
        claims.append(ClaimDocument(
            claim_id=claim_id,
            document_id=_safe_doc_id(claim_id),
            ordinal=ordinal,
            text=claim_text,
        ))

    return claims


# ── v6.3-additions claim parser (claims 20-35) ───────────────────────────────

def _parse_v63_additions(path: str, start_ordinal: int) -> list[ClaimDocument]:
    """Parse claims 20-35 from the v6.3 additions file.

    Each claim section starts with '### Claim N —' header.
    The actual claim body starts at '**N.**' and ends before the first
    italic annotation line (*Hardening, *Spec support, *Multiple-dependency
    note, etc.).
    """
    with open(path) as f:
        content = f.read()

    # Split at every '### Claim N' heading (claims 20-35 plus any preamble)
    sections = re.split(r'\n(?=### Claim \d)', content)

    claims: list[ClaimDocument] = []
    ordinal = start_ordinal

    for section in sections:
        m = re.match(r'### Claim\s+(\d+[a-z]?)', section)
        if not m:
            continue
        claim_id = m.group(1)

        # Find where claim body starts: '**N.**'
        body_start = section.find(f'**{claim_id}.**')
        if body_start < 0:
            continue
        body = section[body_start:]

        # Stop at first italic annotation line (\n*Letter…)
        stop = re.search(r'\n\*[A-Za-z]', body)
        if stop:
            claim_text = body[:stop.start()].strip()
        else:
            stop2 = body.find('\n---')
            claim_text = body[:stop2].strip() if stop2 >= 0 else body.strip()

        if not claim_text:
            continue

        claims.append(ClaimDocument(
            claim_id=claim_id,
            document_id=_safe_doc_id(claim_id),
            ordinal=ordinal,
            text=claim_text,
        ))
        ordinal += 1

    return claims


# ── Public API ────────────────────────────────────────────────────────────────

def parse_claim_ladder(v62_path: str, v63_additions_path: str) -> list[ClaimDocument]:
    """Assemble the full v6.3 claim ladder (35 claims) from both files.

    Returns list sorted by ordinal (1 → 35).
    """
    v62 = _parse_v62_claims(v62_path)
    v63 = _parse_v63_additions(v63_additions_path, start_ordinal=len(v62) + 1)
    all_claims = sorted(v62 + v63, key=lambda c: c.ordinal)
    return all_claims


def parse_ids(path: str) -> list[PriorArtDocument]:
    """Parse the v6.2 IDS markdown into PriorArtDocument list (~49 entries).

    Each IDS entry starts with '### v6.N.N' or '### v6.N.pN' header.
    Text = citation + relevance combined (the predicate-extraction input).
    """
    with open(path) as f:
        content = f.read()

    # Split at every '### v6.' heading
    sections = re.split(r'\n(?=### v6\.)', content)

    refs: list[PriorArtDocument] = []
    for section in sections:
        m = re.match(r'### (v6\.\d+\.[\w]+)\s*[—–\-]?\s*(.*)', section)
        if not m:
            continue
        section_id = m.group(1)
        title = m.group(2).strip()

        category = _extract_field(section, 'Category') or '?'
        citation = _extract_field(section, 'Citation')
        relevance = (
            _extract_field(section, 'Relevance to claims')
            or _extract_field(section, 'Relevance')
        )

        if not citation and not relevance:
            continue

        text = ' — '.join(filter(None, [citation, relevance]))
        identifier = _build_identifier(citation, section_id, title)
        slug = re.sub(r'[^a-z0-9]', '_', section_id.lower())
        doc_id = f"ref_{slug}"

        refs.append(PriorArtDocument(
            identifier=identifier,
            document_id=doc_id,
            section_id=section_id,
            category=category,
            text=text,
        ))

    return refs


# ── Spot-check ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import os

    WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    RESEARCH = os.path.join(WORKSPACE, '..', '..', 'research')

    V62_PATH = os.path.join(
        RESEARCH, 'docs', 'patent', 'Plyknot', 'v6.2',
        'patent-claim-ladder-v6.2.md',
    )
    V63_PATH = os.path.join(
        RESEARCH, 'docs', 'patent', 'Plyknot', 'v6.3',
        'patent-claim-ladder-v6.3-additions.md',
    )
    IDS_PATH = os.path.join(
        RESEARCH, 'docs', 'patent', 'Plyknot', 'v6.2',
        'patent-IDS-list.md',
    )

    print('Parsing claim ladder...')
    claims = parse_claim_ladder(V62_PATH, V63_PATH)
    print(f'  Total claims parsed: {len(claims)}')

    # Spot-check: ordinal 19 = last v6.2 claim, ordinal 20 = first v6.3 claim
    c19 = next((c for c in claims if c.ordinal == 19), None)
    c20 = next((c for c in claims if c.ordinal == 20), None)

    assert c19 is not None, 'ordinal 19 not found'
    assert c20 is not None, 'ordinal 20 not found'
    assert c19.text, f'claim ordinal 19 (id={c19.claim_id}) has empty text'
    assert c20.text, f'claim ordinal 20 (id={c20.claim_id}) has empty text'

    print(f'\n  Spot-check claim ordinal 19 (claim_id={c19.claim_id}):')
    print(f'    document_id : {c19.document_id}')
    print(f'    text length : {len(c19.text)} chars')
    print(f'    text[:120]  : {c19.text[:120]!r}')

    print(f'\n  Spot-check claim ordinal 20 (claim_id={c20.claim_id}):')
    print(f'    document_id : {c20.document_id}')
    print(f'    text length : {len(c20.text)} chars')
    print(f'    text[:120]  : {c20.text[:120]!r}')

    print('\nAll 35 claims:')
    for c in claims:
        print(f'  [{c.ordinal:2d}] claim_id={c.claim_id:<4s}  doc_id={c.document_id:<14s}  '
              f'text_len={len(c.text):4d}  text[:60]={c.text[:60]!r}')

    print('\nParsing IDS...')
    refs = parse_ids(IDS_PATH)
    print(f'  Total references parsed: {len(refs)}')
    print('\nAll references:')
    for r in refs:
        print(f'  [{r.section_id:<10s}] {r.document_id:<20s}  cat={r.category}  '
              f'id={r.identifier[:50]!r}  text_len={len(r.text)}')

    print('\nParse complete. Assertions passed.')
