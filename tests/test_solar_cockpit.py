"""End-to-end tests with a real Home Assistant core."""

from __future__ import annotations

from datetime import datetime

from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.solar_cockpit.const import DOMAIN

KWH = {"unit_of_measurement": "kWh", "device_class": "energy", "state_class": "total_increasing"}
W = {"unit_of_measurement": "W", "device_class": "power", "state_class": "measurement"}

DATA = {
    "pv": {
        "pv_power": "sensor.inverter_pv_power",
        "pv_strings": ["sensor.inverter_pv1_power", "sensor.inverter_pv2_power"],
        "pv_energy_total": "sensor.inverter_pv_energy_total",
    },
    "battery": {
        "battery_soc": "sensor.inverter_battery_soc",
        "battery_power": "sensor.inverter_battery_power",
        "battery_power_invert": False,
        "battery_capacity_kwh": 10.0,
        "battery_min_soc": 10.0,
    },
    "house": {
        "house_power": "sensor.inverter_house_power",
        "grid_power": "sensor.inverter_grid_power",
        "grid_power_invert": True,
    },
    "meter": {
        "meter_import_total": "sensor.meter_import_total",
        "meter_export_total": "sensor.meter_export_total",
    },
    "forecast": {"forecast_today": "sensor.forecast_today"},
    "prices": {"price_buy": 0.30, "price_sell": 0.08},
    "surplus": {"surplus_on_w": 1500, "surplus_off_w": 500, "surplus_min_soc": 50},
}


def _set_sources(hass: HomeAssistant, **over) -> None:
    values = {
        "sensor.inverter_pv_power": ("4800", W),
        "sensor.inverter_pv1_power": ("2400", W),
        "sensor.inverter_pv2_power": ("2400", W),
        "sensor.inverter_pv_energy_total": ("12000.0", KWH),
        "sensor.inverter_battery_soc": ("60", {"unit_of_measurement": "%"}),
        "sensor.inverter_battery_power": ("-800", W),  # discharging
        "sensor.inverter_house_power": ("1400", W),
        "sensor.inverter_grid_power": ("-959", W),  # inverter reports import as negative
        "sensor.unused_power": ("540", W),
        "sensor.meter_import_total": ("860.0", {"state_class": "measurement"}),
        "sensor.meter_export_total": ("3740.0", {"state_class": "measurement"}),
        "sensor.forecast_today": ("10.0", KWH),
    }
    for eid, val in over.items():
        values[eid] = (val, values[eid][1])
    for eid, (state, attrs) in values.items():
        hass.states.async_set(eid, state, attrs)


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    _set_sources(hass)
    entry = MockConfigEntry(domain=DOMAIN, data=DATA, unique_id=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _f(hass, eid):
    return float(hass.states.get(eid).state)


async def test_config_flow_prefills_and_creates(hass: HomeAssistant) -> None:
    _set_sources(hass)
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], DATA)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Solar Cockpit"


