"""Solar Cockpit – PV, battery, grid and cost overview for Home Assistant."""

from __future__ import annotations

import logging
from pathlib import Path

import voluptuous as vol

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import CARD_FILENAME, DOMAIN, FRONTEND_URL, PERIODS, PLATFORMS, VERSION
from .hub import SolarCockpitHub

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

SERVICE_RESET_PERIOD = "reset_period"
RESET_SCHEMA = vol.Schema({vol.Required("period"): vol.In(PERIODS)})

type SolarCockpitConfigEntry = ConfigEntry[SolarCockpitHub]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the bundled Lovelace card once."""
    frontend_dir = Path(__file__).parent / "frontend"
    if getattr(hass, "http", None) is not None:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(FRONTEND_URL, str(frontend_dir), False)]
        )
    if "frontend" in hass.config.components:
        # ?v= busts the browser cache after every update
        add_extra_js_url(hass, f"{FRONTEND_URL}/{CARD_FILENAME}?v={VERSION}")
    else:
        _LOGGER.debug("Frontend not loaded – card not registered")

    async def _reset(call: ServiceCall) -> None:
        for entry in hass.config_entries.async_loaded_entries(DOMAIN):
            await entry.runtime_data.async_reset_period(call.data["period"])

    hass.services.async_register(DOMAIN, SERVICE_RESET_PERIOD, _reset, RESET_SCHEMA)
    return True


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """v1 -> v2: prices move into the integration, sub-meter is dropped."""
    if entry.version > 2:
        return False
    if entry.version == 1:

        def _migrate(source: dict) -> dict:
            data = {k: (dict(v) if isinstance(v, dict) else v) for k, v in source.items()}
            house = data.get("house")
            if isinstance(house, dict):
                house.pop("submeter_power", None)
                house.pop("submeter_name", None)
            prices = data.get("prices")
            if isinstance(prices, dict):
                for ent_key, num_key in (("price_buy_entity", "price_buy"), ("price_sell_entity", "price_sell")):
                    entity_id = prices.get(ent_key) or ""
                    if entity_id.startswith("input_number."):
                        state = hass.states.get(entity_id)
                        try:
                            prices[num_key] = float(state.state)
                        except (AttributeError, TypeError, ValueError):
                            pass
                        prices.pop(ent_key, None)
            return data

        hass.config_entries.async_update_entry(
            entry,
            data=_migrate(dict(entry.data)),
            options=_migrate(dict(entry.options)) if entry.options else {},
            version=2,
        )
        _LOGGER.info("Migrated Solar Cockpit config entry to version 2")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: SolarCockpitConfigEntry) -> bool:
    """Set up Solar Cockpit from a config entry."""
    hub = SolarCockpitHub(hass, entry)
    await hub.async_setup()
    entry.runtime_data = hub
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    return True


async def _async_reload(hass: HomeAssistant, entry: SolarCockpitConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: SolarCockpitConfigEntry) -> bool:
    """Unload a config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.async_unload()
    return unloaded
