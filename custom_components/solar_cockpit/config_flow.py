"""Config flow for Solar Cockpit.

Nothing is read from devices directly – the user only points to entities of
already installed integrations (inverter, forecast, meter reader, ...).
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.data_entry_flow import section
from homeassistant.helpers import selector

from .const import (
    CONF_BAT_CAPACITY,
    CONF_BAT_CHARGE_TOTAL,
    CONF_BAT_DISCHARGE_TOTAL,
    CONF_BAT_MIN_SOC,
    CONF_BAT_POWER,
    CONF_BAT_POWER_INVERT,
    CONF_BAT_SOC,
    CONF_FC_POWER_NOW,
    CONF_FC_TODAY,
    CONF_FC_TODAY_REMAINING,
    CONF_FC_TOMORROW,
    CONF_GRID_POWER,
    CONF_GRID_POWER_INVERT,
    CONF_HOUSE_POWER,
    CONF_METER_EXPORT_TOTAL,
    CONF_METER_IMPORT_TOTAL,
    CONF_METER_POWER,
    CONF_PRICE_BUY,
    CONF_PRICE_BUY_ENTITY,
    CONF_PRICE_SELL,
    CONF_PRICE_SELL_ENTITY,
    CONF_PV_ENERGY_TOTAL,
    CONF_PV_POWER,
    CONF_PV_STRINGS,
    CONF_SURPLUS_MIN_SOC,
    CONF_SURPLUS_OFF,
    CONF_SURPLUS_ON,
    DEFAULTS,
    DOMAIN,
    NAME,
    SECTION_BATTERY,
    SECTION_FORECAST,
    SECTION_HOUSE,
    SECTION_METER,
    SECTION_PRICES,
    SECTION_PV,
    SECTION_SURPLUS,
)

PRICE_DOMAINS = ["sensor", "input_number", "number"]


def _entity(device_class: str | list[str] | None = None, domains: list[str] | None = None, multiple: bool = False):
    cfg: dict[str, Any] = {"domain": domains or ["sensor"], "multiple": multiple}
    if device_class:
        cfg["device_class"] = device_class
    return selector.EntitySelector(selector.EntitySelectorConfig(**cfg))


def _number(minimum: float, maximum: float, step: float, unit: str | None = None):
    return selector.NumberSelector(
        selector.NumberSelectorConfig(
            min=minimum,
            max=maximum,
            step=step,
            unit_of_measurement=unit,
            mode=selector.NumberSelectorMode.BOX,
        )
    )


def _opt(key: str, values: dict[str, Any]) -> vol.Optional:
    """Optional field whose current/suggested value is pre-filled."""
    if key in values and values[key] not in (None, "", []):
        return vol.Optional(key, description={"suggested_value": values[key]})
    return vol.Optional(key)


def _req(key: str, values: dict[str, Any]) -> vol.Required:
    if key in values and values[key] not in (None, "", []):
        return vol.Required(key, description={"suggested_value": values[key]})
    return vol.Required(key)


def _build_schema(v: dict[str, Any]) -> vol.Schema:
    """Schema with sections; ``v`` holds the flat values to pre-fill."""
    power = "power"
    energy = "energy"
    return vol.Schema(
        {
            vol.Required(SECTION_PV): section(
                vol.Schema(
                    {
                        _req(CONF_PV_POWER, v): _entity(power),
                        _opt(CONF_PV_STRINGS, v): _entity(power, multiple=True),
                        _opt(CONF_PV_ENERGY_TOTAL, v): _entity(energy),
                    }
                ),
                {"collapsed": False},
            ),
            vol.Required(SECTION_BATTERY): section(
                vol.Schema(
                    {
                        _opt(CONF_BAT_SOC, v): _entity(),
                        _opt(CONF_BAT_POWER, v): _entity(power),
                        vol.Optional(
                            CONF_BAT_POWER_INVERT,
                            default=v.get(CONF_BAT_POWER_INVERT, DEFAULTS[CONF_BAT_POWER_INVERT]),
                        ): selector.BooleanSelector(),
                        _opt(CONF_BAT_CHARGE_TOTAL, v): _entity(energy),
                        _opt(CONF_BAT_DISCHARGE_TOTAL, v): _entity(energy),
                        vol.Optional(
                            CONF_BAT_CAPACITY,
                            default=v.get(CONF_BAT_CAPACITY, DEFAULTS[CONF_BAT_CAPACITY]),
                        ): _number(0, 200, 0.1, "kWh"),
                        vol.Optional(
                            CONF_BAT_MIN_SOC,
                            default=v.get(CONF_BAT_MIN_SOC, DEFAULTS[CONF_BAT_MIN_SOC]),
                        ): _number(0, 100, 1, "%"),
                    }
                ),
                {"collapsed": True},
            ),
            vol.Required(SECTION_HOUSE): section(
                vol.Schema(
                    {
                        _opt(CONF_HOUSE_POWER, v): _entity(power),
                        _opt(CONF_GRID_POWER, v): _entity(power),
                        vol.Optional(
                            CONF_GRID_POWER_INVERT,
                            default=v.get(CONF_GRID_POWER_INVERT, DEFAULTS[CONF_GRID_POWER_INVERT]),
                        ): selector.BooleanSelector(),
                    }
                ),
                {"collapsed": True},
            ),
            vol.Required(SECTION_METER): section(
                vol.Schema(
                    {
                        _opt(CONF_METER_IMPORT_TOTAL, v): _entity(),
                        _opt(CONF_METER_EXPORT_TOTAL, v): _entity(),
                        _opt(CONF_METER_POWER, v): _entity(power),
                    }
                ),
                {"collapsed": True},
            ),
            vol.Required(SECTION_FORECAST): section(
                vol.Schema(
                    {
                        _opt(CONF_FC_TODAY, v): _entity(energy),
                        _opt(CONF_FC_TODAY_REMAINING, v): _entity(energy),
                        _opt(CONF_FC_TOMORROW, v): _entity(energy),
                        _opt(CONF_FC_POWER_NOW, v): _entity(power),
                    }
                ),
                {"collapsed": True},
            ),
            vol.Required(SECTION_PRICES): section(
                vol.Schema(
                    {
                        _opt(CONF_PRICE_BUY_ENTITY, v): _entity(domains=PRICE_DOMAINS),
                        vol.Optional(
                            CONF_PRICE_BUY,
                            default=v.get(CONF_PRICE_BUY, DEFAULTS[CONF_PRICE_BUY]),
                        ): _number(0, 2, 0.001, "€/kWh"),
                        _opt(CONF_PRICE_SELL_ENTITY, v): _entity(domains=PRICE_DOMAINS),
                        vol.Optional(
                            CONF_PRICE_SELL,
                            default=v.get(CONF_PRICE_SELL, DEFAULTS[CONF_PRICE_SELL]),
                        ): _number(0, 2, 0.001, "€/kWh"),
                    }
                ),
                {"collapsed": True},
            ),
            vol.Required(SECTION_SURPLUS): section(
                vol.Schema(
                    {
                        vol.Optional(
                            CONF_SURPLUS_ON,
                            default=v.get(CONF_SURPLUS_ON, DEFAULTS[CONF_SURPLUS_ON]),
                        ): _number(0, 30000, 50, "W"),
                        vol.Optional(
                            CONF_SURPLUS_OFF,
                            default=v.get(CONF_SURPLUS_OFF, DEFAULTS[CONF_SURPLUS_OFF]),
                        ): _number(0, 30000, 50, "W"),
                        vol.Optional(
                            CONF_SURPLUS_MIN_SOC,
                            default=v.get(CONF_SURPLUS_MIN_SOC, DEFAULTS[CONF_SURPLUS_MIN_SOC]),
                        ): _number(0, 100, 1, "%"),
                    }
                ),
                {"collapsed": True},
            ),
        }
    )


def _flat(values: dict[str, Any]) -> dict[str, Any]:
    flat: dict[str, Any] = {}
    for key, value in values.items():
        if isinstance(value, dict):
            flat.update(value)
        else:
            flat[key] = value
    return flat


def _validate(user_input: dict[str, Any]) -> dict[str, str]:
    flat = _flat(user_input)
    errors: dict[str, str] = {}
    if float(flat.get(CONF_SURPLUS_OFF, 0)) > float(flat.get(CONF_SURPLUS_ON, 0)):
        errors["base"] = "surplus_hysteresis"
    if not flat.get(CONF_GRID_POWER) and not flat.get(CONF_METER_POWER) and not flat.get(CONF_HOUSE_POWER):
        errors["base"] = "need_grid_or_house"
    return errors


class SolarCockpitConfigFlow(ConfigFlow, domain=DOMAIN):
    """Initial setup."""

    VERSION = 2

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate(user_input)
            if not errors:
                return self.async_create_entry(title=NAME, data=user_input)
            values = _flat(user_input)
        else:
            values = {}

        return self.async_show_form(
            step_id="user", data_schema=_build_schema(values), errors=errors
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return SolarCockpitOptionsFlow()


class SolarCockpitOptionsFlow(OptionsFlow):
    """Change the referenced entities and prices later."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate(user_input)
            if not errors:
                return self.async_create_entry(data=user_input)
            values = _flat(user_input)
        else:
            values = _flat(dict(self.config_entry.options or self.config_entry.data))

        return self.async_show_form(
            step_id="init", data_schema=_build_schema(values), errors=errors
        )
