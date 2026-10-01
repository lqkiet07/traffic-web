// tests/clock_contract.test.mjs
import assert from "node:assert";
import { CYCLE_LEN, GAMA_CYCLE_LEN, getGamaSignal } from "../src/lib/data.js";

assert.strictEqual(CYCLE_LEN, 120, "web trajectory clock stays 120s");
assert.strictEqual(GAMA_CYCLE_LEN, 112, "GAMA KPI clock stays 112s");

const entries = [{ cycle: 1, g1: 60, g2: 52 }];
const s1 = getGamaSignal(entries, 10);
assert.strictEqual(s1.gamaCycle, 1, "t=10 -> cycle 1");
assert.strictEqual(s1.activePhase, 0, "phase 1 green first");
assert.strictEqual(s1.axis_1.state, "green", "axis_1 green in phase 1");
assert.strictEqual(s1.axis_2.state, "red", "axis_2 red in phase 1");

const s2 = getGamaSignal(entries, 112);
assert.strictEqual(s2.gamaCycle, 2, "t=112 wraps to cycle 2");
assert.strictEqual(s2.split.g1, 60, "cycle 2 runs logged cycle-1 split");

const s3 = getGamaSignal(entries, 99999);
assert.strictEqual(s3.split.g1, 60, "overflow falls back to last entry");

const s4 = getGamaSignal([], -5);
assert.strictEqual(s4.gamaCycle, 1, "negative time guards to cycle 1");

console.log("[clock_contract.test] all assertions passed");
