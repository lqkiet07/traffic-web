# Corridor 3D Lab: Dual-Node Overlays, Dynamic HUD, WebGL Disposal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three defects in the Algorithm Lab 3D view — step overlays and curbside HUD boards are hardcoded to Node 1, HUD vehicle labels hardcode a single vehicle type, and Three.js resources are never disposed when toggling 2D/3D.

**Architecture:** Extract all testable logic out of the 1058-line `Corridor3DCanvas.jsx` into a new pure module `src/lib/corridor3dScene.js` (no React, no DOM, no Three.js import). The component consumes that module and repositions its existing mesh groups when the selected node changes. This satisfies the repo rule that Node test suites import plain `.js` only.

**Tech Stack:** React 19, Three.js 0.186, Vite 6, Node.js built-in test runner (`node:assert`).

**Spec:** Findings from the systematic-debugging review of 2026-10-05 (see conversation; no separate spec file).

## Global Constraints

- Unit tests import from `src/lib/*.js` only. Node cannot import `.jsx` — verified: `Unknown file extension ".jsx"`.
- No new npm dependencies.
- All 18 existing test suites must keep passing (no regressions).
- Do not change CAO-CBMP math or physics in `src/lib/corridorSim.js`.
- Keep functions under 50 lines, nesting under 4 levels, use early returns.
- Match existing repo comment style: brief English comments explaining non-obvious WHY only.

## Review findings carried into Task 2

The Task 1 reviewer returned SHIP but raised one blocking gap and one cheap correction. Both are folded into Task 2 below.

1. **HIGH — departed vehicle meshes still leak.** `syncVehicles` calls `scene.remove(mesh)` when a vehicle exits the network (`Corridor3DCanvas.jsx:277-281`) and `vehicleMeshes.clear()` drops the last reference. Those meshes are unreachable from `scene.traverse`, so `disposeThreeScene` cannot reclaim them. Every spawned-then-departed vehicle permanently leaks its `BoxGeometry`/`SphereGeometry`/`MeshStandardMaterial`. Task 2 must dispose on removal at the moment of removal.
2. **MEDIUM — `inflowPlaneX` encodes `baseX - 12` as two literals.** `nodeId === 2 ? 4 : -28` is correct today but a future third node would silently inherit the Node 1 branch. Use `baseX - 12`.

Two further non-blocking review findings are also adopted: dedupe geometry/material disposal the same way textures already are, and add the missing trailing newline to `src/lib/corridor3dScene.js`.

---

## Node coordinate reference

Simulation is `x: 0..800, y: 0..320`. The canvas maps `X = (x - 400) / 10`, `Z = (y - 160) / 10`.

| Node | Sim x | World X | Approaches |
|------|-------|---------|-----------|
| Node 1 (upstream) | 240 | -16 | `west`, `north1`, `south1` |
| Node 2 (downstream) | 560 | +16 | `corridor`, `north2`, `south2` |

Node 1 phase 1 is fed by the West arterial (world X ≈ -28). Node 2 phase 1 is fed by the corridor link (world X ≈ +4).

---

## File Structure

- Create `src/lib/corridor3dScene.js` — pure helpers: node anchors, overlay layout, HUD text formatting, scene disposal. Testable from Node.
- Create `tests/corridor3d_scene_hud.test.mjs` — tests for the text formatters.
- Create `tests/corridor3d_scene_layout.test.mjs` — tests for node anchors and overlay layout.
- Create `tests/corridor3d_scene_dispose.test.mjs` — tests for disposal.
- Modify `src/components/Corridor3DCanvas.jsx` — consume the helpers, add `selectedNode` prop, reposition overlay groups, dispose on unmount.
- Modify `src/components/AlgorithmLab.jsx` — pass `selectedNode` down to the 3D canvas.

---

## Task 1: Pure helpers module `src/lib/corridor3dScene.js`

**Files:**
- Create: `src/lib/corridor3dScene.js`
- Create: `tests/corridor3d_scene_hud.test.mjs`
- Create: `tests/corridor3d_scene_layout.test.mjs`
- Create: `tests/corridor3d_scene_dispose.test.mjs`

