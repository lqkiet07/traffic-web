import assert from "node:assert";
import { GAMA_CYCLE_LEN, getGamaSignal } from "../src/lib/data.js";

const mockSignals = [
  { cycle: 1, g1: 80, g2: 32 }, // g1 + g2 = 112
  { cycle: 2, g1: 60, g2: 52 }, // g1 + g2 = 112
  { cycle: 10, g1: 70, g2: 42 },
];

// 1. GAMA_CYCLE_LEN === 112
assert.strictEqual(GAMA_CYCLE_LEN, 112);

// 2. At globalSimTime = 0: gamaCycle === 1, axis_1 = green, axis_2 = red, activePhase = 0
const s0 = getGamaSignal(mockSignals, 0);
assert.strictEqual(s0.gamaCycle, 1);
assert.strictEqual(s0.axis_1.state, "green");
assert.strictEqual(s0.axis_2.state, "red");
assert.strictEqual(s0.activePhase, 0);

// 3. At t = 79.5 (just before g1 = 80): axis_1 STILL green (no amber zone)
const s78 = getGamaSignal(mockSignals, 79.5);
assert.strictEqual(s78.axis_1.state, "green");
assert.strictEqual(s78.axis_2.state, "red");

// 3b. At t = 80 (g1 boundary): axis_1 = red, axis_2 = green
const s80 = getGamaSignal(mockSignals, 80);
assert.strictEqual(s80.axis_1.state, "red");
assert.strictEqual(s80.axis_2.state, "green");
assert.strictEqual(s80.activePhase, 1);

// 4. At globalSimTime = 81 (in [80, 80 + 32 - 3)): axis_1 = red, axis_2 = green, activePhase = 1
const s81 = getGamaSignal(mockSignals, 81);
assert.strictEqual(s81.axis_1.state, "red");
assert.strictEqual(s81.axis_2.state, "green");
assert.strictEqual(s81.activePhase, 1);

// 5. At t = 111.5 (just before cycle end): axis_2 STILL green
const s110 = getGamaSignal(mockSignals, 111.5);
assert.strictEqual(s110.axis_1.state, "red");
assert.strictEqual(s110.axis_2.state, "green");

// 6. At globalSimTime = 112: gamaCycle === 2, axis_1 = green, axis_2 = red (no 8s freeze/drift)
const s112 = getGamaSignal(mockSignals, 112);
assert.strictEqual(s112.gamaCycle, 2);
assert.strictEqual(s112.axis_1.state, "green");
assert.strictEqual(s112.axis_2.state, "red");

// 7. At globalSimTime = 112 * 9 = 1008: gamaCycle === 10, uses cycle 10 split (g1: 70, g2: 42)
const s1008 = getGamaSignal(mockSignals, 1008);
assert.strictEqual(s1008.gamaCycle, 10);
assert.strictEqual(s1008.split.g1, 70);
assert.strictEqual(s1008.split.g2, 42);

// 8. Offset test: offsetS = 5 at globalSimTime = 0 acts as t = 5
const sOffset = getGamaSignal(mockSignals, 0, 5);
const sAt5 = getGamaSignal(mockSignals, 5, 0);
assert.deepStrictEqual(sOffset, sAt5);
assert.strictEqual(sOffset.remaining, 75);
assert.strictEqual(sOffset.axis_1.state, "green");

// 9. Accumulated-time lookup with non-112 chunk: c1 dur 120, c2 dur 112
const accSignals = [
  { cycle: 1, g1: 90, g2: 30 },
  { cycle: 2, g1: 30, g2: 82 },
];
const s115 = getGamaSignal(accSignals, 115);
assert.strictEqual(s115.gamaCycle, 1);
assert.strictEqual(s115.split.g1, 90);
assert.strictEqual(s115.axis_1.state, "red");
assert.strictEqual(s115.axis_2.state, "green");

// 10. t=125 falls in second logged chunk
const s125 = getGamaSignal(accSignals, 125);
assert.strictEqual(s125.gamaCycle, 2);
assert.strictEqual(s125.split.g1, 30);
assert.strictEqual(s125.axis_1.state, "green");
assert.strictEqual(s125.axis_2.state, "red");

// 11. Beyond all logged time: wraps within last entry, never stuck red/red
const sFar = getGamaSignal(accSignals, 10000);
assert.strictEqual(sFar.gamaCycle, 2);
const oneGreen = [sFar.axis_1.state, sFar.axis_2.state].filter((s) => s === "green").length;
assert.strictEqual(oneGreen, 1);

console.log("[signal_timing.test] all assertions passed");
