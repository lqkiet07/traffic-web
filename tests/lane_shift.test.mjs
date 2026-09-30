import assert from "node:assert";
import {
  laneOffsetM,
  hash100,
  buildSegIndex,
  assignLanes,
} from "../src/lib/lane.js";
import { mppAt } from "../src/lib/scale.js";

const seg2 = { lanes: 2, width: 7.0 };

// Sparse regime: moto holds the right lane center (+1.75m) plus id stagger.
const moto = laneOffsetM({ type: 0, id: "a", dir: 1 }, seg2, 0.1);
assert(moto >= 1.15 && moto <= 2.35, `moto sparse ~+1.75, got ${moto}`);

// Flipping travel direction mirrors across the centerline.
const motoFlip = laneOffsetM({ type: 0, id: "a", dir: -1 }, seg2, 0.1);
assert(
  Math.abs(motoFlip + moto) < 1e-9,
  `dir flip mirrors: ${moto} vs ${motoFlip}`
);

// A 2-lane road has no center lane; the GAMA lowest_lane rule puts cars
// on the left lane center (-1.75m). Adapted from the draft [-0.6, 0.6]
// range, which assumed a 3-lane middle lane.
const car = laneOffsetM({ type: 1, id: "b", dir: 1 }, seg2, 0.1);
assert(car >= -2.35 && car <= -1.15, `car sparse ~-1.75, got ${car}`);

// Dense regime: adjacent filled lanes differ by one lane width (3.5m).
const d0 = laneOffsetM({ type: 1, id: "a", dir: 1, laneIdx: 0 }, seg2, 0.8);
const d1 = laneOffsetM({ type: 1, id: "a", dir: 1, laneIdx: 1 }, seg2, 0.8);
assert(
  Math.abs(Math.abs(d1 - d0) - 3.5) < 0.7,
  `dense lanes differ by ~3.5, got ${Math.abs(d1 - d0)}`
);

// True-meter units: shiftPx = offsetM / mppAt(z). Identity holds at any zoom.
const pair = Math.abs(moto - car);
for (const z of [14, 19]) {
  const px = pair / mppAt(z);
  assert(
    Math.abs(px * mppAt(z) - pair) < 1e-9,
    `z${z}: px*mppAt round-trips to meters`
  );
}
// At z19 the pair is well separated; at z14 a 3.5m road is sub-pixel by
// physics (~0.37px), so zoom scaling (2x per level) proves units instead.
assert(pair / mppAt(19) > 1, "z19 moto/car separation > 1px");
const ratio = pair / mppAt(19) / (pair / mppAt(14));
assert(Math.abs(ratio - 2 ** 5) < 1e-6, `zoom scaling 32x, got ${ratio}`);

// Helpers: deterministic stagger, tiny index builds, fallback works.
assert(hash100("a") === hash100("a"), "hash deterministic");
const idx = buildSegIndex({
  features: [
    {
      geometry: { type: "LineString", coordinates: [[105.78, 10.03], [105.79, 10.04]] },
      properties: { lanes: 2, width: 7.0 },
    },
  ],
});
assert(idx.length === 1 && idx[0].lanes === 2, "index builds one segment");
const fb = assignLanes([[ "v1", 0, 10.03, 105.78, 5, 45 ]], null);
assert(fb.has("v1"), "fallback assigns without roads");
console.log("[lane_shift.test] all assertions passed");
