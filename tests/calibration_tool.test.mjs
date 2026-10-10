import assert from "node:assert";

function computeVideoCoords(clientX, clientY, rect, baseW = 886, baseH = 490) {
  const x = Math.max(0, Math.min(baseW, Math.round(((clientX - rect.left) / rect.width) * baseW)));
  const y = Math.max(0, Math.min(baseH, Math.round(((clientY - rect.top) / rect.height) * baseH)));
  return [x, y];
}

const rect = { left: 100, top: 50, width: 886, height: 490 };

// 1. Coordinates within rect
assert.deepStrictEqual(computeVideoCoords(100, 50, rect), [0, 0]);
assert.deepStrictEqual(computeVideoCoords(986, 540, rect), [886, 490]);
assert.deepStrictEqual(computeVideoCoords(543, 295, rect), [443, 245]);

// 2. Clamping out-of-bounds clicks
assert.deepStrictEqual(computeVideoCoords(50, 20, rect), [0, 0]);
assert.deepStrictEqual(computeVideoCoords(1500, 1000, rect), [886, 490]);

// 3. Accumulating up to 4 calibration points
let points = [];
const addPoint = (pt) => {
  if (points.length < 4) points = [...points, pt];
};

addPoint([165, 245]);
addPoint([520, 248]);
addPoint([630, 488]);
addPoint([45, 488]);
addPoint([999, 999]); // should be ignored

assert.strictEqual(points.length, 4);
assert.deepStrictEqual(points[0], [165, 245]);
assert.deepStrictEqual(points[3], [45, 488]);

// 4. Anchor mapping
const anchors = {
  p1: points[0],
  p2: points[1],
  p3: points[2],
  p4: points[3],
};
assert.deepStrictEqual(anchors.p1, [165, 245]);
assert.deepStrictEqual(anchors.p2, [520, 248]);
assert.deepStrictEqual(anchors.p3, [630, 488]);
assert.deepStrictEqual(anchors.p4, [45, 488]);

// 5. HUD text format check
const statusText = `Đã chấm ${points.length}/4 điểm (P1: Trên-Trái → P2: Trên-Phải → P3: Dưới-Phải → P4: Dưới-Trái)`;
assert.strictEqual(
  statusText,
  "Đã chấm 4/4 điểm (P1: Trên-Trái → P2: Trên-Phải → P3: Dưới-Phải → P4: Dưới-Trái)"
);

const coordsText = `P1: [${points[0]}], P2: [${points[1]}], P3: [${points[2]}], P4: [${points[3]}]`;
assert.strictEqual(coordsText, "P1: [165,245], P2: [520,248], P3: [630,488], P4: [45,488]");

console.log("[calibration_tool.test] all assertions passed");
