"""Price settings for Solar Cockpit (editable on the device page or a dashboard)."""

from __future__ import annotations

from homeassistant.components.number import NumberMode, RestoreNumber
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import CONF_PRICE_BUY_ENTITY, CONF_PRICE_SELL_ENTITY
from .hub import SolarCockpitHub
from .sensor import device_info


async def async_setup_entry(
    hass: HomeAssistant, entry, async_add_entities: AddEntitiesCallback
) -> None:
    hub: SolarCockpitHub = entry.runtime_data
    async_add_entities(
        [
            PriceNumber(hub, "buy", "price_buy", "mdi:cash-minus", CONF_PRICE_BUY_ENTITY),
            PriceNumber(hub, "sell", "price_sell", "mdi:cash-plus", CONF_PRICE_SELL_ENTITY),
        ]
    )


class PriceNumber(RestoreNumber):
    """€/kWh price; used unless a price entity (dynamic tariff) is configured."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_entity_category = EntityCategory.CONFIG
    _attr_mode = NumberMode.BOX
    _attr_native_min_value = 0.0
    _attr_native_max_value = 2.0
    _attr_native_step = 0.001
    _attr_native_unit_of_measurement = "€/kWh"

    def __init__(self, hub: SolarCockpitHub, which: str, key: str, icon: str, override_key: str) -> None:
        self.hub = hub
        self.which = which
        self._override_key = override_key
        self._attr_translation_key = key
        self._attr_icon = icon
        self._attr_unique_id = f"{hub.entry.entry_id}_{key}_setting"
        self.entity_id = f"number.solar_cockpit_{key}"
        self._attr_device_info = device_info(hub)
        self._attr_native_value = hub.price_values.get(which)

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_number_data()
        if last is not None and last.native_value is not None:
            self._attr_native_value = last.native_value
        if self._attr_native_value is not None:
            self.hub.async_set_price(self.which, float(self._attr_native_value))

    @property
    def extra_state_attributes(self) -> dict:
        override = self.hub.config.get(self._override_key)
        return {"overridden_by": override} if override else {}

    async def async_set_native_value(self, value: float) -> None:
        self._attr_native_value = value
        self.hub.async_set_price(self.which, value)
        self.async_write_ha_state()
