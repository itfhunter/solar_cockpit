"""Constants for Solar Cockpit."""

from __future__ import annotations

DOMAIN = "solar_cockpit"
NAME = "Solar Cockpit"
VERSION = "0.3.1"

PLATFORMS = ["sensor", "binary_sensor", "number"]

FRONTEND_URL = "/solar_cockpit_static"
CARD_FILENAME = "solar-cockpit-card.js"

STORAGE_VERSION = 1

# ---------------------------------------------------------------------------
# Config keys – sources (entities of other integrations, only referenced)
# ---------------------------------------------------------------------------
# PV (e.g. an inverter integration)
CONF_PV_POWER = "pv_power"
CONF_PV_STRINGS = "pv_strings"
CONF_PV_ENERGY_TOTAL = "pv_energy_total"

# Battery (e.g. an inverter integration)
CONF_BAT_SOC = "battery_soc"
CONF_BAT_POWER = "battery_power"
CONF_BAT_POWER_INVERT = "battery_power_invert"
CONF_BAT_CHARGE_TOTAL = "battery_charge_total"
CONF_BAT_DISCHARGE_TOTAL = "battery_discharge_total"
CONF_BAT_CAPACITY = "battery_capacity_kwh"
CONF_BAT_MIN_SOC = "battery_min_soc"

# House / inverter grid
CONF_HOUSE_POWER = "house_power"
CONF_GRID_POWER = "grid_power"
CONF_GRID_POWER_INVERT = "grid_power_invert"

# Utility meter (e.g. an optical reader on the billing meter)
CONF_METER_IMPORT_TOTAL = "meter_import_total"
CONF_METER_EXPORT_TOTAL = "meter_export_total"
CONF_METER_POWER = "meter_power"

# Forecast (e.g. Forecast.Solar)
CONF_FC_TODAY = "forecast_today"
CONF_FC_TODAY_REMAINING = "forecast_today_remaining"
CONF_FC_TOMORROW = "forecast_tomorrow"
CONF_FC_POWER_NOW = "forecast_power_now"

# Prices
CONF_PRICE_BUY_ENTITY = "price_buy_entity"
CONF_PRICE_BUY = "price_buy"
CONF_PRICE_SELL_ENTITY = "price_sell_entity"
CONF_PRICE_SELL = "price_sell"

# Surplus logic
CONF_SURPLUS_ON = "surplus_on_w"
CONF_SURPLUS_OFF = "surplus_off_w"
CONF_SURPLUS_MIN_SOC = "surplus_min_soc"

# Sections in the config flow
SECTION_PV = "pv"
SECTION_BATTERY = "battery"
SECTION_HOUSE = "house"
SECTION_METER = "meter"
SECTION_FORECAST = "forecast"
SECTION_PRICES = "prices"
SECTION_SURPLUS = "surplus"

DEFAULTS: dict[str, object] = {
    CONF_BAT_POWER_INVERT: False,  # wanted: positive = charging
    CONF_GRID_POWER_INVERT: False,  # wanted: positive = import
    CONF_BAT_CAPACITY: 10.0,
    CONF_BAT_MIN_SOC: 10.0,
    CONF_PRICE_BUY: 0.30,
    CONF_PRICE_SELL: 0.08,
    CONF_SURPLUS_ON: 1500.0,
    CONF_SURPLUS_OFF: 500.0,
    CONF_SURPLUS_MIN_SOC: 80.0,
}

# Periods for the meters
PERIODS = ("day", "week", "month", "year")

# Accumulator channels (per period)
CH_IMPORT = "import"  # kWh from grid
CH_EXPORT = "export"  # kWh to grid
CH_PV = "pv"  # kWh produced
CH_BAT_CHARGE = "battery_charge"
CH_BAT_DISCHARGE = "battery_discharge"
CH_COST = "cost"  # EUR for import (price at time of consumption)
CH_REVENUE = "revenue"  # EUR for export
CH_SAVINGS = "savings"  # EUR saved by self-consumed PV

ENERGY_CHANNELS = (CH_IMPORT, CH_EXPORT, CH_PV, CH_BAT_CHARGE, CH_BAT_DISCHARGE)
MONEY_CHANNELS = (CH_COST, CH_REVENUE, CH_SAVINGS)

SIGNAL_UPDATE = f"{DOMAIN}_update_{{}}"
