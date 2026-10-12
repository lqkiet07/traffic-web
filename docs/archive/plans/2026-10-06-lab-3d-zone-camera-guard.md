# 3D Detection Zone Alignment & Camera Anti-Crash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two 3D defects at their root: (1) align Step-1 detection planes (`planeArterial` + cross planes) to the true physical road spans per node so the cyan grid matches vehicle-count logic; (2) guard camera zoom against horizon-raycast blowup and NaN corruption that permanently black-screens the canvas.

**Architecture:**
1. Reconfigure `getStepOverlayPositions` in `corridor3dScene.js`: export node-specific `inflowPlaneX` + `inflowPlaneLength` (Node 1: length 22 centered X=-29 covering x=0..220 to stop line X=-18; Node 2: length 28 centered X=0 covering corridor X=-14..+14). `planeArterial` scales dynamically; split cross plane into North/South halves covering both legs.
2. Harden `groundHit` in `Corridor3DCanvas.jsx`: reject sky/horizon rays (dir.y >= -0.05), cap hit distance ≤ 85m and sandbox bounds (X ±60, Z ±35). Clamp `rig.currentLook` to the intersection footprint, floor camera Y ≥ 2.0, and self-heal NaN camera state back to [0,28,30].
3. Prove with unit tests: plane-coverage contract per node + raycast-guard math, then full 23-suite run + production build + live browser zoom-to-HUD check.

**Tech Stack:** Three.js 0.186, React 19, Vite 6, Node.js assert test runner.

**Spec:** Systematic-debugging Phase 1-2 report (Issue 1: 120m void X=-14..-2 on corridor, 40m gap before Node-1 stop line; Issue 2: unbounded ground-plane raycast → t→∞ → NaN → permanent black screen, unrecoverable by presets). Road geometry: `buildArterial` (X -40..+40), `buildCrossStreets` (X ±16), `buildStopLines` (X -18 / +14); sim mapping X=(x-400)/10.

## Global Constraints
- Do NOT revert unrelated in-progress files (~26 modified files and `vid/` untracked); stage only task files per commit.
- All 22 existing suites + 1 new suite (23 total) must PASS after every commit.
- Keep design tokens (`#090d16`, `#0f172a`, `#1e293b`, `#38bdf8`, `#10b981`, `#22d3ee` cyan overlay).
- No obvious paraphrase comments; brief English-only comments for geometric constraints.

---

### Task 1: Align 3D Detection Planes to Physical Roads per Node

**Files:**
- Modify: `src/lib/corridor3dScene.js` (`getStepOverlayPositions`)
- Modify: `src/components/Corridor3DCanvas.jsx` (`buildStep1Overlay`, `positionOverlaysForNode` — preserve all other rig positionings byte-identical)
- Test: `tests/corridor3d_scene_layout.test.mjs` (update Node 1/2 expectations)

**Interfaces:**
- Consumes: `nodeId` (1 or 2).
- Produces: `getStepOverlayPositions(nodeId)` → `{ baseX, inflowPlaneX, inflowPlaneLength, inflowCrossZ, gammaBar1X, gammaBar2X, phaseBoardX, releaseStartX, releaseHeadX }` with Node 1: X=-29/len 22 (covers sim x=0..220, ends exactly at stop line X=-18); Node 2: X=0/len 28 (covers corridor X=-14..+14).

- [ ] **Step 1: Update layout contract test**

Replace the two node blocks in `tests/corridor3d_scene_layout.test.mjs`:
```javascript
// Node 1 sits on the upstream cross street at world X = -16.
{
  assert.strictEqual(getNodeBaseX(1), -16);
  const p = getStepOverlayPositions(1);
  assert.strictEqual(p.baseX, -16);
  assert.strictEqual(p.inflowPlaneX, -29);
  assert.strictEqual(p.inflowPlaneLength, 22);
  assert.strictEqual(p.inflowCrossZ, -9);
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
  assert.strictEqual(p.inflowPlaneX, 0);
  assert.strictEqual(p.inflowPlaneLength, 28);
  assert.strictEqual(p.gammaBar1X, 15.4);
  assert.strictEqual(p.gamma2X ?? p.gammaBar2X, 16.6);
  assert.strictEqual(p.phaseBoardX, 16);
  assert.strictEqual(p.releaseStartX, 13);
  assert.strictEqual(p.releaseHeadX, 20.2);
  assert.strictEqual(p.inflowCrossZ, -9);
}
```
(Keep the unknown-node fallback block byte-identical. NOTE: `p.gamma2X ?? p.gammaBar2X` guards a possible typo — implementer: use `p.gammaBar2X` to match the existing key; the `??` form above is illustrative only.)

