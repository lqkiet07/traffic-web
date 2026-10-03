import assert from "node:assert";
import { formatClock, replayAvailable } from "../src/lib/data.js";

assert.strictEqual(formatClock(7200), "02:00:00", "60x120s legacy total");
assert.strictEqual(formatClock(7320), "02:02:00", "61x120s replay total");
assert.strictEqual(formatClock(0), "00:00:00", "zero guard");

assert.strictEqual(replayAvailable("cao", "Low_400"), true, "cao x Low");
assert.strictEqual(replayAvailable("cao", "Medium_900"), true, "cao x Medium");
assert.strictEqual(replayAvailable("cao", "High_1400"), true, "cao x High");
assert.strictEqual(replayAvailable("baseline", "Low_400"), true, "baseline x Low");
assert.strictEqual(replayAvailable("baseline", "Medium_900"), true, "baseline x Medium");
assert.strictEqual(replayAvailable("baseline", "High_1400"), true, "baseline x High");

console.log("[replay_meta.test] all assertions passed");
