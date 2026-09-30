// Minimum longitudinal separation for geometrically overlapping bodies.
// Preserves GAMA headway: stopped queues get a static gap, moving vehicles
// get just-enough separation. Never touches speed/heading/type/id.
// ponytail: approximate; true lowest_lane is not in the export log.
import { VEH_LENS, VEH_WIDS } from "./scale.js";
import { V_INDEX } from "./data.js";

const M_LAT = 111320;
const M_LNG = 109640;
const LANE_TOL = 1.0;
const HDG_TOL = 15;
const STOP_SPD = 0.5;
const STOP_EXTRA = 0.5;
const TOUCH_EPS = 0.05;

function dims(t) {
  return { L: VEH_LENS[t] ?? 4.5, W: VEH_WIDS[t] ?? 1.8 };
}

function fwd(hDeg) {
  const h = ((hDeg || 0) * Math.PI) / 180;
  return { fE: Math.cos(h), fN: -Math.sin(h) };
}

function hdgDiff(a, b) {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return Math.abs(d);
}

function relMeters(lead, foll) {
  return {
    dx: (foll[V_INDEX.LNG] - lead[V_INDEX.LNG]) * M_LNG,
    dy: (foll[V_INDEX.LAT] - lead[V_INDEX.LAT]) * M_LAT,
  };
}

function projRel(f, dx, dy) {
  return { lon: dx * f.fE + dy * f.fN, lat: Math.abs(dx * -f.fN + dy * f.fE) };
}

function groupLanes(out) {
  const groups = [];
  for (let i = 0; i < out.length; i++) {
    let placed = false;
    for (let g = 0; g < groups.length; g++) {
      const rep = out[groups[g][0]];
      if (hdgDiff(rep[V_INDEX.HEADING] || 0, out[i][V_INDEX.HEADING] || 0) >= HDG_TOL) continue;
      const f = fwd(rep[V_INDEX.HEADING] || 0);
      const { dx, dy } = relMeters(rep, out[i]);
      if (projRel(f, dx, dy).lat >= LANE_TOL) continue;
      groups[g].push(i);
      placed = true;
      break;
    }
    if (!placed) groups.push([i]);
  }
  return groups;
}

function separatePair(out, li, fi) {
  const lead = out[li];
  const foll = out[fi];
  const f = fwd(foll[V_INDEX.HEADING] || 0);
  const { dx, dy } = relMeters(lead, foll);
  const p = projRel(f, dx, dy);
  const d1 = dims(lead[V_INDEX.TYPE]);
  const d2 = dims(foll[V_INDEX.TYPE]);
  if (p.lat >= (d1.W + d2.W) / 2) return;
  const stopped = (lead[V_INDEX.SPEED] ?? 99) < STOP_SPD && (foll[V_INDEX.SPEED] ?? 99) < STOP_SPD;
  const minGap = (d1.L + d2.L) / 2 + (stopped ? STOP_EXTRA : TOUCH_EPS);
  const push = minGap + p.lon;
  if (push <= 0) return;
  foll[V_INDEX.LNG] -= (f.fE * push) / M_LNG;
  foll[V_INDEX.LAT] -= (f.fN * push) / M_LAT;
}

export function declutter(vehicles) {
  const out = (vehicles || []).map((v) => v.slice());
  if (out.length < 2) return out;
  for (const g of groupLanes(out)) {
    if (g.length < 2) continue;
    const f0 = fwd(out[g[0]][V_INDEX.HEADING] || 0);
    const scored = g.map((idx) => {
      const { dx, dy } = relMeters(out[g[0]], out[idx]);
      return { idx, s: dx * f0.fE + dy * f0.fN };
    });
    scored.sort((a, b) => b.s - a.s);
    for (let k = 1; k < scored.length; k++) separatePair(out, scored[k - 1].idx, scored[k].idx);
  }
  return out;
}
