import assert from "node:assert";
import {
  applyHomography,
  invertHomography,
  computeIpmOccupancy,
  VEHICLE_AREAS,
} from "../src/lib/homography.js";

// Helper for approximate float comparison
function assertNear(actual, expected, eps = 1e-6, message = "") {
  assert.ok(
    Math.abs(actual - expected) < eps,
    `${message} Expected ${expected} +/- ${eps}, got ${actual}`
  );
}

// ----------------------------------------------------
// 1. VEHICLE_AREAS constant export
// ----------------------------------------------------
assert.deepStrictEqual(VEHICLE_AREAS, { moto: 1.5, car: 7.5, truck: 18.0 });

// ----------------------------------------------------
// 2. applyHomography
// ----------------------------------------------------
{
  // Identity matrix
  const I = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const ptIdentity = applyHomography(I, [15, 25]);
  assert.deepStrictEqual(ptIdentity, [15, 25]);

  // Scaling + Translation
  const H_affine = [
    [2, 0, 10],
    [0, 3, 20],
    [0, 0, 1],
  ];
  const ptAffine = applyHomography(H_affine, [5, 4]);
  // x' = 2*5 + 10 = 20, y' = 3*4 + 20 = 32, w' = 1
  assert.deepStrictEqual(ptAffine, [20, 32]);

  // Perspective transformation with w' != 1
  const H_persp = [
    [1, 0, 0],
    [0, 1, 0],
    [0.01, 0.02, 1],
  ];
  // for [10, 20]:
  // x' = 10, y' = 20, w' = 0.01*10 + 0.02*20 + 1 = 1.5
  // x_out = 10/1.5 = 6.666667, y_out = 20/1.5 = 13.333333
  const [px, py] = applyHomography(H_persp, [10, 20]);
  assertNear(px, 10 / 1.5, 1e-6, "perspective x");
  assertNear(py, 20 / 1.5, 1e-6, "perspective y");

  // Degenerate / horizon point where w' <= 1e-8
  const H_zero_w = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ];
  const ptDegenerate = applyHomography(H_zero_w, [10, 20]);
  assert.deepStrictEqual(ptDegenerate, [0, 0]);
}

// ----------------------------------------------------
// 3. invertHomography
// ----------------------------------------------------
{
  // Identity matrix inversion
  const I = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const invI = invertHomography(I);
  assert.deepStrictEqual(invI, I);

  // Reversible affine homography
  const H = [
    [2, 0, 10],
    [0, 3, 20],
    [0, 0, 1],
  ];
  const H_inv = invertHomography(H);

  // Round-trip transformation: H_inv(H(pt)) === pt
  const original = [12, 18];
  const transformed = applyHomography(H, original);
  const recovered = applyHomography(H_inv, transformed);
  assertNear(recovered[0], original[0], 1e-6, "recovered x");
  assertNear(recovered[1], original[1], 1e-6, "recovered y");

  // Singular matrix (determinant == 0) returns identity
  const singular = [
    [1, 2, 3],
    [2, 4, 6],
    [0, 0, 0],
  ];
  const fallback = invertHomography(singular);
  assert.deepStrictEqual(fallback, I);
}

// ----------------------------------------------------
// 4. computeIpmOccupancy
// ----------------------------------------------------
{
  // Standard count object (cbmp compatibility)
  const phiCounts = computeIpmOccupancy({ moto: 10, car: 2, truck: 0 }, 150);
  // (10*1.5 + 2*7.5) / 150 = 30 / 150 = 0.2
  assertNear(phiCounts, 0.2, 1e-6);

  // Array of detection objects with type
  const detections1 = [
    { type: "moto" },
    { type: "moto" },
    { type: "car" },
  ];
  const phiArray1 = computeIpmOccupancy(detections1, 100);
  // (1.5 + 1.5 + 7.5) / 100 = 10.5 / 100 = 0.105
  assertNear(phiArray1, 0.105, 1e-6);

  // Array of detection objects with class
  const detections2 = [{ class: "truck" }];
  const phiArray2 = computeIpmOccupancy(detections2, 18);
  assertNear(phiArray2, 1.0, 1e-6);

  // Clamped at 1.0 on saturation
  const phiSaturated = computeIpmOccupancy({ truck: 10 }, 100);
  assert.strictEqual(phiSaturated, 1.0);

  // Clamped at 0.0 or safe on empty / invalid roadArea
  assert.strictEqual(computeIpmOccupancy([], 100), 0);
  assert.strictEqual(computeIpmOccupancy({}, 100), 0);
  assert.strictEqual(computeIpmOccupancy(null, 100), 0);
  assert.strictEqual(computeIpmOccupancy({ moto: 5 }, 0), 0);
  assert.strictEqual(computeIpmOccupancy({ moto: 5 }, -10), 0);
}

console.log("[homography.test] all assertions passed");
