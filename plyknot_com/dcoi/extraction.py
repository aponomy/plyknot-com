"""LLM extraction of predictor metadata from McLean-Pontiff (2016).

Produces one Predictor record per row. Uses Haiku for cost.
Output written to predictors-v1.json (replacing the TBD skeleton)
and extraction-raw-v1.json (audit trail).
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import anthropic

EXTRACTION_PROMPT_VERSION = "v1.0"

EXTRACTION_PROMPT = """\
You are extracting structured metadata from a list of academic finance
predictors studied in McLean and Pontiff (2016) "Does Academic Research
Destroy Stock Return Predictability?" Journal of Finance 71(1), 5-32.

For each predictor, output a JSON object with exactly these fields:

  id                   - snake_case identifier, derived from the predictor name
  name                 - the predictor's name as commonly cited
  mclean_pontiff_index - the 1-97 row number provided
  original_paper:
    doi              - DOI if known, else null
    authors          - list of "Last, F. M." strings
    title            - paper title
    year             - 4-digit year
    venue            - journal or working-paper venue
    url              - stable URL if no DOI, else null
  publication_date     - ISO 8601 date; if SSRN/working-paper date predates
                         journal date, use the earlier
  database_families    - list, canonicalized to one of: CRSP, Compustat,
                         IBES, TAQ, CDS Markit, 13F holdings, OptionMetrics,
                         Datastream. Use the canonical name verbatim. If a
                         database does not fit these families, use your best
                         short name.
  variable_patterns    - list of pattern names. Short strings describing
                         the predictor's variable construction (e.g.,
                         "accruals", "asset_growth", "book_to_market").
                         Use snake_case.
  ambiguous            - true if you have low confidence in any field
  notes                - free text, mainly for ambiguity explanations