**Interfaces:**
- Produces:
  - `formatVehicleCountSummary(counts) -> string`
  - `formatApproachSummary({ title, counts, area, phi, color }) -> { title, metric, color }`
  - `getNodeBaseX(nodeId) -> -16 | 16`
  - `getStepOverlayPositions(nodeId) -> object`
  - `disposeThreeScene(scene) -> void`

- [ ] **Step 1: Write the failing HUD text tests**

```javascript
// tests/corridor3d_scene_hud.test.mjs
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
```

- [ ] **Step 2: Run the HUD test and confirm it fails**

Run: `node tests/corridor3d_scene_hud.test.mjs`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `src/lib/corridor3dScene.js`.

- [ ] **Step 3: Write the failing overlay layout test**

```javascript
// tests/corridor3d_scene_layout.test.mjs
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
}

// Unknown node ids fall back to Node 1 rather than producing NaN positions.
{
  assert.strictEqual(getNodeBaseX(undefined), -16);
  assert.strictEqual(getNodeBaseX(7), -16);
}

console.log("[corridor3d_scene_layout.test] all assertions passed");
```

- [ ] **Step 4: Run the layout test and confirm it fails**

Run: `node tests/corridor3d_scene_layout.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 5: Write the failing disposal test**

```javascript
// tests/corridor3d_scene_dispose.test.mjs
import assert from "node:assert";
import { disposeThreeScene } from "../src/lib/corridor3dScene.js";

let geoDisposed = 0;
let matDisposed = 0;
let texDisposed = 0;
const sharedTexture = { dispose: () => { texDisposed += 1; } };

const scene = {
  traverse: (fn) => {
    fn({
      geometry: { dispose: () => { geoDisposed += 1; } },
      material: { map: sharedTexture, dispose: () => { matDisposed += 1; } },
    });
    // Same texture shared by a second material must only be disposed once.
    fn({
      geometry: { dispose: () => { geoDisposed += 1; } },
      material: { map: sharedTexture, dispose: () => { matDisposed += 1; } },
    });
  },
};

disposeThreeScene(scene);
assert.strictEqual(geoDisposed, 2, "every geometry is disposed");
assert.strictEqual(matDisposed, 2, "every material is disposed");
assert.strictEqual(texDisposed, 1, "shared textures are disposed exactly once");

// Null / malformed scenes must not throw.
disposeThreeScene(null);
disposeThreeScene({});

console.log("[corridor3d_scene_dispose.test] all assertions passed");
```

- [ ] **Step 6: Run the disposal test and confirm it fails**

Run: `node tests/corridor3d_scene_dispose.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `src/lib/corridor3dScene.js`**

```javascript
// Pure helpers for the Algorithm Lab 3D view: node anchors, overlay layout,
// HUD board text and scene disposal. No React, DOM or Three.js imports so the
// Node test suites can import this module directly.

const HUD_LABELS = { truck: "Xe tải", car: "Ô tô", moto: "Xe máy" };

// Heaviest first so the metric reads as a descending pressure summary.
const HUD_ORDER = ["truck", "car", "moto"];

export function formatVehicleCountSummary(counts) {
  const parts = [];
  for (const type of HUD_ORDER) {
    const n = counts?.[type] ?? 0;
    if (n > 0) parts.push(`${n} ${HUD_LABELS[type]}`);
  }
  return parts.length > 0 ? parts.join(", ") : "0 xe";
}

export function formatApproachSummary({ title, counts, area, phi, color = "#38bdf8" }) {
  const pct = Math.round((phi ?? 0) * 100);
  return {
    title,
    metric: `${formatVehicleCountSummary(counts)} · ${(area ?? 0).toFixed(0)} m² (${pct}%)`,
    color,
  };
}

// World X of each signalised node (see simToWorld in Corridor3DCanvas.jsx).
export function getNodeBaseX(nodeId) {
  return nodeId === 2 ? 16 : -16;
}

// Overlay anchor points for one node, so switching nodes translates the meshes
// instead of rebuilding them. Node 1 phase 1 is fed by the West arterial;
// node 2 phase 1 is fed by the corridor link.
export function getStepOverlayPositions(nodeId) {
  const baseX = getNodeBaseX(nodeId);
  return {
    baseX,
    inflowPlaneX: baseX - 12,
    inflowCrossZ: -8,
    gammaBar1X: baseX - 0.6,
    gammaBar2X: baseX + 0.6,
    phaseBoardX: baseX,
    releaseStartX: baseX - 3,
    releaseHeadX: baseX + 4.2,
  };
}

function disposeMaterial(material, once) {
  if (!material) return;
  if (Array.isArray(material)) {
    for (const entry of material) disposeMaterial(entry, once);
    return;
  }
  once(material.map);
  once(material.emissiveMap);
  once(material.normalMap);
  once(material);
}

// Release GPU resources for every mesh so toggling 2D/3D does not leak VRAM.
export function disposeThreeScene(scene) {
  if (typeof scene?.traverse !== "function") return;
  const seen = new Set();
  const once = (disposable) => {
    if (!disposable || seen.has(disposable)) return;
    seen.add(disposable);
    disposable.dispose?.();
  };
  scene.traverse((obj) => {
    once(obj.geometry);
    const material = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of material) {
      if (!mat) continue;
      once(mat.map);
      once(mat.emissiveMap);
      once(mat.normalMap);
      once(mat);
    }
  });
}
```

