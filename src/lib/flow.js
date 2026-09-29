// Infers the green axis from live vehicle motion near a junction.
// The axis with higher total speed is flowing green; stopped axis is red.
// Returns 0 (axis_1/NS) | 1 (axis_2/EW) | null (too little evidence).
// ponytail: 60m radius + speed-sum heuristic; replace with GAMA phase log if exported.
import { V_INDEX } from "./data.js";

const M_LAT = 111320;
const M_LNG = 109640;

export function inferPhaseFromFlow(vehicles, center, radiusM = 60) {
  if (!vehicles || !center) return null;
  let s1 = 0;
  let s2 = 0;
  for (const v of vehicles) {
    const dx = (v[V_INDEX.LNG] - center.lng) * M_LNG;
    const dy = (v[V_INDEX.LAT] - center.lat) * M_LAT;
    if (dx * dx + dy * dy > radiusM * radiusM) continue;
    const h = ((v[V_INDEX.HEADING] || 0) * Math.PI) / 180;
    if (Math.abs(Math.cos(h)) > Math.abs(Math.sin(h))) s1 += v[V_INDEX.SPEED] || 0;
    else s2 += v[V_INDEX.SPEED] || 0;
  }
  if (s1 <= 0 && s2 <= 0) return null;
  const hi = Math.max(s1, s2);
  const lo = Math.min(s1, s2);
  if (hi < 1.1 * lo) return null;
  return s1 >= s2 ? 0 : 1;
}
