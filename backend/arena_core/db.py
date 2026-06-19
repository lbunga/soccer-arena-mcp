"""SQLite connection + schema bootstrap.

Bookings are the single source of truth. The partial unique index on
(booking_date, start_time) WHERE status='confirmed' is what enforces
no-double-booking while still allowing rebooking after a cancellation.
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager

from . import config

_SCHEMA = """
CREATE TABLE IF NOT EXISTS bookings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL,
    booking_date  TEXT    NOT NULL,
    start_time    TEXT    NOT NULL,
    rate_cad      REAL    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'confirmed',
    created_at    TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_slot
    ON bookings (booking_date, start_time)
    WHERE status = 'confirmed';
"""


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(config.ARENA_DB_PATH, isolation_level=None)
    conn.row_factory = sqlite3.Row
    # WAL allows concurrent reads from FastAPI while MCP writes (and vice versa).
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init() -> None:
    with connect() as conn:
        conn.executescript(_SCHEMA)


@contextmanager
def cursor():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


def confirmed_start_times(booking_date: str) -> set[str]:
    with cursor() as conn:
        rows = conn.execute(
            "SELECT start_time FROM bookings WHERE booking_date=? AND status='confirmed'",
            (booking_date,),
        ).fetchall()
    return {r["start_time"] for r in rows}


def insert_booking(
    code: str,
    name: str,
    email: str,
    booking_date: str,
    start_time: str,
    rate_cad: float,
    created_at: str,
) -> int:
    with cursor() as conn:
        cur = conn.execute(
            """INSERT INTO bookings
               (code, name, email, booking_date, start_time, rate_cad, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)""",
            (code, name, email, booking_date, start_time, rate_cad, created_at),
        )
        return cur.lastrowid


def code_exists(code: str) -> bool:
    with cursor() as conn:
        row = conn.execute("SELECT 1 FROM bookings WHERE code=?", (code,)).fetchone()
    return row is not None


def get_by_code(code: str) -> dict | None:
    with cursor() as conn:
        row = conn.execute("SELECT * FROM bookings WHERE code=?", (code,)).fetchone()
    return dict(row) if row else None


def set_status(code: str, status: str) -> bool:
    with cursor() as conn:
        cur = conn.execute("UPDATE bookings SET status=? WHERE code=?", (status, code))
        return cur.rowcount > 0
