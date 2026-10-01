// tests/kpi_rep1.test.mjs
import assert from "node:assert";
import { readFileSync } from "node:fs";

const kpi = JSON.parse(readFileSync("public/data/kpi_summary.json", "utf8"));
const jk = JSON.parse(readFileSync("public/data/junction_kpis.json", "utf8"));

const m = kpi.Medium_900;
assert.strictEqual(m.cycles.length, 64, "Medium_900 rep1 1:1 = 64 cycles");
assert.deepStrictEqual(m.cycles, Array.from({ length: 64 }, (_, i) => i + 1));
for (const k of ["delay", "queue", "throughput"]) {
  assert.strictEqual(m.proposed[k].length, 64, `proposed.${k} 64 pts`);
  assert.strictEqual(m.baseline[k].length, 64, `baseline.${k} 64 pts`);
}

const j1 = Object.values(jk.cao.Medium_900).flatMap((arr) => arr.filter((e) => e.cycle === 1));
const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const q = avg(j1.map((e) => e.queue));
assert(Math.abs(q - m.proposed.queue[0]) < 1e-3, `kpi matches junction rep1 (q=${q})`);

assert.strictEqual(kpi.Low_400.cycles.length, 64, "Low legacy untouched");
assert.strictEqual(kpi.High_1400.cycles.length, 64, "High legacy untouched");

console.log("[kpi_rep1.test] all assertions passed");
