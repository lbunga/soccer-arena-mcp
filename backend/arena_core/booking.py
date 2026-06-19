"""Booking creation, lookup, cancellation, rebooking."""
from __future__ import annotations

import secrets
import sqlite3
from datetime import datetime

from . import db, rules

# Ambiguous chars excluded (no 0/O/1/I).
_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


class BookingError(Exception):
    pass


def _new_code() -> str:
    return "ARENA-" + "".join(secrets.choice(_ALPHABET) for _ in range(4))


def _unique_code(max_tries: int = 16) -> str:
    for _ in range(max_tries):
        code = _new_code()
        if not db.code_exists(code):
            return code
    raise BookingError("Could not generate a unique booking code.")


def _validate_slot(date_str: str, start_time: str) -> None:
    try:
        d = rules.parse_iso_date(date_str)
    except ValueError as e:
        raise BookingError(f"Invalid date '{date_str}', expected YYYY-MM-DD.") from e

    if rules.is_holiday(d):
        raise BookingError(f"The arena is closed on {date_str} (holiday).")

    if not rules.is_valid_session(d, start_time):
        valid = ", ".join(rules.sessions_for(d))
        raise BookingError(
            f"'{start_time}' is not a valid session start on {date_str}. "
            f"Valid starts: {valid}."
        )


def create(name: str, email: str, date_str: str, start_time: str) -> dict:
    _validate_slot(date_str, start_time)
    d = rules.parse_iso_date(date_str)
    rate = rules.rate_for(d, start_time)
    code = _unique_code()
    created_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    try:
        db.insert_booking(code, name, email, date_str, start_time, rate, created_at)
    except sqlite3.IntegrityError as e:
        # Partial unique index fires when the slot already has a confirmed row.
        if "uq_active_slot" in str(e) or "UNIQUE" in str(e).upper():
            raise BookingError(
                f"The {start_time} slot on {date_str} is already booked."
            ) from e
        raise

    # Email is best-effort: a delivery failure shouldn't roll back the booking.
    try:
        from . import email_service
        email_service.send_invite(name, email, date_str, start_time, code, rate)
        email_sent = True
    except Exception:
        email_sent = False

    return {
        "code": code,
        "date": date_str,
        "start_time": start_time,
        "end_time": rules.add_hours(start_time, rules.SESSION_HOURS),
        "rate_cad": rate,
        "email_sent": email_sent,
        "message": (
            f"Booked {start_time} on {date_str} for {name}. "
            f"Code: {code}. "
            + ("Calendar invite emailed." if email_sent else "Email delivery failed; code still valid.")
        ),
    }


def get_by_code(code: str) -> dict | None:
    return db.get_by_code(code)


def cancel(code: str) -> dict:
    bk = db.get_by_code(code)
    if not bk:
        raise BookingError(f"No booking with code {code}.")
    if bk["status"] == "cancelled":
        return {"code": code, "status": "cancelled", "message": "Already cancelled."}
    db.set_status(code, "cancelled")
    return {"code": code, "status": "cancelled", "message": f"Booking {code} cancelled."}


def rebook(code: str, new_date: str, new_start_time: str) -> dict:
    bk = db.get_by_code(code)
    if not bk:
        raise BookingError(f"No booking with code {code}.")
    if bk["status"] == "confirmed":
        db.set_status(code, "cancelled")
    return create(bk["name"], bk["email"], new_date, new_start_time)