- [ ] **Step 8: Run all three new tests and confirm they pass**

Run: `node tests/corridor3d_scene_hud.test.mjs; node tests/corridor3d_scene_layout.test.mjs; node tests/corridor3d_scene_dispose.test.mjs`
Expected: PASS for all three.

- [ ] **Step 9: Commit**

```bash
git add src/lib/corridor3dScene.js tests/corridor3d_scene_hud.test.mjs tests/corridor3d_scene_layout.test.mjs tests/corridor3d_scene_dispose.test.mjs
git commit -m "feat(lab3d): add pure node-layout, HUD text and scene disposal helpers"
```

---

## Task 2: Wire helpers into the 3D canvas and the lab shell

**Files:**
- Modify: `src/components/Corridor3DCanvas.jsx` — imports, `buildStep1Overlay`, `buildStep3Overlay`, `buildStep4Overlay`, `buildStep5Overlay`, `buildHudBoards`, `formatWestSummary`, `formatNorthSummary`, `updateStepOverlays`, render loop, `useThreeLoop` cleanup, component props.
- Modify: `src/components/AlgorithmLab.jsx:358-371` — pass `selectedNode` to `Corridor3DCanvas`.

**Interfaces:**
- Consumes: everything exported by `src/lib/corridor3dScene.js` (Task 1).
- Produces: `Corridor3DCanvas` accepts `selectedNode = 1`; overlay groups and HUD boards follow the selected node; unmount releases GPU resources.

- [ ] **Step 1: Import the helpers and add the `selectedNode` prop**

Add to the import block in `src/components/Corridor3DCanvas.jsx`:

```javascript
import {
  disposeThreeScene,
  formatApproachSummary,
  formatVehicleCountSummary,
  getStepOverlayPositions,
} from "../lib/corridor3dScene.js";
```

Add `selectedNode = 1` to the component signature, mirror it into a ref the render loop can read:

```javascript
const nodeRef = useRef(selectedNode);
nodeRef.current = selectedNode;
```

Pass `nodeRef` into `startRenderLoop` alongside the existing `modeRef` / `stepRef` / `subRef`.

- [ ] **Step 2: Make the step 1 overlay expose its planes**

Change `buildStep1Overlay` to return the two plane meshes so they can be repositioned:

```javascript
function buildStep1Overlay(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.3 });
  const mkPlane = (w, d, px, pz) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(px, 0.18, pz);
    group.add(m);
    return m;
  };
  const planeArterial = mkPlane(12, 4, -28, 0);
  const planeCross = mkPlane(4, 10, -16, -8);
  group.visible = false;
  scene.add(group);
  return { group, mat, planeArterial, planeCross };
}
```

- [ ] **Step 3: Add `positionOverlaysForNode` and call it on node change**

