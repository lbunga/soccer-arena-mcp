"""Business rules: hours, sessions, peak/off-peak, rates, holiday closures.

Demo values, fixed in code. Demo window is Jun-Dec 2026.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

WEEKDAY_SESSIONS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]
WEEKEND_SESSIONS = [
    "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00",
]

WEEKDAY_PEAK = {"16:00", "18:00"}
WEEKEND_PEAK = {"10:00", "12:00", "14:00", "16:00"}

RATES: dict[tuple[str, str], int] = {
    ("weekday", "offpeak"): 120,
    ("weekday", "peak"): 160,
    ("weekend", "offpeak"): 150,
    ("weekend", "peak"): 200,
}

# Ontario statutory holidays / closures, demo window only.
HOLIDAYS: set[date] = {
    date(2026, 7, 1),   # Canada Day
    date(2026, 8, 3),   # August Civic Holiday
    date(2026, 9, 7),   # Labour Day
    date(2026, 10, 12), # Thanksgiving
    date(2026, 11, 11), # Remembrance Day
    date(2026, 12, 25), # Christmas Day
    date(2026, 12, 26), # Boxing Day
}

SESSION_HOURS = 2


def parse_iso_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def day_type(d: date) -> str:
    return "weekend" if d.weekday() >= 5 else "weekday"


def sessions_for(d: date) -> list[str]:
    return WEEKEND_SESSIONS if day_type(d) == "weekend" else WEEKDAY_SESSIONS


def is_peak(d: date, start_time: str) -> bool:
    peak = WEEKEND_PEAK if day_type(d) == "weekend" else WEEKDAY_PEAK
    return start_time in peak


def rate_for(d: date, start_time: str) -> int:
    tier = "peak" if is_peak(d, start_time) else "offpeak"
    return RATES[(day_type(d), tier)]


def add_hours(start_time: str, hours: int) -> str:
    h, m = start_time.split(":")
    end = datetime(2000, 1, 1, int(h), int(m)) + timedelta(hours=hours)
    return end.strftime("%H:%M")


def is_holiday(d: date) -> bool:
    return d in HOLIDAYS


def is_valid_session(d: date, start_time: str) -> bool:
    return start_time in sessions_for(d)
