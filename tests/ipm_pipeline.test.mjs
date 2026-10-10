import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyHomography, PIPELINE_STAGES } from "../src/lib/homography.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const metaPath = path.resolve(__dirname, "../public/data/camera_roi_meta.json");
const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

// 1. PIPELINE_STAGES contract
assert.strictEqual(PIPELINE_STAGES.length, 5, "Pipeline must have exactly 5 stages");
assert.deepStrictEqual(PIPELINE_STAGES, [
  "YOLOv8 Segmentation",
  "ByteTrack",
  "Homography H(3×3)",
  "CAO Occupancy",
  "GAMA Engine",
]);

// 2. Homography projection on all frame vehicles
const H = meta.homography;
assert.ok(Array.isArray(H) && H.length === 3, "Homography 3x3 exists");

let totalVehicles = 0;
for (const frame of meta.frames) {
  for (const v of frame.vehicles) {
    totalVehicles++;
    const [x, y, w, h] = v.bbox;
    const bottomCenter = [x + w / 2, y + h];
    const [u, vCoord] = applyHomography(H, bottomCenter);

    assert.ok(Number.isFinite(u), `u coordinate must be finite: ${u}`);
    assert.ok(Number.isFinite(vCoord), `v coordinate must be finite: ${vCoord}`);

    // Road boundaries: lateral u between 0 and 400 (with tolerance [-50, 450])
    assert.ok(u >= -50 && u <= 450, `u out of road bounds: ${u}`);
    // Longitudinal v: traveling down the road (0 to ~300 with tolerance [-50, 350])
    assert.ok(vCoord >= -50 && vCoord <= 350, `v out of longitudinal bounds: ${vCoord}`);
  }
}
assert.ok(totalVehicles >= 464, `Verified ${totalVehicles} vehicle projections across frames`);

// 3. Occupancy gauge and area formula contract
const roadArea = meta.roadAreaM2;
assert.strictEqual(roadArea, 150, "Road area is 150 m^2");

for (const frame of meta.frames) {
  const phi = frame.occupancy_phi;
  const area = phi * roadArea;
  assert.ok(area >= 0 && area <= 150, `Area must be in [0, 150]: got ${area}`);

  const bboxCount = frame.bbox_count;
  const gtCount = frame.ground_truth_count;
  if (gtCount > 0) {
    const occlusionPct = Math.round(((gtCount - bboxCount) / gtCount) * 100);
    assert.ok(occlusionPct >= 0 && occlusionPct <= 100, `Occlusion gap realistic: got ${occlusionPct}%`);
  }
}

console.log(`[ipm_pipeline.test] all assertions passed (${totalVehicles} vehicles projected).`);
