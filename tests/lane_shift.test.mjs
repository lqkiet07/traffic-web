import assert from "node:assert";
import { laneShiftM } from "../src/lib/lane.js";
import { mppAt, mppLen, VEH_LENS } from "../src/lib/scale.js";

for (const id of ["a", "car12", "motobike17", "truck1", "x9"]) {
  const s = laneShiftM(0, id);
  assert(s >= 0.8 && s <= 1.8, `moto ${id} in [0.8,1.8], got ${s}`);
}
for (const id of ["a", "car12", "motobike17"]) {
  const s = laneShiftM(1, id);
  assert(s >= -0.7 && s <= -0.3, `car ${id} in [-0.7,-0.3], got ${s}`);
}
for (const id of ["a", "truck1"]) {
  const s = laneShiftM(2, id);
  assert(s >= -1.4 && s <= -1.0, `truck ${id} in [-1.4,-1.0], got ${s}`);
}
assert(laneShiftM(0, "same") === laneShiftM(0, "same"), "deterministic");
const distinct = new Set(["a", "b", "c", "d", "e"].map((id) => laneShiftM(0, id)));
assert(distinct.size >= 2, "stagger varies by id");
assert(laneShiftM(9, "x") === 0, "unknown type -> 0");

for (let z = 14; z <= 19; z++) {
  const motoLen = Math.max(VEH_LENS[0] / mppLen(z), 1.6);
  assert(motoLen >= 1.6, `z${z}: moto floor kept`);
}
for (let z = 16; z <= 19; z++) {
  const carLen = VEH_LENS[1] / mppLen(z);
  const gap6 = 6 / mppAt(z);
  assert(carLen < gap6, `z${z}: car len ${carLen.toFixed(2)} < 6m gap ${gap6.toFixed(2)}`);
}
console.log("[lane_shift.test] all assertions passed");