```javascript
// Translate the existing overlay meshes onto the selected node. Cheaper than
// rebuilding the overlay rig, which would churn geometries every node switch.
function positionOverlaysForNode(rig, nodeId) {
  const p = getStepOverlayPositions(nodeId);
  rig.s1.planeArterial.position.x = p.inflowPlaneX;
  rig.s1.planeCross.position.x = p.baseX;
  rig.s1.planeCross.position.z = p.inflowCrossZ;
  rig.s3.b1.position.x = p.gammaBar1X;
  rig.s3.b2.position.x = p.gammaBar2X;
  rig.s4.board.sprite.position.x = p.phaseBoardX;
  rig.s5.releaseBoxes.forEach((box, i) => {
    box.position.x = p.releaseStartX + i * 2;
  });
  rig.s5.releaseHead.position.x = p.releaseHeadX;
  rig.hud.west.sprite.position.x = p.baseX - 5;
  rig.hud.north.sprite.position.x = p.baseX;
  rig.hud.north.sprite.position.z = p.inflowCrossZ - 4;
}
```

Have `buildStep5Overlay` return `releaseBoxes` and `releaseHead` instead of just `{ group }`.

Track the last positioned node on the rig and reposition only when it changes:

```javascript
// inside the render loop, before updateStepOverlays
const nodeId = nodeRef?.current ?? 1;
if (rig.lastNode !== nodeId) {
  rig.lastNode = nodeId;
  positionOverlaysForNode(overlayRig, nodeId);
}
```

Initialise `lastNode` to `null` on the overlay rig so the first frame positions it.

- [ ] **Step 4: Rewrite the HUD summaries to use the shared formatter**

Replace the bodies of `formatWestSummary` and `formatNorthSummary` so they:

- use `formatApproachSummary` and `formatVehicleCountSummary` instead of reading a single vehicle type,
- read phase-1 counts from the selected node (`nodeId === 1 ? step1.p1Counts : corridor telemetry`) and phase-2 counts from `step1.p2Counts`,
- keep the continuous-mode branch on live telemetry.

Signature becomes `formatWestSummary(stepData, sim, simMode, nodeId = 1)` and `formatNorthSummary(stepData, sim, simMode, nodeId = 1)`; `refreshHudBoards` passes the node id through.

- [ ] **Step 5: Dispose GPU resources on unmount**

In the `useThreeLoop` cleanup function, replace `ctx.renderer.dispose();` with:

```javascript
disposeThreeScene(ctx.scene);
ctx.renderer.dispose();
```

- [ ] **Step 6: Dispose vehicle meshes when they leave the network (HIGH — review finding 1)**

`disposeThreeScene` cannot reach a mesh already detached from the scene, so the existing removal branch in `syncVehicles` must dispose on the spot:

```javascript
function disposeObject(obj) {
  obj.geometry?.dispose?.();
  const material = Array.isArray(obj.material) ? obj.material : [obj.material];
  for (const mat of material) {
    if (!mat) continue;
    mat.map?.dispose?.();
    mat.dispose?.();
  }
}

function syncVehicles(scene, meshMap, sim) {
  // ...unchanged mesh creation/positioning loop...
  for (const [id, mesh] of Array.from(meshMap)) {
    if (seen.has(id)) continue;
    scene.remove(mesh);
    disposeObject(mesh);
    meshMap.delete(id);
  }
}
```

`disposeObject` walks the detached group, so child `BoxGeometry`/`SphereGeometry` parts are released too. Do not reuse `disposeThreeScene` here: it requires `scene.traverse`, and the mesh is already orphaned.

- [ ] **Step 7: Pass `selectedNode` from `AlgorithmLab.jsx`**

In `LabCanvasView`, add `selectedNode={lab.selectedNode}` to the `Corridor3DCanvas` element.

- [ ] **Step 8: Run the full test suite**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }`
Expected: 21/21 PASS.

- [ ] **Step 9: Build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 10: Commit**

```bash
git add src/lib/corridor3dScene.js src/components/Corridor3DCanvas.jsx src/components/AlgorithmLab.jsx tests/corridor3d_scene_layout.test.mjs
git commit -m "fix(lab3d): follow selected node in overlays and HUD, dispose GPU resources"
```

---

## Task 3: Regression verification

- [ ] **Step 1: Full test suite**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }`
Expected: 21/21 PASS, exit code 0.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 3: Confirm no stray debug logging**

Run: `rg "console\.log" src/components/Corridor3DCanvas.jsx src/lib/corridor3dScene.js`
Expected: no matches.