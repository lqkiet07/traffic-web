import assert from "node:assert";
import { inferPhaseFromFlow } from "../src/lib/flow.js";

const C = { lat: 10.022373, lng: 105.763055 };
const V = (id, lat, lng, speed, heading) => [id, 0, lat, lng, speed, heading];

const nsFlow = [V("a", C.lat + 0.0002, C.lng, 8, 0), V("b", C.lat - 0.0002, C.lng, 0, 90)];
assert(inferPhaseFromFlow(nsFlow, C) === 0, "NS flowing -> phase 0");

const ewFlow = [V("a", C.lat, C.lng + 0.0002, 0, 0), V("b", C.lat, C.lng - 0.0002, 8, 90)];
assert(inferPhaseFromFlow(ewFlow, C) === 1, "EW flowing -> phase 1");

assert(inferPhaseFromFlow([], C) === null, "empty -> null");
assert(inferPhaseFromFlow(nsFlow, null) === null, "no center -> null");

const tie = [V("a", C.lat + 0.0002, C.lng, 5, 0), V("b", C.lat, C.lng + 0.0002, 5, 90)];
assert(inferPhaseFromFlow(tie, C) === null, "tie -> null (schedule fallback)");

const far = [V("a", C.lat + 0.01, C.lng, 20, 0)];
assert(inferPhaseFromFlow(far, C) === null, "500m+ away ignored -> null");

const stopped = [V("a", C.lat + 0.0002, C.lng, 0, 0), V("b", C.lat, C.lng + 0.0002, 0, 90)];
assert(inferPhaseFromFlow(stopped, C) === null, "all stopped -> null");

console.log("[flow_phase.test] all assertions passed");