Output a JSON array, one object per predictor, in mclean_pontiff_index order.
Do not include any prose outside the JSON. If you cannot determine a field,
use null and set ambiguous: true with a note.
"""

# McLean-Pontiff Table 1 predictor list (97 rows).
# Source: McLean & Pontiff (2016) JF Table 1, cross-referenced with
# Andrew Chen's OpenAssetPricing signal documentation.
# Format: (index, predictor_name, original_citation)
MCLEAN_PONTIFF_TABLE_1 = [
    (1, "Accruals", "Sloan (1996)"),
    (2, "Asset Growth", "Cooper, Gulen, and Schill (2008)"),
    (3, "Asset Turnover", "Soliman (2008)"),
    (4, "Beta Arbitrage", "Hong and Sraer (2012)"),
    (5, "Book-to-Market", "Rosenberg, Reid, and Lanstein (1985)"),
    (6, "Capital Turnover", "Haugen and Baker (1996)"),
    (7, "Cash Flow to Debt", "Ou and Penman (1989)"),
    (8, "Cash Productivity", "Chandrashekar and Rao (2009)"),
    (9, "Cash to Assets", "Palazzo (2012)"),
    (10, "Change in Forecast and Accrual", "Barth and Hutton (2004)"),
    (11, "Change in Recommendation", "Jegadeesh, Kim, Krische, and Lee (2004)"),
    (12, "Change in Shares Outstanding", "Pontiff and Woodgate (2008)"),
    (13, "Composite Debt Issuance", "Lyandres, Sun, and Zhang (2008)"),
    (14, "Current Ratio", "Ou and Penman (1989)"),
    (15, "Days with Zero Trades", "Liu (2006)"),
    (16, "Debt Issuance", "Spiess and Affleck-Graves (1999)"),
    (17, "Depreciation to Plant", "Holthausen and Larcker (1992)"),
    (18, "Dividend Payout Ratio", "Litzenberger and Ramaswamy (1979)"),
    (19, "Dividend Yield", "Litzenberger and Ramaswamy (1979)"),
    (20, "Earnings Consistency", "Alwathainani (2009)"),
    (21, "Earnings Forecast to Price", "Elgers, Lo, and Pfeiffer (2001)"),
    (22, "Earnings Surprise", "Foster, Olsen, and Shevlin (1984)"),
    (23, "Earnings to Price", "Basu (1977)"),
    (24, "Enterprise Multiple", "Loughran and Wellman (2011)"),
    (25, "Financial Distress", "Campbell, Hilscher, and Szilagyi (2008)"),
    (26, "Firm Age", "Barry and Brown (1984)"),
    (27, "Firm Age-Momentum", "Zhang (2006)"),
    (28, "Forecast Dispersion", "Diether, Malloy, and Scherbina (2002)"),
    (29, "Gross Margin", "Novy-Marx (2013)"),
    (30, "Gross Profitability", "Novy-Marx (2013)"),
    (31, "Growth in Long-term Debt", "Richardson, Sloan, Soliman, and Tuna (2005)"),
    (32, "Idiosyncratic Volatility (FF)", "Ang, Hodrick, Xing, and Zhang (2006)"),
    (33, "Industry Concentration (Herfindahl)", "Hou and Robinson (2006)"),
    (34, "Industry Momentum", "Moskowitz and Grinblatt (1999)"),
    (35, "Industry-adjusted BM", "Asness, Porter, and Stevens (2000)"),
    (36, "Industry-adjusted CFtoP", "Asness, Porter, and Stevens (2000)"),
    (37, "Industry-adjusted Change in Employees", "Asness, Porter, and Stevens (2000)"),
    (38, "Industry-adjusted LTreversal", "Asness, Porter, and Stevens (2000)"),
    (39, "Industry-adjusted Momentum", "Asness, Porter, and Stevens (2000)"),
    (40, "Industry-adjusted SGA to Sales", "Asness, Porter, and Stevens (2000)"),
    (41, "Industry-adjusted Size", "Asness, Porter, and Stevens (2000)"),
    (42, "Intangibles to Total Assets", "Daniel and Titman (2006)"),
    (43, "Inventory Change", "Thomas and Zhang (2002)"),
    (44, "Inventory Growth", "Belo and Lin (2012)"),
    (45, "Investment Growth", "Xing (2008)"),
    (46, "Investment to Assets", "Titman, Wei, and Xie (2004)"),
    (47, "Kaplan-Zingales Index", "Lamont, Polk, and Saa-Requejo (2001)"),
    (48, "Lagged Momentum (12-7)", "Novy-Marx (2012)"),
    (49, "Long-term Reversal", "De Bondt and Thaler (1985)"),
    (50, "Max Daily Return", "Bali, Cakici, and Whitelaw (2011)"),
    (51, "Momentum (12-2)", "Jegadeesh and Titman (1993)"),
    (52, "Momentum (6-2)", "Jegadeesh and Titman (1993)"),
    (53, "Momentum and LT Reversal", "Chan and Kot (2006)"),
    (54, "Momentum and Volume", "Lee and Swaminathan (2000)"),
    (55, "Momentum-Reversal", "Jegadeesh and Titman (1993)"),
    (56, "Net Debt Finance", "Bradshaw, Richardson, and Sloan (2006)"),
    (57, "Net Equity Finance", "Bradshaw, Richardson, and Sloan (2006)"),
    (58, "Net Operating Assets", "Hirshleifer, Hou, Teoh, and Zhang (2004)"),
    (59, "Net Payout Yield", "Boudoukh, Michaely, Richardson, and Roberts (2007)"),
    (60, "Number of Analysts", "Elgers, Lo, and Pfeiffer (2001)"),
    (61, "Number of Consecutive Earnings Increases", "Loh and Warachka (2012)"),
    (62, "Operating Leverage", "Novy-Marx (2011)"),
    (63, "Operating Profitability", "Fama and French (2006)"),
    (64, "Organizational Capital", "Eisfeldt and Papanikolaou (2013)"),
    (65, "OScore", "Dichev (1998)"),
    (66, "Percent Accruals", "Hafzalla, Lundholm, and Van Winkle (2011)"),
    (67, "Percent Operating Accruals", "Hafzalla, Lundholm, and Van Winkle (2011)"),
    (68, "Price", "Miller and Scholes (1982)"),
    (69, "Price Delay", "Hou and Moskowitz (2005)"),
    (70, "Profit Margin", "Soliman (2008)"),
    (71, "R&D to Market Capitalization", "Chan, Lakonishok, and Sougiannis (2001)"),
    (72, "R&D to Sales", "Chan, Lakonishok, and Sougiannis (2001)"),
    (73, "Real Dirty Surplus", "Landsman, Miller, Peasnell, and Yeh (2011)"),
    (74, "Return on Assets", "Fama and French (2006)"),
    (75, "Return on Equity", "Haugen and Baker (1996)"),
    (76, "Return on Invested Capital", "Brown and Rowe (2007)"),
    (77, "Revenue Surprise", "Jegadeesh and Livnat (2006)"),
    (78, "Sales Growth", "Lakonishok, Shleifer, and Vishny (1994)"),
    (79, "Sales to Price", "Barbee, Mukherji, and Raines (1996)"),
    (80, "Share Issuance (1yr)", "Pontiff and Woodgate (2008)"),
    (81, "Share Issuance (5yr)", "Daniel and Titman (2006)"),
    (82, "Share Volume", "Datar, Naik, and Radcliffe (1998)"),
    (83, "Short Interest", "Dechow, Hutton, Meulbroek, and Sloan (2001)"),
    (84, "Short-term Reversal", "Jegadeesh (1990)"),
    (85, "Sin Stock", "Hong and Kacperczyk (2009)"),
    (86, "Size", "Banz (1981)"),
    (87, "Sparse Analyst Forecast", "Frankel and Lee (1998)"),
    (88, "Spin-off", "Cusatis, Miles, and Woolridge (1993)"),
    (89, "Sustainable Growth", "Lockwood and Prombutr (2010)"),
    (90, "Tax", "Thomas and Zhang (2011)"),
    (91, "Total Volatility", "Ang, Hodrick, Xing, and Zhang (2006)"),
    (92, "Unexpected R&D Increase", "Eberhart, Maxwell, and Siddique (2004)"),
    (93, "Volume to Market Equity", "Haugen and Baker (1996)"),
    (94, "Volume Trend", "Haugen and Baker (1996)"),
    (95, "Volume Variance", "Chordia, Subrahmanyam, and Anshuman (2001)"),
    (96, "Whited-Wu Index", "Whited and Wu (2006)"),
    (97, "Zscore", "Dichev (1998)"),
]


DECAY_TRANSCRIPTION_PROMPT_VERSION = "v1.0"

DECAY_TRANSCRIPTION_PROMPT = """\
You are a financial economics expert. For each of the 97 McLean-Pontiff (2016)
predictors listed below, provide the post-publication decay data as reported or
derivable from McLean and Pontiff (2016) "Does Academic Research Destroy Stock
Return Predictability?" Journal of Finance 71(1), 5-32.