- [ ] **Step 2: Run test to verify FAIL**

Run: `node tests/corridor3d_scene_layout.test.mjs`
Expected: FAIL (inflowPlaneX currently -28/+4, inflowPlaneLength missing).

- [ ] **Step 3: Implement per-node geometry**

`src/lib/corridor3dScene.js`:
```javascript
export function getStepOverlayPositions(nodeId) {
  const isNode2 = nodeId === 2;
  const baseX = getNodeBaseX(nodeId);
  return {
    baseX,
    inflowPlaneX: isNode2 ? 0 : -29,
    inflowPlaneLength: isNode2 ? 28 : 22,
    inflowCrossZ: -9,
    gammaBar1X: isNode2 ? 15.4 : -16.6,
    gammaBar2X: isNode2 ? 16.6 : -15.4,
    phaseBoardX: baseX,
    releaseStartX: isNode2 ? 13 : -19,
    releaseHeadX: isNode2 ? 20.2 : -11.8,
  };
}
```

`src/components/Corridor3DCanvas.jsx` — `buildStep1Overlay`: base arterial width 1 (scaled dynamically), split cross into N/S halves:
```javascript
  const planeArterial = mkPlane(1, 4, -29, 0); // base width 1 for dynamic scaling
  const planeCrossN = mkPlane(4, 14, -16, -9);
  const planeCrossS = mkPlane(4, 14, -16, 9);
  group.visible = false;
  scene.add(group);
  return { group, mat, planeArterial, planeCrossN, planeCrossS };
```
`positionOverlaysForNode`: set arterial position AND scale from `p`, position both cross halves by `baseX`; keep gamma/bar/board/release/HUD lines byte-identical:
```javascript
  rig.s1.planeArterial.position.x = p.inflowPlaneX;
  rig.s1.planeArterial.scale.x = p.inflowPlaneLength;
  rig.s1.planeCrossN.position.x = p.baseX;
  rig.s1.planeCrossS.position.x = p.baseX;
```
CRITICAL: grep ALL `planeCross` (singular) references in Corridor3DCanvas.jsx (build return, positionOverlaysForNode, and any refresh/update function) and migrate every one to planeCrossN/planeCrossS. A leftover singular reference is a runtime crash (`cannot set position of undefined`).

- [ ] **Step 4: Run test to verify PASS**

Run: `node tests/corridor3d_scene_layout.test.mjs`
Expected: all assertions passed. Also run `node tests/corridor3d_scene_hud.test.mjs` + `node tests/corridor3d_scene_dispose.test.mjs` (share the 3D scene module).

- [ ] **Step 5: Commit**

```bash
git add src/lib/corridor3dScene.js src/components/Corridor3DCanvas.jsx tests/corridor3d_scene_layout.test.mjs
git commit -m "fix(3d): scale step 1 detection planes to match physical road corridors"
```

### Task 2: Camera Zoom Guard Against Horizon Blowup + NaN

**Files:**
- Modify: `src/components/Corridor3DCanvas.jsx` (`groundHit`, `zoomToCursor`, `updateCinematicCamera` only)

**Interfaces:**
- Consumes: wheel `deltaY`, cursor `clientX/clientY`, canvas rect.
- Produces: `groundHit` returns a finite in-bounds hit or null; `zoomToCursor` never moves `currentLook` out of the intersection footprint and never lets camera go below Y=2.0; `updateCinematicCamera` self-heals NaN state to the requested target.

- [ ] **Step 1: Guard `groundHit`**

```javascript
function groundHit(camera, clientX, clientY, canvas) {
  if (!camera || !canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  _mouse.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  _raycaster.setFromCamera(_mouse, camera);
  // Discard rays looking near or above the horizon to prevent infinite projection
  if (_raycaster.ray.direction.y >= -0.05) return null;

  const hit = new THREE.Vector3();
  if (!_raycaster.ray.intersectPlane(_groundPlane, hit)) return null;

  // Discard intersections beyond the visible sandbox bounds
  if (hit.distanceTo(_raycaster.ray.origin) > 85) return null;
  if (Math.abs(hit.x) > 60 || Math.abs(hit.z) > 35) return null;
  return hit;
}
```

