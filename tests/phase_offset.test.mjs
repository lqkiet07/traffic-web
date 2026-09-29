import assert from "node:assert";
import fs from "node:fs";
const src = fs.readFileSync(new URL("../src/hooks/usePhaseOffset.js", import.meta.url), "utf8");
assert(src.includes('const KEY = "trafficdt.phaseOffsetS.v2"'), "v2 key present");
assert(!src.includes('const KEY = "trafficdt.phaseOffsetS"'), "old key gone");
assert(src.includes("Math.min(Math.max"), "clamp kept");
assert(src.includes("set(0)"), "reset kept");
console.log("[phase_offset.test] all assertions passed");
