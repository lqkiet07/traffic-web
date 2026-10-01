// tests/interpolate_maps_mismatch.test.mjs
import assert from "node:assert";
import { interpolateVehicles } from "../src/lib/data.js";

const V = (id, speed = 5) => [id, 0, 10.03, 105.76, speed, 90];
const frames = [
  { time: 0, vehicles: [V("a")] },
  { time: 2, vehicles: [V("a")] },
  { time: 4, vehicles: [V("a")] },
];

const staleMaps = [new Map([["a", frames[0].vehicles[0]]])];
const out = interpolateVehicles(frames, 3, staleMaps);
assert(Array.isArray(out) && out.length === 1, "falls back when maps shorter than frames");

const none = interpolateVehicles(frames, 3, []);
assert(none.length === 1, "empty maps falls back");

console.log("[interpolate_maps_mismatch.test] all assertions passed");
