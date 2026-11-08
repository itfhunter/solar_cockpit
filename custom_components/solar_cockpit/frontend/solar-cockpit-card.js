/*
 * Solar Cockpit Card – bundled with the solar_cockpit integration.
 * Nine visual styles, each in a light and a dark version, English and German.
 * No build step, no external dependencies.
 */
const CARD_VERSION = "0.3.1";

const STYLES = ["minimal", "glass", "flow", "tiles", "house", "sunpath", "control", "nature", "orbit"];
const PERIODS = ["day", "week", "month", "year"];

const I18N = {
  en: {
    pv: "PV", battery: "Battery", grid: "Grid", house: "House", inverter: "Inverter",
    today: "today", expected: "expected", in: "in", out: "out", idle: "idle",
    charging: "charging", discharging: "discharging", fullIn: "full in", emptyIn: "empty in",
    selfSuff: "self-sufficient", sunrise: "Sunrise", sunset: "Sunset", sunElevation: "Sun elevation",
    pvToday: "PV today", houseToday: "House today", todayTitle: "Today", pvYield: "PV yield",
    consumption: "House consumption", gridIn: "Grid in", gridOut: "Grid out", liveFlow: "Energy flow (live)",
    power24: "Power (24 h)", systemOk: "System OK", degraded: "Sources missing", lastUpdate: "Last update",
    dayProfile: "Power over the day", gridBalance: "Grid balance", balance: "Balance", previous: "previous",
    factor: "Factor", factorHint: "revenue ÷ cost · above 1 = profit", savings: "PV savings", benefit: "PV benefit",
    autarky: "Self-sufficiency", restToday: "Rest of today", tomorrow: "Tomorrow", forecastReached: "Forecast reached",
    surplus: "Surplus", surplusOn: "Surplus switch on", details: "Details", night: "Night",
    forecast: "PV forecast", todayOf: "Today {a} of {b}", expectedNow: "Expected now", actualNow: "actual",
    sunriseAt: "Sunrise", periods: { day: "Day", week: "Week", month: "Month", year: "Year" },
    notFound: "Status sensor {e} not found. Is the Solar Cockpit integration set up?",
    styleNames: { minimal: "Minimal", glass: "Glass & night", flow: "Energy flow", tiles: "Tiles", house: "House model",
      sunpath: "Sun path", control: "Control room", nature: "Nature", orbit: "Orbit" },
  },
  de: {
    pv: "PV", battery: "Akku", grid: "Netz", house: "Haus", inverter: "Wechselrichter",
    today: "heute", expected: "erwartet", in: "in", out: "out", idle: "Ruhe",
    charging: "lädt", discharging: "entlädt", fullIn: "voll in", emptyIn: "leer in",
    selfSuff: "autark", sunrise: "Sonnenaufgang", sunset: "Sonnenuntergang", sunElevation: "Sonnenstand",
    pvToday: "PV heute", houseToday: "Haus heute", todayTitle: "Heute", pvYield: "PV-Ertrag",
    consumption: "Hausverbrauch", gridIn: "Netz in", gridOut: "Netz out", liveFlow: "Energiefluss (live)",
    power24: "Leistung (24 h)", systemOk: "Anlage OK", degraded: "Quellen fehlen", lastUpdate: "Letzte Aktualisierung",
    dayProfile: "Tagesverlauf Leistung", gridBalance: "Netzbilanz", balance: "Saldo", previous: "vorher",
    factor: "Faktor", factorHint: "Erlös ÷ Kosten · über 1 = Gewinn", savings: "PV-Ersparnis", benefit: "PV-Nutzen",
    autarky: "Autarkie", restToday: "Rest heute", tomorrow: "Morgen", forecastReached: "Prognose erreicht",
    surplus: "Überschuss", surplusOn: "Überschuss-Schalter an", details: "Details", night: "Nacht",
    forecast: "PV-Prognose", todayOf: "Heute {a} von {b}", expectedNow: "Erwartet jetzt", actualNow: "tatsächlich",
    sunriseAt: "Sonnenaufgang", periods: { day: "Tag", week: "Woche", month: "Monat", year: "Jahr" },
    notFound: "Status-Sensor {e} nicht gefunden. Ist die Solar-Cockpit-Integration eingerichtet?",
    styleNames: { minimal: "Minimal", glass: "Glas & Nacht", flow: "Energiefluss", tiles: "Kacheln", house: "Hausmodell",
      sunpath: "Sonnenbahn", control: "Leitwarte", nature: "Natur", orbit: "Orbit" },
  },
};

/* ---------------------------------------------------------------- icons */
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  panel: '<path d="M3.5 15.5 6.5 5.5h14l-3 10z"/><path d="M5 10.5h14M10.2 5.5l-2 10M15.3 5.5l-2 10M12 15.5v3.5M8.5 19h7"/>',
  pylon: '<path d="M12 2.5 7.5 21.5M12 2.5l4.5 19M5 7.5h14M6.3 12h11.4M9 7.5l6.2 9.5M15 7.5 8.8 17M7 17h10"/>',
  house: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5M10 20v-5h4v5"/>',
  inverter: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M7.5 12c1.2-3.2 2.8-3.2 4 0s2.8 3.2 4.5 0"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
};
function icon(name, x, y, size, color, cls = "") {
  return `<g class="ic ${cls}" transform="translate(${x} ${y}) scale(${(size / 24).toFixed(3)})" style="stroke:${color}">${ICONS[name]}</g>`;
}
function batteryIcon(x, y, size, soc, color) {
  const s = size / 24;
  const lvl = Math.max(0, Math.min(100, soc || 0));
  const h = (14 * lvl) / 100;
  return `<g class="ic" transform="translate(${x} ${y}) scale(${s.toFixed(3)})" style="stroke:var(--ink)">
    <rect x="6.5" y="4.5" width="11" height="17" rx="2.2"/><path d="M10 2.5h4"/>
    <rect x="8.5" y="${(19.5 - h).toFixed(2)}" width="7" height="${h.toFixed(2)}" rx="0.8" style="fill:${color};stroke:none"/></g>`;
}
/* Pylon with lightning (style 09), drawn on a 512 grid, gradient stroke */
const PYLON_BOLT = '<path d="M125 28h110l75 47H50zM110 185h140l95 60H15zM125 28 70 465M235 28l60 437M45 465h50M270 465h50M150 75l100 110M210 75 110 185M100 245l170 95M260 245 90 340M90 340l195 125M270 340 75 465M90 340h180"/><path d="M455 20 368 145l64 25-37 100 102-125-67-25z"/>';
let pylonSeq = 0;
function pylonColors(state) {
  return state === "in" ? ["var(--c-bad)", "#f59e0b"] : state === "out" ? ["var(--c-good)", "#a3d65c"] : ["#ef4f2b", "#f8b51c"];
}
function pylonInner(state) {
  const id = `scpb${++pylonSeq}`;
  const [c1, c2] = pylonColors(state);
  return `<defs><linearGradient id="${id}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${c1}"/><stop offset="1" style="stop-color:${c2}"/></linearGradient></defs>` +
    `<g style="fill:none;stroke:url(#${id});stroke-width:26;stroke-linecap:round;stroke-linejoin:round">${PYLON_BOLT}</g>`;
}
/* as HTML icon */
function pylonBolt(size, state) {
  return `<svg class="hic" viewBox="0 0 512 512" width="${size}" height="${size}">${pylonInner(state)}</svg>`;
}
/* inside an SVG scene */
function pylonBoltAt(x, y, size, state) {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 512 512" overflow="visible">${pylonInner(state)}</svg>`;
}
const svgIcon = (name, size = 20, color = "currentColor") =>
  `<svg class="hic" viewBox="0 0 24 24" width="${size}" height="${size}" style="stroke:${color}">${ICONS[name]}</svg>`;

/* ---------------------------------------------------------------- utils */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ARC_DAY = 86400000;

class SolarCockpitCard extends HTMLElement {
  static getConfigForm() {
    return {
      schema: [
        { name: "style", selector: { select: { mode: "dropdown", options: STYLES.map((s) => ({ value: s, label: I18N.en.styleNames[s] })) } } },
        {
          type: "grid", name: "", schema: [
            { name: "mode", selector: { select: { mode: "dropdown", options: [
              { value: "auto", label: "Follow theme" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }] } } },
            { name: "language", selector: { select: { mode: "dropdown", options: [
              { value: "auto", label: "Follow Home Assistant" }, { value: "en", label: "English" }, { value: "de", label: "Deutsch" }] } } },
          ],
        },
        { name: "title", selector: { text: {} } },
        {
          type: "grid", name: "", schema: [
            { name: "show_costs", selector: { boolean: {} } },
            { name: "default_period", selector: { select: { mode: "dropdown", options: PERIODS.map((p) => ({ value: p, label: I18N.en.periods[p] })) } } },
          ],
        },
        { name: "peak_power", selector: { number: { min: 1000, max: 50000, step: 100, unit_of_measurement: "W" } } },
        { name: "details", selector: { entity: { multiple: true } } },
        { name: "status_entity", selector: { entity: { domain: "sensor", integration: "solar_cockpit" } } },
        { name: "sun_entity", selector: { entity: { domain: "sun" } } },
      ],
    };
  }

  static getStubConfig() {
    return { style: "minimal", mode: "auto", language: "auto", show_costs: true };
  }

  setConfig(config) {
    this._config = {
      style: "minimal",
      mode: "auto",
      language: "auto",
      show_costs: true,
      default_period: "day",
      peak_power: 10000,
      status_entity: "sensor.solar_cockpit_status",
      sun_entity: "sun.sun",
      details: [],
      ...config,
    };
    if (!STYLES.includes(this._config.style)) this._config.style = "minimal";
    this._period = this._period || this._config.default_period;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._lastSig = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._maybeFetchHistory();
    const sig = this._signature();
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._render();
  }

