import assert from "node:assert";
import { getNodeBaseX, getStepOverlayPositions } from "../src/lib/corridor3dScene.js";

// Node 1 sits on the upstream cross street at world X = -16.
{
  assert.strictEqual(getNodeBaseX(1), -16);
  const p = getStepOverlayPositions(1);
  assert.strictEqual(p.baseX, -16);
  assert.strictEqual(p.inflowPlaneX, -28);
  assert.strictEqual(p.inflowCrossZ, -8);
  assert.strictEqual(p.gammaBar1X, -16.6);
  assert.strictEqual(p.gammaBar2X, -15.4);
  assert.strictEqual(p.phaseBoardX, -16);
  assert.strictEqual(p.releaseStartX, -19);
  assert.strictEqual(p.releaseHeadX, -11.8);
}

// Node 2 sits on the downstream cross street at world X = +16, fed by the corridor link.
{
  assert.strictEqual(getNodeBaseX(2), 16);
  const p = getStepOverlayPositions(2);
  assert.strictEqual(p.baseX, 16);
  assert.strictEqual(p.inflowPlaneX, 4);
  assert.strictEqual(p.gammaBar1X, 15.4);
  assert.strictEqual(p.gammaBar2X, 16.6);
  assert.strictEqual(p.phaseBoardX, 16);
  assert.strictEqual(p.releaseStartX, 13);
  assert.strictEqual(p.releaseHeadX, 20.2);
  // The cross-street scan plane keeps the same Z on both nodes.
  assert.strictEqual(p.inflowCrossZ, -8);
}

// Unknown node ids fall back to Node 1 rather than producing NaN positions.
{
  assert.strictEqual(getNodeBaseX(undefined), -16);
  assert.strictEqual(getNodeBaseX(7), -16);
}

console.log("[corridor3d_scene_layout.test] all assertions passed");
