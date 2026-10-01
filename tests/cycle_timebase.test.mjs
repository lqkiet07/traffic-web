// tests/cycle_timebase.test.mjs
import assert from "node:assert";
import { kpiIndexForTime, chartCycleForTime, isStubChunk } from "../src/lib/data.js";

assert.strictEqual(kpiIndexForTime(0, 64), 0, "t=0 first row");
assert.strictEqual(kpiIndexForTime(111.9, 64), 0, "inside cycle 1");
assert.strictEqual(kpiIndexForTime(112, 64), 1, "cycle boundary");
assert.strictEqual(kpiIndexForTime(7199, 64), 63, "end clamps to last row");
assert.strictEqual(kpiIndexForTime(-5, 64), 0, "negative guards");
assert.strictEqual(kpiIndexForTime(0, 0), 0, "empty guards");

assert.strictEqual(chartCycleForTime(0, 64), 1, "cursor starts at 1");
assert.strictEqual(chartCycleForTime(7199, 64), 64, "end clamps to last point");
assert.strictEqual(chartCycleForTime(60 * 120, 64), 64, "7200s clamps, never 65");

assert.strictEqual(isStubChunk([]), true, "empty is stub");
assert.strictEqual(isStubChunk([{ time: 0 }]), true, "single frame is stub");
assert.strictEqual(isStubChunk([{ time: 0 }, { time: 2 }]), false, "two frames play");

console.log("[cycle_timebase.test] all assertions passed");