  connectedCallback() {
    this._timer = setInterval(() => { this._lastSig = null; this._render(); }, 60000);
  }
  disconnectedCallback() { clearInterval(this._timer); }
  getCardSize() { return 10; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  /* --------------------------------------------------------- language */
  get _lang() {
    const l = this._config.language;
    if (l === "de" || l === "en") return l;
    const h = (this._hass && ((this._hass.locale && this._hass.locale.language) || this._hass.language)) || "en";
    return h.startsWith("de") ? "de" : "en";
  }
  _t(k) { return I18N[this._lang][k] ?? I18N.en[k] ?? k; }
  get _loc() { return this._lang === "de" ? "de-DE" : "en-GB"; }
  _n(v, d = 0) {
    return v === null || v === undefined || isNaN(v) ? "–"
      : Number(v).toLocaleString(this._loc, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  _p(w) {
    if (w === null || w === undefined || isNaN(w)) return "–";
    const a = Math.abs(w);
    return a >= 1000 ? `${this._n(a / 1000, a >= 10000 ? 1 : 2)} kW` : `${this._n(a, 0)} W`;
  }
  _kwh(v) { return v === null || v === undefined || isNaN(v) ? "–" : `${this._n(v, v >= 100 ? 0 : 1)} kWh`; }
  _eur(v) {
    return v === null || v === undefined || isNaN(v) ? "–"
      : Number(v).toLocaleString(this._loc, { style: "currency", currency: "EUR" });
  }
  _hours(h) {
    if (h === null || h === undefined || isNaN(h)) return "–";
    if (h > 48) return `${this._n(h / 24, 1)} d`;
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return `${hh}:${String(mm).padStart(2, "0")} h`;
  }
  _clock(d) { return d.toLocaleTimeString(this._loc, { hour: "2-digit", minute: "2-digit" }); }

  /* ----------------------------------------------------------- state */
  _status() { return this._hass && this._hass.states[this._config.status_entity]; }
  _eid(key) {
    const st = this._status();
    return ((st && st.attributes.entities) || {})[key] || null;
  }
  _num(key) {
    const eid = this._eid(key);
    if (!eid) return null;
    const s = this._hass.states[eid];
    if (!s || s.state === "unknown" || s.state === "unavailable") return null;
    const v = parseFloat(s.state);
    return isNaN(v) ? null : v;
  }
  _signature() {
    if (!this._hass) return "";
    const st = this._status();
    if (!st) return "nostatus";
    const ids = Object.values(st.attributes.entities || {});
    ids.push(this._config.status_entity, this._config.sun_entity, ...(this._config.details || []));
    const dark = this._hass.themes && this._hass.themes.darkMode;
    return ids.map((e) => (this._hass.states[e] ? this._hass.states[e].state : "")).join("|") +
      JSON.stringify(st.attributes) + this._period + dark + (this._histStamp || 0);
  }
  _now() { return this._config.now ? new Date(this._config.now) : new Date(); }

  _sun() {
    const s = this._hass.states[this._config.sun_entity];
    const now = this._now();
    const elevation = s && s.attributes.elevation !== undefined ? Number(s.attributes.elevation) : null;
    if (!s || !s.attributes.next_rising || !s.attributes.next_setting) {
      const rise = new Date(now); rise.setHours(7, 0, 0, 0);
      const set = new Date(now); set.setHours(17, 0, 0, 0);
      const f = (now - rise) / (set - rise);
      return { f: f >= 0 && f <= 1 ? f : null, rise, set, before: f < 0, elevation };
    }
    const nr = new Date(s.attributes.next_rising), ns = new Date(s.attributes.next_setting);
    if (s.state === "above_horizon") {
      const rise = new Date(nr - ARC_DAY);
      return { f: clamp((now - rise) / (ns - rise), 0, 1), rise, set: ns, elevation };
    }
    const before = now.getHours() < 12;
    return { f: null, rise: before ? nr : new Date(nr - ARC_DAY), set: before ? ns : new Date(ns - ARC_DAY), before, elevation };
  }

  _data() {
    const st = this._status();
    const a = st.attributes;
    const d = {
      pv: this._num("pv_power"), home: this._num("house_power"), grid: this._num("grid_power"),
      bat: this._num("battery_power"), soc: this._num("battery_soc"), batTime: this._num("battery_time_remaining"),
      batAvail: this._num("battery_energy_available"),
      autarky: this._num("self_sufficiency"), surplus: this._num("pv_surplus"),
      pvDay: this._num("pv_day"), consDay: this._num("consumption_day"), buyDay: this._num("import_day"), sellDay: this._num("export_day"),
      ratio: this._num("forecast_ratio_day"),
      fc: a.forecast_today, fcRest: a.forecast_today_remaining, fcTomorrow: a.forecast_tomorrow, fcNow: a.forecast_power_now,
      strings: (a.pv_strings || []).filter((v) => v !== null),
      surplusOn: !!a.surplus_active, ok: st.state === "ok", missing: a.missing_sources || [],
      hasBat: this._eid("battery_power") !== null || this._eid("battery_soc") !== null,
      sun: this._sun(), hist: this._hist || null,
    };
    d.gridIn = (d.grid || 0) > 15;
    d.gridOut = (d.grid || 0) < -15;
    d.charging = (d.bat || 0) > 15;
    d.discharging = (d.bat || 0) < -15;
    return d;
  }

  /* ---------------------------------------------------------- history */
  _maybeFetchHistory() {
    const needs = ["glass", "tiles", "control", "nature"].includes(this._config.style);
    if (!needs || !this._hass || !this._hass.callWS || !this._status()) return;
    const now = Date.now();
    if (this._histBusy || (this._histAt && now - this._histAt < 300000)) return;
    this._histBusy = true;
    const keys = ["pv_power", "house_power", "grid_power", "battery_soc"];
    const ids = keys.map((k) => this._eid(k)).filter(Boolean);
    const end = this._now();
    const start = new Date(end - ARC_DAY);
    this._hass.callWS({
      type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
      entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false,
    }).then((res) => {
      const out = {};
      for (const k of keys) {
        const eid = this._eid(k);
        out[k] = bucket(res[eid] || [], start.getTime(), end.getTime(), 48);
      }
      out.start = start; out.end = end;
      this._hist = out;
      this._histAt = Date.now();
      this._histStamp = this._histAt;
      this._lastSig = null;
      this._render();
    }).catch(() => { this._histAt = Date.now(); }).finally(() => { this._histBusy = false; });
  }

  _moreInfo(eid) {
    if (!eid) return;
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId: eid };
    this.dispatchEvent(ev);
  }

  /* ----------------------------------------------- shared drawing parts */
  _flowColor(kind, d) {
    if (kind === "pv") return "var(--c-pv)";
    if (kind === "home") return "var(--c-home)";
    if (kind === "bat") return d.charging ? "var(--c-good)" : "var(--c-bad)";
    return d.gridOut ? "var(--c-good)" : "var(--c-bad)";
  }
  /* path is drawn source->target for pv/home and inverter->node for bat/grid */
  _flow(path, kind, d, widthScale = 1) {
    const w = kind === "pv" ? d.pv : kind === "home" ? d.home : kind === "bat" ? d.bat : d.grid;
    const active = Math.abs(w || 0) > 15;
    if (!active) return `<path class="idle" d="${path}"/>`;
    const reverse = (kind === "bat" && d.discharging) || (kind === "grid" && d.gridIn);
    const color = this._flowColor(kind, d);
    const width = (2 + clamp(Math.abs(w) / this._config.peak_power, 0, 1) * 4) * widthScale;
    const dur = Math.max(0.45, 3.4 - Math.log10(Math.abs(w) + 1) * 0.9);
    return `<path class="flow" d="${path}" style="stroke:${color};color:${color};stroke-width:${width.toFixed(2)};animation-duration:${dur.toFixed(2)}s;animation-direction:${reverse ? "reverse" : "normal"}"/>`;
  }
  _gridText(d) { return d.grid === null ? "–" : d.gridIn ? this._t("in") : d.gridOut ? this._t("out") : this._t("idle"); }
  _gridColor(d) { return d.gridIn ? "var(--c-bad)" : d.gridOut ? "var(--c-good)" : "var(--ink)"; }
  _socColor(d) { return d.soc !== null && d.soc <= 20 ? "var(--c-bad)" : "var(--c-good)"; }
  _batText(d) {
    const st = d.charging ? this._t("charging") : d.discharging ? this._t("discharging") : this._t("idle");
    const tm = d.batTime !== null && (d.charging || d.discharging)
      ? ` · ${d.charging ? this._t("fullIn") : this._t("emptyIn")} ${this._hours(d.batTime)}` : "";
    return st + tm;
  }
  _pvSub(d) {
    return `${this._kwh(d.pvDay)}${d.fc !== null && d.fc !== undefined ? ` / ${this._kwh(d.fc)}` : ""}`;
  }

  /* SVG pill: icon, label, value, optional second line */
  _pill(cx, cy, w, h, ic, label, value, valColor, sub, key) {
    const x = cx - w / 2, y = cy - h / 2;
    const top = sub ? cy - 9 : cy - 4;
    return `<g class="pill click" data-key="${key}">
      <rect class="pillbg" x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(h / 2, 12)}"/>
      ${ic(x + 9, cy - 11, 22)}
      <text class="lab" x="${x + 38}" y="${top}">${label}</text>
      <text class="val" x="${x + 38}" y="${top + 15}" style="fill:${valColor}">${value}</text>
      ${sub ? `<text class="sub" x="${x + 38}" y="${top + 28}">${sub}</text>` : ""}
    </g>`;
  }
  _iconPv(d) { return (x, y, s) => icon("panel", x, y, s, "var(--c-pv)"); }
  _iconBat(d) { return (x, y, s) => batteryIcon(x, y, s, d.soc, this._socColor(d)); }
  _gs(d) { return d.gridIn ? "in" : d.gridOut ? "out" : "idle"; }
  _iconGrid(d) { return (x, y, s) => pylonBoltAt(x + s * 0.03, y + s * 0.03, s * 0.94, this._gs(d)); }
  _iconHome() { return (x, y, s) => icon("house", x, y, s, "var(--c-home)"); }

  /* Sun arc with trail and sun */
  _arc(cx, cy, rx, ry, d, opts = {}) {
    const s = d.sun;
    const pt = (f) => {
      const a = Math.PI * clamp(f, 0, 1);
      return { x: cx - rx * Math.cos(a), y: cy - ry * Math.sin(a) };
    };
    const full = `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`;
    let out = `<path class="arc" d="${full}"/>`;
    const f = s.f !== null ? s.f : s.before ? 0 : 1;
    const p = pt(f);
    out += `<path class="trail" d="M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${p.x.toFixed(1)} ${p.y.toFixed(1)}"/>`;
    if (opts.labels !== false) {
      const noon = new Date((s.rise.getTime() + s.set.getTime()) / 2);
      out += `<text class="tl" x="${cx - rx}" y="${cy + 13}" text-anchor="middle">${this._clock(s.rise)}</text>`;
      out += `<text class="tl" x="${cx + rx}" y="${cy + 13}" text-anchor="middle">${this._clock(s.set)}</text>`;
      if (s.f !== null && Math.abs(s.f - 0.5) > 0.09)
        out += `<text class="tl" x="${cx}" y="${cy - ry - 7}" text-anchor="middle">${this._clock(noon)}</text>`;
    }
    if (s.f !== null) {
      out += `<g class="sun click" data-key="pv_power"><circle class="sunglow" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${opts.r ? opts.r * 2.2 : 15}"/><circle class="sundisc" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${opts.r || 7}"/></g>`;
    } else {
      const m = pt(0.5);
      out += `<g class="moon"><circle cx="${m.x}" cy="${m.y + 4}" r="6"/><circle class="moon-cut" cx="${m.x + 3}" cy="${m.y + 2}" r="5.4"/></g>`;
    }
    return out;
  }

  /* Hub topology used by minimal, glass and sunpath */
  _topology(d) {
    const T = (k) => this._t(k);
    const P = { pv: [200, 80], inv: [200, 158], bat: [66, 158], grid: [334, 158], home: [200, 222] };
    let svg = this._arc(200, 122, 130, 86, d);
    svg += this._flow(`M200 106 L200 143`, "pv", d);
    svg += d.hasBat ? this._flow(`M182 158 L116 158`, "bat", d) : "";
    svg += this._flow(`M218 158 L284 158`, "grid", d);
    svg += this._flow(`M200 173 L200 200`, "home", d);
    svg += `<g class="click" data-key="pv_power">${this._pill(P.pv[0], P.pv[1], 126, 50, this._iconPv(d), T("pv"), this._p(d.pv), "var(--ink)", this._pvSub(d), "pv_power")}</g>`;
    svg += `<g><rect class="invbg" x="182" y="143" width="36" height="30" rx="8"/>${icon("inverter", 188, 146, 24, "var(--ink)")}</g>`;
    if (d.hasBat) svg += this._pill(P.bat[0], P.bat[1], 100, 44, this._iconBat(d), T("battery"), d.soc === null ? "–" : `${this._n(d.soc)} %`, this._socColor(d), null, "battery_soc");
    svg += this._pill(P.grid[0], P.grid[1], 100, 44, this._iconGrid(d), `${T("grid")} · ${this._gridText(d)}`, this._p(d.grid), this._gridColor(d), null, "grid_power");
    svg += this._pill(P.home[0], P.home[1], 112, 44, this._iconHome(), T("house"), this._p(d.home), "var(--c-home)", null, "house_power");
    // small value labels on active battery/grid links
    if (d.hasBat && (d.charging || d.discharging)) svg += `<text class="fl" x="149" y="150" text-anchor="middle" style="fill:${this._flowColor("bat", d)}">${this._p(d.bat)}</text>`;
    return `<svg class="scene" viewBox="0 0 400 252" role="img" aria-label="${this._aria(d)}">${svg}</svg>`;
  }
  _aria(d) {
    return `PV ${this._p(d.pv)}, ${this._t("house")} ${this._p(d.home)}, ${this._t("grid")} ${this._gridText(d)} ${this._p(d.grid)}, ${this._t("battery")} ${d.soc === null ? "–" : this._n(d.soc) + " %"}`;
  }

  _todayList(d, withSun = false) {
    const row = (ic, label, val, cls = "") => `<div class="trow ${cls}">${ic}<span>${label}</span><b>${val}</b></div>`;
    let out = row(svgIcon("sun", 16, "var(--c-pv)"), this._t("pvYield"), this._kwh(d.pvDay));
    out += row(svgIcon("house", 16, "var(--c-home)"), this._t("consumption"), this._kwh(d.consDay));
    out += row(pylonBolt(15, "in"), this._t("gridIn"), this._kwh(d.buyDay));
    out += row(pylonBolt(15, "out"), this._t("gridOut"), this._kwh(d.sellDay));
    if (withSun) {
      out += row(svgIcon("sun", 16, "var(--muted)"), this._t("sunrise"), this._clock(d.sun.rise), "dim");
      out += row(svgIcon("sun", 16, "var(--muted)"), this._t("sunset"), this._clock(d.sun.set), "dim");
    }
    return out;
  }

  _spark(arr, color, w = 100, h = 28, area = true) {
    if (!arr || !arr.length) return `<svg class="spark" viewBox="0 0 ${w} ${h}"></svg>`;
    const vals = arr.map((v) => (v === null ? 0 : v));
    const max = Math.max(...vals.map(Math.abs), 1);
    const min = Math.min(0, ...vals);
    const y = (v) => h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
    const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${area ? `<path d="M0 ${h} L${pts.join(" L")} L${w} ${h} Z" style="fill:${color};opacity:.14"/>` : ""}
      <path d="M${pts.join(" L")}" style="fill:none;stroke:${color};stroke-width:1.6;vector-effect:non-scaling-stroke"/></svg>`;
  }
  _bars(arr, color, n = 12) {
    if (!arr || !arr.length) return "";
    const per = Math.ceil(arr.length / n);
    const vals = [];
    for (let i = 0; i < arr.length; i += per) vals.push(Math.max(0, ...arr.slice(i, i + per).map((v) => v || 0)));
    const max = Math.max(...vals, 1);
    return `<svg class="bars" viewBox="0 0 ${vals.length * 8} 24" preserveAspectRatio="none">${vals.map((v, i) =>
      `<rect x="${i * 8 + 1}" y="${(24 - (v / max) * 22).toFixed(1)}" width="6" height="${((v / max) * 22).toFixed(1)}" rx="1.5" style="fill:${color};opacity:${(0.45 + 0.55 * (i / vals.length)).toFixed(2)}"/>`).join("")}</svg>`;
  }

  /* ------------------------------------------------------------ styles */
  _s_minimal(d) {
    return `<div class="stage">${this._topology(d)}</div>`;
  }

  _s_glass(d) {
    const h = d.hist;
    const side = `
      <div class="side">
        <div class="gtile">${svgIcon("sun", 22, "var(--c-pv)")}<div><div class="gl">${this._t("sunElevation")}</div><div class="gv">${d.sun.elevation === null ? "–" : `${this._n(d.sun.elevation)}°`}</div></div></div>
        <div class="gtile click" data-key="pv_day">${svgIcon("panel", 22, "var(--c-pv)")}<div><div class="gl">${this._t("pvToday")}</div><div class="gv">${this._kwh(d.pvDay)}</div>${this._bars(h && h.pv_power, "var(--c-good)")}</div></div>
        <div class="gtile click" data-key="consumption_day">${svgIcon("house", 22, "var(--c-home)")}<div><div class="gl">${this._t("houseToday")}</div><div class="gv">${this._kwh(d.consDay)}</div>${this._bars(h && h.house_power, "var(--c-accent2)")}</div></div>
      </div>`;
    return `<div class="split"><div class="stage panelglass">${this._topology(d)}</div>${side}</div>`;
  }

  _s_sunpath(d) {
    const side = `<div class="side panelglass today"><div class="ptitle">${this._t("todayTitle")}</div>${this._todayList(d, true)}</div>`;
    const hills = `<svg class="hills" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 40 C40 22 70 30 100 26 S160 10 200 24 S270 14 310 26 S370 18 400 30 V60 H0Z" class="h1"/>
      <path d="M0 50 C50 38 90 46 140 40 S230 34 280 44 S360 38 400 46 V60 H0Z" class="h2"/></svg>`;
    return `<div class="split left">${side}<div class="stage sky">${hills}${this._topology(d)}</div></div>`;
  }

  _s_flow(d) {
    const T = (k) => this._t(k);
    const peak = this._config.peak_power;
    const band = (x1, y1, x2, y2, w, kind, idle) => {
      const xm = (x1 + x2) / 2;
      const path = `M${x1} ${y1} C${xm} ${y1} ${xm} ${y2} ${x2} ${y2}`;
      if (idle) return `<path class="idle" d="${path}"/>`;
      const width = 6 + clamp(Math.abs(w) / peak, 0, 1) * 30;
      const color = this._flowColor(kind, d);
      const reverse = (kind === "bat" && d.discharging) || (kind === "grid" && d.gridIn);
      const dur = Math.max(0.6, 3.6 - Math.log10(Math.abs(w) + 1) * 0.9);
      return `<path d="${path}" style="fill:none;stroke:${color};stroke-width:${width.toFixed(1)};opacity:.55;stroke-linecap:round"/>
        <path class="flow shine" d="${path}" style="stroke-width:${Math.max(2, width / 4).toFixed(1)};animation-duration:${dur.toFixed(2)}s;animation-direction:${reverse ? "reverse" : "normal"}"/>`;
    };
    const node = (x, y, ic, label, value, color, key) => `
      <g class="click" data-key="${key}"><rect class="fnode" x="${x}" y="${y}" width="112" height="52" rx="12" style="stroke:${color}"/>
      ${ic(x + 10, y + 14, 24)}<text class="lab" x="${x + 44}" y="${y + 21}">${label}</text>
      <text class="val" x="${x + 44}" y="${y + 38}" style="fill:${color}">${value}</text></g>`;
    let svg = "";
    svg += band(120, 50, 172, 112, d.pv, "pv", !(d.pv > 15));
    if (d.hasBat) svg += band(120, 170, 172, 132, d.bat, "bat", !(d.charging || d.discharging));
    svg += band(228, 112, 280, 50, d.grid, "grid", !(d.gridIn || d.gridOut));
    svg += band(228, 132, 280, 170, d.home, "home", !(d.home > 15));
    svg += node(8, 24, this._iconPv(d), T("pv"), this._p(d.pv), "var(--c-pv)", "pv_power");
    if (d.hasBat) svg += node(8, 144, this._iconBat(d), T("battery"), d.soc === null ? "–" : `${this._n(d.soc)} %`, this._socColor(d), "battery_soc");
    svg += node(280, 24, this._iconGrid(d), `${T("grid")} · ${this._gridText(d)}`, this._p(d.grid), this._gridColor(d), "grid_power");
    svg += node(280, 144, this._iconHome(), T("house"), this._p(d.home), "var(--c-home)", "house_power");
    svg += `<rect class="fnode inv" x="172" y="92" width="56" height="60" rx="12"/>${icon("inverter", 186, 100, 28, "var(--ink)")}<text class="tl" x="200" y="144" text-anchor="middle">${T("inverter")}</text>`;
    return `<div class="stage"><svg class="scene" viewBox="0 0 400 210" role="img" aria-label="${this._aria(d)}">${svg}</svg></div>
      <div class="strip">${this._chipsToday(d)}</div>`;
  }
  _chipsToday(d) {
    return `<span>${svgIcon("sun", 14, "var(--c-pv)")} ${this._t("pvYield")} <b>${this._kwh(d.pvDay)}</b></span>
      <span>${svgIcon("house", 14, "var(--c-home)")} ${this._t("consumption")} <b>${this._kwh(d.consDay)}</b></span>
      <span>${pylonBolt(14, "in")} ${this._t("gridIn")} <b>${this._kwh(d.buyDay)}</b></span>`;
  }

  _s_tiles(d) {
    const T = (k) => this._t(k);
    const h = d.hist;
    const tile = (ic, label, value, color, key, extra) => `
      <div class="ktile click" data-key="${key}"><div class="kh">${ic}<span>${label}</span></div>
      <div class="kv" style="color:${color}">${value}</div>${extra}</div>`;
    const socBar = `<div class="socbar"><span style="width:${clamp(d.soc || 0, 0, 100)}%;background:${this._socColor(d)}"></span></div>`;
    const tiles = `<div class="ktiles">
      ${tile(svgIcon("sun", 22, "var(--c-pv)"), T("pv"), this._p(d.pv), "var(--ink)", "pv_power", this._spark(h && h.pv_power, "var(--c-pv)"))}
      ${tile(pylonBolt(21, this._gs(d)), `${T("grid")} · ${this._gridText(d)}`, this._p(d.grid), this._gridColor(d), "grid_power", this._spark(h && h.grid_power && h.grid_power.map((v) => (v === null ? null : Math.abs(v))), this._gridColor(d), 100, 28, false))}
      ${tile(svgIcon("house", 22, "var(--c-home)"), T("house"), this._p(d.home), "var(--c-home)", "house_power", this._spark(h && h.house_power, "var(--c-home)"))}
      ${d.hasBat ? tile(`<svg class="hic" viewBox="0 0 24 24" width="22" height="22">${batteryIcon(0, 0, 24, d.soc, this._socColor(d))}</svg>`, T("battery"), d.soc === null ? "–" : `${this._n(d.soc)} %`, this._socColor(d), "battery_soc", socBar + `<div class="ksub">${this._batText(d)}</div>`) : ""}
    </div>`;
    // mini live flow: panel -> inverter -> house -> grid
    const mini = (() => {
      let s = "";
      s += icon("panel", 4, 14, 24, "var(--c-pv)") + this._flow("M32 26 L62 26", "pv", d, 0.6);
      s += `<rect class="invbg" x="64" y="14" width="28" height="24" rx="6"/>` + icon("inverter", 66, 14, 24, "var(--ink)");
      s += this._flow("M94 26 L124 26", "home", d, 0.6) + icon("house", 126, 13, 26, "var(--c-home)");
      s += this._flow("M156 26 L186 26", "grid", d, 0.6) + pylonBoltAt(189, 14, 24, this._gs(d));
      s += `<text class="fl" x="18" y="52" text-anchor="middle" style="fill:var(--c-pv)">${this._p(d.pv)}</text>`;
      s += `<text class="fl" x="139" y="52" text-anchor="middle" style="fill:var(--c-home)">${this._p(d.home)}</text>`;
      s += `<text class="fl" x="201" y="52" text-anchor="middle" style="fill:${this._gridColor(d)}">${this._p(d.grid)}</text>`;
      return `<svg class="mini" viewBox="0 0 220 58">${s}</svg>`;
    })();
    const max = Math.max(d.pvDay || 0, d.consDay || 0, d.buyDay || 0, 0.1);
    const bar = (label, v, color) => `<div class="brow"><span>${label}</span><b>${this._kwh(v)}</b><div class="bt"><span style="width:${((v || 0) / max) * 100}%;background:${color}"></span></div></div>`;
    return `${tiles}<div class="row2">
      <div class="kpanel"><div class="ptitle">${T("liveFlow")}</div>${mini}</div>
      <div class="kpanel"><div class="ptitle">${T("todayTitle")}</div>
        ${bar(T("pvYield"), d.pvDay, "var(--c-good)")}${bar(T("consumption"), d.consDay, "var(--c-home)")}${bar(T("gridIn"), d.buyDay, "var(--c-bad)")}</div>
    </div>`;
  }

  _img(name) {
    const own = this._config.images && this._config.images[name];
    if (own) return own;
    const base = this._config.image_base || "/solar_cockpit_static/img";
    return `${base}/${name}.webp?v=${CARD_VERSION}`;
  }
  /* night picture when it is dark outside or the card is in dark mode */
  _night(d) { return d.sun.f === null || this._isDark(); }

  _s_house(d) {
    const T = (k) => this._t(k);
    const night = this._night(d);
    // picture box (1000x675 source) and anchor points on it
    const IX = 82, IY = 14, IW = 236, IH = 159;
    const at = (fx, fy) => [IX + IW * fx, IY + IH * fy];
    const roof = at(0.42, 0.24), door = at(0.33, 0.8), wall = at(0.8, 0.6), base = at(0.5, 0.97);
    let svg = `<defs><linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky1"/><stop offset="1" class="sky2"/></linearGradient></defs>
      <rect x="0" y="0" width="400" height="262" rx="16" fill="url(#hsky)"/>`;
    if (d.sun.f === null) svg += `<g class="stars">${[[30, 24], [70, 14], [120, 30], [300, 20], [352, 44], [250, 10], [380, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1"/>`).join("")}</g>`;
    svg += this._arc(200, 150, 186, 124, d, { labels: false, r: 8 });
    svg += `<image href="${this._img(night ? "house_night" : "house_day")}" x="${IX}" y="${IY}" width="${IW}" height="${IH}" preserveAspectRatio="xMidYMid meet"/>`;
    // slim pylon picture (386x756) right of the house, standing on the same ground line
    const PX = 333, PY = 64, PW = 50, PH = 98;
    svg += `<image href="${this._img(night ? "pylon_night" : "pylon_day")}" x="${PX}" y="${PY}" width="${PW}" height="${PH}" preserveAspectRatio="xMidYMax meet"/>`;
    const arm = [PX + PW * 0.12, PY + PH * 0.24];
    // connections
    svg += this._flow(`M110 44 C140 44 150 ${roof[1]} ${roof[0]} ${roof[1]}`, "pv", d);
    if (d.hasBat) svg += this._flow(`M${door[0]} ${door[1]} C${door[0] - 20} ${door[1] + 24} 130 152 110 152`, "bat", d);
    svg += this._flow(`M${wall[0]} ${wall[1]} C${wall[0] + 26} ${wall[1] - 4} ${arm[0] - 18} ${arm[1] + 10} ${arm[0]} ${arm[1]}`, "grid", d);
    svg += this._flow(`M${base[0]} ${base[1]} L200 212`, "home", d);
    svg += this._pill(58, 44, 104, 44, this._iconPv(d), T("pv"), this._p(d.pv), "var(--ink)", null, "pv_power");
    if (d.hasBat) svg += this._pill(58, 152, 104, 44, this._iconBat(d), T("battery"), d.soc === null ? "–" : `${this._n(d.soc)} %`, this._socColor(d), null, "battery_soc");
    svg += this._pill(342, 192, 108, 44, this._iconGrid(d), `${T("grid")} · ${this._gridText(d)}`, this._p(d.grid), this._gridColor(d), null, "grid_power");
    svg += this._pill(200, 232, 112, 42, this._iconHome(), T("house"), this._p(d.home), "var(--c-home)", null, "house_power");
    return `<div class="stage art"><svg class="scene" viewBox="0 0 400 262" role="img" aria-label="${this._aria(d)}">${svg}</svg></div>
      <div class="strip">${this._chipsToday(d)}</div>`;
  }

  _s_control(d) {
    const T = (k) => this._t(k);
    const peak = this._config.peak_power;
    const gauge = (label, value, frac, color, key) => {
      const a0 = (210 * Math.PI) / 180, a1 = (-30 * Math.PI) / 180;
      const at = (t) => { const a = a0 + (a1 - a0) * t; return [50 + 36 * Math.cos(a), 52 - 36 * Math.sin(a)]; };
      const [sx, sy] = at(0), [ex, ey] = at(1), [vx, vy] = at(clamp(frac, 0, 1));
      const large = clamp(frac, 0, 1) * 240 > 180 ? 1 : 0;
      return `<div class="gbox click" data-key="${key}"><svg viewBox="0 0 100 80">
        <path class="gtrack" d="M${sx.toFixed(1)} ${sy.toFixed(1)} A36 36 0 1 1 ${ex.toFixed(1)} ${ey.toFixed(1)}"/>
        ${frac > 0.002 ? `<path d="M${sx.toFixed(1)} ${sy.toFixed(1)} A36 36 0 ${large} 1 ${vx.toFixed(1)} ${vy.toFixed(1)}" style="fill:none;stroke:${color};stroke-width:7;stroke-linecap:round"/>` : ""}
        <text class="glab" x="50" y="48" text-anchor="middle">${label}</text>
        <text class="gval" x="50" y="64" text-anchor="middle" style="fill:${color}">${value}</text></svg></div>`;
    };
    const gauges = `<div class="gauges">
      ${gauge(T("pv"), this._p(d.pv), (d.pv || 0) / peak, "var(--c-pv)", "pv_power")}
      ${gauge(`${T("grid")} · ${this._gridText(d)}`, this._p(d.grid), Math.abs(d.grid || 0) / peak, this._gridColor(d), "grid_power")}
      ${gauge(T("house"), this._p(d.home), (d.home || 0) / peak, "var(--c-home)", "house_power")}
      ${d.hasBat ? gauge(T("battery"), d.soc === null ? "–" : `${this._n(d.soc)} %`, (d.soc || 0) / 100, this._socColor(d), "battery_soc") : ""}
    </div>`;
    const chart = this._chart(d, 300, 110, [["pv_power", "var(--c-pv)", T("pv")], ["house_power", "var(--c-home)", T("house")], ["grid_power", "var(--c-accent2)", T("grid")]]);
    const ok = d.ok;
    return `${gauges}<div class="row2 wide">
      <div class="kpanel">${chart}</div>
      <div class="kpanel"><div class="ptitle">${T("todayTitle")}</div>${this._todayList(d)}</div></div>
      <div class="statusbar"><span class="dot ${ok ? "ok" : "bad"}"></span>${ok ? T("systemOk") : `${T("degraded")}: ${d.missing.join(", ")}`}
      <span class="sright">${T("lastUpdate")}: ${this._now().toLocaleTimeString(this._loc)}</span></div>`;
  }

  /* line chart over the last 24 h */
  _chart(d, w, h, series, opts = {}) {
    const hist = d.hist;
    const title = opts.title || this._t("power24");
    const legend = series.map(([, c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join("");
    if (!hist) return `<div class="ptitle">${title}<span class="legend">${legend}</span></div><div class="nochart">…</div>`;
    const all = series.flatMap(([k]) => hist[k] || []).map((v) => Math.abs(v || 0));
    const max = Math.max(...all, 100);
    const top = Math.ceil(max / 500) * 500;
    const L = 30, R = 16, B = h - 16;
    const x = (i, n) => L + (i / (n - 1)) * (w - L - R);
    const y = (v) => B - (Math.max(v, 0) / top) * (B - 6);
    let g = "";
    for (let k = 0; k <= 4; k++) {
      const v = (top / 4) * k, yy = y(v);
      g += `<line class="grid" x1="${L}" y1="${yy.toFixed(1)}" x2="${w - R}" y2="${yy.toFixed(1)}"/><text class="axis" x="${L - 4}" y="${(yy + 3).toFixed(1)}" text-anchor="end">${this._n(v / 1000, 1)}</text>`;
    }
    for (let k = 0; k <= 4; k++) {
      const t = new Date(hist.start.getTime() + (k / 4) * ARC_DAY);
      g += `<text class="axis" x="${(L + (k / 4) * (w - L - R)).toFixed(1)}" y="${h - 3}" text-anchor="middle">${this._clock(t)}</text>`;
    }
    for (const [k, c] of series) {
      const arr = hist[k] || [];
      if (!arr.length) continue;
      const pts = arr.map((v, i) => `${x(i, arr.length).toFixed(1)},${y(Math.abs(v || 0)).toFixed(1)}`);
      if (opts.area) g += `<path d="M${L},${B} L${pts.join(" L")} L${w - R},${B} Z" style="fill:${c};opacity:.18"/>`;
      g += `<path d="M${pts.join(" L")}" style="fill:none;stroke:${c};stroke-width:1.8;stroke-linejoin:round"/>`;
    }
    return `<div class="ptitle">${title}<span class="legend">${legend}</span></div>
      <svg class="chart" viewBox="0 -10 ${w} ${h + 10}">${g}<text class="axis" x="${L - 4}" y="-2" text-anchor="end">kW</text></svg>`;
  }

  _s_nature(d) {
    const T = (k) => this._t(k);
    const s = d.sun;
    const night = this._night(d);
    const art = `<svg class="nart" viewBox="0 0 240 180" role="img" aria-label="${this._aria(d)}">
      <defs><linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky1"/><stop offset="1" class="sky2"/></linearGradient>
      <clipPath id="nclip"><path d="M14 40 Q14 8 52 8 L194 8 Q232 8 232 44 L232 150 Q232 176 200 176 L40 176 Q8 176 8 146 Z"/></clipPath></defs>
      <g clip-path="url(#nclip)">
        <rect width="240" height="180" fill="url(#nsky)"/>
        ${s.f === null ? `<g class="stars">${[[40, 26], [80, 16], [150, 30], [200, 20], [120, 12], [176, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1"/>`).join("")}</g>` : ""}
        ${this._arc(120, 112, 100, 92, d, { labels: false, r: 7 })}
        <image href="${this._img(night ? "nature_night" : "nature_day")}" x="0" y="0" width="240" height="180" preserveAspectRatio="xMidYMax meet"/>
      </g></svg>`;
    const tile = (ic, label, value, color, key) =>
      `<div class="ntile click" data-key="${key}">${ic}<div><div class="gl">${label}</div><div class="gv" style="color:${color}">${value}</div></div></div>`;
    const tiles = `<div class="ntiles">
      ${tile(svgIcon("sun", 24, "var(--c-pv)"), T("pv"), this._p(d.pv), "var(--ink)", "pv_power")}
      ${tile(pylonBolt(24.7, this._gs(d)), `${T("grid")} · ${this._gridText(d)}`, this._p(d.grid), this._gridColor(d), "grid_power")}
      ${tile(svgIcon("house", 24, "var(--c-home)"), T("house"), this._p(d.home), "var(--c-home)", "house_power")}
      ${d.hasBat ? tile(`<svg class="hic" viewBox="0 0 24 24" width="24" height="24">${batteryIcon(0, 0, 24, d.soc, this._socColor(d))}</svg>`, T("battery"), d.soc === null ? "–" : `${this._n(d.soc)} %`, this._socColor(d), "battery_soc") : ""}
    </div>`;
    const chart = this._chart(d, 300, 110, [["pv_power", "var(--c-good)", T("pv")], ["house_power", "var(--c-home)", T("house")]], { area: true, title: T("dayProfile") });
    const today = `<div class="ptitle">${T("todayTitle")}</div>${this._todayList(d).replace(/<svg class="hic"[^>]*>.*?<\/svg>/g, svgIcon("leaf", 16, "var(--c-good)"))}`;
    return `<div class="ntop">${art}${tiles}</div><div class="row2 wide"><div class="kpanel">${chart}</div><div class="kpanel">${today}</div></div>`;
  }

  _s_orbit(d) {
    const T = (k) => this._t(k);
    const C = [200, 146];
    let svg = `<defs><radialGradient id="ohalo"><stop offset="0" class="halo1"/><stop offset="1" class="halo2"/></radialGradient></defs>`;
    svg += `<ellipse class="orbit" cx="${C[0]}" cy="${C[1]}" rx="118" ry="96"/><ellipse class="orbit thin" cx="${C[0]}" cy="${C[1]}" rx="150" ry="122"/>`;
    // the sun travels on the outer ring
    svg += this._arc(C[0], C[1], 150, 122, d, { labels: false, r: 8 });
    svg += `<circle cx="${C[0]}" cy="${C[1]}" r="74" fill="url(#ohalo)"/>`;
    const nodeC = { pv: [200, 50], bat: [86, 166], grid: [314, 166] };
    svg += this._flow(`M200 84 L200 96`, "pv", d);
    if (d.hasBat) svg += this._flow(`M151 157 L120 163`, "bat", d);
    svg += this._flow(`M249 157 L280 163`, "grid", d);
    const orb = (c, r, ic, label, value, color, key) => `<g class="click" data-key="${key}">
      <circle class="orb" cx="${c[0]}" cy="${c[1]}" r="${r}" style="stroke:${color}"/>
      ${ic(c[0] - 9, c[1] - r + 6, 18)}
      <text class="lab" x="${c[0]}" y="${c[1] + 6}" text-anchor="middle">${label}</text>
      <text class="val" x="${c[0]}" y="${c[1] + 21}" text-anchor="middle" style="fill:${color}">${value}</text></g>`;
    svg += orb(nodeC.pv, 34, this._iconPv(d), T("pv"), this._p(d.pv), "var(--c-pv)", "pv_power");
    if (d.hasBat) svg += orb(nodeC.bat, 34, this._iconBat(d), T("battery"), d.soc === null ? "–" : `${this._n(d.soc)} %`, this._socColor(d), "battery_soc");
    svg += orb(nodeC.grid, 34, this._iconGrid(d), `${T("grid")} · ${this._gridText(d)}`, this._p(d.grid), this._gridColor(d), "grid_power");
    svg += `<g class="click" data-key="house_power"><circle class="orb core" cx="${C[0]}" cy="${C[1]}" r="50"/>
      ${icon("house", C[0] - 15, C[1] - 40, 30, "var(--ink)")}
      <text class="lab" x="${C[0]}" y="${C[1] + 8}" text-anchor="middle">${T("house")}</text>
      <text class="big" x="${C[0]}" y="${C[1] + 28}" text-anchor="middle">${this._p(d.home)}</text></g>`;
    const side = `<div class="side panelglass today"><div class="ptitle">${T("todayTitle")}</div>${this._todayList(d, true)}</div>`;
    return `<div class="split"><div class="stage"><svg class="scene" viewBox="0 0 400 280" role="img" aria-label="${this._aria(d)}">${svg}</svg></div>${side}</div>`;
  }

  /* PV forecast block, shown in every style when a forecast is configured */
  _forecast(d) {
    const has = (v) => v !== null && v !== undefined && !isNaN(v);
    if (!has(d.fc) && !has(d.fcTomorrow)) return "";
    const T = (k) => this._t(k);
    const done = d.pvDay || 0;
    const fc = has(d.fc) ? d.fc : 0;
    const max = Math.max(fc, done, 0.1);
    const ratio = d.ratio !== null ? d.ratio : fc > 0 ? (done / fc) * 100 : null;
    const item = (label, value) => `<span>${label} <b>${value}</b></span>`;
    let items = "";
    if (has(d.fcRest) && d.sun.f !== null) items += item(T("restToday"), this._kwh(d.fcRest));
    if (has(d.fcTomorrow)) {
      const trend = has(d.fc) && fc > 0 ? (d.fcTomorrow >= fc ? "▲" : "▼") : "";
      items += item(T("tomorrow"), `${this._kwh(d.fcTomorrow)} ${trend}`);
    }
    if (has(d.fcNow) && d.sun.f !== null) items += item(T("expectedNow"), `${this._p(d.fcNow)} · ${T("actualNow")} ${this._p(d.pv)}`);
    return `<div class="fcast click" data-key="forecast_ratio_day">
      <div class="fchead">${svgIcon("sun", 16, "var(--c-pv)")}<span>${T("forecast")}</span>
        <span class="fcmain">${has(d.fc) ? T("todayOf").replace("{a}", `<b>${this._kwh(done)}</b>`).replace("{b}", `<b>${this._kwh(fc)}</b>`) : ""}</span>
        ${ratio !== null ? `<b class="fcpct">${this._n(ratio)} %</b>` : ""}</div>
      ${has(d.fc) ? `<div class="fcbar" role="img" aria-label="${this._kwh(done)} / ${this._kwh(fc)}"><span class="done" style="width:${((done / max) * 100).toFixed(1)}%"></span><span class="mark" style="left:${((fc / max) * 100).toFixed(1)}%"></span></div>` : ""}
      ${items ? `<div class="fcrow">${items}</div>` : ""}
    </div>`;
  }

  /* ----------------------------------------------------- costs + more */
  _chips(d) {
    const c = [];
    if (d.surplus !== null && d.surplus > 0) c.push(`${this._t("surplus")} ${this._p(d.surplus)}`);
    let out = c.map((x) => `<span class="chip">${x}</span>`).join("");
    if (d.surplusOn) out += `<span class="chip hot">${this._t("surplusOn")}</span>`;
    if (!d.ok && this._config.style !== "control") out += `<span class="chip warn" title="${d.missing.join(", ")}">${this._t("degraded")}</span>`;
    return out ? `<div class="chips">${out}</div>` : "";
  }

  _costs() {
    if (!this._config.show_costs || !this._eid(`balance_${this._period}`)) return "";
    const T = (k) => this._t(k);
    const p = this._period;
    const v = (k) => this._num(`${k}_${p}`);
    const bal = v("balance"), fac = v("factor"), cost = v("cost"), rev = v("revenue");
    const buy = v("import"), sell = v("export"), sav = v("savings"), ben = v("benefit");
    const aut = v("autarky"), cons = v("consumption"), yld = v("pv");
    const balEid = this._eid(`balance_${p}`);
    const prev = balEid && this._hass.states[balEid] ? this._hass.states[balEid].attributes.previous_value : null;
    const g = fac === null ? 0 : clamp(fac, 0, 2);
    const rad = Math.PI * (1 - g / 2);
    const nx = 50 + 34 * Math.cos(rad), ny = 50 - 34 * Math.sin(rad);
    const tile = (label, value, key, cls = "") =>
      `<div class="ctile click ${cls}" data-key="${key}"><div class="gl">${label}</div><div class="cv">${value}</div></div>`;
    return `<div class="costs">
      <div class="chead"><span>${T("gridBalance")}</span>
        <div class="tabs" role="tablist">${PERIODS.map((x) =>
          `<button role="tab" aria-selected="${x === p}" class="${x === p ? "act" : ""}" data-period="${x}">${T("periods")[x]}</button>`).join("")}</div></div>
      <div class="cgrid">
        <div class="click" data-key="factor_${p}"><svg viewBox="0 0 100 58" class="cgauge">
          <path d="M14 50 A36 36 0 0 1 50 14" class="g-bad"/><path d="M50 14 A36 36 0 0 1 86 50" class="g-good"/>
          <line x1="50" y1="50" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" class="needle"/><circle cx="50" cy="50" r="3" class="needle-dot"/></svg>
          <div class="cfac">${this._n(fac, 2)}</div><div class="gl">${T("factor")}: ${T("factorHint")}</div></div>
        <div class="click" data-key="balance_${p}"><div class="gl">${T("balance")}</div>
          <div class="cbig ${bal === null ? "" : bal >= 0 ? "good" : "bad"}">${this._eur(bal)}</div>
          ${prev !== null && prev !== undefined ? `<div class="gl">${T("previous")} ${this._eur(prev)}</div>` : ""}</div>
      </div>
      <div class="ctiles">
        ${tile(T("gridIn"), `${this._kwh(buy)}<small>${this._eur(cost)}</small>`, `import_${p}`, "edge-bad")}
        ${tile(T("gridOut"), `${this._kwh(sell)}<small>${this._eur(rev)}</small>`, `export_${p}`, "edge-good")}
        ${yld !== null ? tile(T("pvYield"), this._kwh(yld), `pv_${p}`) : ""}
        ${cons !== null ? tile(T("consumption"), this._kwh(cons), `consumption_${p}`) : ""}
        ${sav !== null ? tile(T("savings"), this._eur(sav), `savings_${p}`, "good") : ""}
        ${ben !== null ? tile(T("benefit"), this._eur(ben), `benefit_${p}`, "good") : ""}
        ${aut !== null ? tile(T("autarky"), `${this._n(aut)} %`, `autarky_${p}`) : ""}
      </div></div>`;
  }

  _details() {
    const det = (this._config.details || []).filter((e) => this._hass.states[e]);
    if (!det.length) return "";
    return `<div class="costs"><div class="chead"><span>${this._t("details")}</span></div><div class="details">${det.map((e) => {
      const s = this._hass.states[e];
      return `<div class="drow" data-eid="${e}"><span>${s.attributes.friendly_name || e}</span><b>${s.state} ${s.attributes.unit_of_measurement || ""}</b></div>`;
    }).join("")}</div></div>`;
  }

  /* ------------------------------------------------------------- render */
  _isDark() {
    const m = this._config.mode;
    if (m === "dark") return true;
    if (m === "light") return false;
    return !!(this._hass && this._hass.themes && this._hass.themes.darkMode);
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    if (!this._hass) { this.shadowRoot.innerHTML = `<ha-card></ha-card>`; return; }
    const style = this._config.style;
    const dark = this._isDark();
    if (!this._status()) {
      this.shadowRoot.innerHTML = `${css()}<ha-card class="sc s-${style} ${dark ? "dark" : "light"}"><div class="warnbox">${this._t("notFound").replace("{e}", this._config.status_entity)}</div></ha-card>`;
      return;
    }
    const d = this._data();
    const body = this[`_s_${style}`](d);
    const title = this._config.title === undefined ? "Solar Cockpit" : this._config.title;
    this.shadowRoot.innerHTML = `${css()}
      <ha-card class="sc s-${style} ${dark ? "dark" : "light"}"><div class="cq">
        ${title ? `<div class="head"><span>${title}</span><span class="hsub">${svgIcon("house", 16, "var(--muted)")} ${this._t("styleNames")[style]}</span></div>` : ""}
        ${body}
        ${this._forecast(d)}
        ${this._chips(d)}
        ${this._costs()}
        ${this._details()}
      </div></ha-card>`;

    this.shadowRoot.querySelectorAll("[data-key]").forEach((el) =>
      el.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(this._eid(el.getAttribute("data-key"))); }));
    this.shadowRoot.querySelectorAll("[data-eid]").forEach((el) =>
      el.addEventListener("click", () => this._moreInfo(el.getAttribute("data-eid"))));
    this.shadowRoot.querySelectorAll("[data-period]").forEach((el) =>
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._period = el.getAttribute("data-period");
        this._lastSig = null;
        this._render();
      }));
  }
}

/* average history states into n equal time buckets */
function bucket(rows, start, end, n) {
  const out = new Array(n).fill(null);
  if (!rows.length) return out;
  const size = (end - start) / n;
  const pts = rows.map((r) => ({ t: (r.lu !== undefined ? r.lu * 1000 : Date.parse(r.last_updated || r.last_changed)), v: parseFloat(r.s !== undefined ? r.s : r.state) }))
    .filter((p) => !isNaN(p.v)).sort((a, b) => a.t - b.t);
  let j = 0, last = null;
  for (let i = 0; i < n; i++) {
    const b0 = start + i * size, b1 = b0 + size;
    let sum = 0, cnt = 0;
    while (j < pts.length && pts[j].t < b1) {
      if (pts[j].t >= b0) { sum += pts[j].v; cnt++; }
      last = pts[j].v; j++;
    }
    out[i] = cnt ? sum / cnt : last;
  }
  return out;
}

/* ------------------------------------------------------------------ CSS */
function css() {
  return `<style>
  :host { display:block; }
  /* palette per style; .dark switches every style to its night version */
  .sc { --c-pv:#f2a516; --c-home:#f07a2a; --c-good:#2fa55a; --c-bad:#e0463c; --c-accent2:#8b5cf6; --idle:#9aa1ab;
        --bg:#ffffff; --ink:#1d232b; --muted:#6b7480; --line:rgba(29,35,43,.12); --panel:#f5f6f8; --pillbg:#ffffff; --pillline:rgba(29,35,43,.14);
        --arc:rgba(29,35,43,.28); --font:"Inter","Roboto",system-ui,sans-serif; --glow:0; }
  .sc.dark { --bg:#121820; --ink:#e8edf3; --muted:#9aa6b4; --line:rgba(232,237,243,.12); --panel:#1b2330; --pillbg:#1a222d; --pillline:rgba(232,237,243,.16);
        --arc:rgba(232,237,243,.3); --c-good:#3fcf74; --c-bad:#ff5d52; --c-pv:#ffc23d; --c-home:#ff9a4d; --glow:1; --idle:#5d6774; }
  .s-glass.light { --bg:linear-gradient(160deg,#eef4ff,#dfe9fb); --panel:rgba(255,255,255,.55); --pillbg:rgba(255,255,255,.7); --pillline:rgba(70,110,200,.25); }
  .s-glass.dark { --bg:linear-gradient(160deg,#0b1730,#081022 60%,#0d1b3a); --panel:rgba(40,70,140,.18); --pillbg:rgba(28,48,96,.55); --pillline:rgba(120,160,255,.35); --muted:#9fb1d1; }
  .s-flow.light { --bg:#f3f4f7; --panel:#ffffff; }
  .s-flow.dark { --bg:#11151c; --panel:#1a1f28; --pillbg:#1a1f28; }
  .s-tiles.light { --bg:#f4f5f8; --panel:#ffffff; }
  .s-tiles.dark { --bg:#141920; --panel:#1d242e; }
  .s-house.light { --bg:#eaf3fb; --pillbg:rgba(255,255,255,.88); }
  .s-house.dark { --bg:#0e1522; --pillbg:rgba(18,26,40,.85); --pillline:rgba(255,200,120,.35); }
  .s-sunpath.light { --bg:linear-gradient(180deg,#e6f0fb 0%,#fbe9d7 100%); --panel:rgba(255,255,255,.6); --pillbg:rgba(255,255,255,.75); }
  .s-sunpath.dark { --bg:linear-gradient(180deg,#0c1426 0%,#1c1d33 55%,#3a2632 100%); --panel:rgba(20,28,48,.6); --pillbg:rgba(16,22,38,.75); --pillline:rgba(255,210,150,.3); }
  .s-control.light { --bg:#eef1f6; --panel:#ffffff; --c-accent2:#7c4dff; }
  .s-control.dark { --bg:#0f141c; --panel:#171e29; --c-accent2:#b085ff; }
  .s-nature.light { --bg:#f7f3e8; --panel:#fffdf6; --pillbg:#fffdf6; --ink:#24301f; --muted:#6c735f; --line:rgba(36,48,31,.12); --c-good:#4a9a3a; }
  .s-nature.dark { --bg:#141a14; --panel:#1c241b; --pillbg:#1c241b; --ink:#e7eedf; --muted:#a2ad96; --c-good:#7cc96a; }
  .s-orbit.light { --bg:radial-gradient(circle at 40% 45%,#f4efff,#e7e3fb); --panel:rgba(255,255,255,.6); --pillbg:#fff; --c-accent2:#7c4dff; }
  .s-orbit.dark { --bg:radial-gradient(circle at 40% 45%,#2a1d5c,#140f30 70%); --panel:rgba(60,40,120,.28); --pillbg:rgba(30,22,70,.8); --pillline:rgba(180,150,255,.4); --muted:#b6abdc; --c-accent2:#b085ff; }

  ha-card.sc { background: var(--bg); color: var(--ink); font-family: var(--font); padding: 14px 16px 16px; overflow:hidden; border: 1px solid var(--line); }
  .cq { container-type: inline-size; display:flex; flex-direction:column; gap:12px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:700; font-size:1.05rem; letter-spacing:.01em; }
  .hsub { display:flex; align-items:center; gap:6px; font-size:.75rem; font-weight:500; color: var(--muted); }
  .hic { fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; flex:none; }
  .warnbox { padding:16px; color: var(--c-bad); }
  .click, [data-key] { cursor:pointer; }

  .scene { display:block; width:100%; height:auto; overflow:visible; }
  .scene text { font-family: var(--font); }
  .ic { fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .lab, .tl, .sub, .glab { fill: var(--muted); font-size:9.5px; }
  .tl { font-size:9px; }
  .val { font-size:14px; font-weight:700; }
  .big { font-size:19px; font-weight:800; fill: var(--c-home); }
  .fl { font-size:9.5px; font-weight:700; }
  .pillbg { fill: var(--pillbg); stroke: var(--pillline); stroke-width:1; }
  .dark .pillbg { filter: drop-shadow(0 4px 10px rgba(0,0,0,.35)); }
  .invbg { fill: var(--pillbg); stroke: var(--pillline); stroke-width:1; }
  .arc { fill:none; stroke: var(--arc); stroke-width:1.2; stroke-dasharray:3 4; }
  .trail { fill:none; stroke: var(--c-pv); stroke-width:2.4; stroke-linecap:round; }
  .sundisc { fill: var(--c-pv); }
  .sunglow { fill: var(--c-pv); opacity:.22; }
  .moon circle { fill: var(--muted); opacity:.6; } .moon .moon-cut { fill: var(--bg); opacity:1; }
  .light .moon .moon-cut { fill:#eef2f8; }
  .dark .moon .moon-cut { fill:#0f1626; }
  .idle { fill:none; stroke: var(--idle); stroke-width:1.8; stroke-dasharray:4 5; stroke-linecap:round; opacity:.8; }
  .flow { fill:none; stroke-linecap:round; stroke-dasharray:1 8; animation: dash linear infinite; }
  .dark .flow, .s-glass .flow, .s-orbit .flow { filter: drop-shadow(0 0 3px currentColor); }
  .flow.shine { stroke: rgba(255,255,255,.75); stroke-dasharray:2 14; }
  @keyframes dash { to { stroke-dashoffset:-18; } }
  @media (prefers-reduced-motion: reduce) { .flow { animation:none; stroke-dasharray:none; } }

  .stage { position:relative; border-radius:16px; }
  .panelglass { background: var(--panel); border:1px solid var(--pillline); border-radius:16px; backdrop-filter: blur(8px); }
  .split { display:grid; grid-template-columns: minmax(0,1fr) 215px; gap:12px; align-items:stretch; }
  .split.left { grid-template-columns: 215px minmax(0,1fr); }
  .s-glass .stage { padding:6px 8px; }
  .side { display:flex; flex-direction:column; gap:10px; }
  .gtile { display:flex; gap:10px; align-items:flex-start; background: var(--panel); border:1px solid var(--pillline); border-radius:14px; padding:10px 12px; }
  .gtile > div { flex:1; min-width:0; }
  .gl { font-size:.72rem; color: var(--muted); }
  .gv { font-size:1.15rem; font-weight:700; }
  .bars { display:block; width:100%; height:22px; margin-top:4px; }
  .today { padding:12px 14px; gap:8px; }
  .ptitle { font-weight:700; font-size:.85rem; margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .trow { display:flex; align-items:center; gap:8px; font-size:.78rem; color: var(--muted); padding:3px 0; }
  .trow span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .trow b { white-space:nowrap; color: var(--ink); font-weight:700; font-variant-numeric: tabular-nums; }
  .trow.dim b { font-weight:500; }

  .sky { overflow:hidden; }
  .hills { position:absolute; left:0; right:0; bottom:0; width:100%; height:34%; z-index:0; }
  .sky .scene { position:relative; z-index:1; }
  .s-sunpath .h1 { fill: rgba(80,90,120,.25); } .s-sunpath .h2 { fill: rgba(60,70,100,.3); }
  .s-sunpath.dark .h1 { fill:#1c1a2e; } .s-sunpath.dark .h2 { fill:#141322; }

  .fnode { fill: var(--panel); stroke-width:1.4; }
  .fnode.inv { stroke: var(--pillline); }
  .strip { display:flex; flex-wrap:wrap; gap:6px 16px; justify-content:center; font-size:.78rem; color: var(--muted); }
  .strip span { display:inline-flex; align-items:center; gap:5px; } .strip b { color: var(--ink); }

  .ktiles { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; }
  .ktile, .kpanel { background: var(--panel); border:1px solid var(--line); border-radius:14px; padding:10px 12px; min-width:0; }
  .dark .ktile, .dark .kpanel { border-color: var(--pillline); }
  .kh { display:flex; align-items:center; gap:6px; font-size:.78rem; font-weight:600; color: var(--muted); }
  .kv { font-size:1.35rem; font-weight:800; margin:4px 0 2px; font-variant-numeric: tabular-nums; }
  .ksub { font-size:.7rem; color: var(--muted); margin-top:4px; }
  .spark { display:block; width:100%; height:30px; }
  .socbar { height:8px; border-radius:4px; background: var(--line); overflow:hidden; margin-top:8px; } .socbar span { display:block; height:100%; border-radius:4px; }
  .row2 { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:10px; }
  .row2.wide { grid-template-columns: minmax(0,1.6fr) minmax(0,1fr); }
  .mini { display:block; width:100%; max-width:300px; height:auto; margin:6px auto 0; }
  .brow { display:grid; grid-template-columns: 1fr auto; gap:2px 8px; font-size:.75rem; color: var(--muted); margin:4px 0; }
  .brow b { color: var(--ink); } .bt { grid-column: 1 / -1; height:7px; border-radius:4px; background: var(--line); overflow:hidden; } .bt span { display:block; height:100%; border-radius:4px; }

  .art { overflow:hidden; border-radius:16px; }
  .s-house.light .sky1 { stop-color:#cfe6fb; } .s-house.light .sky2 { stop-color:#f4f8fc; }
  .s-house.dark .sky1 { stop-color:#0a1222; } .s-house.dark .sky2 { stop-color:#1c2a44; }
  .s-house .art .scene image, .nart image { pointer-events:none; }
  .stars circle { fill:#fff; opacity:.7; }
  .ground { fill:#7fb069; } .dark .ground { fill:#1d3a26; }
  .hfront { fill:#f4f1ea; stroke:#cfc8bb; stroke-width:1; } .dark .hfront { fill:#d9d3c7; stroke:#8d8678; }
  .hside { fill:#dcd6ca; } .dark .hside { fill:#a39d91; }
  .hgable { fill:#ece8df; } .dark .hgable { fill:#c8c2b6; }
  .roofl { fill:#3a4250; } .roofr { fill:#2f3744; }
  .solarp { fill:#2c5fa8; stroke:#9cc3ff; stroke-width:.6; } .dark .solarp { fill:#21447e; }
  .win { fill:#bcd6ee; stroke:#8aa5bf; stroke-width:.8; } .dark .win { fill:#ffcf7a; stroke:#e0a74a; filter: drop-shadow(0 0 4px rgba(255,190,90,.8)); }
  .door { fill:#6b4b34; }
  .bush { fill:#5d9a4a; } .dark .bush { fill:#24502f; }

  .gauges { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; }
  .gbox { background: var(--panel); border:1px solid var(--line); border-radius:14px; padding:6px 6px 0; }
  .dark .gbox { border-color: var(--pillline); }
  .gbox svg { display:block; width:100%; height:auto; }
  .gtrack { fill:none; stroke: var(--line); stroke-width:7; stroke-linecap:round; }
  .glab { font-size:9px; } .gval { font-size:12.5px; font-weight:800; }
  .chart { display:block; width:100%; height:auto; }
  .chart .grid { stroke: var(--line); stroke-width:1; } .axis { fill: var(--muted); font-size:8px; }
  .legend { display:flex; gap:10px; font-weight:500; font-size:.7rem; color: var(--muted); margin-left:auto; }
  .legend i { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:4px; vertical-align:middle; }
  .nochart { height:90px; display:flex; align-items:center; justify-content:center; color: var(--muted); }
  .statusbar { display:flex; align-items:center; gap:8px; font-size:.75rem; color: var(--muted); }
  .statusbar .sright { margin-left:auto; } .dot { width:9px; height:9px; border-radius:50%; } .dot.ok { background: var(--c-good); } .dot.bad { background: var(--c-bad); }

  .ntop { display:grid; grid-template-columns: minmax(0,1.1fr) minmax(0,1fr); gap:12px; align-items:center; }
  .nart { display:block; width:100%; height:auto; }
  .s-nature.light .sky1 { stop-color:#fde7b8; } .s-nature.light .sky2 { stop-color:#fff7e4; }
  .s-nature.dark .sky1 { stop-color:#0c1622; } .s-nature.dark .sky2 { stop-color:#1d2c36; }
  .hill3 { fill:#a8c98a; } .hill2 { fill:#86b56b; } .hill1 { fill:#5f9a4c; }
  .dark .hill3 { fill:#2c4232; } .dark .hill2 { fill:#22382a; } .dark .hill1 { fill:#1a2e21; }
  .tree circle { fill:#3f7d36; } .tree rect { fill:#6b4b34; } .dark .tree circle { fill:#1f4426; }
  .roofn { fill:#36507a; }
  .ntiles { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:10px; }
  .ntile { display:flex; gap:10px; align-items:center; background: var(--panel); border:1px solid var(--line); border-radius:14px; padding:12px; }

  .orbit { fill:none; stroke: var(--pillline); stroke-width:1.2; }
  .orbit.thin { stroke-dasharray:2 5; opacity:.7; }
  .orb { fill: var(--pillbg); stroke-width:1.6; }
  .dark .orb { filter: drop-shadow(0 0 8px rgba(160,120,255,.35)); }
  .orb.core { stroke: var(--c-accent2); stroke-width:2.2; }
  .halo1 { stop-color: var(--c-accent2); stop-opacity:.35; } .halo2 { stop-color: var(--c-accent2); stop-opacity:0; }

  .fcast { background: var(--panel); border:1px solid var(--line); border-radius:14px; padding:10px 12px; display:flex; flex-direction:column; gap:7px; }
  .dark .fcast { border-color: var(--pillline); }
  .fchead { display:flex; align-items:center; gap:8px; font-size:.82rem; font-weight:700; flex-wrap:wrap; }
  .fcmain { font-weight:500; color: var(--muted); } .fcmain b { color: var(--ink); }
  .fcpct { margin-left:auto; color: var(--c-pv); font-size:.95rem; }
  .fcbar { position:relative; height:9px; border-radius:5px; background: var(--line); }
  .fcbar .done { position:absolute; left:0; top:0; bottom:0; border-radius:5px; background: linear-gradient(90deg, var(--c-pv), color-mix(in srgb, var(--c-pv) 70%, var(--c-good))); }
  .fcbar .mark { position:absolute; top:-4px; bottom:-4px; width:2px; margin-left:-1px; background: var(--ink); border-radius:1px; }
  .fcrow { display:flex; flex-wrap:wrap; gap:4px 16px; font-size:.75rem; color: var(--muted); }
  .fcrow b { color: var(--ink); font-weight:700; }
  .chips { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; }
  .chip { font-size:.74rem; padding:3px 10px; border-radius:12px; background: var(--panel); border:1px solid var(--line); }
  .chip.hot { background: color-mix(in srgb, var(--c-pv) 28%, transparent); }
  .chip.warn { background: color-mix(in srgb, var(--c-bad) 22%, transparent); }

  .costs { border-top:1px solid var(--line); padding-top:12px; }
  .chead { display:flex; align-items:center; gap:8px; font-weight:700; font-size:.92rem; margin-bottom:8px; flex-wrap:wrap; }
  .tabs { margin-left:auto; display:flex; gap:2px; background: var(--panel); border:1px solid var(--line); border-radius:9px; padding:2px; }
  .tabs button { border:0; background:transparent; color: var(--muted); font: inherit; font-size:.76rem; padding:3px 10px; border-radius:7px; cursor:pointer; }
  .tabs button.act { background: var(--ink); color: var(--bg); font-weight:700; }
  .s-glass .tabs button.act, .s-sunpath .tabs button.act, .s-orbit .tabs button.act { color:#111; background: var(--c-pv); }
  .tabs button:focus-visible { outline:2px solid var(--c-pv); }
  .cgrid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; align-items:center; text-align:center; }
  .cgauge { width:100%; max-width:150px; }
  .cgauge path { fill:none; stroke-width:8; }
  .g-bad { stroke: color-mix(in srgb, var(--c-bad) 60%, transparent); } .g-good { stroke: color-mix(in srgb, var(--c-good) 60%, transparent); }
  .needle { stroke: var(--ink); stroke-width:2.5; stroke-linecap:round; } .needle-dot { fill: var(--ink); }
  .cfac { font-size:1.2rem; font-weight:800; }
  .cbig { font-size:1.6rem; font-weight:800; font-variant-numeric: tabular-nums; }
  .good { color: var(--c-good); } .bad { color: var(--c-bad); }
  .ctiles { display:grid; grid-template-columns: repeat(auto-fill, minmax(112px,1fr)); gap:8px; margin-top:10px; }
  .ctile { background: var(--panel); border:1px solid var(--line); border-radius:12px; padding:7px 10px; }
  .ctile .cv { font-weight:700; font-size:.95rem; font-variant-numeric: tabular-nums; }
  .ctile small { display:block; font-weight:400; font-size:.72rem; color: var(--muted); }
  .ctile.good .cv { color: var(--c-good); }
  .ctile.edge-bad { box-shadow: inset 3px 0 0 var(--c-bad); } .ctile.edge-good { box-shadow: inset 3px 0 0 var(--c-good); }
  .details { display:grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap:4px 14px; font-size:.8rem; }
  .drow { display:flex; justify-content:space-between; gap:8px; cursor:pointer; color: var(--muted); } .drow b { color: var(--ink); font-weight:600; white-space:nowrap; }

  @container (max-width: 560px) {
    .split, .split.left { grid-template-columns: minmax(0,1fr); }
    .split.left .side { order: 2; }
    .side:not(.today) { flex-direction:row; flex-wrap:wrap; } .side:not(.today) > * { flex:1 1 140px; }
    .ktiles, .gauges { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .row2, .row2.wide, .ntop { grid-template-columns: minmax(0,1fr); }
  }
  @container (max-width: 360px) { .cgrid { grid-template-columns: 1fr; } }
  </style>`;
}

if (!customElements.get("solar-cockpit-card")) {
  customElements.define("solar-cockpit-card", SolarCockpitCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "solar-cockpit-card",
    name: "Solar Cockpit",
    description: "PV, battery, grid and house with live energy flows, the sun's daily arc and grid balance. Nine styles, light and dark.",
    preview: true,
    documentationURL: "https://github.com/itfhunter/solar_cockpit",
  });
  console.info(`%c SOLAR-COCKPIT-CARD %c ${CARD_VERSION} `, "background:#f2a516;color:#000;font-weight:700", "background:#333;color:#fff");
}
