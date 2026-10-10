// tests/kpi_rep1.test.mjs
import assert from "node:assert";
import { readFileSync } from "node:fs";

const kpi = JSON.parse(readFileSync("public/data/kpi_summary.json", "utf8"));
const jk = JSON.parse(readFileSync("public/data/junction_kpis.json", "utf8"));

const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const scenarios = ["Low_400", "Medium_900", "High_1400"];

for (const sc of scenarios) {
  const item = kpi[sc];
  assert(item, `Scenario ${sc} exists in kpi_summary.json`);
  assert.strictEqual(item.cycles.length, 64, `${sc} cycles length === 64`);
  assert.deepStrictEqual(item.cycles, Array.from({ length: 64 }, (_, i) => i + 1), `${sc} cycles match 1..64`);

  for (const k of ["delay", "queue", "throughput"]) {
    assert.strictEqual(item.proposed[k].length, 64, `${sc} proposed.${k} length === 64`);
    assert.strictEqual(item.baseline[k].length, 64, `${sc} baseline.${k} length === 64`);
  }

  if (jk.cao && jk.cao[sc]) {
    const j1 = Object.values(jk.cao[sc]).flatMap((arr) => arr.filter((e) => e.cycle === 1));
    if (j1.length > 0) {
      const q = avg(j1.map((e) => e.queue));
      assert(
        Math.abs(q - item.proposed.queue[0]) < 1e-3,
        `${sc} kpi matches junction rep1 cycle 1 queue (jk=${q}, kpi=${item.proposed.queue[0]})`
      );
    }
  }
}

// Core behavioral assertions:
const qCaoHigh = avg(kpi.High_1400.proposed.queue);
const qBaseHigh = avg(kpi.High_1400.baseline.queue);
assert(
  qCaoHigh < qBaseHigh,
  `High_1400 CAO average queue (${qCaoHigh}) must be less than Baseline average queue (${qBaseHigh})`
);

assert(
  kpi.High_1400.proposed.throughput[0] < 60,
  `High_1400 proposed throughput[0] must be < 60 (got ${kpi.High_1400.proposed.throughput[0]})`
);

console.log("[kpi_rep1.test] all assertions passed");

