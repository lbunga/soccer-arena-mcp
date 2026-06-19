from arena_core import availability, booking


def test_availability_weekday_open(fresh_db):
    out = availability.get_availability("2026-06-15")  # Monday
    assert out["closed"] is False
    assert out["day_type"] == "weekday"
    assert len(out["slots"]) == 6
    assert all(s["available"] for s in out["slots"])


def test_availability_weekend_has_eight_slots(fresh_db):
    out = availability.get_availability("2026-06-20")  # Saturday
    assert out["closed"] is False
    assert out["day_type"] == "weekend"
    assert len(out["slots"]) == 8


def test_availability_holiday_closed(fresh_db):
    out = availability.get_availability("2026-07-01")
    assert out["closed"] is True
    assert "Holiday" in out["reason"]
    assert out["slots"] == []


def test_availability_subtracts_confirmed_booking(fresh_db):
    booking.create("Alex", "alex@example.com", "2026-06-15", "16:00")
    out = availability.get_availability("2026-06-15")
    slot_1600 = next(s for s in out["slots"] if s["start_time"] == "16:00")
    assert slot_1600["available"] is False
    slot_other = next(s for s in out["slots"] if s["start_time"] == "08:00")
    assert slot_other["available"] is True
