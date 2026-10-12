import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeLiveCameraSignalSplit } from "../src/lib/cbmp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const metaPath = path.resolve(__dirname, "../public/data/camera_roi_meta.json");
const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

// 1. Kiểm tra cấu trúc dữ liệu trả về với frame đầu tiên
const frame0 = meta.frames[0];
const res0 = computeLiveCameraSignalSplit(frame0);

assert.strictEqual(typeof res0.cao.g1, "number");
assert.strictEqual(typeof res0.cao.g2, "number");
assert.strictEqual(typeof res0.baseline.g1, "number");
assert.strictEqual(typeof res0.baseline.g2, "number");
assert.strictEqual(typeof res0.groundTruth.g1, "number");
assert.strictEqual(typeof res0.groundTruth.g2, "number");

// Tổng thời gian xanh phải luôn bảo toàn = 112s
assert.strictEqual(res0.cao.g1 + res0.cao.g2, 112);
assert.strictEqual(res0.baseline.g1 + res0.baseline.g2, 112);
assert.strictEqual(res0.groundTruth.g1 + res0.groundTruth.g2, 112);

// Giới hạn cận 10s <= g <= 102s
assert.ok(res0.cao.g1 >= 10 && res0.cao.g1 <= 102);
assert.ok(res0.baseline.g1 >= 10 && res0.baseline.g1 <= 102);

// Tại frame 0: phi = 0.6365, bbox_count = 8, ground_truth = 36.
// CAO đo diện tích lớn nên g1 của CAO phải cao hơn đáng kể so với Baseline bị hụt bbox
assert.ok(
  res0.cao.g1 > res0.baseline.g1,
  `CAO g1 (${res0.cao.g1}) phải lớn hơn Baseline g1 (${res0.baseline.g1}) khi xe bị che khuất`
);
assert.strictEqual(res0.deltaGreen, res0.cao.g1 - res0.baseline.g1);

// 2. Quét qua toàn bộ các frame trong video để đảm bảo không lỗi biên chia cho 0
for (const frame of meta.frames) {
  const r = computeLiveCameraSignalSplit(frame);
  assert.ok(Number.isFinite(r.cao.g1));
  assert.ok(Number.isFinite(r.baseline.g1));
  assert.strictEqual(r.cao.g1 + r.cao.g2, 112);
  assert.strictEqual(r.baseline.g1 + r.baseline.g2, 112);
}

// 3. Kiểm tra trường hợp frame rỗng hoặc null an toàn
const fallback = computeLiveCameraSignalSplit(null);
assert.strictEqual(fallback.cao.g1 + fallback.cao.g2, 112);

console.log("[live_signal_allocation.test] all assertions passed.");
