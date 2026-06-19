from arena_core import weather


def test_weather_is_deterministic():
    a = weather.forecast("2026-07-15")
    b = weather.forecast("2026-07-15")
    assert a == b


def test_weather_seasonal_ranges():
    summer = weather.forecast("2026-07-15")
    fall = weather.forecast("2026-10-15")
    winter = weather.forecast("2026-12-20")
    assert 20 <= summer["temp_c"] <= 31
    assert 8 <= fall["temp_c"] <= 18
    assert -12 <= winter["temp_c"] <= 2
