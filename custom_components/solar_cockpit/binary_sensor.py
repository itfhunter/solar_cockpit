"""Binary sensors for Solar Cockpit."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import CONF_SURPLUS_MIN_SOC, CONF_SURPLUS_OFF, CONF_SURPLUS_ON
from .hub import SolarCockpitHub
from .sensor import device_info


async def async_setup_entry(
    hass: HomeAssistant, entry, async_add_entities: AddEntitiesCallback
) -> None:
    async_add_entities([SurplusBinarySensor(entry.runtime_data)])


class SurplusBinarySensor(BinarySensorEntity):
    """On while there is enough PV surplus (with hysteresis and SOC guard).

    Meant as trigger for loads like the air conditioner or a heater.
    """

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "surplus_active"
    _attr_icon = "mdi:solar-power-variant-outline"

    def __init__(self, hub: SolarCockpitHub) -> None:
        self.hub = hub
        self._attr_unique_id = f"{hub.entry.entry_id}_surplus_active"
        self.entity_id = "binary_sensor.solar_cockpit_surplus_active"
        self._attr_device_info = device_info(hub)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, self.hub.signal, self._handle_update)
        )
        self._handle_update()

    @callback
    def _handle_update(self) -> None:
        self._attr_is_on = self.hub.live.surplus_active
        cfg = self.hub.config
        self._attr_extra_state_attributes = {
            "surplus_w": self.hub.live.pv_surplus,
            "on_threshold_w": cfg.get(CONF_SURPLUS_ON),
            "off_threshold_w": cfg.get(CONF_SURPLUS_OFF),
            "min_soc": cfg.get(CONF_SURPLUS_MIN_SOC),
        }
        self.async_write_ha_state()
