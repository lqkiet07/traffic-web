import assert from "node:assert";
import fs from "node:fs";
import { getGamaSignal, V_INDEX, STOPPED_SPEED } from "../src/lib/data.js";

const cycle = JSON.parse(fs.readFileSync(new URL("../public/data/trajectories/cao/cycle_1.json", import.meta.url)));
const signals = JSON.parse(fs.readFileSync(new URL("../public/data/signals_cao.json", import.meta.url)));
const polesByCode = JSON.parse(fs.readFileSync(new URL("../public/data/signals_poles.json", import.meta.url)));

const poles = [];
for (const [code, list] of Object.entries(polesByCode))
  for (const p of list) poles.push({ code, axis: p.axis, lat: p.lat, lng: p.lng });
assert.ok(poles.length > 0, "expected poles");

let correct = 0;
let total = 0;
for (const frame of cycle.frames) {
  const t = frame.time;
  for (const v of frame.vehicles) {
    if (v[V_INDEX.SPEED] >= STOPPED_SPEED) continue;
    let best = null;
    let bestD2 = 40 * 40;
    for (const p of poles) {
      const dx = (v[V_INDEX.LNG] - p.lng) * 109640;
      const dy = (v[V_INDEX.LAT] - p.lat) * 111320;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = p; }
    }
    if (!best) continue;
    total++;
    const sig = getGamaSignal(signals[best.code], t, 0);
    if (sig[best.axis].state === "red") correct++;
  }
}

const ratio = total === 0 ? 0 : correct / total;
console.log(`[alignment] stopped-near-red ratio = ${ratio.toFixed(3)} (${correct}/${total})`);
assert.ok(total > 0, "expected stopped vehicles near poles");
assert.ok(ratio > 0.5, `stopped-near-red ratio ${ratio} should beat coin flip`);
console.log("[alignment] PASS: stopped vehicles cluster at red poles");
