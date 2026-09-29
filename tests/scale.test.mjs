import assert from "node:assert";
import { mppAt, exagg, mppEff, ROAD_W_M, VEH_LENS, VEH_WIDS } from "../src/lib/scale.js";

for (let z = 12; z <= 19; z++) assert(exagg(z) > 0, `exagg(${z}) > 0`);
for (let z = 12; z < 19; z++) assert(exagg(z) >= exagg(z + 1), `exagg ${z} >= ${z+1}`);

for (let z = 14; z <= 19; z++) {
  const m = mppEff(z);
  const roadPx = ROAD_W_M / m;
  for (const t of [0, 1, 2]) {
    const carW = Math.max(VEH_WIDS[t] / m, 1.2);
    assert(carW < roadPx, `z${z} type${t}: width ${carW.toFixed(2)} < road ${roadPx.toFixed(2)}`);
  }
}

for (let z = 14; z <= 19; z++) {
  const m = mppEff(z);
  if ([0, 1, 2].some((t) => VEH_LENS[t] / m < 1.6)) continue;
  const ratios = [0, 1, 2].map((t) => Math.max(VEH_LENS[t] / m, 1.6) / VEH_LENS[t]);
  for (const r of ratios) assert(Math.abs(r - ratios[0]) < 1e-9, `z${z}: length ratio preserved`);
}

for (let z = 14; z <= 19; z++) {
  const m = mppEff(z);
  for (const t of [0, 1, 2]) {
    const wid = Math.max(VEH_WIDS[t] / m, 1.2);
    assert(3.5 / m > wid, `z${z} type${t}: laneSep > width`);
  }
}

assert(Math.abs(mppAt(14) - 9.408) < 0.01, `mppAt(14)=${mppAt(14)}`);
console.log("[scale.test] all assertions passed");
