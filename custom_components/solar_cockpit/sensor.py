"""Sensors for Solar Cockpit."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import (
    PERCENTAGE,
    EntityCategory,
    UnitOfEnergy,
    UnitOfPower,
    UnitOfTime,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import (
    CONF_BAT_CHARGE_TOTAL,
    CONF_BAT_DISCHARGE_TOTAL,
    CONF_BAT_POWER,
    CONF_BAT_SOC,
    CONF_FC_TODAY,
    CONF_METER_EXPORT_TOTAL,
    CONF_METER_IMPORT_TOTAL,
    CONF_PV_ENERGY_TOTAL,
    DOMAIN,
    NAME,
    PERIODS,
    VERSION,
)
from .hub import LiveValues, SolarCockpitHub, period_start

EUR = "€"
EUR_PER_KWH = "€/kWh"

PERIOD_LABELS = {"day": "day", "week": "week", "month": "month", "year": "year"}


@dataclass(frozen=True, kw_only=True)
class LiveDescription(SensorEntityDescription):
    """Live value read from the hub snapshot."""

    value: Callable[[LiveValues], Any]
    requires: tuple[str, ...] = ()


@dataclass(frozen=True, kw_only=True)
class PeriodDescription(SensorEntityDescription):
    """Value of a period meter (day/week/month/year)."""

    metric: str
    requires: tuple[str, ...] = ()
    periods: tuple[str, ...] = PERIODS
    resets: bool = True  # energy/money that restarts every period


def _power(key: str, icon: str, value, requires=(), enabled=True) -> LiveDescription:
    return LiveDescription(
        key=key,
        translation_key=key,
        icon=icon,
        native_unit_of_measurement=UnitOfPower.WATT,
        device_class=SensorDeviceClass.POWER,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value=value,
        requires=requires,
        entity_registry_enabled_default=enabled,
    )


LIVE_SENSORS: tuple[LiveDescription, ...] = (
    _power("pv_power", "mdi:solar-power-variant", lambda v: v.pv_power),
    _power("house_power", "mdi:home-lightning-bolt", lambda v: v.house_power),
    _power("grid_power", "mdi:transmission-tower", lambda v: v.grid_power),
    _power("grid_import_power", "mdi:transmission-tower-import", lambda v: v.grid_import_power),
    _power("grid_export_power", "mdi:transmission-tower-export", lambda v: v.grid_export_power),
    _power("battery_power", "mdi:battery-charging", lambda v: v.battery_power, (CONF_BAT_POWER,)),
    _power("battery_charge_power", "mdi:battery-arrow-up", lambda v: v.battery_charge_power, (CONF_BAT_POWER,)),
    _power("battery_discharge_power", "mdi:battery-arrow-down", lambda v: v.battery_discharge_power, (CONF_BAT_POWER,)),
    _power("pv_surplus", "mdi:solar-power", lambda v: v.pv_surplus),
    LiveDescription(
        key="self_sufficiency",
        translation_key="self_sufficiency",
        icon="mdi:shield-home",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value=lambda v: v.self_sufficiency,
    ),
    LiveDescription(
        key="self_consumption",
        translation_key="self_consumption",
        icon="mdi:home-percent",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value=lambda v: v.self_consumption,
    ),
    LiveDescription(
        key="battery_soc",
        translation_key="battery_soc",
        native_unit_of_measurement=PERCENTAGE,
        device_class=SensorDeviceClass.BATTERY,
        state_class=SensorStateClass.MEASUREMENT,
        value=lambda v: v.battery_soc,
        requires=(CONF_BAT_SOC,),
    ),
    LiveDescription(
        key="battery_energy_available",
        translation_key="battery_energy_available",
        icon="mdi:battery-high",
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
        device_class=SensorDeviceClass.ENERGY_STORAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        value=lambda v: v.battery_energy_available,
        requires=(CONF_BAT_SOC,),
    ),
    LiveDescription(
        key="battery_energy_to_full",
        translation_key="battery_energy_to_full",
        icon="mdi:battery-plus-outline",
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
        device_class=SensorDeviceClass.ENERGY_STORAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        value=lambda v: v.battery_energy_to_full,
        requires=(CONF_BAT_SOC,),
    ),
    LiveDescription(
        key="battery_time_remaining",
        translation_key="battery_time_remaining",
        icon="mdi:timer-sand",
        native_unit_of_measurement=UnitOfTime.HOURS,
        device_class=SensorDeviceClass.DURATION,
        suggested_display_precision=1,
        value=lambda v: v.battery_time_remaining,
        requires=(CONF_BAT_SOC, CONF_BAT_POWER),
    ),
    LiveDescription(
        key="battery_state",
        translation_key="battery_state",
        icon="mdi:battery-sync",
        device_class=SensorDeviceClass.ENUM,
        options=["charging", "discharging", "idle"],
        value=lambda v: v.battery_state,
        requires=(CONF_BAT_POWER,),
    ),
    LiveDescription(
        key="price_buy",
        translation_key="price_buy",
        icon="mdi:cash-minus",
        native_unit_of_measurement=EUR_PER_KWH,
        suggested_display_precision=3,
        value=lambda v: v.price_buy,
    ),
    LiveDescription(
        key="price_sell",
        translation_key="price_sell",
        icon="mdi:cash-plus",
        native_unit_of_measurement=EUR_PER_KWH,
        suggested_display_precision=3,
        value=lambda v: v.price_sell,
    ),
)


def _energy(metric: str, icon: str, requires=(), enabled=True, resets=True) -> PeriodDescription:
    return PeriodDescription(
        key=metric,
        translation_key=metric,
        icon=icon,
        metric=metric,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
        device_class=SensorDeviceClass.ENERGY,
        state_class=SensorStateClass.TOTAL,
        suggested_display_precision=2,
        requires=requires,
        entity_registry_enabled_default=enabled,
        resets=resets,
    )


def _money(metric: str, icon: str, requires=()) -> PeriodDescription:
    return PeriodDescription(
        key=metric,
        translation_key=metric,
        icon=icon,
        metric=metric,
        native_unit_of_measurement=EUR,
        device_class=SensorDeviceClass.MONETARY,
        state_class=SensorStateClass.TOTAL,
        suggested_display_precision=2,
        requires=requires,
    )


METER = (CONF_METER_IMPORT_TOTAL, CONF_METER_EXPORT_TOTAL)
PV_AND_METER = (*METER, CONF_PV_ENERGY_TOTAL)

PERIOD_SENSORS: tuple[PeriodDescription, ...] = (
    _energy("import", "mdi:transmission-tower-import", (CONF_METER_IMPORT_TOTAL,)),
    _energy("export", "mdi:transmission-tower-export", (CONF_METER_EXPORT_TOTAL,)),
    _energy("pv", "mdi:solar-power-variant", (CONF_PV_ENERGY_TOTAL,)),
    _energy("self_consumed", "mdi:home-import-outline", PV_AND_METER),
    _energy("consumption", "mdi:home-lightning-bolt-outline", PV_AND_METER),
    _energy("battery_charge", "mdi:battery-arrow-up-outline", (CONF_BAT_CHARGE_TOTAL,), enabled=False),
    _energy("battery_discharge", "mdi:battery-arrow-down-outline", (CONF_BAT_DISCHARGE_TOTAL,), enabled=False),
    PeriodDescription(
        key="autarky",
        translation_key="autarky",
        icon="mdi:shield-sun",
        metric="autarky",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        requires=PV_AND_METER,
        resets=False,
    ),
    _money("cost", "mdi:cash-minus", (CONF_METER_IMPORT_TOTAL,)),
    _money("revenue", "mdi:cash-plus", (CONF_METER_EXPORT_TOTAL,)),
    _money("balance", "mdi:scale-balance", METER),
    _money("savings", "mdi:piggy-bank", PV_AND_METER),
    _money("benefit", "mdi:hand-coin", PV_AND_METER),
    PeriodDescription(
        key="factor",
        translation_key="factor",
        icon="mdi:gauge",
        metric="factor",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=2,
        requires=METER,
        resets=False,
    ),
    PeriodDescription(
        key="forecast_ratio",
        translation_key="forecast_ratio",
        icon="mdi:weather-sunny-alert",
        metric="forecast_ratio",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        requires=(CONF_PV_ENERGY_TOTAL, CONF_FC_TODAY),
        periods=("day",),
        resets=False,
    ),
)


def device_info(hub: SolarCockpitHub) -> DeviceInfo:
    return DeviceInfo(
        identifiers={(DOMAIN, hub.entry.entry_id)},
        name=NAME,
        manufacturer="itfhunter",
        model="PV overview",
        sw_version=VERSION,
        entry_type=DeviceEntryType.SERVICE,
    )


async def async_setup_entry(
    hass: HomeAssistant, entry, async_add_entities: AddEntitiesCallback
) -> None:
    hub: SolarCockpitHub = entry.runtime_data
    labels = PERIOD_LABELS
    entities: list[SensorEntity] = []

    for desc in LIVE_SENSORS:
        if all(hub.has(k) for k in desc.requires):
            entities.append(LiveSensor(hub, desc))

    for desc in PERIOD_SENSORS:
        if not all(hub.has(k) for k in desc.requires):
            continue
        for period in desc.periods:
            entities.append(PeriodSensor(hub, desc, period, labels[period]))

    status = StatusSensor(hub)
    entities.append(status)
    hub.entity_map = {e.map_key: e.entity_id for e in entities}
    async_add_entities(entities)


class _Base(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, hub: SolarCockpitHub, key: str) -> None:
        self.hub = hub
        self.map_key = key
        self._attr_unique_id = f"{hub.entry.entry_id}_{key}"
        self.entity_id = f"sensor.solar_cockpit_{key}"
        self._attr_device_info = device_info(hub)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, self.hub.signal, self._handle_update)
        )
        self._handle_update()

    @callback
    def _handle_update(self) -> None:
        self._refresh()
        self.async_write_ha_state()

    def _refresh(self) -> None:  # pragma: no cover - overridden
        raise NotImplementedError


class LiveSensor(_Base):
    entity_description: LiveDescription

    def __init__(self, hub: SolarCockpitHub, desc: LiveDescription) -> None:
        super().__init__(hub, desc.key)
        self.entity_description = desc

    def _refresh(self) -> None:
        value = self.entity_description.value(self.hub.live)
        self._attr_native_value = value
        self._attr_available = value is not None or self.entity_description.key in (
            "pv_surplus",
            "battery_time_remaining",
            "self_consumption",
            "self_sufficiency",
        )


class PeriodSensor(_Base):
    entity_description: PeriodDescription

    def __init__(self, hub: SolarCockpitHub, desc: PeriodDescription, period: str, label: str) -> None:
        super().__init__(hub, f"{desc.key}_{period}")
        self.entity_description = desc
        self.period = period
        self._attr_translation_placeholders = {"period": label}

    def _refresh(self) -> None:
        self._attr_native_value = self.hub.period_value(self.period, self.entity_description.metric)
        if self.entity_description.metric in ("factor", "autarky", "forecast_ratio"):
            self._attr_available = True
        else:
            self._attr_available = self.hub.periods.get(self.period) is not None

    @property
    def last_reset(self) -> datetime | None:
        if not self.entity_description.resets or self.entity_description.state_class != SensorStateClass.TOTAL:
            return None
        return period_start(self.period, dt_util.now())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        previous = self.hub.periods.get(f"{self.period}_previous")
        attrs: dict[str, Any] = {"period": self.period}
        data = self.hub.periods.get(self.period)
        if data:
            attrs["period_id"] = data.get("id")
        if previous:
            attrs["previous_period_id"] = previous.get("id")
            attrs["previous_value"] = _previous_value(self.hub, self.period, self.entity_description.metric)
        return attrs


def _previous_value(hub: SolarCockpitHub, period: str, metric: str):
    key = f"{period}_previous"
    if key not in hub.periods:
        return None
    return hub.period_value(key, metric)


class StatusSensor(_Base):
    """Diagnostic sensor; its attributes feed the bundled Lovelace card."""

    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_translation_key = "status"
    _attr_icon = "mdi:solar-panel-large"

    def __init__(self, hub: SolarCockpitHub) -> None:
        super().__init__(hub, "status")

    def _refresh(self) -> None:
        missing = [
            e for e in self.hub.source_entities()
            if (s := self.hub.hass.states.get(e)) is None or s.state in ("unknown", "unavailable")
        ]
        self._attr_native_value = "ok" if not missing else "degraded"
        # Real entity ids from the registry (the user may have renamed some)
        prefix = f"{self.hub.entry.entry_id}_"
        registry = er.async_get(self.hass)
        entity_map = {
            reg.unique_id.removeprefix(prefix): reg.entity_id
            for reg in er.async_entries_for_config_entry(registry, self.hub.entry.entry_id)
            if reg.unique_id.startswith(prefix) and reg.disabled_by is None
        }
        self.hub.entity_map = entity_map or self.hub.entity_map
        live = self.hub.live
        self._attr_extra_state_attributes = {
            "entities": self.hub.entity_map,
            "missing_sources": missing,
            "pv_strings": live.pv_strings,
            "forecast_today": live.forecast_today,
            "forecast_today_remaining": live.forecast_today_remaining,
            "forecast_tomorrow": live.forecast_tomorrow,
            "forecast_power_now": live.forecast_power_now,
            "surplus_active": live.surplus_active,
            "version": VERSION,
        }
