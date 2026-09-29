import assert from "node:assert";
import { GAMA_CYCLE_LEN, getGamaSignal, poleSignal, activePhase, phaseCountdown } from "../src/lib/data.js";

assert.strictEqual(GAMA_CYCLE_LEN, 112, "GAMA_CYCLE_LEN must be 112");

const mockSignals = [
  { cycle: 1, g1: 60, g2: 52 },
  { cycle: 2, g1: 50, g2: 62 },
];

// Cycle 1, Phase 1 Green (t=10s)
const s1 = getGamaSignal(mockSignals, 10);
assert.strictEqual(s1.gamaCycle, 1);
assert.strictEqual(s1.activePhase, 0);
assert.strictEqual(s1.axis_1.state, "green");
assert.strictEqual(s1.axis_2.state, "red");
assert.strictEqual(s1.remaining, 50);

// Cycle 1, Phase 1 Yellow (t=58s, 60-3=57 <= t < 60)
const s2 = getGamaSignal(mockSignals, 58);
assert.strictEqual(s2.activePhase, 0);
assert.strictEqual(s2.axis_1.state, "yellow");
assert.strictEqual(s2.axis_2.state, "red");
assert.strictEqual(s2.remaining, 2);

// Cycle 1, Phase 2 Green (t=70s)
const s3 = getGamaSignal(mockSignals, 70);
assert.strictEqual(s3.activePhase, 1);
assert.strictEqual(s3.axis_1.state, "red");
assert.strictEqual(s3.axis_2.state, "green");
assert.strictEqual(s3.remaining, 42);

// Cycle 1, Phase 2 Yellow (t=110s, 112-3=109 <= t < 112)
const s4 = getGamaSignal(mockSignals, 110);
assert.strictEqual(s4.activePhase, 1);
assert.strictEqual(s4.axis_1.state, "red");
assert.strictEqual(s4.axis_2.state, "yellow");
assert.strictEqual(s4.remaining, 2);

// Cycle 2 transitions at t=112s
const s5 = getGamaSignal(mockSignals, 112);
assert.strictEqual(s5.gamaCycle, 2);
assert.strictEqual(s5.activePhase, 0);
assert.strictEqual(s5.split.g1, 50);

// Backward compatibility check
assert.strictEqual(typeof poleSignal, "function");
assert.strictEqual(typeof activePhase, "function");
assert.strictEqual(typeof phaseCountdown, "function");

console.log("[signals.test] all assertions passed");
