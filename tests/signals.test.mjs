import assert from "node:assert";
import { GAMA_CYCLE_LEN, getGamaSignal, poleSignal, activePhase, phaseCountdown } from "../src/lib/data.js";

assert.strictEqual(GAMA_CYCLE_LEN, 112, "GAMA_CYCLE_LEN must be 112");

const mockSignals = [
  { cycle: 1, g1: 60, g2: 52 },
  { cycle: 2, g1: 50, g2: 62 },
];

// Cycle 1 runs initial default 56/56
// at t=10s
const s1 = getGamaSignal(mockSignals, 10);
assert.strictEqual(s1.gamaCycle, 1);
assert.strictEqual(s1.activePhase, 0);
assert.strictEqual(s1.axis_1.state, "green");
assert.strictEqual(s1.axis_2.state, "red");
assert.strictEqual(s1.remaining, 46);

// at t=58s
const s2 = getGamaSignal(mockSignals, 58);
assert.strictEqual(s2.gamaCycle, 1);
assert.strictEqual(s2.activePhase, 1);
assert.strictEqual(s2.axis_1.state, "red");
assert.strictEqual(s2.axis_2.state, "green");
assert.strictEqual(s2.remaining, 54);

// Cycle 2 runs mockSignals[0] (cycle: 1, g1: 60, g2: 52)
// at t=112s
const s3 = getGamaSignal(mockSignals, 112);
assert.strictEqual(s3.gamaCycle, 2);
assert.strictEqual(s3.activePhase, 0);
assert.strictEqual(s3.axis_1.state, "green");
assert.strictEqual(s3.axis_2.state, "red");
assert.strictEqual(s3.split.g1, 60);

// at t=175s: (tInCycle = 175 - 112 = 63s >= 60s)
const s4 = getGamaSignal(mockSignals, 175);
assert.strictEqual(s4.gamaCycle, 2);
assert.strictEqual(s4.activePhase, 1);
assert.strictEqual(s4.axis_1.state, "red");
assert.strictEqual(s4.axis_2.state, "green");

// Backward compatibility check
assert.strictEqual(typeof poleSignal, "function");
assert.strictEqual(typeof activePhase, "function");
assert.strictEqual(typeof phaseCountdown, "function");

console.log("[signals.test] all assertions passed");
