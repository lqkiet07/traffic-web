import assert from "node:assert";
import { GAMA_CYCLE_LEN, getGamaSignal } from "../src/lib/data.js";

const mockSignals = [
  { cycle: 1, g1: 100, g2: 12 }, // Log cycle 1 is actually applied in GAMA cycle 2
  { cycle: 2, g1: 34, g2: 78 },  // Log cycle 2 is applied in GAMA cycle 3
];

// Test 1: Cycle 1 (t=0..111s) must use initial default 56s/56s
const s0 = getGamaSignal(mockSignals, 0);
assert.strictEqual(s0.gamaCycle, 1);
assert.strictEqual(s0.split.g1, 56);
assert.strictEqual(s0.split.g2, 56);
assert.strictEqual(s0.axis_1.state, "green");

const s57 = getGamaSignal(mockSignals, 57);
assert.strictEqual(s57.gamaCycle, 1);
assert.strictEqual(s57.axis_1.state, "red");
assert.strictEqual(s57.axis_2.state, "green");

// Test 2: Cycle 2 (t=112..223s) must use split from log cycle 1 (g1=100, g2=12)
const s112 = getGamaSignal(mockSignals, 112);
assert.strictEqual(s112.gamaCycle, 2);
assert.strictEqual(s112.split.g1, 100);
assert.strictEqual(s112.split.g2, 12);
assert.strictEqual(s112.axis_1.state, "green");

// Test 3: At t=198 (Frame in user's image at 32NVL, tInCycle=86s < 100s)
const s198 = getGamaSignal(mockSignals, 198);
assert.strictEqual(s198.gamaCycle, 2);
assert.strictEqual(s198.axis_1.state, "green");

// Test 4: At t=213 (tInCycle = 213 - 112 = 101s >= 100s -> axis_1 turns red, axis_2 green)
const s213 = getGamaSignal(mockSignals, 213);
assert.strictEqual(s213.gamaCycle, 2);
assert.strictEqual(s213.axis_1.state, "red");
assert.strictEqual(s213.axis_2.state, "green");

console.log("[signal_timing.test] all assertions passed");
