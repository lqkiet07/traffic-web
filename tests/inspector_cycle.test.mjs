import assert from "node:assert";
import { getGamaSignal, latestCycleEntry } from "../src/lib/data.js";

const mockKpis = [
  { cycle: 10, marker: "web10" },
  { cycle: 11, marker: "web11" },
];

// New App logic: KPI lookup locked to the GAMA cycle.
function kpiForSimTime(globalSimTime) {
  const gamaCycle = getGamaSignal([], globalSimTime).gamaCycle;
  return latestCycleEntry(mockKpis, gamaCycle);
}

// Web cycle 10 spans globalSimTime 1080..1200 (120s cadence).
assert.strictEqual(getGamaSignal([], 1090).gamaCycle, 10);
assert.strictEqual(kpiForSimTime(1090).cycle, 10);
assert.strictEqual(kpiForSimTime(1090).marker, "web10");

// At t=1205, rolls to cycle 11.
assert.strictEqual(getGamaSignal([], 1205).gamaCycle, 11);
assert.strictEqual(kpiForSimTime(1205).cycle, 11);
assert.strictEqual(kpiForSimTime(1205).marker, "web11");

// Regression lock: cycle 10 lookup differs from cycle at t=1205.
assert.strictEqual(latestCycleEntry(mockKpis, 10).cycle, 10);
assert.notStrictEqual(latestCycleEntry(mockKpis, 10).cycle, getGamaSignal([], 1205).gamaCycle);

console.log("[inspector_cycle.test] all assertions passed");
