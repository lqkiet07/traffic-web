// tests/player_logic.test.mjs
import assert from "node:assert";
import { shouldStopOnWrap, clampCycle, globalSimTimeFor } from "../src/hooks/useCyclePlayer.js";

assert.strictEqual(shouldStopOnWrap(60, 60), true, "stops at last cycle");
assert.strictEqual(shouldStopOnWrap(59, 60), false, "continues mid-replay");
assert.strictEqual(clampCycle(99, 60), 60, "clamps high");
assert.strictEqual(clampCycle(-3, 60), 1, "clamps low");
assert.strictEqual(globalSimTimeFor(1, 0), 0, "origin");
assert.strictEqual(globalSimTimeFor(2, 10), 130, "(2-1)*120+10");

console.log("[player_logic.test] all assertions passed");
