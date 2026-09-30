// Shared data helpers: fetchers, vehicle styling, signal schedule.
//
// Signal schedule reconstruction: GAMA logs per-cycle green splits (g1, g2)
// but not the live phase state. We reconstruct a deterministic schedule:
// phase 1 green for g1 seconds, then phase 2 green for g2 seconds,
// repeating every CYCLE_LEN (120s). Documented approximation for display.

export const CYCLE_LEN = 120;
export const GAMA_CYCLE_LEN = 112;

// GAMA clearance per phase (Intersection.gaml: lost_time = 4s): yellow +
// all-red during which no approach has green. Logged g1+g2 ~= 112s.
export const LOST_PER_PHASE = 4;

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

/** Shared phase window: elapsed time t and phase-1 green length.
 * Mirrors GAMA: each phase ends with LOST_PER_PHASE clearance seconds
 * (yellow + all-red), so greens occupy CYCLE_LEN - 2*LOST, not 120s.
 * offsetS shifts the whole schedule (manual eye-alignment, Task 2).
 */
function phaseWindow(g1, g2, simTime, offsetS = 0) {
  const total = g1 + g2;
  if (total <= 0) return null;
  const clear = 2 * LOST_PER_PHASE;
  const greenSpan = CYCLE_LEN - clear;
  const t = mod(simTime + offsetS, CYCLE_LEN);
  const green1 = (g1 / total) * greenSpan;
  return { t, green1, greenSpan };
}

/** Green phase index (0 or 1) active at simTime within a cycle. */
export function activePhase(g1, g2, simTime, offsetS = 0) {
  const w = phaseWindow(g1, g2, simTime, offsetS);
  if (!w) return 0;
  return w.t < w.green1 ? 0 : 1;
}

/** Active phase + remaining green seconds (countdown) at simTime. */
export function phaseCountdown(g1, g2, simTime, offsetS = 0) {
  const w = phaseWindow(g1, g2, simTime, offsetS);
  if (!w) return { phase: 0, remaining: 0 };
  if (w.t < w.green1) return { phase: 0, remaining: w.green1 - w.t };
  return { phase: 1, remaining: CYCLE_LEN - w.t };
}

/** Pole signal state from GAMA axis mapping (Intersection.gaml to_green/to_red):
 * phase 1 (g1) = axis_1 (NS/SN) green; phase 2 (g2) = axis_2 (EW/WE) green.
 * Each phase ends with LOST_PER_PHASE clearance (yellow tail + all-red gap)
 * during which the other axis stays red. Matches GAMA lost_time = 4s.
 * Red poles count down to their next green.
 */
export function poleSignal(g1, g2, simTime, axis, offsetS = 0) {
  const w = phaseWindow(g1, g2, simTime, offsetS);
  if (!w) return { state: "red", secs: 0 };
  const greenEnd1 = w.green1;
  const greenEnd2 = w.greenSpan;
  if (axis === "axis_1") {
    if (w.t < greenEnd1) return { state: "green", secs: greenEnd1 - w.t };
    if (w.t < greenEnd1 + LOST_PER_PHASE)
      return { state: "yellow", secs: greenEnd1 + LOST_PER_PHASE - w.t };
    return { state: "red", secs: CYCLE_LEN - w.t };
  }
  if (w.t < greenEnd1 + LOST_PER_PHASE)
    return { state: "red", secs: greenEnd1 + LOST_PER_PHASE - w.t };
  if (w.t < greenEnd2 + LOST_PER_PHASE)
    return { state: "green", secs: greenEnd2 + LOST_PER_PHASE - w.t };
  if (w.t < greenEnd2 + 2 * LOST_PER_PHASE)
    return { state: "yellow", secs: greenEnd2 + 2 * LOST_PER_PHASE - w.t };
  return { state: "red", secs: CYCLE_LEN - w.t };
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

  const bById = maps ? maps[i + 1] : new Map(b.vehicles.map((v) => [v[V_INDEX.ID], v]));
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
