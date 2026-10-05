import assert from "node:assert";
import {
  VEHICLE_AREAS,
  DEFAULT_ZONE_AREA,
  CYCLE_DURATION,
  LOST_TIME,
  MIN_GREEN,
  AVAILABLE_GREEN,
  C_SATURATION,
  computeOccupancy,
  computePressure,
  allocateCbmpGreen,
  PRESETS,
} from "../src/lib/cbmp.js";

// Test 1: constants match GAMA spec
assert.deepStrictEqual(VEHICLE_AREAS, { moto: 1.5, car: 7.5, truck: 18.0 });
assert.strictEqual(DEFAULT_ZONE_AREA, 150.0);
assert.strictEqual(CYCLE_DURATION, 120);
assert.strictEqual(LOST_TIME, 8);
assert.strictEqual(MIN_GREEN, 10);
assert.strictEqual(AVAILABLE_GREEN, 92);
assert.strictEqual(C_SATURATION, 2.5);

// Test 2: basic occupancy (10 moto + 2 car = 15 + 15 = 30m2 over 150m2 zone)
assert.strictEqual(computeOccupancy({ moto: 10, car: 2, truck: 0 }), 0.2);

// Test 3: occupancy saturates at 1.0 and pressure subtracts downstream flow
assert.strictEqual(computeOccupancy(PRESETS.saturated.p1), 1.0);
assert.strictEqual(computePressure(0.5, 0.5), C_SATURATION * (0.5 - 0.7 * 0.5));
assert.strictEqual(computePressure(0.1, 0.9), 0);

// Test 4: balanced preset splits evenly 56/56 for both controllers
{
  const phi = computeOccupancy(PRESETS.balanced.p1);
  const gamma = computePressure(phi, 0);
  const cbmp = allocateCbmpGreen(gamma, gamma);
  assert.strictEqual(cbmp.g1, 56);
  assert.strictEqual(cbmp.g2, 56);
}

// Test 5: paradox preset — motorcycle swarm occlusion (26 west moto vs 18 north1 moto);
// CAO favours the larger occupied area (phi1 > phi2 so cbmp.g1 > cbmp.g2).
// No baseline count assertion: both phases are the same vehicle type so the
// baseline count ratio tracks the area ratio and the old base.g1<base.g2 assert is invalid.
{
  const phi1 = computeOccupancy(PRESETS.paradox.p1);
  const phi2 = computeOccupancy(PRESETS.paradox.p2);
  assert.ok(phi1 > phi2);
  const g1 = computePressure(phi1, 0);
  const g2 = computePressure(phi2, 0);
  const cbmp = allocateCbmpGreen(g1, g2);
  assert.ok(cbmp.g1 > cbmp.g2);
}

// Test 6: saturated preset — full phase takes max green (10 + 92 = 102s)
{
  const phi1 = computeOccupancy(PRESETS.saturated.p1);
  const phi2 = computeOccupancy(PRESETS.saturated.p2);
  const g1 = computePressure(phi1, 0);
  const g2 = computePressure(phi2, 0);
  const cbmp = allocateCbmpGreen(g1, g2);
  assert.strictEqual(cbmp.g1, 102);
  assert.strictEqual(cbmp.g2, 10);
  const idle = allocateCbmpGreen(0, 0);
  assert.strictEqual(idle.g1, 56);
  assert.strictEqual(idle.g2, 56);
}

console.log("[cbmp_math.test] all assertions passed");