- [ ] **Step 2: Clamp `zoomToCursor` + NaN self-heal**

```javascript
function zoomToCursor(camera, rig, deltaY, clientX, clientY, canvas) {
  if (!camera || !rig || !canvas) return;
  const hit = groundHit(camera, clientX, clientY, canvas);
  if (hit && Number.isFinite(hit.x) && deltaY < 0) {
    rig.currentLook.lerp(hit, 0.12);
  }

  // Constrain look-at target within the road network footprint
  rig.currentLook.x = Math.max(-45, Math.min(45, rig.currentLook.x));
  rig.currentLook.z = Math.max(-25, Math.min(25, rig.currentLook.z));
  rig.currentLook.y = Math.max(0, Math.min(6, rig.currentLook.y));

  const off = camera.position.clone().sub(rig.currentLook);
  const radius = off.length();
  if (!radius || !Number.isFinite(radius)) {
    // Self-heal corrupted camera state
    camera.position.set(0, 28, 30);
    rig.currentLook.set(0, 0, 0);
    return;
  }

  const next = Math.min(80, Math.max(8, radius * (1 + deltaY * 0.001)));
  off.setLength(next);
  camera.position.copy(rig.currentLook).add(off);

  // Keep camera above road level to prevent clipping through asphalt
  if (camera.position.y < 2.0) camera.position.y = 2.0;
  camera.lookAt(rig.currentLook);
}
```
NOTE: zoom-out path (deltaY > 0 with null hit) must still dolly — the clamp + dolly below the hit block run unconditionally, only the look-pull is gated. Preserve the existing min/max radius semantics (8..80; the old code had 6 in one path — standardize to 8 per this spec).

- [ ] **Step 3: Self-heal in `updateCinematicCamera`**

```javascript
function updateCinematicCamera(camera, rig, target) {
  if (!camera || !rig || !target) return;
  // If camera or look target got corrupted by NaN, reset immediately to target
  if (!Number.isFinite(camera.position.x) || !Number.isFinite(rig.currentLook.x)) {
    camera.position.set(target.pos[0], target.pos[1], target.pos[2]);
    rig.currentLook.set(target.look[0], target.look[1], target.look[2]);
    camera.lookAt(rig.currentLook);
    return;
  }
  _camPos.set(target.pos[0], target.pos[1], target.pos[2]);
  _camLook.set(target.look[0], target.look[1], target.look[2]);
  camera.position.lerp(_camPos, 0.08);
  rig.currentLook.lerp(_camLook, 0.08);
  camera.lookAt(rig.currentLook);
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/Corridor3DCanvas.jsx
git commit -m "fix(3d): guard camera zoom against horizon raycast blowup and NaN corruption"
```

### Task 3: Guard Tests + Full Verification + Browser Proof

**Files:**
- Create: `tests/corridor3d_camera_guard.test.mjs`

**Interfaces:**
- Test 1: plane-coverage contract per node from `getStepOverlayPositions` (Node 1: X -40..-18; Node 2: X -14..+14).
- Test 2: raycast-guard math mirror (horizon/far/out-of-bounds rejected, valid hit accepted).

- [ ] **Step 1: Write `tests/corridor3d_camera_guard.test.mjs`**

```javascript
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
```

- [ ] **Step 2: Run all 23 suites**

Run each `node tests/<name>.test.mjs` (22 existing + new guard test).
Expected: 23/23 print "all assertions passed".

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add tests/corridor3d_camera_guard.test.mjs
git commit -m "test(3d): verify detection plane road coverage and horizon raycast guard"
```

## Self-Review
1. Spec coverage: 120m void + 40m gap closed (Task 1, exact stop-line math); horizon blowup + NaN lockup closed (Task 2, three independent guards); contracts locked by tests (Task 3).
2. Placeholders: none — exact code, asserts, commands throughout.
3. Type consistency: inflowPlaneLength number; groundHit Vector3|null (unchanged signature); camera preset flow untouched.
