from datetime import date

from arena_core import rules


def test_day_type():
    assert rules.day_type(date(2026, 6, 15)) == "weekday"  # Mon
    assert rules.day_type(date(2026, 6, 19)) == "weekday"  # Fri
    assert rules.day_type(date(2026, 6, 20)) == "weekend"  # Sat
    assert rules.day_type(date(2026, 6, 21)) == "weekend"  # Sun


def test_sessions_per_day_type():
    assert rules.sessions_for(date(2026, 6, 15)) == rules.WEEKDAY_SESSIONS
    assert rules.sessions_for(date(2026, 6, 20)) == rules.WEEKEND_SESSIONS
    assert len(rules.WEEKDAY_SESSIONS) == 6
    assert len(rules.WEEKEND_SESSIONS) == 8


def test_peak_classification():
    mon = date(2026, 6, 15)
    assert rules.is_peak(mon, "16:00")
    assert rules.is_peak(mon, "18:00")
    assert not rules.is_peak(mon, "08:00")
    assert not rules.is_peak(mon, "12:00")

    sat = date(2026, 6, 20)
    for s in ("10:00", "12:00", "14:00", "16:00"):
        assert rules.is_peak(sat, s)
    for s in ("06:00", "08:00", "18:00", "20:00"):
        assert not rules.is_peak(sat, s)


def test_rate_table_inequalities():
    mon = date(2026, 6, 15)
    sat = date(2026, 6, 20)
    # off-peak < peak per day type
    assert rules.rate_for(mon, "08:00") < rules.rate_for(mon, "16:00")
    assert rules.rate_for(sat, "06:00") < rules.rate_for(sat, "12:00")
    # weekend > weekday at every tier
    assert rules.rate_for(sat, "06:00") > rules.rate_for(mon, "08:00")
    assert rules.rate_for(sat, "12:00") > rules.rate_for(mon, "16:00")


def test_rate_exact_values():
    assert rules.rate_for(date(2026, 6, 15), "08:00") == 120
    assert rules.rate_for(date(2026, 6, 15), "16:00") == 160
    assert rules.rate_for(date(2026, 6, 20), "06:00") == 150
    assert rules.rate_for(date(2026, 6, 20), "12:00") == 200


def test_all_seven_holidays_marked_closed():
    expected = {
        date(2026, 7, 1), date(2026, 8, 3), date(2026, 9, 7),
        date(2026, 10, 12), date(2026, 11, 11),
        date(2026, 12, 25), date(2026, 12, 26),
    }
    for d in expected:
        assert rules.is_holiday(d), f"{d} should be a holiday"
    assert rules.is_holiday(date(2026, 6, 15)) is False


def test_add_hours():
    assert rules.add_hours("08:00", 2) == "10:00"
    assert rules.add_hours("18:00", 2) == "20:00"


def test_is_valid_session():
    mon = date(2026, 6, 15)
    assert rules.is_valid_session(mon, "08:00")
    assert not rules.is_valid_session(mon, "06:00")  # weekday doesn't have 06:00
    sat = date(2026, 6, 20)
    assert rules.is_valid_session(sat, "06:00")
