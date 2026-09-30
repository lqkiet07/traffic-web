// DEPRECATED path: GAMA now exports display positions (compute_position);
// set TRUE_POSITIONS in VehicleCanvas after re-export. Kept so
// lane_shift.test still passes and old centerline data still renders.
// Density-aware lateral offsets mirroring GAMA Vehicles.gaml lowest_lane.
// Sparse (occ<0.3): type holds its GAMA lane center plus deterministic id
// stagger. Dense: fill lanes in order, adjacent lanes differ by one laneW.
// ponytail: nearest-vertex map matching only; upgrade to true on-road
// projection when surveyed lane polylines are available.
export function hash100(s) { let h = 0; const t = String(s ?? ""); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 100; return h; }
export function laneOffsetM(v, seg, occ) {
  const n = Math.max(seg.lanes || 2, 1);
  const width = seg.width || n * 3.5;
  const laneW = width / n;
  const stag = (hash100(v.id) / 100 - 0.5) * Math.min(0.6, laneW * 0.3);
  if ((occ ?? 0) < 0.3) {
    const lowest = v.type === 0 ? 0 : v.type === 2 ? n - 1 : Math.floor(n / 2);
    const side = (v.dir ?? 1) >= 0 ? 1 : -1;
    return side * (((n - lowest - 0.5) * laneW) - width / 2 + stag);
  }
  const lane = (v.laneIdx ?? 0) % n;
  return (((lane + 0.5) * laneW) - width / 2 + stag) * ((v.dir ?? 1) >= 0 ? 1 : -1);
}
function nearestSeg(lng, lat, segs) {
  let best = 0;
  let bd = Infinity;
  for (let s = 0; s < segs.length; s++) {
    const pts = segs[s].pts;
    for (let i = 0; i < pts.length; i++) {
      const dE = (pts[i][0] - lng) * 109640;
      const dN = (pts[i][1] - lat) * 111320;
      const d = dE * dE + dN * dN;
      if (d < bd) { bd = d; best = s; }
    }
  }
  return best;
}
export function buildSegIndex(roads) {
  const out = [];
  const feats = roads?.features || [];
  for (const f of feats) {
    if (f?.geometry?.type !== "LineString") continue;
    const c = f.geometry.coordinates || [];
    if (c.length < 2) continue;
    const lanes = Math.max(f.properties?.lanes || 2, 1);
    const width = f.properties?.width || lanes * 3.5;
    let len = 0;
    let vecE = 0;
    let vecN = 0;
    for (let i = 1; i < c.length; i++) {
      const dE = (c[i][0] - c[i - 1][0]) * 109640;
      const dN = (c[i][1] - c[i - 1][1]) * 111320;
      len += Math.hypot(dE, dN);
      vecE += dE;
      vecN += dN;
    }
    out.push({ lanes, width, segLen: Math.max(len, 1), vecE, vecN, pts: c });
  }
  return out;
}
export function assignLanes(vehicles, segIndex) {
  const out = new Map();
  if (!vehicles) return out;
  if (!segIndex || segIndex.length === 0) {
    for (const v of vehicles) out.set(v[0], { seg: { lanes: 2, width: 7 }, dir: 1, occ: 0, laneIdx: 0 });
    return out;
  }
  const first = [];
  const counts = new Map();
  for (const v of vehicles) {
    const idx = nearestSeg(v[3], v[2], segIndex);
    const hr = ((v[5] || 0) * Math.PI) / 180;
    const sg = segIndex[idx];
    const dir = (Math.cos(hr) * sg.vecE - Math.sin(hr) * sg.vecN) >= 0 ? 1 : -1;
    first.push({ id: v[0], segIdx: idx, dir });
    counts.set(idx, (counts.get(idx) || 0) + 1);
  }
  const occBy = new Map();
  for (const [k, c] of counts) {
    const sg = segIndex[k];
    occBy.set(k, c / ((sg.lanes * sg.segLen) / 7));
  }
  const ctr = new Map();
  for (const r of first) {
    const sg = segIndex[r.segIdx];
    const key = r.segIdx + ":" + r.dir;
    const li = (ctr.get(key) || 0) % Math.max(sg.lanes, 1);
    ctr.set(key, (ctr.get(key) || 0) + 1);
    out.set(r.id, { seg: sg, dir: r.dir, occ: occBy.get(r.segIdx) || 0, laneIdx: li });
  }
  return out;
}