For each predictor, output a JSON object:

  id                   - snake_case predictor id (matching the id provided)
  in_sample_return     - the average monthly in-sample long-short portfolio
                         return (as a decimal, e.g. 0.0085 for 85 bps)
  out_of_sample_return - the average monthly out-of-sample (post-publication)
                         long-short portfolio return
  decay_magnitude      - (in_sample - out_of_sample) / in_sample, computed
                         from the two values above; round to 4 decimals

Use the values from McLean-Pontiff Table 6 or the most closely matching
table. If the exact in-sample and out-of-sample values are not separately
reported for a predictor, use your best estimate from the paper's reported
statistics. If truly unknown, set all numeric fields to null.

Output a JSON array. No prose outside the JSON.
"""

DATA_DIR = Path(__file__).parent / "data"


def build_extraction_input() -> str:
    """Build the predictor list input for the extraction prompt."""
    lines = []
    for idx, name, citation in MCLEAN_PONTIFF_TABLE_1:
        lines.append(f"{idx}. {name} — {citation}")
    return "\n".join(lines)


def run_predictor_extraction() -> dict:
    """Extract 97 predictor records via Haiku.

    Splits into two batches (1-50, 51-97) to stay within token limits.
    Returns combined raw responses.
    """
    client = anthropic.Anthropic()
    all_lines = build_extraction_input().split("\n")

    batches = [all_lines[:50], all_lines[50:]]
    raw_parts = []
    all_parsed = []

    for i, batch_lines in enumerate(batches):
        batch_text = "\n".join(batch_lines)
        n_start = i * 50 + 1
        n_end = n_start + len(batch_lines) - 1
        print(f"  Batch {i+1}/2: predictors {n_start}-{n_end}...")

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=16000,
            messages=[
                {
                    "role": "user",
                    "content": f"{EXTRACTION_PROMPT}\n\nHere are predictors {n_start}-{n_end}:\n\n{batch_text}",
                }
            ],
        )

        raw_part = {
            "batch": i + 1,
            "model": message.model,
            "prompt_version": EXTRACTION_PROMPT_VERSION,
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens,
            "raw_text": message.content[0].text,
            "stop_reason": message.stop_reason,
        }
        raw_parts.append(raw_part)

        parsed = parse_json_from_response(message.content[0].text)
        all_parsed.extend(parsed)
        print(f"    -> {len(parsed)} records, stop_reason={message.stop_reason}")

    return {
        "model": raw_parts[0]["model"],
        "prompt_version": EXTRACTION_PROMPT_VERSION,
        "batches": raw_parts,
        "total_parsed": len(all_parsed),
        "_parsed": all_parsed,
    }


def run_decay_extraction(predictor_ids: list[dict]) -> dict:
    """Transcribe decay labels via Haiku. Returns raw API response."""
    client = anthropic.Anthropic()

    id_list = "\n".join(
        f"{p['mclean_pontiff_index']}. {p['name']} (id: {p['id']})"
        for p in predictor_ids
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=16000,
        messages=[
            {
                "role": "user",
                "content": f"{DECAY_TRANSCRIPTION_PROMPT}\n\nPredictors:\n\n{id_list}",
            }
        ],
    )

    return {
        "model": message.model,
        "prompt_version": DECAY_TRANSCRIPTION_PROMPT_VERSION,
        "input_tokens": message.usage.input_tokens,
        "output_tokens": message.usage.output_tokens,
        "raw_text": message.content[0].text,
    }


def parse_json_from_response(raw_text: str) -> list[dict]:
    """Extract JSON array from LLM response text."""
    text = raw_text.strip()
    # Handle markdown code blocks
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (``` markers)
        lines = [l for l in lines[1:] if not l.strip().startswith("```")]
        text = "\n".join(lines)
    return json.loads(text)


def save_predictors(parsed: list[dict], raw_response: dict) -> None:
    """Save extracted predictors and raw response to data dir."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(DATA_DIR / "extraction-raw-v1.json", "w") as f:
        json.dump(raw_response, f, indent=2)

    with open(DATA_DIR / "predictors-v1.json", "w") as f:
        json.dump(parsed, f, indent=2)


