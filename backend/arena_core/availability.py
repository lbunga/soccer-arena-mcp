"""Availability = rules' sessions for the day MINUS confirmed bookings.

Nothing about availability is persisted; it is always derived.
"""
from __future__ import annotations

from . import db, rules


def get_availability(date_str: str) -> dict:
    d = rules.parse_iso_date(date_str)

    if rules.is_holiday(d):
        return {
            "date": date_str,
            "closed": True,
            "reason": "Holiday closure",
            "slots": [],
        }

    dt = rules.day_type(d)
    sessions = rules.sessions_for(d)
    taken = db.confirmed_start_times(date_str)

    slots = [
        {
            "start_time": s,
            "end_time": rules.add_hours(s, rules.SESSION_HOURS),
            "tier": "peak" if rules.is_peak(d, s) else "offpeak",
            "rate_cad": rules.rate_for(d, s),
            "available": s not in taken,
        }
        for s in sessions
    ]
    return {"date": date_str, "closed": False, "day_type": dt, "slots": slots}
