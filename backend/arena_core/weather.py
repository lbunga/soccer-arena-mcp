"""Deterministic mock seasonal forecast for the Jun-Dec 2026 demo window.

Same date -> same forecast (seeded by date ordinal), so the demo is repeatable.
"""
from __future__ import annotations

import random

from . import rules


def forecast(date_str: str) -> dict:
    d = rules.parse_iso_date(date_str)
    rng = random.Random(d.toordinal())
    month = d.month

    if month in (6, 7, 8):
        temp = rng.randint(20, 31)
        conds = ["sunny", "sunny", "overcast", "partly cloudy"]
    elif month in (9, 10):
        temp = rng.randint(8, 18)
        conds = ["overcast", "rainy", "sunny", "windy"]
    else:
        temp = rng.randint(-12, 2)
        conds = ["snow", "overcast", "snow", "flurries"]

    return {
        "date": date_str,
        "temp_c": temp,
        "condition": rng.choice(conds),
    }
