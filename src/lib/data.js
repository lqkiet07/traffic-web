// Shared data helpers: fetchers, vehicle styling, signal schedule.
//
// Dual-clock truth: trajectory replay runs on the 120s web clock
// (CYCLE_LEN), while GAMA KPI/phase logs run on the 112s GAMA clock
// (GAMA_CYCLE_LEN). Every panel looks up by absolute time t via
// getGamaSignal / kpiIndexForTime / chartCycleForTime.

export const CYCLE_LEN = 120;
export const GAMA_CYCLE_LEN = 112;

export const SCENARIOS = [
  { key: "Low_400", label: "Thấp · 400 vph" },
  { key: "Medium_900", label: "Trung bình · 900 vph" },
  { key: "High_1400", label: "Cao · 1400 vph" },
];

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.json();
}

export const loadJunctions = () => fetchJson("/data/junctions.json");
export const loadKpi = () => fetchJson("/data/kpi_summary.json");
export const loadJunctionKpis = () => fetchJson("/data/junction_kpis.json");
export const loadSignals = (algo) => fetchJson(`/data/signals_${algo}.json`);
export const loadRoads = () => fetchJson("/data/roads.geojson");
export const loadPoles = () => fetchJson("/data/signals_poles.json");
export const loadCycle = (algo, cycle) =>
  fetchJson(`/data/trajectories/${algo}/cycle_${cycle}.json`);

// Latest log entry at or before the current cycle (fallback: last entry).
export function latestCycleEntry(entries, cycle) {
  if (!entries || entries.length === 0) return null;
  return entries.find((e) => e.cycle === cycle) || entries[entries.length - 1];
}

// Named positions inside a compact vehicle record [id, type, lat, lng, speed, heading]
export const V_INDEX = { ID: 0, TYPE: 1, LAT: 2, LNG: 3, SPEED: 4, HEADING: 5 };

// True vehicle dimensions from models/Vehicles.gaml (meters).
// Canvas exaggerates absolute size for visibility but preserves ratios.
export const VEH_DIMS = {
  0: { label: "Xe máy", color: "#f59e0b", edge: "#92610a", len: 1.9, wid: 0.7 },
  1: { label: "Ô tô", color: "#38bdf8", edge: "#1d5f8a", len: 4.5, wid: 1.8 },
  2: { label: "Xe tải", color: "#ec4899", edge: "#8a2c55", len: 8.0, wid: 2.4 },
};

// GAMA stopped-vehicle threshold (models/Vehicles.gaml: speed < 0.28 m/s)
export const STOPPED_SPEED = 0.28;

/** Sign-safe modulo: JS % keeps the sign, so wrap negatives into [0, m). */
function mod(n, m) {
  return ((n % m) + m) % m;
}

/**
 * Computes exact signal states for a junction at continuous global simulation time.
 * In GAMA, Cycle 1 always runs 56s Phase 1, 56s Phase 2.
 * For Cycle K >= 2, executes the green times logged in row cycle === K - 1.
 */
export function getGamaSignal(signalsForJnc, globalSimTime, offsetS = 0) {
  const t = Math.max(0, globalSimTime + offsetS);
  const gamaCycle = Math.floor(t / GAMA_CYCLE_LEN) + 1;
  const tInCycle = t % GAMA_CYCLE_LEN;

  let split;
  if (gamaCycle <= 1) {
    split = { g1: 56, g2: 56 };
  } else {
    const entries = signalsForJnc || [];
    const match = entries.find((e) => e.cycle === gamaCycle - 1);
    split = match || entries[entries.length - 1] || { g1: 56, g2: 56 };
  }

  const g1 = Number(split.g1) || 56;
  const g2 = Number(split.g2) || 56;
  const dur = g1 + g2 || GAMA_CYCLE_LEN;
  const isPhase1 = tInCycle < g1;
  const activePhase = isPhase1 ? 0 : 1;
  const remaining = isPhase1 ? g1 - tInCycle : dur - tInCycle;
  const axis1 = isPhase1 ? "green" : "red";
  const axis2 = isPhase1 ? "red" : "green";

  return {
    axis_1: { state: axis1, secs: remaining },
    axis_2: { state: axis2, secs: remaining },
    activePhase,
    remaining,
    split,
    gamaCycle,
  };
}

