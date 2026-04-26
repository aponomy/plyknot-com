"""DCOI v1 canonicalization maps and functions.

The canonicalization maps are part of the formula specification.
They are locked at v1 and live here, not in runtime config.
"""

from __future__ import annotations

from typing import Mapping


# --- Database family canonicalization ---
# Maps specific table/dataset names to family names.
# Anything not in the map is canonicalized to itself with a warning.

DATABASE_FAMILY_CANONICALIZATION: Mapping[str, str] = {
    # CRSP family
    "CRSP": "CRSP",
    "CRSP daily returns": "CRSP",
    "CRSP monthly returns": "CRSP",
    "CRSP daily": "CRSP",
    "CRSP monthly": "CRSP",
    "CRSP/Compustat merged": "CRSP",  # primary identity is CRSP linkage
    # Compustat family
    "Compustat": "Compustat",
    "Compustat North America": "Compustat",
    "Compustat Annual": "Compustat",
    "Compustat Quarterly": "Compustat",
    "Compustat Global": "Compustat",
    # IBES family
    "IBES": "IBES",
    "IBES summary file": "IBES",
    "IBES detail file": "IBES",
    "I/B/E/S": "IBES",
    # TAQ family
    "TAQ": "TAQ",
    "NYSE TAQ": "TAQ",
    # CDS Markit family
    "CDS Markit": "CDS Markit",
    "Markit CDS": "CDS Markit",
    # 13F holdings family
    "13F holdings": "13F holdings",
    "Thomson Reuters 13F": "13F holdings",
    "13F": "13F holdings",
    # OptionMetrics family
    "OptionMetrics": "OptionMetrics",
    "OptionMetrics IvyDB": "OptionMetrics",
    # Datastream family
    "Datastream": "Datastream",
    "Thomson Datastream": "Datastream",
    "Refinitiv Datastream": "Datastream",
}

# --- Variable pattern canonicalization ---
# Maps specific variable names to pattern names.

VARIABLE_PATTERN_CANONICALIZATION: Mapping[str, str] = {
    # Accruals pattern
    "accruals": "accruals",
    "working_capital_accruals": "accruals",
    "total_accruals": "accruals",
    "discretionary_accruals": "accruals",
    # Asset growth pattern
    "asset_growth": "asset_growth",
    "asset_growth_yoy": "asset_growth",
    "total_asset_growth": "asset_growth",
    # Momentum pattern
    "momentum": "momentum",
    "price_momentum": "momentum",
    "return_momentum": "momentum",
    "intermediate_momentum": "momentum",
    # Value pattern
    "book_to_market": "value",
    "book_market": "value",
    "earnings_to_price": "value",
    "ep_ratio": "value",
    # Profitability pattern
    "profitability": "profitability",
    "gross_profitability": "profitability",
    "operating_profitability": "profitability",
    "roe": "profitability",
    "roa": "profitability",
    # Investment pattern
    "investment": "investment",
    "capital_expenditure": "investment",
    "rd_expenditure": "investment",
    # Size pattern
    "market_cap": "size",
    "firm_size": "size",
    "market_equity": "size",
    # Volatility pattern
    "volatility": "volatility",
    "idiosyncratic_volatility": "volatility",
    "return_volatility": "volatility",
    # Turnover pattern
    "turnover": "turnover",
    "share_turnover": "turnover",
    "volume_turnover": "turnover",
    # Leverage pattern
    "leverage": "leverage",
    "debt_to_equity": "leverage",
    "financial_leverage": "leverage",
    # Beta pattern
    "beta": "beta",
    "market_beta": "beta",
    "capm_beta": "beta",
    # Earnings surprise pattern
    "earnings_surprise": "earnings_surprise",
    "sue": "earnings_surprise",
    "post_earnings_drift": "earnings_surprise",
    # Short interest pattern
    "short_interest": "short_interest",
    "short_ratio": "short_interest",
    "days_to_cover": "short_interest",
    # Illiquidity pattern
    "illiquidity": "illiquidity",
    "amihud_illiquidity": "illiquidity",
    "bid_ask_spread": "illiquidity",
}


def canonicalize_db(raw: str) -> tuple[str, list[str]]:
    """Canonicalize a database name to its family.

    Returns (canonical_name, warnings).
    If the name is not in the map, returns it unchanged with a warning.
    """
    warnings: list[str] = []
    canonical = DATABASE_FAMILY_CANONICALIZATION.get(raw)
    if canonical is None:
        warnings.append(f"WARN: uncanonicalized_db: {raw!r}")
        return (raw, warnings)
    return (canonical, warnings)


def canonicalize_var(raw: str) -> tuple[str, list[str]]:
    """Canonicalize a variable name to its pattern.

    Returns (canonical_name, warnings).
    If the name is not in the map, returns it unchanged with a warning.
    """
    warnings: list[str] = []
    canonical = VARIABLE_PATTERN_CANONICALIZATION.get(raw)
    if canonical is None:
        warnings.append(f"WARN: uncanonicalized_var: {raw!r}")
        return (raw, warnings)
    return (canonical, warnings)
