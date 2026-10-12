import assert from "node:assert";
import { GAMA_CYCLE_LEN, getGamaSignal } from "../src/lib/data.js";

const mockSignals = [
  { cycle: 1, g1: 100, g2: 12 }, // Log cycle 1 is actually applied in GAMA cycle 2
  { cycle: 2, g1: 34, g2: 78 },  // Log cycle 2 is applied in GAMA cycle 3
];

// Test 1: Cycle 1 uses initial default 56s/56s with 4s yellow
const s0 = getGamaSignal(mockSignals, 0);
assert.strictEqual(s0.gamaCycle, 1);
assert.strictEqual(s0.split.g1, 56);
assert.strictEqual(s0.split.g2, 56);
assert.strictEqual(s0.axis_1.state, "green");

// t=57: inside yellow phase 1 (56..60s) -> axis_1 yellow, axis_2 red
const s57 = getGamaSignal(mockSignals, 57);
assert.strictEqual(s57.gamaCycle, 1);
assert.strictEqual(s57.axis_1.state, "yellow");
assert.strictEqual(s57.axis_2.state, "red");

// t=62: inside phase 2 green (60..116s) -> axis_1 red, axis_2 green
const s62 = getGamaSignal(mockSignals, 62);
assert.strictEqual(s62.gamaCycle, 1);
assert.strictEqual(s62.axis_1.state, "red");
assert.strictEqual(s62.axis_2.state, "green");

// Test 2: Cycle 2 starts at t=120 (120..240s) using split from log cycle 1 (g1=100, g2=12, yellow=4)
const s120 = getGamaSignal(mockSignals, 120);
assert.strictEqual(s120.gamaCycle, 2);
assert.strictEqual(s120.split.g1, 100);
assert.strictEqual(s120.split.g2, 12);
assert.strictEqual(s120.axis_1.state, "green");

// Test 3: At t=198 (inside phase 1 green: tInCycle = 78s < 100s)
const s198 = getGamaSignal(mockSignals, 198);
assert.strictEqual(s198.gamaCycle, 2);
assert.strictEqual(s198.axis_1.state, "green");

// Test 4: At t=222 (inside phase 1 yellow: tInCycle = 102s >= 100s and < 104s)
const s222 = getGamaSignal(mockSignals, 222);
assert.strictEqual(s222.gamaCycle, 2);
assert.strictEqual(s222.axis_1.state, "yellow");
assert.strictEqual(s222.axis_2.state, "red");

// Test 5: At t=225 (inside phase 2 green: tInCycle = 105s >= 104s and < 116s)
const s225 = getGamaSignal(mockSignals, 225);
assert.strictEqual(s225.gamaCycle, 2);
assert.strictEqual(s225.axis_1.state, "red");
assert.strictEqual(s225.axis_2.state, "green");

console.log("[signal_timing.test] all assertions passed");
