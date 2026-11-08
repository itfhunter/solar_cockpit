"""Seeding of running periods from long-term statistics."""

from __future__ import annotations

from datetime import datetime, timedelta

from homeassistant.components.recorder.models import StatisticData, StatisticMetaData
from homeassistant.components.recorder.statistics import async_import_statistics
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.components.recorder.common import (
    async_wait_recording_done,
)

import pytest

from custom_components.solar_cockpit.const import DOMAIN

from .test_solar_cockpit import DATA, _f, _set_sources


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(recorder_mock, enable_custom_integrations):
    """The recorder must start before hass in this module."""
    yield


async def test_seed_from_statistics(hass: HomeAssistant, freezer) -> None:
    tz = dt_util.get_default_time_zone()
    now = datetime(2026, 11, 8, 8, 30, tzinfo=tz)
    freezer.move_to(now)

    # Import meter: hourly stats exist only since 1 Oct (younger than the year)
    first = datetime(2026, 10, 1, 0, 0, tzinfo=tz)
    rows = []
    value = 500.0
    t = first
    while t < now.replace(minute=0) - timedelta(hours=1):
        rows.append(StatisticData(start=t, mean=value + 0.25, min=value, max=value + 0.5))
        value += 0.5
        t += timedelta(hours=1)
    meta = StatisticMetaData(
        has_mean=True, has_sum=False, name=None, source="recorder",
        statistic_id="sensor.meter_import_total", unit_of_measurement="kWh",
        mean_type=1, unit_class="energy",
    )
    async_import_statistics(hass, meta, rows)
    await async_wait_recording_done(hass)

    _set_sources(hass, **{"sensor.meter_import_total": str(value)})
    entry = MockConfigEntry(domain=DOMAIN, data=DATA, unique_id=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    hours_today = 8  # 00:00 .. 08:00
    # day: value at midnight from the hour before -> 8 h * 0.5 kWh = 4 kWh (minus last missing hour)
    day = _f(hass, "sensor.solar_cockpit_import_day")
    assert 3.0 <= day <= 4.5, day
    month = _f(hass, "sensor.solar_cockpit_import_month")
    assert 3.0 + 7 * 12 <= month <= 4.5 + 7 * 12, month
    # year: falls back to the first value since 1 Oct
    year = _f(hass, "sensor.solar_cockpit_import_year")
    assert year >= value - 500.0 - 1, (year, value)
    assert hours_today