def save_decay_labels(parsed: list[dict], raw_response: dict) -> None:
    """Save extracted decay labels and raw response to data dir."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(DATA_DIR / "decay-raw-v1.json", "w") as f:
        json.dump(raw_response, f, indent=2)

    with open(DATA_DIR / "decay-labels-v1.json", "w") as f:
        json.dump(parsed, f, indent=2)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2 or sys.argv[1] not in ("predictors", "decay"):
        print("Usage: python -m plyknot_com.dcoi.extraction [predictors|decay]")
        sys.exit(1)

    if sys.argv[1] == "predictors":
        print("Running predictor extraction via Haiku...")
        raw = run_predictor_extraction()
        parsed = raw.pop("_parsed")
        print(f"  Model: {raw['model']}")
        print(f"  Total parsed: {len(parsed)} predictor records")

        save_predictors(parsed, raw)
        print(f"  Saved to {DATA_DIR / 'predictors-v1.json'}")
        print(f"  Raw response saved to {DATA_DIR / 'extraction-raw-v1.json'}")

        ambiguous = [p for p in parsed if p.get("ambiguous")]
        print(f"  Ambiguous: {len(ambiguous)}/{len(parsed)}")

    elif sys.argv[1] == "decay":
        # Load predictor ids from the already-extracted file
        with open(DATA_DIR / "predictors-v1.json") as f:
            predictors = json.load(f)

        predictor_ids = [
            {"mclean_pontiff_index": p["mclean_pontiff_index"], "name": p["name"], "id": p["id"]}
            for p in predictors
        ]

        print("Running decay-label transcription via Haiku...")
        raw = run_decay_extraction(predictor_ids)
        print(f"  Model: {raw['model']}")
        print(f"  Tokens: {raw['input_tokens']} in, {raw['output_tokens']} out")

        parsed = parse_json_from_response(raw["raw_text"])
        print(f"  Parsed {len(parsed)} decay labels")

        save_decay_labels(parsed, raw)
        print(f"  Saved to {DATA_DIR / 'decay-labels-v1.json'}")
        print(f"  Raw response saved to {DATA_DIR / 'decay-raw-v1.json'}")
