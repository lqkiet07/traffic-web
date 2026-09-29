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

// GAMA cadence (112s) rolls to cycle 11 at t=1120, before web cycle 10 ends.
assert.strictEqual(getGamaSignal([], 1190).gamaCycle, 11);
assert.strictEqual(kpiForSimTime(1190).cycle, 11);
assert.strictEqual(kpiForSimTime(1190).marker, "web11");

// Regression lock: old logic (web cycle 10) shows stale cycle 10 at t=1190.
assert.strictEqual(latestCycleEntry(mockKpis, 10).cycle, 10);
assert.notStrictEqual(latestCycleEntry(mockKpis, 10).cycle, getGamaSignal([], 1190).gamaCycle);

console.log("[inspector_cycle.test] all assertions passed");
