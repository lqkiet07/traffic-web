import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyHomography } from "../src/lib/homography.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const metaPath = path.resolve(__dirname, "../public/data/camera_roi_meta.json");

// 1. Valid JSON and file existence
assert.ok(fs.existsSync(metaPath), "camera_roi_meta.json must exist");
const raw = fs.readFileSync(metaPath, "utf-8");
const meta = JSON.parse(raw);

// 2. Video contract
assert.ok(meta.video, "video must exist");
assert.strictEqual(typeof meta.video.src, "string");
assert.strictEqual(typeof meta.video.fps, "number");
assert.strictEqual(typeof meta.video.duration, "number");
assert.strictEqual(typeof meta.video.width, "number");
assert.strictEqual(typeof meta.video.height, "number");
assert.strictEqual(meta.video.src, "/videos/intersection_1_roi.mp4");
assert.ok(meta.video.duration >= 190, "video duration >= 190");
assert.strictEqual(meta.video.width, 886);
assert.strictEqual(meta.video.height, 490);

// 3. Anchors contract
assert.ok(meta.anchors, "anchors must exist");
assert.ok(Array.isArray(meta.anchors.p1) && meta.anchors.p1.length === 2);
assert.ok(Array.isArray(meta.anchors.p2) && meta.anchors.p2.length === 2);
assert.ok(Array.isArray(meta.anchors.p3) && meta.anchors.p3.length === 2);
assert.ok(Array.isArray(meta.anchors.p4) && meta.anchors.p4.length === 2);
assert.deepStrictEqual(meta.anchors.p1, [170, 237]);
assert.deepStrictEqual(meta.anchors.p2, [501, 259]);
assert.deepStrictEqual(meta.anchors.p3, [323, 484]);
assert.deepStrictEqual(meta.anchors.p4, [3, 342]);

// 4. Homography contract (3x3 matrix)
assert.ok(Array.isArray(meta.homography), "homography must be an array");
assert.strictEqual(meta.homography.length, 3, "homography must have 3 rows");
for (const row of meta.homography) {
  assert.ok(Array.isArray(row), "each homography row must be an array");
  assert.strictEqual(row.length, 3, "each homography row must have 3 elements");
  for (const cell of row) {
    assert.strictEqual(typeof cell, "number", "homography element must be a number");
  }
}

// Verify homography maps anchor quadrilateral to [0..400, 0..300] IPM bird's eye space
const eps = 1e-3;
const ipmP1 = applyHomography(meta.homography, meta.anchors.p1);
const ipmP2 = applyHomography(meta.homography, meta.anchors.p2);
const ipmP3 = applyHomography(meta.homography, meta.anchors.p3);
const ipmP4 = applyHomography(meta.homography, meta.anchors.p4);

assert.ok(Math.abs(ipmP1[0] - 0) < eps && Math.abs(ipmP1[1] - 0) < eps, "p1 maps to (0, 0)");
assert.ok(Math.abs(ipmP2[0] - 400) < eps && Math.abs(ipmP2[1] - 0) < eps, "p2 maps to (400, 0)");
assert.ok(Math.abs(ipmP3[0] - 400) < eps && Math.abs(ipmP3[1] - 300) < eps, "p3 maps to (400, 300)");
assert.ok(Math.abs(ipmP4[0] - 0) < eps && Math.abs(ipmP4[1] - 300) < eps, "p4 maps to (0, 300)");

// 5. Road area contract
assert.strictEqual(typeof meta.roadAreaM2, "number");
assert.ok(meta.roadAreaM2 > 0);

// 6. Frames contract
assert.ok(Array.isArray(meta.frames), "frames must be an array");
assert.strictEqual(meta.frames.length, 388, "frames count is 388");
assert.ok(meta.frames.length >= 380, "frames count >= 380");

const vehicleTypes = new Set();
let totalVehicles = 0;
let prevTime = -1;
for (const frame of meta.frames) {
  assert.strictEqual(typeof frame.time, "number");
  assert.ok(frame.time >= 0 && frame.time <= meta.video.duration);
  assert.ok(frame.time > prevTime, "frame times must be strictly ascending");
  prevTime = frame.time;

  assert.strictEqual(typeof frame.occupancy_phi, "number");
  assert.ok(frame.occupancy_phi >= 0 && frame.occupancy_phi <= 1, "occupancy_phi must be 0..1");

  assert.strictEqual(typeof frame.bbox_count, "number");
  assert.ok(Number.isInteger(frame.bbox_count));
  assert.ok(frame.bbox_count >= 0, "bbox_count >= 0");

  assert.strictEqual(typeof frame.ground_truth_count, "number");
  assert.ok(Number.isInteger(frame.ground_truth_count));
  assert.ok(frame.ground_truth_count >= frame.bbox_count, "ground_truth_count >= bbox_count");

  assert.ok(Array.isArray(frame.vehicles), "vehicles must be an array");
  assert.strictEqual(frame.vehicles.length, frame.bbox_count, "vehicles array length equals bbox_count");

  const ids = frame.vehicles.map((v) => v.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(
    uniqueIds.size,
    ids.length,
    `Frame at t=${frame.time}s has duplicate vehicle IDs: ${ids}`
  );

  for (const v of frame.vehicles) {
    totalVehicles++;
    assert.ok(v.id !== undefined && v.id !== null, "vehicle id must be present");
    assert.ok(typeof v.type === "string", "vehicle type must be string");
    vehicleTypes.add(v.type);
    assert.ok(Array.isArray(v.bbox) && v.bbox.length === 4, "bbox must be array of 4 [x, y, w, h]");
    for (const coord of v.bbox) {
      assert.strictEqual(typeof coord, "number", "bbox coordinates must be numbers");
    }
    assert.strictEqual(typeof v.speed, "number", "speed must be number");
  }
}

assert.ok(totalVehicles > 0, "vehicles must exist across frames");
assert.ok(vehicleTypes.has("moto"), "vehicle types must contain moto");

// 7. Rider-Motorcycle fusion regression check at t=55.4s
const waitFrame = meta.frames.find((f) => Math.abs(f.time - 55.4) < 0.2);
assert.ok(waitFrame, "Frame around t=55.4s must exist");
assert.strictEqual(waitFrame.bbox_count, 2, "Must detect exactly 2 waiting motorcycles at t=55.4s");
assert.ok(waitFrame.vehicles.every((v) => v.type === "moto"), "Both waiting vehicles at t=55.4s must be moto");

console.log(`[camera_meta_contract.test] Passed: ${meta.frames.length} frames verified.`);