async def test_hysteresis_validation(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    bad = {**DATA, "surplus": {"surplus_on_w": 500, "surplus_off_w": 1500, "surplus_min_soc": 50}}
    result = await hass.config_entries.flow.async_configure(result["flow_id"], bad)
    assert result["errors"] == {"base": "surplus_hysteresis"}


async def test_live_values(hass: HomeAssistant) -> None:
    await _setup(hass)
    assert _f(hass, "sensor.solar_cockpit_pv_power") == 4800
    assert _f(hass, "sensor.solar_cockpit_grid_power") == 959  # import positive
    assert _f(hass, "sensor.solar_cockpit_grid_import_power") == 959
    assert _f(hass, "sensor.solar_cockpit_grid_export_power") == 0
    assert _f(hass, "sensor.solar_cockpit_battery_discharge_power") == 800
    assert hass.states.get("sensor.solar_cockpit_battery_state").state == "discharging"
    assert _f(hass, "sensor.solar_cockpit_pv_surplus") == 3400
    # (60-10)% of 10 kWh = 5 kWh ; 5000 Wh / 800 W = 6.25 h
    assert _f(hass, "sensor.solar_cockpit_battery_energy_available") == 5.0
    assert _f(hass, "sensor.solar_cockpit_battery_time_remaining") == 6.25
    assert hass.states.get("binary_sensor.solar_cockpit_surplus_active").state == "on"
    status = hass.states.get("sensor.solar_cockpit_status")
    assert status.attributes["entities"]["balance_day"] == "sensor.solar_cockpit_balance_day"


async def test_meters_and_money(hass: HomeAssistant) -> None:
    await _setup(hass)
    # 2 kWh import at 0.30, 5 kWh export at 0.08, 7 kWh PV
    _set_sources(
        hass,
        **{
            "sensor.meter_import_total": "862.0",
            "sensor.meter_export_total": "3745.0",
            "sensor.inverter_pv_energy_total": "12007.0",
        },
    )
    await hass.async_block_till_done()
    assert _f(hass, "sensor.solar_cockpit_import_day") == 2.0
    assert _f(hass, "sensor.solar_cockpit_export_year") == 5.0
    assert _f(hass, "sensor.solar_cockpit_cost_day") == 0.6
    assert _f(hass, "sensor.solar_cockpit_revenue_day") == 0.4
    assert _f(hass, "sensor.solar_cockpit_balance_day") == -0.2
    assert _f(hass, "sensor.solar_cockpit_factor_day") == 0.67
    assert _f(hass, "sensor.solar_cockpit_self_consumed_day") == 2.0
    assert _f(hass, "sensor.solar_cockpit_savings_day") == 0.6  # 2 kWh * 0.30
    assert _f(hass, "sensor.solar_cockpit_benefit_day") == 1.0
    assert _f(hass, "sensor.solar_cockpit_consumption_day") == 4.0
    assert _f(hass, "sensor.solar_cockpit_autarky_day") == 50.0
    assert _f(hass, "sensor.solar_cockpit_forecast_ratio_day") == 70.0

    # Tasmota glitch: 0 must be ignored, then value continues
    _set_sources(hass, **{"sensor.meter_import_total": "0"})
    await hass.async_block_till_done()
    _set_sources(hass, **{"sensor.meter_import_total": "863.0"})
    await hass.async_block_till_done()
    assert _f(hass, "sensor.solar_cockpit_import_day") == 3.0


async def test_day_rollover(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(datetime(2026, 11, 8, 22, 0, tzinfo=dt_util.get_default_time_zone()))
    await _setup(hass)
    _set_sources(hass, **{"sensor.meter_import_total": "861.5"})
    await hass.async_block_till_done()
    assert _f(hass, "sensor.solar_cockpit_import_day") == 1.5

    freezer.move_to(datetime(2026, 11, 9, 0, 0, 30, tzinfo=dt_util.get_default_time_zone()))
    _set_sources(hass, **{"sensor.meter_import_total": "862.0"})
    await hass.async_block_till_done()
    state = hass.states.get("sensor.solar_cockpit_import_day")
    assert float(state.state) == 0.5
    assert state.attributes["previous_value"] == 1.5
    assert _f(hass, "sensor.solar_cockpit_import_month") == 2.0


async def test_unload(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)


async def test_price_number_changes_money(hass: HomeAssistant) -> None:
    await _setup(hass)
    assert float(hass.states.get("number.solar_cockpit_price_buy").state) == 0.3
    await hass.services.async_call(
        "number", "set_value",
        {"entity_id": "number.solar_cockpit_price_buy", "value": 0.4}, blocking=True,
    )
    await hass.async_block_till_done()
    assert _f(hass, "sensor.solar_cockpit_price_buy") == 0.4
    _set_sources(hass, **{"sensor.meter_import_total": "861.0"})
    await hass.async_block_till_done()
    assert _f(hass, "sensor.solar_cockpit_cost_day") == 0.4


async def test_options_flow(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.options.async_configure(result["flow_id"], DATA)
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_migration_v1(hass: HomeAssistant) -> None:
    _set_sources(hass)
    hass.states.async_set("input_number.electricity_price", "0.31")
    v1 = {**DATA, "house": {**DATA["house"], "submeter_power": "sensor.x", "submeter_name": "Floor"},
          "prices": {"price_buy_entity": "input_number.electricity_price", "price_buy": 0.5, "price_sell": 0.08}}
    entry = MockConfigEntry(domain=DOMAIN, data=v1, unique_id=DOMAIN, version=1)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.version == 2
    assert "price_buy_entity" not in entry.data["prices"]
    assert "submeter_power" not in entry.data["house"]
    assert float(hass.states.get("number.solar_cockpit_price_buy").state) == 0.31
