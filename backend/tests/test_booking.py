import pytest

from arena_core import booking


def test_create_returns_code_and_rate(fresh_db):
    out = booking.create("Alex", "alex@example.com", "2026-06-15", "18:00")
    assert out["code"].startswith("ARENA-")
    assert len(out["code"]) == len("ARENA-") + 4
    assert out["rate_cad"] == 160  # weekday peak
    assert out["end_time"] == "20:00"


def test_double_booking_rejected(fresh_db):
    booking.create("Alex", "alex@example.com", "2026-06-15", "18:00")
    with pytest.raises(booking.BookingError, match="already booked"):
        booking.create("Sam", "sam@example.com", "2026-06-15", "18:00")


def test_holiday_rejected(fresh_db):
    with pytest.raises(booking.BookingError, match="closed"):
        booking.create("Alex", "alex@example.com", "2026-07-01", "10:00")


def test_invalid_session_rejected(fresh_db):
    # 06:00 is not a weekday session.
    with pytest.raises(booking.BookingError, match="not a valid session"):
        booking.create("Alex", "alex@example.com", "2026-06-15", "06:00")


def test_bad_date_format_rejected(fresh_db):
    with pytest.raises(booking.BookingError, match="Invalid date"):
        booking.create("Alex", "alex@example.com", "06/15/2026", "10:00")


def test_get_by_code_roundtrip(fresh_db):
    out = booking.create("Alex", "alex@example.com", "2026-06-15", "10:00")
    bk = booking.get_by_code(out["code"])
    assert bk is not None
    assert bk["name"] == "Alex"
    assert bk["status"] == "confirmed"


def test_cancel_then_rebook_same_slot(fresh_db):
    out = booking.create("Alex", "alex@example.com", "2026-06-15", "10:00")
    booking.cancel(out["code"])
    # Slot is now free again — partial unique index allows this.
    out2 = booking.create("Sam", "sam@example.com", "2026-06-15", "10:00")
    assert out2["code"] != out["code"]


def test_codes_use_safe_alphabet(fresh_db):
    forbidden = set("0O1I")
    for _ in range(20):
        out = booking.create("X", "x@example.com", "2026-06-15", "08:00")
        booking.cancel(out["code"])  # free the slot for the next iteration
        code = out["code"].replace("ARENA-", "")
        assert not (set(code) & forbidden), f"code {code} contains ambiguous char"
