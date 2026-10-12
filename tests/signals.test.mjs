import assert from "node:assert";
import { GAMA_CYCLE_LEN, YELLOW_TIME, getGamaSignal } from "../src/lib/data.js";

assert.strictEqual(GAMA_CYCLE_LEN, 120, "GAMA_CYCLE_LEN must be 120");
assert.strictEqual(YELLOW_TIME, 4, "YELLOW_TIME must be 4");

const mockSignals = [
  { cycle: 1, g1: 60, g2: 52 },
  { cycle: 2, g1: 50, g2: 62 },
];

// Cycle 1 runs default 56/56 with 4s yellow phases (56 + 4 + 56 + 4 = 120s)
// at t=10s: Phase 1 green
const s1 = getGamaSignal(mockSignals, 10);
assert.strictEqual(s1.gamaCycle, 1);
assert.strictEqual(s1.activePhase, 0);
assert.strictEqual(s1.isYellow, false);
assert.strictEqual(s1.axis_1.state, "green");
assert.strictEqual(s1.axis_1.secs, 46);
assert.strictEqual(s1.axis_2.state, "red");
assert.strictEqual(s1.axis_2.secs, 50);
assert.strictEqual(s1.remaining, 46);

// at t=58s: Phase 1 yellow (remaining 2s)
const s2 = getGamaSignal(mockSignals, 58);
assert.strictEqual(s2.gamaCycle, 1);
assert.strictEqual(s2.activePhase, 0);
assert.strictEqual(s2.isYellow, true);
assert.strictEqual(s2.axis_1.state, "yellow");
assert.strictEqual(s2.axis_1.secs, 2);
assert.strictEqual(s2.axis_2.state, "red");
assert.strictEqual(s2.axis_2.secs, 2);
assert.strictEqual(s2.remaining, 2);

// at t=62s: Phase 2 green
const s3 = getGamaSignal(mockSignals, 62);
assert.strictEqual(s3.gamaCycle, 1);
assert.strictEqual(s3.activePhase, 1);
assert.strictEqual(s3.isYellow, false);
assert.strictEqual(s3.axis_1.state, "red");
assert.strictEqual(s3.axis_1.secs, 58);
assert.strictEqual(s3.axis_2.state, "green");
assert.strictEqual(s3.axis_2.secs, 54);
assert.strictEqual(s3.remaining, 54);

// at t=118s: Phase 2 yellow (remaining 2s)
const s4 = getGamaSignal(mockSignals, 118);
assert.strictEqual(s4.gamaCycle, 1);
assert.strictEqual(s4.activePhase, 1);
assert.strictEqual(s4.isYellow, true);
assert.strictEqual(s4.axis_1.state, "red");
assert.strictEqual(s4.axis_1.secs, 2);
assert.strictEqual(s4.axis_2.state, "yellow");
assert.strictEqual(s4.axis_2.secs, 2);
assert.strictEqual(s4.remaining, 2);

// at t=120s: Cycle 2 wraps to split from logged cycle 1 (g1: 60, g2: 52)
const s5 = getGamaSignal(mockSignals, 120);
assert.strictEqual(s5.gamaCycle, 2);
assert.strictEqual(s5.activePhase, 0);
assert.strictEqual(s5.isYellow, false);
assert.strictEqual(s5.axis_1.state, "green");
assert.strictEqual(s5.axis_1.secs, 60);
assert.strictEqual(s5.axis_2.state, "red");
assert.strictEqual(s5.axis_2.secs, 64);
assert.strictEqual(s5.remaining, 60);
assert.strictEqual(s5.split.g1, 60);
assert.strictEqual(s5.split.g2, 52);

console.log("[signals.test] all assertions passed");
