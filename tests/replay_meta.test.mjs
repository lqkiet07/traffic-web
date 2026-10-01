import assert from "node:assert";
import { formatClock, replayAvailable } from "../src/lib/data.js";

assert.strictEqual(formatClock(7200), "02:00:00", "60x120s legacy total");
assert.strictEqual(formatClock(7320), "02:02:00", "61x120s replay total");
assert.strictEqual(formatClock(0), "00:00:00", "zero guard");

assert.strictEqual(replayAvailable("cao", "Medium_900"), true, "current replay data");
assert.strictEqual(replayAvailable("baseline", "Medium_900"), false, "no baseline traj");
assert.strictEqual(replayAvailable("cao", "Low_400"), false, "no Low traj");

console.log("[replay_meta.test] all assertions passed");
