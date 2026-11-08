"""Central calculation hub for Solar Cockpit.

The hub only *reads* entities of other integrations (inverter, forecast,
meter reader, ...). It normalises signs and units, derives live values and keeps
its own period meters (day/week/month/year) including money values that are
weighted with the price valid at the moment the energy flowed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, Event, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import (
    async_track_state_change_event,
    async_track_time_change,
    async_track_time_interval,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    CH_BAT_CHARGE,
    CH_BAT_DISCHARGE,
    CH_COST,
    CH_EXPORT,
    CH_IMPORT,
    CH_PV,
    CH_REVENUE,
    CH_SAVINGS,
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
    ENERGY_CHANNELS,
    MONEY_CHANNELS,
    PERIODS,
    SIGNAL_UPDATE,
    STORAGE_VERSION,
)

_LOGGER = logging.getLogger(__name__)

# Which config key feeds which energy channel (cumulative meter, kWh)
CHANNEL_SOURCES: dict[str, str] = {
    CH_IMPORT: CONF_METER_IMPORT_TOTAL,
    CH_EXPORT: CONF_METER_EXPORT_TOTAL,
    CH_PV: CONF_PV_ENERGY_TOTAL,
    CH_BAT_CHARGE: CONF_BAT_CHARGE_TOTAL,
    CH_BAT_DISCHARGE: CONF_BAT_DISCHARGE_TOTAL,
}

# Bump when the statistics seeding improves; older installs are re-seeded once.
SEED_VERSION = 2

# A single step larger than this (kWh) is treated as a glitch, not as energy.
MAX_PLAUSIBLE_STEP_KWH = 50.0


def flatten_config(entry: ConfigEntry) -> dict[str, Any]:
    """Merge data + options and flatten the config-flow sections."""
    merged: dict[str, Any] = {}
    # Options (after reconfiguration) fully replace the initial data, so that
    # an entity removed in the options dialog is really gone.
    source = entry.options or entry.data
    if source:
        for key, value in source.items():
            if isinstance(value, dict):
                merged.update(value)
            else:
                merged[key] = value
    for key, value in DEFAULTS.items():
        merged.setdefault(key, value)
    return merged


def period_id(period: str, now: datetime) -> str:
    """Return a stable id for the period that contains ``now``."""
    if period == "day":
        return now.date().isoformat()
    if period == "week":
        iso = now.isocalendar()
        return f"{iso[0]}-W{iso[1]:02d}"
    if period == "month":
        return f"{now.year}-{now.month:02d}"
    return str(now.year)


def period_start(period: str, now: datetime) -> datetime:
    """Return the local start of the period containing ``now``."""
    start = dt_util.start_of_local_day(now)
    if period == "week":
        start = start - timedelta(days=start.weekday())
    elif period == "month":
        start = start.replace(day=1)
    elif period == "year":
        start = start.replace(month=1, day=1)
    return start


def _empty_period(pid: str) -> dict[str, Any]:
    data: dict[str, Any] = {"id": pid}
    for ch in (*ENERGY_CHANNELS, *MONEY_CHANNELS):
        data[ch] = 0.0
    return data


@dataclass
class LiveValues:
    """Snapshot of normalised live values (W, %, kWh, EUR/kWh)."""

    pv_power: float | None = None
    pv_strings: list[float | None] = field(default_factory=list)
    house_power: float | None = None
    grid_power: float | None = None  # + = import, - = export
    grid_import_power: float | None = None
    grid_export_power: float | None = None
    battery_power: float | None = None  # + = charging, - = discharging
    battery_charge_power: float | None = None
    battery_discharge_power: float | None = None
    battery_soc: float | None = None
    battery_energy_available: float | None = None
    battery_energy_to_full: float | None = None
    battery_time_remaining: float | None = None  # hours
    battery_state: str | None = None
    pv_surplus: float | None = None
    self_sufficiency: float | None = None
    self_consumption: float | None = None
    forecast_today: float | None = None
    forecast_today_remaining: float | None = None
    forecast_tomorrow: float | None = None
    forecast_power_now: float | None = None
    price_buy: float | None = None
    price_sell: float | None = None
    surplus_active: bool = False


class SolarCockpitHub:
    """Reads source entities and computes everything the platforms show."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.config = flatten_config(entry)
        self.live = LiveValues()
        self.periods: dict[str, dict[str, Any]] = {}
        self._last_totals: dict[str, float] = {}
        self._store: Store = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}"
        )
        self._unsubs: list[Any] = []
        self._seeded = False
        self.entity_map: dict[str, str] = {}
        # Prices set on the integration's own number entities (€/kWh).
        # A configured price entity (e.g. a dynamic tariff) takes precedence.
        self.price_values: dict[str, float | None] = {
            "buy": self.config.get(CONF_PRICE_BUY),
            "sell": self.config.get(CONF_PRICE_SELL),
        }

    # ------------------------------------------------------------------ setup
    @property
    def signal(self) -> str:
        return SIGNAL_UPDATE.format(self.entry.entry_id)

    def has(self, key: str) -> bool:
        value = self.config.get(key)
        return bool(value)

    def source_entities(self) -> list[str]:
        keys = (
            CONF_PV_POWER,
            CONF_PV_ENERGY_TOTAL,
            CONF_BAT_SOC,
            CONF_BAT_POWER,
            CONF_BAT_CHARGE_TOTAL,
            CONF_BAT_DISCHARGE_TOTAL,
            CONF_HOUSE_POWER,
            CONF_GRID_POWER,
            CONF_METER_IMPORT_TOTAL,
            CONF_METER_EXPORT_TOTAL,
            CONF_METER_POWER,
            CONF_FC_TODAY,
            CONF_FC_TODAY_REMAINING,
            CONF_FC_TOMORROW,
            CONF_FC_POWER_NOW,
            CONF_PRICE_BUY_ENTITY,
            CONF_PRICE_SELL_ENTITY,
        )
        entities = [self.config[k] for k in keys if self.config.get(k)]
        entities.extend(self.config.get(CONF_PV_STRINGS) or [])
        return sorted(set(entities))

    async def async_setup(self) -> None:
        stored = await self._store.async_load() or {}
        self.periods = stored.get("periods", {})
        self._last_totals = stored.get("last_totals", {})
        self._seeded = bool(stored.get("seeded")) and stored.get("seed_version", 1) >= SEED_VERSION

        self._unsubs.append(
            async_track_state_change_event(
                self.hass, self.source_entities(), self._handle_source_event
            )
        )
        # Roll periods over right after midnight even if no source changes.
        self._unsubs.append(
            async_track_time_change(
                self.hass, self._handle_tick, hour=0, minute=0, second=5
            )
        )
        self._unsubs.append(
            async_track_time_interval(
                self.hass, self._handle_tick, timedelta(minutes=1)
            )
        )

        if self.hass.state is CoreState.running:
            await self._async_first_run()
        else:

            async def _started(_event: Event) -> None:
                await self._async_first_run()

            self._unsubs.append(
                self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _started)
            )

    async def _async_first_run(self) -> None:
        if not self._seeded:
            await self._async_seed_from_statistics()
        self._recalculate(update_meters=True)

    async def async_unload(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        await self._store.async_save(self._store_data())

    # ---------------------------------------------------------------- storage
    def _store_data(self) -> dict[str, Any]:
        return {
            "periods": self.periods,
            "last_totals": self._last_totals,
            "seeded": self._seeded,
            "seed_version": SEED_VERSION,
        }

    def _schedule_save(self) -> None:
        self._store.async_delay_save(self._store_data, 30)

    async def async_reset_period(self, period: str) -> None:
        """Reset one period (service)."""
        now = dt_util.now()
        self.periods[period] = _empty_period(period_id(period, now))
        self._schedule_save()
        self._notify()

    # ------------------------------------------------------------ statistics
    async def _async_seed_from_statistics(self) -> None:
        """On first install fill the running periods from long-term stats.

        Money for the seeded part uses today's price because the historic
        price is unknown; everything after installation is weighted exactly.
        """
        try:
            from homeassistant.components.recorder import get_instance
            from homeassistant.components.recorder.statistics import (
                statistics_during_period,
            )
        except ImportError:  # recorder not available
            self._seeded = True
            return

        now = dt_util.now()
        buy, sell = self._prices()
        for period in PERIODS:
            self.periods[period] = _empty_period(period_id(period, now))

        async def _stats(entity_id: str, begin: datetime, finish: datetime, period: str):
            try:
                result = await get_instance(self.hass).async_add_executor_job(
                    statistics_during_period,
                    self.hass,
                    begin,
                    finish,
                    {entity_id},
                    period,
                    None,
                    {"state", "mean", "min", "max"},
                )
            except Exception:  # noqa: BLE001 - never block setup on stats
                _LOGGER.debug("No statistics for %s", entity_id, exc_info=True)
                return []
            return result.get(entity_id) or []

        def _ts(row) -> float:
            value = row.get("start")
            if isinstance(value, datetime):
                return value.timestamp()
            return float(value or 0)

        for channel, conf_key in CHANNEL_SOURCES.items():
            entity_id = self.config.get(conf_key)
            current = self._energy_kwh(entity_id) if entity_id else None
            if current is None:
                continue
            factor = self._energy_factor(entity_id)
            for period in PERIODS:
                start = dt_util.as_utc(period_start(period, now))
                raw = None
                rows = await _stats(entity_id, start - timedelta(hours=1), start + timedelta(hours=2), "hour")
                before = [r for r in rows if _ts(r) < start.timestamp()]
                after = [r for r in rows if _ts(r) >= start.timestamp()]
                if before:
                    # end of the hour before the period = value at period start
                    r = before[-1]
                    raw = r.get("state") if r.get("state") is not None else r.get("max")
                elif after:
                    r = after[0]
                    raw = next((r.get(k) for k in ("min", "mean", "state") if r.get(k) is not None), None)
                else:
                    # sensor is younger than the period: start from its first value
                    rows = await _stats(entity_id, start, dt_util.utcnow(), "day")
                    if rows:
                        r = rows[0]
                        raw = next((r.get(k) for k in ("min", "mean", "state") if r.get(k) is not None), None)
                if raw is None:
                    continue
                start_value = float(raw) * factor
                delta = current - start_value
                if 0 <= delta < 100000:
                    self.periods[period][channel] = round(delta, 4)

        for period in PERIODS:
            data = self.periods[period]
            if buy is not None:
                data[CH_COST] = data[CH_IMPORT] * buy
                data[CH_SAVINGS] = (data[CH_PV] - data[CH_EXPORT]) * buy
            if sell is not None:
                data[CH_REVENUE] = data[CH_EXPORT] * sell

        for channel, conf_key in CHANNEL_SOURCES.items():
            entity_id = self.config.get(conf_key)
            value = self._energy_kwh(entity_id) if entity_id else None
            if value is not None:
                self._last_totals[channel] = value

        self._seeded = True
        self._schedule_save()

    # --------------------------------------------------------------- readers
    def _state(self, entity_id: str | None):
        if not entity_id:
            return None
        return self.hass.states.get(entity_id)

    def _float(self, entity_id: str | None) -> float | None:
        state = self._state(entity_id)
        if state is None or state.state in ("unknown", "unavailable", "", None):
            return None
        try:
            return float(state.state)
        except (TypeError, ValueError):
            return None

    def _power_w(self, entity_id: str | None) -> float | None:
        value = self._float(entity_id)
        if value is None:
            return None
        unit = (self._state(entity_id).attributes.get("unit_of_measurement") or "").lower()
        if unit == "kw":
            return value * 1000
        if unit == "mw":
            return value * 1_000_000
        return value

    def _energy_factor(self, entity_id: str | None) -> float:
        state = self._state(entity_id)
        unit = ((state.attributes.get("unit_of_measurement") if state else "") or "").lower()
        if unit == "wh":
            return 0.001
        if unit == "mwh":
            return 1000.0
        return 1.0

    def _energy_kwh(self, entity_id: str | None) -> float | None:
        value = self._float(entity_id)
        if value is None:
            return None
        return value * self._energy_factor(entity_id)

    def _price(self, entity_key: str, which: str) -> float | None:
        entity_id = self.config.get(entity_key)
        if entity_id:
            value = self._float(entity_id)
            if value is not None:
                unit = (
                    self._state(entity_id).attributes.get("unit_of_measurement") or ""
                ).lower()
                if "ct" in unit or "cent" in unit:
                    value /= 100
                return value
        number = self.price_values.get(which)
        return float(number) if number is not None else None

    @callback
    def async_set_price(self, which: str, value: float) -> None:
        """Called by the price number entities."""
        self.price_values[which] = value
        self._recalculate(update_meters=False)

    def _prices(self) -> tuple[float | None, float | None]:
        return (
            self._price(CONF_PRICE_BUY_ENTITY, "buy"),
            self._price(CONF_PRICE_SELL_ENTITY, "sell"),
        )

    # ---------------------------------------------------------------- events
    @callback
    def _handle_source_event(self, event: Event) -> None:
        self._recalculate(update_meters=True)

    @callback
    def _handle_tick(self, _now: datetime) -> None:
        self._recalculate(update_meters=True)

    @callback
    def _notify(self) -> None:
        async_dispatcher_send(self.hass, self.signal)

    # ------------------------------------------------------------- compute
    @callback
    def _recalculate(self, update_meters: bool) -> None:
        self._compute_live()
        if update_meters and self._seeded:
            self._update_meters()
        self._notify()

    def _compute_live(self) -> None:
        cfg = self.config
        live = self.live

        strings = [self._power_w(e) for e in (cfg.get(CONF_PV_STRINGS) or [])]
        live.pv_strings = strings
        pv = self._power_w(cfg.get(CONF_PV_POWER))
        if pv is None and strings and any(s is not None for s in strings):
            pv = sum(s or 0 for s in strings)
        live.pv_power = max(pv, 0.0) if pv is not None else None

        grid = self._power_w(cfg.get(CONF_GRID_POWER))
        if grid is not None and cfg.get(CONF_GRID_POWER_INVERT):
            grid = -grid
        if grid is None:
            grid = self._power_w(cfg.get(CONF_METER_POWER))
        live.grid_power = grid
        live.grid_import_power = max(grid, 0.0) if grid is not None else None
        live.grid_export_power = max(-grid, 0.0) if grid is not None else None

        bat = self._power_w(cfg.get(CONF_BAT_POWER))
        if bat is not None and cfg.get(CONF_BAT_POWER_INVERT):
            bat = -bat
        live.battery_power = bat
        live.battery_charge_power = max(bat, 0.0) if bat is not None else None
        live.battery_discharge_power = max(-bat, 0.0) if bat is not None else None

        house = self._power_w(cfg.get(CONF_HOUSE_POWER))
        if house is None and None not in (live.pv_power, grid):
            house = (live.pv_power or 0) + (grid or 0) - (bat or 0)
        live.house_power = max(house, 0.0) if house is not None else None

        # Surplus = PV that the house does not need right now
        if live.pv_power is not None and live.house_power is not None:
            live.pv_surplus = round(max(live.pv_power - live.house_power, 0.0), 0)
        else:
            live.pv_surplus = None

        if live.house_power and live.grid_import_power is not None:
            live.self_sufficiency = round(
                min(max((1 - live.grid_import_power / live.house_power) * 100, 0), 100), 1
            )
        else:
            live.self_sufficiency = None
        if live.pv_power and live.pv_power > 20 and live.grid_export_power is not None:
            live.self_consumption = round(
                min(max((1 - live.grid_export_power / live.pv_power) * 100, 0), 100), 1
            )
        else:
            live.self_consumption = None

        # Battery energy
        soc = self._float(cfg.get(CONF_BAT_SOC))
        live.battery_soc = soc
        capacity = float(cfg.get(CONF_BAT_CAPACITY) or 0)
        min_soc = float(cfg.get(CONF_BAT_MIN_SOC) or 0)
        if soc is not None and capacity > 0:
            live.battery_energy_available = round(
                max(soc - min_soc, 0) / 100 * capacity, 2
            )
            live.battery_energy_to_full = round(max(100 - soc, 0) / 100 * capacity, 2)
        else:
            live.battery_energy_available = None
            live.battery_energy_to_full = None

        live.battery_time_remaining = None
        if bat is None:
            live.battery_state = None
        elif bat > 20:
            live.battery_state = "charging"
            if live.battery_energy_to_full is not None:
                live.battery_time_remaining = round(
                    live.battery_energy_to_full * 1000 / bat, 2
                )
        elif bat < -20:
            live.battery_state = "discharging"
            if live.battery_energy_available is not None:
                live.battery_time_remaining = round(
                    live.battery_energy_available * 1000 / -bat, 2
                )
        else:
            live.battery_state = "idle"

        # Forecast
        live.forecast_today = self._energy_kwh(cfg.get(CONF_FC_TODAY))
        live.forecast_today_remaining = self._energy_kwh(cfg.get(CONF_FC_TODAY_REMAINING))
        live.forecast_tomorrow = self._energy_kwh(cfg.get(CONF_FC_TOMORROW))
        live.forecast_power_now = self._power_w(cfg.get(CONF_FC_POWER_NOW))

        live.price_buy, live.price_sell = self._prices()

        # Surplus switch with hysteresis and battery guard
        on_w = float(cfg.get(CONF_SURPLUS_ON) or 0)
        off_w = float(cfg.get(CONF_SURPLUS_OFF) or 0)
        min_soc_surplus = float(cfg.get(CONF_SURPLUS_MIN_SOC) or 0)
        surplus = live.pv_surplus
        soc_ok = soc is None or soc >= min_soc_surplus
        if surplus is None:
            live.surplus_active = False
        elif live.surplus_active:
            live.surplus_active = surplus >= off_w and (soc is None or soc >= min_soc_surplus - 5)
        else:
            live.surplus_active = surplus >= on_w and soc_ok

    def _update_meters(self) -> None:
        now = dt_util.now()
        changed = False

        # Roll periods over
        for period in PERIODS:
            pid = period_id(period, now)
            current = self.periods.get(period)
            if current is None or current.get("id") != pid:
                if current is not None:
                    self.periods[f"{period}_previous"] = current
                self.periods[period] = _empty_period(pid)
                changed = True

        deltas: dict[str, float] = {}
        for channel, conf_key in CHANNEL_SOURCES.items():
            entity_id = self.config.get(conf_key)
            if not entity_id:
                continue
            value = self._energy_kwh(entity_id)
            if value is None or value <= 0:
                continue  # Tasmota sends 0 after reconnect – ignore
            last = self._last_totals.get(channel)
            self._last_totals[channel] = value
            if last is None:
                changed = True
                continue
            delta = value - last
            if delta <= 0:
                if delta < 0:
                    changed = True  # meter reset or replaced – re-anchor
                continue
            if delta > MAX_PLAUSIBLE_STEP_KWH:
                _LOGGER.warning(
                    "Ignoring implausible step of %.1f kWh on %s", delta, entity_id
                )
                changed = True
                continue
            deltas[channel] = delta

        if deltas:
            buy, sell = self._prices()
            d_import = deltas.get(CH_IMPORT, 0.0)
            d_export = deltas.get(CH_EXPORT, 0.0)
            d_pv = deltas.get(CH_PV, 0.0)
            for period in PERIODS:
                data = self.periods[period]
                for channel, delta in deltas.items():
                    data[channel] = data.get(channel, 0.0) + delta
                if buy is not None:
                    data[CH_COST] = data.get(CH_COST, 0.0) + d_import * buy
                    data[CH_SAVINGS] = data.get(CH_SAVINGS, 0.0) + (d_pv - d_export) * buy
                if sell is not None:
                    data[CH_REVENUE] = data.get(CH_REVENUE, 0.0) + d_export * sell
            changed = True

        if changed:
            self._schedule_save()

    # ------------------------------------------------------------- derived
    def period_value(self, period: str, key: str) -> float | None:
        """Derived values for one period (used by the period sensors)."""
        data = self.periods.get(period)
        if data is None:
            return None
        imp = data.get(CH_IMPORT, 0.0)
        exp = data.get(CH_EXPORT, 0.0)
        pv = data.get(CH_PV, 0.0)
        chg = data.get(CH_BAT_CHARGE, 0.0)
        dis = data.get(CH_BAT_DISCHARGE, 0.0)
        cost = data.get(CH_COST, 0.0)
        rev = data.get(CH_REVENUE, 0.0)
        savings = max(data.get(CH_SAVINGS, 0.0), 0.0)
        has_pv = self.has(CONF_PV_ENERGY_TOTAL)

        if key in (CH_IMPORT, CH_EXPORT, CH_PV, CH_BAT_CHARGE, CH_BAT_DISCHARGE):
            return round(data.get(key, 0.0), 3)
        if key == "self_consumed":
            return round(max(pv - exp, 0.0), 3) if has_pv else None
        if key == "consumption":
            if not has_pv:
                return None
            return round(max(imp + pv - exp + dis - chg, 0.0), 3)
        if key == "autarky":
            if not has_pv:
                return None
            cons = imp + pv - exp + dis - chg
            if cons <= 0.05:
                return None
            return round(min(max((1 - imp / cons) * 100, 0), 100), 1)
        if key == "cost":
            return round(cost, 2)
        if key == "revenue":
            return round(rev, 2)
        if key == "balance":
            return round(rev - cost, 2)
        if key == "factor":
            if cost < 0.01:
                return None
            return round(rev / cost, 2)
        if key == "savings":
            return round(savings, 2) if has_pv else None
        if key == "benefit":
            return round(savings + rev, 2) if has_pv else None
        if key == "forecast_ratio":
            if period != "day" or not self.live.forecast_today:
                return None
            return round(pv / self.live.forecast_today * 100, 1) if has_pv else None
        return None
