import assert from "node:assert";
import { getStepOverlayPositions } from "../src/lib/corridor3dScene.js";

// Test 1: Step 1 detection plane coverage contract
{
  const p1 = getStepOverlayPositions(1);
  // Node 1 West approach: X from (-29 - 11 = -40) to (-29 + 11 = -18), exactly reaches stop line -18
  assert.strictEqual(p1.inflowPlaneX - p1.inflowPlaneLength / 2, -40);
  assert.strictEqual(p1.inflowPlaneX + p1.inflowPlaneLength / 2, -18);

  const p2 = getStepOverlayPositions(2);
  // Node 2 Corridor link: X from (0 - 14 = -14) to (0 + 14 = +14), covers entire link between junctions
  assert.strictEqual(p2.inflowPlaneX - p2.inflowPlaneLength / 2, -14);
  assert.strictEqual(p2.inflowPlaneX + p2.inflowPlaneLength / 2, 14);
}

// Test 2: Math guard simulation for horizon raycast
{
  function isSafeRaycast(dirY, hitDist, hitX, hitZ) {
    if (dirY >= -0.05) return false;
    if (hitDist > 85) return false;
    if (Math.abs(hitX) > 60 || Math.abs(hitZ) > 35) return false;
    return true;
  }

  // Horizon raycast (looking at HUD / sky) -> rejected
  assert.strictEqual(isSafeRaycast(0.01, 1000, 500, 500), false);
  assert.strictEqual(isSafeRaycast(-0.01, 500, 200, 100), false);
  // Far ground hit -> rejected
  assert.strictEqual(isSafeRaycast(-0.2, 120, 30, 20), false);
  // Valid ground hit within road network -> accepted
  assert.strictEqual(isSafeRaycast(-0.4, 30, 10, 5), true);
}

console.log("[corridor3d_camera_guard.test] all assertions passed");