/** Shortest-arc interpolation of headings (degrees). */
export function lerpAngle(a, b, r) {
  const d = mod(b - a + 540, 360) - 180;
  return mod(a + d * r, 360);
}

/** Linear interpolation of positions + headings between 2s sample frames.
 * Pass prebuilt per-frame id->vehicle maps to skip Map allocation (60fps path).
 */
export function interpolateVehicles(frames, simTime, maps = null) {
  if (!frames || frames.length === 0) return [];
  if (simTime <= frames[0].time) return frames[0].vehicles;
  const last = frames[frames.length - 1];
  if (simTime >= last.time) return last.vehicles;

  let i = 0;
  while (i < frames.length - 2 && frames[i + 1].time <= simTime) i++;
  const a = frames[i];
  const b = frames[i + 1];
  const span = Math.max(b.time - a.time, 1e-6);
  const r = Math.min(Math.max((simTime - a.time) / span, 0), 1);

  const bById = maps?.[i + 1] ?? new Map(b.vehicles.map((v) => [v[V_INDEX.ID], v]));
  const out = [];
  for (const v of a.vehicles) {
    const w = bById.get(v[V_INDEX.ID]);
    if (!w) {
      out.push(v);
      continue;
    }
    out.push([
      v[V_INDEX.ID],
      v[V_INDEX.TYPE],
      v[V_INDEX.LAT] + (w[V_INDEX.LAT] - v[V_INDEX.LAT]) * r,
      v[V_INDEX.LNG] + (w[V_INDEX.LNG] - v[V_INDEX.LNG]) * r,
      w[V_INDEX.SPEED],
      lerpAngle(v[V_INDEX.HEADING], w[V_INDEX.HEADING], r),
    ]);
  }
  // Vehicles born in frame b (no match in a) appear once reached
  if (r > 0.999) return b.vehicles;
  return out;
}

/** % improvement of proposed (CAO) over baseline. higherIsBetter flips sign.
 * Guards NaN/zero so badges never render NaN%.
 */
export function improvementPct(proposed, baseline, higherIsBetter = false) {
  if (proposed == null || baseline == null || baseline === 0) return 0;
  if (Number.isNaN(proposed) || Number.isNaN(baseline)) return 0;
  const d = higherIsBetter
    ? (proposed - baseline) / Math.abs(baseline)
    : (baseline - proposed) / Math.abs(baseline);
  return Number.isFinite(d) ? d * 100 : 0;
}

export const REPLAY_ALGOS = ["cao"];
export const REPLAY_SCENARIOS = ["Medium_900"];
export function replayAvailable(algo, scenario) {
  return REPLAY_ALGOS.includes(algo) && REPLAY_SCENARIOS.includes(scenario);
}
export function formatClock(totalSeconds) {
  const s = Math.max(Math.floor(totalSeconds), 0);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// Stub guard: a real GAMA cycle always has 2+ sample frames.
export function isStubChunk(frames) {
  return !frames || frames.length < 2;
}

// 112s-clock lookups: KPI/phase logs run on GAMA_CYCLE_LEN, not the 120s web clock.
export function kpiIndexForTime(t, len) {
  if (!len || len <= 0) return 0;
  return Math.min(Math.max(Math.floor(Math.max(0, t) / GAMA_CYCLE_LEN), 0), len - 1);
}
export function chartCycleForTime(t, len) {
  if (!len || len <= 0) return 1;
  return Math.min(Math.max(Math.floor(Math.max(0, t) / GAMA_CYCLE_LEN) + 1, 1), len);
}
