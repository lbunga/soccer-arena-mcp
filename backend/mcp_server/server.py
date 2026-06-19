"""VirtualSoccerArena MCP server.

Launched by Claude Desktop over stdio. Exposes 4 tools that wrap arena_core.
Tool docstrings are the only thing Claude sees to decide when/how to call,
so they are written precisely.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Allow running with `python -m mcp_server.server` from the backend directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from mcp.server.fastmcp import FastMCP  # noqa: E402

from arena_core import availability, booking, db, weather  # noqa: E402
from arena_core.policy import retriever  # noqa: E402

# Ensure schema exists before the first call (idempotent).
db.init()

mcp = FastMCP("VirtualSoccerArena")


@mcp.tool()
def check_availability(date: str) -> dict:
    """List open 2-hour slots and their CAD rates for a given date.

    Args:
        date: ISO date 'YYYY-MM-DD'. Demo window is Jun-Dec 2026.

    Returns a dict with `closed` (True on Ontario holidays), `day_type`
    ('weekday'|'weekend'), and `slots` — each slot has start_time, end_time,
    tier ('peak'|'offpeak'), rate_cad, and available (bool). Call this before
    create_booking so the user can see what's open and how much each slot costs.
    """
    return availability.get_availability(date)


@mcp.tool()
def query_policy(question: str) -> str:
    """Look up arena policy — cancellation, rebooking, late arrival, refunds,
    code of conduct, equipment rental, memberships, age rules, holidays, etc.

    Args:
        question: The user's natural-language question.

    Returns the most relevant policy passages as plain text. Base your answer
    on the returned text rather than prior assumptions; if the passages do not
    cover the question, say so.
    """
    return retriever.query(question)


@mcp.tool()
def create_booking(name: str, email: str, date: str, start_time: str) -> dict:
    """Book a 2-hour session at VirtualSoccerArena.

    Args:
        name: Booker's full name.
        email: Booker's email (the .ics invite is sent here).
        date: ISO date 'YYYY-MM-DD'.
        start_time: 'HH:MM' 24-hour. Must be a valid session start for that
            day (see check_availability).

    Returns the unique booking code (also unlocks the web mini-game), the
    confirmed slot, rate_cad, and whether the email invite went out. Fails if
    the slot is already booked or the arena is closed that day.
    """
    try:
        return booking.create(name, email, date, start_time)
    except booking.BookingError as e:
        return {"error": str(e)}


@mcp.tool()
def get_weather(date: str) -> dict:
    """Mock weather forecast for a date in the Jun-Dec 2026 demo window.

    Args:
        date: ISO date 'YYYY-MM-DD'.

    Returns temp_c (int Celsius) and condition (e.g. 'sunny', 'snow').
    Deterministic — same date always returns the same forecast.
    """
    return weather.forecast(date)


if __name__ == "__main__":
    mcp.run(transport="stdio")
