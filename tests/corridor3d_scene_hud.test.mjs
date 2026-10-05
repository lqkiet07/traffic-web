import assert from "node:assert";
import {
  formatVehicleCountSummary,
  formatApproachSummary,
} from "../src/lib/corridor3dScene.js";

// Mixed fleet must list every present type, not just one hardcoded type.
{
  const out = formatVehicleCountSummary({ moto: 8, car: 4, truck: 0 });
  assert.strictEqual(out, "4 Ô tô, 8 Xe máy");
}

// Truck-only phase (paradox step 1).
{
  assert.strictEqual(formatVehicleCountSummary({ moto: 0, car: 0, truck: 4 }), "4 Xe tải");
}

// Empty approach must not render an empty string.
{
  assert.strictEqual(formatVehicleCountSummary({ moto: 0, car: 0, truck: 0 }), "0 xe");
}

// Missing counts object degrades gracefully.
{
  assert.strictEqual(formatVehicleCountSummary(undefined), "0 xe");
}

// Ordering is truck, car, moto (heaviest first).
{
  assert.strictEqual(
    formatVehicleCountSummary({ moto: 12, car: 2, truck: 4 }),
    "4 Xe tải, 2 Ô tô, 12 Xe máy",
  );
}

// Full summary keeps area and occupancy alongside the fleet breakdown.
{
  const summary = formatApproachSummary({
    title: "Nhánh Tây · Pha 1",
    counts: { moto: 8, car: 4, truck: 0 },
    area: 42,
    phi: 0.28,
  });
  assert.strictEqual(summary.title, "Nhánh Tây · Pha 1");
  assert.strictEqual(summary.metric, "4 Ô tô, 8 Xe máy · 42 m² (28%)");
  assert.strictEqual(summary.color, "#38bdf8");
}

console.log("[corridor3d_scene_hud.test] all assertions passed");
