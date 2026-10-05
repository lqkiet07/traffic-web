import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  disposeThreeScene,
  formatApproachSummary,
  getStepOverlayPositions,
} from "../lib/corridor3dScene.js";
import {
  getCorridorTelemetry,
  spawnVehicle,
  updateCorridorSim,
} from "../lib/corridorSim.js";

// Cinematic presets for AlgorithmLab (Task 6 UI selects these).
export const CAMERA_PRESETS = {
  overview: { pos: [0, 28, 30], look: [0, 0, 0] },
  junction1: { pos: [-16, 14, 18], look: [-16, 0, 0] },
  node2: { pos: [16, 14, 18], look: [16, 0, 0] },
  corridor: { pos: [0, 16, 20], look: [0, 0, 0] },
  chase: { pos: null, look: null, dynamic: true },
};

// Scratch vectors for per-frame camera smoothing.
const _camPos = new THREE.Vector3();
const _camLook = new THREE.Vector3();

// Scratch orbit state for cursor-anchored zoom (no per-event allocation).
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

// Scratch vector for world-to-screen projection (no per-frame allocation).
const _projVec = new THREE.Vector3();

// World anchors for HTML HUD badges (west entry, corridor link, node2).
export const STATION_ANCHORS = {
  west: [-20, 1.5, 3],
  corridor: [0, 1.5, 3],
  node2: [16, 1.5, 3],
};

// Project world position to screen pixels, null when behind camera.
export function projectWorldToScreen(worldPos, camera, width, height) {
  if (!worldPos || !camera || !width || !height) return null;
  _projVec.set(worldPos[0], worldPos[1], worldPos[2]);
  _projVec.project(camera);
  if (_projVec.z > 1) return null;
  return {
    x: (_projVec.x * 0.5 + 0.5) * width,
    y: (-_projVec.y * 0.5 + 0.5) * height,
  };
}

// Fresh rig state for smooth look target and orbit idle tracking.
function createCameraRig() {
  return {
    currentLook: new THREE.Vector3(0, 0, 0),
    dragging: false,
    panning: false,
    hasDragged: false,
    lastInteract: 0,
    lastPreset: "overview",
    isUserControlled: false,
  };
}

// Map 2D sim (x:0..800, y:0..320) to 3D world X/Z with Y up.
function simToWorld(x, y) {
  return { X: (x - 400) / 10, Z: (y - 160) / 10 };
}

// Map 3D world X/Z back to 2D sim coordinates.
function worldToSim(X, Z) {
  return { x: X * 10 + 400, y: Z * 10 + 160 };
}

// Lane center defaults for click spawn snapping (mirrors corridorSim defaults).
const LANE_DEFAULTS = {
  west: { y: 170 },
  corridor: { y: 170 },
  north1: { x: 230 },
  south1: { x: 250 },
  north2: { x: 550 },
  south2: { x: 570 },
};

// Reuse 2D click zones for spawning from world clicks.
function getApproachAt(x, y) {
  if (x < 220 && Math.abs(y - 170) <= 25) return "west";
  if (x >= 240 && x < 540 && Math.abs(y - 170) <= 25) return "corridor";
  if (Math.abs(x - 230) <= 20 && y < 140) return "north1";
  if (Math.abs(x - 250) <= 20 && y > 180) return "south1";
  if (Math.abs(x - 550) <= 20 && y < 140) return "north2";
  if (Math.abs(x - 570) <= 20 && y > 180) return "south2";
  return null;
}

// Unwrap ref object or accept raw sim directly.
function unwrapSim(simRef) {
  return simRef?.current ?? simRef;
}

// Shared box helper for roads and markings.
function addBox(scene, w, h, d, px, py, pz, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(px, py, pz);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// Ambient plus shadow-casting directional light.
function buildLights(scene) {
  const ambient = new THREE.AmbientLight(new THREE.Color("#0f172a"), 1.2);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(20, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.far = 120;
  scene.add(sun);
}

// Large dark ground plane receiving shadows.
function buildGround(scene) {
  const geo = new THREE.PlaneGeometry(120, 60);
  const mat = new THREE.MeshStandardMaterial({ color: "#090d16" });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}

// East-west arterial from X -40 to +40.
function buildArterial(scene) {
  addBox(scene, 80, 0.1, 4, 0, 0.05, 0, "#1b2436");
}

// Two north-south cross streets at Node1/Node2.
function buildCrossStreets(scene) {
  addBox(scene, 4, 0.1, 32, -16, 0.05, 0, "#1b2436");
  addBox(scene, 4, 0.1, 32, 16, 0.05, 0, "#1b2436");
}

// Thin curbs along arterial and cross street edges.
function buildCurbs(scene) {
  addBox(scene, 80, 0.2, 0.3, 0, 0.1, 2.15, "#334155");
  addBox(scene, 80, 0.2, 0.3, 0, 0.1, -2.15, "#334155");
  addBox(scene, 0.3, 0.2, 32, -18.15, 0.1, 0, "#334155");
  addBox(scene, 0.3, 0.2, 32, -13.85, 0.1, 0, "#334155");
  addBox(scene, 0.3, 0.2, 32, 13.85, 0.1, 0, "#334155");
  addBox(scene, 0.3, 0.2, 32, 18.15, 0.1, 0, "#334155");
}

// White stop lines at each intersection entrance.
function buildStopLines(scene) {
  addBox(scene, 0.3, 0.12, 4, -18, 0.06, 0, "#ffffff");
  addBox(scene, 0.3, 0.12, 4, 14, 0.06, 0, "#ffffff");
  addBox(scene, 4, 0.12, 0.3, -16, 0.06, -2, "#ffffff");
  addBox(scene, 4, 0.12, 0.3, -16, 0.06, 2, "#ffffff");
  addBox(scene, 4, 0.12, 0.3, 16, 0.06, -2, "#ffffff");
  addBox(scene, 4, 0.12, 0.3, 16, 0.06, 2, "#ffffff");
}

// Dashed centerline along arterial every 2 units.
function buildCenterline(scene) {
  for (let X = -39; X <= 39; X += 2) {
    const nearNode1 = Math.abs(X + 16) < 3;
    const nearNode2 = Math.abs(X - 16) < 3;
    if (nearNode1 || nearNode2) continue;
    addBox(scene, 1, 0.12, 0.15, X, 0.06, 0, "#ffffff");
  }
}

// Assemble all road meshes for the corridor.
function buildRoads(scene) {
  buildArterial(scene);
  buildCrossStreets(scene);
  buildCurbs(scene);
  buildStopLines(scene);
  buildCenterline(scene);
}

// Small box part inside a group with shadow enabled.
function addPart(group, w, h, d, px, py, pz, color, emissive = null) {
  const mat = new THREE.MeshStandardMaterial({ color });
  if (emissive) {
    mat.emissive = new THREE.Color(emissive);
    mat.emissiveIntensity = 1;
  }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(px, py, pz);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

// Small glowing sphere lamp inside a group.
function addLamp(group, r, px, py, pz, color) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 1,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), mat);
  mesh.position.set(px, py, pz);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

// Low-poly moto, front faces +Z, exaggerated x3 scale.
function createMotoMesh() {
  const group = new THREE.Group();
  addPart(group, 0.25, 0.35, 0.6, 0, 0.25, 0, "#f59e0b");
  addPart(group, 0.2, 0.12, 0.3, 0, 0.45, -0.05, "#1f2937");
  addLamp(group, 0.06, 0, 0.28, 0.32, "#ffffff");
  const tail = addPart(group, 0.18, 0.08, 0.05, 0, 0.3, -0.32, "#ef4444", "#ef4444");
  group.userData.tailMats = [tail.material];
  group.userData.baseY = 0.1;
  return group;
}

// Low-poly car, front faces +Z.
function createCarMesh() {
  const group = new THREE.Group();
  addPart(group, 0.55, 0.45, 1.35, 0, 0.32, 0, "#38bdf8");
  addPart(group, 0.45, 0.35, 0.7, 0, 0.65, -0.05, "#0f172a");
  addPart(group, 0.12, 0.1, 0.06, -0.18, 0.3, 0.68, "#ffffff", "#ffffff");
  addPart(group, 0.12, 0.1, 0.06, 0.18, 0.3, 0.68, "#ffffff", "#ffffff");
  const tailL = addPart(group, 0.12, 0.1, 0.06, -0.18, 0.3, -0.68, "#ef4444", "#ef4444");
  const tailR = addPart(group, 0.12, 0.1, 0.06, 0.18, 0.3, -0.68, "#ef4444", "#ef4444");
  group.userData.tailMats = [tailL.material, tailR.material];
  group.userData.baseY = 0.1;
  return group;
}

// Low-poly truck, cab front +Z, total length ~3.3.
function createTruckMesh() {
  const group = new THREE.Group();
  addPart(group, 0.7, 0.9, 0.9, 0, 0.55, 1.15, "#e2e8f0");
  addPart(group, 0.72, 1.0, 2.4, 0, 0.6, -0.5, "#ec4899");
  addPart(group, 0.14, 0.12, 0.06, -0.22, 0.35, 1.61, "#ffffff", "#ffffff");
  addPart(group, 0.14, 0.12, 0.06, 0.22, 0.35, 1.61, "#ffffff", "#ffffff");
  const tailL = addPart(group, 0.14, 0.12, 0.06, -0.22, 0.4, -1.71, "#ef4444", "#ef4444");
  const tailR = addPart(group, 0.14, 0.12, 0.06, 0.22, 0.4, -1.71, "#ef4444", "#ef4444");
  group.userData.tailMats = [tailL.material, tailR.material];
  group.userData.baseY = 0.1;
  return group;
}

// Release a detached object graph. disposeThreeScene cannot be reused here: it
// relies on scene.traverse, and a departed vehicle is already orphaned from it.
function disposeObject(obj) {
  if (!obj) return;
  obj.geometry?.dispose?.();
  const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
  for (const mat of materials) {
    if (!mat) continue;
    mat.map?.dispose?.();
    mat.dispose?.();
  }
  for (const child of obj.children ?? []) disposeObject(child);
}

// Sync 3D meshes with sim vehicles, prune departed ids.
function syncVehicles(scene, meshMap, sim) {
  if (!scene || !meshMap || !sim?.vehicles) return;
  const seen = new Set();
  for (const v of sim.vehicles) {
    seen.add(v.id);
    let mesh = meshMap.get(v.id);
    if (!mesh) {
      if (v.type === "moto") mesh = createMotoMesh();
      else if (v.type === "truck") mesh = createTruckMesh();
      else mesh = createCarMesh();
      meshMap.set(v.id, mesh);
      scene.add(mesh);
    }
    const { X, Z } = simToWorld(v.x, v.y);
    mesh.position.set(X, (mesh.userData.baseY ?? 0.1) + 0.1, Z);
    if (v.direction === "east") mesh.rotation.y = Math.PI / 2;
    else if (v.direction === "north") mesh.rotation.y = Math.PI;
    else mesh.rotation.y = 0;
    const braking = (v.speed ?? 99) < 1;
    const tails = mesh.userData.tailMats ?? [];
    for (const mat of tails) mat.emissiveIntensity = braking ? 3 : 0.6;
  }
  for (const [id, mesh] of Array.from(meshMap)) {
    if (seen.has(id)) continue;
    scene.remove(mesh);
    // Dispose now: meshMap.delete drops the last reference, so nothing can
    // reach these geometries afterwards.
    disposeObject(mesh);
    meshMap.delete(id);
  }
}

// Single roadside signal pole with 3 lamps.
function createSignalPole(px, pz) {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: "#64748b" });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), poleMat);
  pole.position.set(0, 1.5, 0);
  pole.castShadow = true;
  group.add(pole);
  addPart(group, 0.35, 0.9, 0.25, 0, 3.2, 0, "#0f172a");
  const red = addLamp(group, 0.09, 0, 3.5, 0.14, "#ef4444");
  const yellow = addLamp(group, 0.09, 0, 3.2, 0.14, "#f59e0b");
  const green = addLamp(group, 0.09, 0, 2.9, 0.14, "#10b981");
  group.position.set(px, 0.1, pz);
  group.userData.lamps = { red: red.material, yellow: yellow.material, green: green.material };
  return group;
}

// Four corner poles per node plus one glow light per node.
// EW approaches (arterial) face north/south curbs; NS ones (cross) face EW curbs.
function buildSignalPoles(scene) {
  const poles = [];
  const poleConfigs = [
    { dx: -2.5, dz: 2.5, rotY: -Math.PI / 2, type: "arterial" },
    { dx: -2.5, dz: -2.5, rotY: Math.PI, type: "cross" },
    { dx: 2.5, dz: 2.5, rotY: 0, type: "cross" },
    { dx: 2.5, dz: -2.5, rotY: Math.PI / 2, type: "arterial" },
  ];
  for (const nodeX of [-16, 16]) {
    const nodeId = nodeX < 0 ? 1 : 2;
    for (const cfg of poleConfigs) {
      const pole = createSignalPole(nodeX + cfg.dx, cfg.dz);
      pole.rotation.y = cfg.rotY;
      scene.add(pole);
      poles.push({ nodeId, type: cfg.type, mats: pole.userData.lamps });
    }
  }
  const makeGlow = (nodeX, color) => {
    const light = new THREE.PointLight(color, 2, 12);
    light.position.set(nodeX, 4, 0);
    scene.add(light);
    return light;
  };
  const lights = { 1: makeGlow(-16, "#10b981"), 2: makeGlow(16, "#10b981") };
  return { poles, lights };
}

// Brighten active phase lamp per approach, tint node glow light.
// Arterial poles follow phase 1, cross poles follow phase 2.
function updateSignals(state, sim) {
  if (!state || !sim?.nodes) return;
  for (const pole of state.poles) {
    const node = pole.nodeId === 2 ? sim.nodes.node2 : sim.nodes.node1;
    if (!node) continue;
    const isP1 = node.phase === 1;
    const yellow = node.isYellow ?? (node.timeRemaining <= 3 && node.timeRemaining > 0);
    const type = pole.type ?? "arterial";
    const greenForMe = (type === "arterial" && isP1) || (type === "cross" && !isP1);
    pole.mats.green.emissiveIntensity = greenForMe && !yellow ? 2.5 : 0.15;
    pole.mats.yellow.emissiveIntensity = greenForMe && yellow ? 2.5 : 0.15;
    pole.mats.red.emissiveIntensity = !greenForMe ? 2.5 : 0.15;
  }
  for (const id of [1, 2]) {
    const lamp = state.lights[id];
    if (!lamp) continue;
    const node = id === 2 ? sim.nodes.node2 : sim.nodes.node1;
    const arterialGreen = (node?.phase ?? 1) === 1;
    lamp.color.set(arterialGreen ? "#10b981" : "#ef4444");
    lamp.intensity = 2;
  }
}

// Floating text board backed by 1024x320 canvas (updates on data change only).
function makeTextBoard(px, py, pz) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(px, py, pz);
  sprite.scale.set(7.5, 2.35, 1);
  return { sprite, canvas, ctx: canvas.getContext("2d"), tex };
}

// Paint dark glass board with sharp title + metric pill layout.
function paintBoard(board, input, defaultColor = "#10b981") {
  if (!board) return;
  const { canvas, ctx, tex } = board;
  const data = typeof input === "object" && input !== null
    ? input
    : { title: "", metric: String(input ?? ""), color: defaultColor };
  const color = data.color || defaultColor;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  // Dark glass backdrop keeps text legible over 3D scene.
  ctx.fillStyle = "rgba(10,15,29,0.96)";
  ctx.beginPath();
  ctx.roundRect(4, 4, W - 8, H - 8, 20);
  ctx.fill();
  // Accent border encodes board status color.
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(4, 4, W - 8, H - 8, 20);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (data.title) {
    // Uppercase title in near-white for max contrast.
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(String(data.title).toUpperCase(), W / 2, 75);
    // Metric pill grounds the reading under the title.
    ctx.fillStyle = "rgba(30,41,59,0.9)";
    ctx.beginPath();
    ctx.roundRect(40, 140, W - 80, 130, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, 140, W - 80, 130, 16);
    ctx.stroke();
    ctx.font = "bold 64px ui-monospace, monospace";
    ctx.fillStyle = color;
    ctx.fillText(String(data.metric).slice(0, 36), W / 2, 205);
  } else {
    ctx.font = "bold 60px system-ui, sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(String(data.metric).slice(0, 36), W / 2, H / 2);
  }
  tex.needsUpdate = true;
}

// Board base names per node: node 1 phase 1 arrives on the West arterial while
// node 2 phase 1 arrives on the corridor link, so the inflow board is renamed.
const HUD_BOARD_NAMES = {
  1: { inflow: "Nhánh Tây", cross: "Nhánh Bắc" },
  2: { inflow: "Hành lang Nối", cross: "Nhánh Bắc Nút 2" },
};

function boardNames(nodeId) {
  return HUD_BOARD_NAMES[nodeId === 2 ? 2 : 1];
}

// Live telemetry carries only zone occupancy plus a total per phase, so the
// continuous boards keep the phi readout instead of a per-type breakdown.
function formatLiveSummary({ baseTitle, nodeId, phi, count, color, label }) {
  const value = phi ?? 0;
  return {
    title: `${baseTitle} (Nút ${nodeId})`,
    metric: `${label}: ${value.toFixed(2)} (${Math.round(value * 100)}%) · ${count ?? 0} xe`,
    color,
  };
}

// Node 1 phase-1 board; node 2 reads the same slot from its own step data,
// which is already scoped to the selected node by getAlgorithmStepData.
// Continuous mode prefers live telemetry so the board tracks the sim.
function formatWestSummary(stepData, sim, simMode, nodeId = 1) {
  const names = boardNames(nodeId);
  const s1 = stepData?.step1;
  if (simMode === "continuous" || !s1) {
    if (!sim) return { title: names.inflow, metric: "--", color: "#64748b" };
    const t = getCorridorTelemetry(sim);
    // Node 2 phase 1 is fed by the corridor link, so phiCorridor is its inflow.
    const live = nodeId === 2
      ? { phi: t.phiCorridor, count: t.corridorCount }
      : { phi: t.phiNode1P1, count: t.n1P1Count };
    return formatLiveSummary({ baseTitle: names.inflow, nodeId, color: "#38bdf8", label: "φ_in", ...live });
  }
  return formatApproachSummary({
    title: `${names.inflow} · Pha 1`,
    counts: s1.p1Counts,
    area: s1.p1Area,
    phi: s1.phiIn1,
    color: "#fbbf24",
  });
}

// Phase-2 cross-street board; both nodes combine their north and south legs.
// Continuous mode prefers live telemetry so the board tracks the sim.
function formatNorthSummary(stepData, sim, simMode, nodeId = 1) {
  const names = boardNames(nodeId);
  const s1 = stepData?.step1;
  if (simMode === "continuous" || !s1) {
    if (!sim) return { title: names.cross, metric: "--", color: "#64748b" };
    const t = getCorridorTelemetry(sim);
    const live = nodeId === 2
      ? { phi: t.phiNode2P2, count: t.n2P2Count }
      : { phi: t.phiNode1P2, count: t.n1P2Count };
    return formatLiveSummary({ baseTitle: names.cross, nodeId, color: "#38bdf8", label: "φ", ...live });
  }
  return formatApproachSummary({
    title: `${names.cross} · Pha 2`,
    counts: s1.p2Counts,
    area: s1.p2Area,
    phi: s1.phiIn2,
    color: "#38bdf8",
  });
}

// Two curbside HUD boards; west kept in frame at junction1 camera.
function buildHudBoards(scene) {
  const west = makeTextBoard(-21, 4.5, 6);
  const north = makeTextBoard(-16, 4, -12);
  scene.add(west.sprite);
  scene.add(north.sprite);
  paintBoard(west, "West: --");
  paintBoard(north, "North: --");
  return { west, north };
}

// Repaint HUD only when step/telemetry data changes (never per frame).
// Continuous mode repaints live telemetry; stepper mode prefers step data.
function refreshHudBoards(hud, stepData, sim, simMode, nodeId = 1) {
  if (!hud) return;
  paintBoard(hud.west, formatWestSummary(stepData, sim, simMode, nodeId));
  paintBoard(hud.north, formatNorthSummary(stepData, sim, simMode, nodeId));
}

// Step1: cyan translucent planes over west + north approaches.
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

// Step2: red arrow above corridor pointing west + small red board.
function buildStep2Overlay(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#ef4444" });
  mat.emissiveIntensity = 0.6;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5, 10), mat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0, 5, 0);
  group.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 12), mat);
  head.rotation.z = Math.PI / 2;
  head.position.set(-3.2, 5, 0);
  group.add(head);
  const board = makeTextBoard(0, 3.4, 5);
  paintBoard(board, "Doi nguoc ha luu", "#ef4444");
  group.add(board.sprite);
  group.visible = false;
  scene.add(group);
  return { group };
}

// Step3: two vertical bars at node1 scaled by gamma1/gamma2.
function buildStep3Overlay(scene) {
  const group = new THREE.Group();
  const g1Mat = new THREE.MeshStandardMaterial({ color: "#10b981", emissive: "#10b981" });
  g1Mat.emissiveIntensity = 0.5;
  const g2Mat = new THREE.MeshStandardMaterial({ color: "#64748b", emissive: "#64748b" });
  g2Mat.emissiveIntensity = 0.4;
  const geo = new THREE.BoxGeometry(0.8, 1, 0.8);
  const b1 = new THREE.Mesh(geo.clone(), g1Mat);
  b1.position.set(-16.6, 0.5, 0);
  group.add(b1);
  const b2 = new THREE.Mesh(geo.clone(), g2Mat);
  b2.position.set(-15.4, 0.5, 0);
  group.add(b2);
  group.visible = false;
  scene.add(group);
  return { group, b1, b2 };
}

// Step4: floating phase split board near node1.
function buildStep4Overlay(scene) {
  const group = new THREE.Group();
  const board = makeTextBoard(-16, 5, 4);
  paintBoard(board, "P1: 56 s | P2: 56 s");
  group.add(board.sprite);
  group.visible = false;
  scene.add(group);
  return { group, board };
}

// Step5: green boxes across intersection pointing east.
function buildStep5Overlay(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: "#10b981", emissive: "#10b981" });
  mat.emissiveIntensity = 0.7;
  const releaseBoxes = [];
  for (let i = 0; i < 3; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.6), mat);
    box.position.set(-19 + i * 2, 0.5, 0);
    group.add(box);
    releaseBoxes.push(box);
  }
  const releaseHead = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 10), mat);
  releaseHead.rotation.z = -Math.PI / 2;
  releaseHead.position.set(-11.8, 0.5, 0);
  group.add(releaseHead);
  group.visible = false;
  scene.add(group);
  return { group, releaseBoxes, releaseHead };
}

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

// Assemble HUD plus all step groups into one rig object.
function createOverlayRig(scene) {
  const hud = buildHudBoards(scene);
  const s1 = buildStep1Overlay(scene);
  const s2 = buildStep2Overlay(scene);
  const s3 = buildStep3Overlay(scene);
  const s4 = buildStep4Overlay(scene);
  const s5 = buildStep5Overlay(scene);
  // lastNode null forces the first overlay pass to anchor the rig.
  return { hud, s1, s2, s3, s4, s5, lastNode: null };
}

// Refresh data-driven overlay sizes/texts on data change only.
function refreshOverlayData(rig, stepData) {
  if (!rig) return;
  const g1 = stepData?.step3?.gamma1 ?? 1;
  const g2 = stepData?.step3?.gamma2 ?? 1;
  const h1 = Math.max(0.2, Math.min(4, g1 * 1.6));
  const h2 = Math.max(0.2, Math.min(4, g2 * 1.6));
  rig.s3.b1.scale.y = h1;
  rig.s3.b1.position.y = h1 / 2;
  rig.s3.b2.scale.y = h2;
  rig.s3.b2.position.y = h2 / 2;
  const p1 = stepData?.step4?.g1 ?? 56;
  const p2 = stepData?.step4?.g2 ?? 56;
  paintBoard(rig.s4.board, `P1: ${p1} s | P2: ${p2} s`);
}

// Toggle step overlays; pulse handled via time, no texture redraw here.
function updateStepOverlays(rig, step, stepData, simMode, subPhase, time) {
  if (!rig) return;
  const show = simMode === "stepper" && subPhase === "freeze";
  const cur = show ? step : 0;
  rig.s1.group.visible = cur === 1;
  rig.s2.group.visible = cur === 2;
  rig.s3.group.visible = cur === 3;
  rig.s4.group.visible = cur === 4;
  rig.s5.group.visible = cur === 5;
  if (rig.s1.group.visible) rig.s1.mat.opacity = 0.22 + 0.12 * Math.sin(time * 4);
  void stepData;
}

// Pick lead eastbound vehicle mesh for chase cam (max x).
function findChaseMesh(vehicleMeshes, sim) {
  if (!vehicleMeshes || vehicleMeshes.size === 0) return null;
  const list = sim?.vehicles;
  if (!list || list.length === 0) return null;
  let lead = null;
  for (const v of list) {
    const lane = v.approach === "west" || v.approach === "corridor" || v.direction === "east";
    if (!lane) continue;
    if (!lead || v.x > lead.x) lead = v;
  }
  if (!lead) return null;
  return vehicleMeshes.get(lead.id) ?? null;
}

// Resolve world pos/look for a preset; null means free (no auto move).
function resolveCameraTarget(presetName, vehicleMeshes, sim) {
  if (presetName === "junction1") {
    return { pos: [...CAMERA_PRESETS.junction1.pos], look: [...CAMERA_PRESETS.junction1.look] };
  }
  if (presetName === "node2") {
    return { pos: [...CAMERA_PRESETS.node2.pos], look: [...CAMERA_PRESETS.node2.look] };
  }
  if (presetName === "corridor") {
    return { pos: [...CAMERA_PRESETS.corridor.pos], look: [...CAMERA_PRESETS.corridor.look] };
  }
  if (presetName === "chase") {
    const mesh = findChaseMesh(vehicleMeshes, sim);
    if (!mesh) {
      return { pos: [...CAMERA_PRESETS.overview.pos], look: [...CAMERA_PRESETS.overview.look] };
    }
    const p = mesh.position;
    return { pos: [p.x - 6, p.y + 3, p.z], look: [p.x, p.y, p.z] };
  }
  if (presetName === "free") return null;
  return { pos: [...CAMERA_PRESETS.overview.pos], look: [...CAMERA_PRESETS.overview.look] };
}

// Smoothly move camera toward target and look at lerped focus.
function updateCinematicCamera(camera, rig, target) {
  if (!camera || !rig || !target) return;
  _camPos.set(target.pos[0], target.pos[1], target.pos[2]);
  _camLook.set(target.look[0], target.look[1], target.look[2]);
  camera.position.lerp(_camPos, 0.08);
  rig.currentLook.lerp(_camLook, 0.08);
  camera.lookAt(rig.currentLook);
}

// Hold auto-lerp while dragging/panning, in free mode, or after user orbit.
// Preset change clears user control; never time-based so no snap-back.
function shouldHoldCamera(rig, presetName) {
  if (!rig || rig.dragging || rig.panning) return true;
  if (presetName === "free") return true;
  if (presetName !== rig.lastPreset) {
    rig.lastPreset = presetName;
    rig.isUserControlled = false;
    return false;
  }
  if (rig.isUserControlled === true) return true;
  return false;
}

// Rotate camera around focus from drag delta (azimuth/polar).
function orbitByDelta(camera, rig, dx, dy) {
  const off = camera.position.clone().sub(rig.currentLook);
  const radius = off.length();
  if (!radius) return;
  let theta = Math.atan2(off.x, off.z);
  const phiRaw = Math.acos(Math.min(1, Math.max(-1, off.y / radius)));
  const phi = Math.min(1.45, Math.max(0.15, phiRaw - dy * 0.005));
  theta -= dx * 0.005;
  const s = Math.sin(phi);
  camera.position.set(
    rig.currentLook.x + radius * s * Math.sin(theta),
    rig.currentLook.y + radius * Math.cos(phi),
    rig.currentLook.z + radius * s * Math.cos(theta)
  );
  camera.lookAt(rig.currentLook);
}

// Dolly along view ray with clamped distance 8..80.
function dollyCamera(camera, rig, deltaY) {
  const off = camera.position.clone().sub(rig.currentLook);
  const radius = off.length();
  if (!radius) return;
  const next = Math.min(80, Math.max(8, radius * (1 + deltaY * 0.001)));
  off.setLength(next);
  camera.position.copy(rig.currentLook).add(off);
  camera.lookAt(rig.currentLook);
}

// Intersect cursor ray with ground plane, return hit or null.
function groundHit(camera, clientX, clientY, canvas) {
  if (!camera || !canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  _mouse.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  _raycaster.setFromCamera(_mouse, camera);
  const hit = new THREE.Vector3();
  if (!_raycaster.ray.intersectPlane(_groundPlane, hit)) return null;
  return hit;
}

// Zoom toward cursor: pull focus to ground hit on zoom-in, then dolly.
function zoomToCursor(camera, rig, deltaY, clientX, clientY, canvas) {
  if (!camera || !rig || !canvas) return;
  const hit = groundHit(camera, clientX, clientY, canvas);
  if (hit && deltaY < 0) rig.currentLook.lerp(hit, 0.15);
  const off = camera.position.clone().sub(rig.currentLook);
  const radius = off.length();
  if (!radius) return;
  const next = Math.min(80, Math.max(6, radius * (1 + deltaY * 0.001)));
  off.setLength(next);
  camera.position.copy(rig.currentLook).add(off);
  camera.lookAt(rig.currentLook);
}

// Pan camera and focus on ground plane from drag delta.
function panByDelta(camera, rig, dx, dy) {
  const off = camera.position.clone().sub(rig.currentLook);
  const dist = off.length();
  if (!dist) return;
  // Scale drag pixels by distance for consistent feel.
  const factor = dist / 600;
  const up = camera.up.clone().normalize();
  // Right vector perpendicular to view on horizontal plane.
  const right = new THREE.Vector3().crossVectors(up, off).normalize();
  if (!right.lengthSq()) return;
  // Ground-plane forward derived from right and world up.
  const worldY = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3().crossVectors(right, worldY).normalize();
  if (!forward.lengthSq()) return;
  // Combine strafe and forward shift then move eye and target.
  const move = new THREE.Vector3()
    .addScaledVector(right, dx * factor)
    .addScaledVector(forward, -dy * factor);
  camera.position.add(move);
  rig.currentLook.add(move);
  camera.lookAt(rig.currentLook);
}

// Mark orbit interaction for hold logic and parent sync.
function markOrbitInteract(rig, onCameraInteract) {
  rig.lastInteract = performance.now();
  rig.isUserControlled = true;
  onCameraInteract?.();
}

// Build pointermove handler sharing drag state with pointerdown.
function createMoveHandler(camera, rig, state, onCameraInteract) {
  return (e) => {
    // Flag orbit drag so click spawn can be suppressed.
    const moved = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
    if (moved > 4) rig.hasDragged = true;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    if (rig.panning) {
      panByDelta(camera, rig, dx, dy);
      state.lastX = e.clientX; state.lastY = e.clientY;
      markOrbitInteract(rig, onCameraInteract);
      return;
    }
    if (!rig.dragging) return;
    orbitByDelta(camera, rig, dx, dy);
    state.lastX = e.clientX; state.lastY = e.clientY;
    markOrbitInteract(rig, onCameraInteract);
  };
}

// Build wheel handler with cursor-anchored zoom.
function createWheelHandler(canvas, camera, rig, onCameraInteract) {
  return (e) => {
    e.preventDefault();
    zoomToCursor(camera, rig, e.deltaY, e.clientX, e.clientY, canvas);
    markOrbitInteract(rig, onCameraInteract);
  };
}

// Build orbit handlers without touching DOM listeners.
function createOrbitHandlers(canvas, camera, rig, onCameraInteract) {
  const state = { lastX: 0, lastY: 0, startX: 0, startY: 0 };
  // Block menu so right-drag pans without interruption.
  const onContext = (e) => e.preventDefault();
  const onDown = (e) => {
    state.lastX = e.clientX; state.lastY = e.clientY;
    state.startX = e.clientX; state.startY = e.clientY;
    rig.hasDragged = false;
    if (e.button === 2 || e.shiftKey) rig.panning = true;
    else rig.dragging = true;
  };
  const onMove = createMoveHandler(camera, rig, state, onCameraInteract);
  const onUp = () => {
    if (!rig.dragging && !rig.panning) return;
    rig.dragging = false; rig.panning = false;
    rig.lastInteract = performance.now();
  };
  const onWheel = createWheelHandler(canvas, camera, rig, onCameraInteract);
  // Focus ground point on double-click and reset distance to 18.
  const onDblClick = (e) => {
    const hit = groundHit(camera, e.clientX, e.clientY, canvas);
    if (!hit) return;
    rig.currentLook.copy(hit);
    const off = camera.position.clone().sub(rig.currentLook);
    if (!off.lengthSq()) off.set(0, 1, 1);
    off.setLength(18);
    camera.position.copy(rig.currentLook).add(off);
    camera.lookAt(rig.currentLook);
    rig.lastInteract = performance.now();
  };
  return { onDown, onMove, onUp, onWheel, onDblClick, onContext };
}

// Minimal orbit controls: left-drag orbits, right/shift-drag pans, wheel zooms.
function attachOrbit(canvas, camera, rig, onCameraInteract) {
  if (!canvas || !camera || !rig) return () => {};
  // Delegate state logic to factory, keep only listener wiring here.
  const h = createOrbitHandlers(canvas, camera, rig, onCameraInteract);
  canvas.addEventListener("contextmenu", h.onContext);
  canvas.addEventListener("pointerdown", h.onDown);
  window.addEventListener("pointermove", h.onMove);
  window.addEventListener("pointerup", h.onUp);
  canvas.addEventListener("wheel", h.onWheel, { passive: false });
  canvas.addEventListener("dblclick", h.onDblClick);
  return () => {
    canvas.removeEventListener("contextmenu", h.onContext);
    canvas.removeEventListener("pointerdown", h.onDown);
    window.removeEventListener("pointermove", h.onMove);
    window.removeEventListener("pointerup", h.onUp);
    canvas.removeEventListener("wheel", h.onWheel);
    canvas.removeEventListener("dblclick", h.onDblClick);
  };
}

// Create renderer, camera, lights, ground and roads.
function initThreeScene(container) {
  if (!container) return null;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor("#090d16");
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 360;
  renderer.setSize(width, height);
  const canvas = renderer.domElement;
  canvas.className = "w-full h-full block";
  container.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#090d16");
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
  camera.position.set(0, 28, 30);
  camera.lookAt(0, 0, 0);
  buildLights(scene);
  buildGround(scene);
  buildRoads(scene);
  return { renderer, scene, camera };
}

// Overlay pass factory: owns the repaint bookkeeping so the render loop stays
// short. Node switches reposition the meshes and repaint the boards, otherwise
// textures are only redrawn when the underlying data object actually changes.
function createOverlayPass(rig) {
  let lastData = null;
  let lastNode = null;
  return (frame) => {
    const { sim, mode, step, data, subPhase, nodeId, frameCount, time } = frame;
    if (rig.lastNode !== nodeId) {
      rig.lastNode = nodeId;
      positionOverlaysForNode(rig, nodeId);
    }
    if (data !== lastData || nodeId !== lastNode) {
      lastData = data;
      lastNode = nodeId;
      refreshHudBoards(rig.hud, data, sim, mode, nodeId);
      refreshOverlayData(rig, data);
    } else if (sim && frameCount % 60 === 0 && (!data || mode === "continuous")) {
      refreshHudBoards(rig.hud, data, sim, mode, nodeId);
    }
    updateStepOverlays(rig, step, data, mode, subPhase, time);
  };
}

// Advance sim, sync vehicles/signals, emit throttled telemetry.
function startRenderLoop(ctx, simRef, playRef, speedRef, telemetryRef, vehicleMeshes, signalState, presetRef, cameraRig, overlayRig, modeRef, stepRef, dataRef, subRef, nodeRef) {
  let lastTime = performance.now();
  let frameCount = 0;
  let animId = 0;
  const overlayPass = createOverlayPass(overlayRig);
  const render = (now) => {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    const sim = unwrapSim(simRef);
    const isStepperMotion = modeRef?.current === "stepper" && sim?.stepper?.active && sim.stepper.subPhase === "motion";
    if (sim && (playRef.current || isStepperMotion)) {
      updateCorridorSim(sim, dt * (speedRef.current || 1));
    }
    if (sim) {
      syncVehicles(ctx.scene, vehicleMeshes, sim);
      updateSignals(signalState, sim);
    }
    if (overlayRig) {
      overlayPass({
        sim,
        mode: modeRef?.current ?? "continuous",
        step: stepRef?.current ?? 1,
        data: dataRef?.current ?? null,
        subPhase: subRef?.current ?? "freeze",
        nodeId: nodeRef?.current ?? 1,
        frameCount,
        time: now / 1000,
      });
    }
    const presetName = presetRef?.current ?? "overview";
    if (!shouldHoldCamera(cameraRig, presetName)) {
      const target = resolveCameraTarget(presetName, vehicleMeshes, sim);
      updateCinematicCamera(ctx.camera, cameraRig, target);
    }
    frameCount += 1;
    if (sim && frameCount % 10 === 0) {
      telemetryRef.current?.(getCorridorTelemetry(sim));
    }
    ctx.renderer.render(ctx.scene, ctx.camera);
    animId = requestAnimationFrame(render);
  };
  animId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(animId);
}

// Raycast click to ground, map back to sim and spawn.
function handleWorldClick(e, ctx, simRef, typeRef, spawnRef, telemetryRef, cameraRig) {
  // Suppress ghost spawn when click follows an orbit drag.
  if (cameraRig?.hasDragged) {
    cameraRig.hasDragged = false;
    return;
  }
  const sim = unwrapSim(simRef);
  if (!sim || !ctx) return;
  const rect = ctx.renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, ctx.camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, hit)) return;
  const { x, y } = worldToSim(hit.x, hit.z);
  const approach = getApproachAt(x, y);
  if (!approach) return;
  // Snap to lane center: keep longitudinal click, fix lateral axis.
  const isEastWest = approach === "west" || approach === "corridor";
  const spawnX = isEastWest ? x : LANE_DEFAULTS[approach].x;
  const spawnY = isEastWest ? LANE_DEFAULTS[approach].y : y;
  spawnVehicle(sim, { approach, type: typeRef.current || "car", x: spawnX, y: spawnY });
  spawnRef.current?.(approach, typeRef.current);
  telemetryRef.current?.(getCorridorTelemetry(sim));
}

// Keep the renderer in step with the container box; returns observer for teardown.
function observeResize(container, ctx) {
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) continue;
      if (!ctx?.renderer || !ctx?.camera) continue;
      ctx.renderer.setSize(width, height);
      ctx.camera.aspect = width / height;
      ctx.camera.updateProjectionMatrix();
    }
  });
  ro.observe(container);
  return ro;
}

// Hook owning renderer lifecycle, loop and click wiring.
function useThreeLoop(containerRef, simRef, isPlaying, simSpeed, onTelemetry, selectedType, onSpawn, presetRef, modeRef, stepRef, dataRef, subRef, selectedNode, onUserOrbit) {
  const playRef = useRef(isPlaying);
  playRef.current = isPlaying;
  const speedRef = useRef(simSpeed);
  speedRef.current = simSpeed;
  const telemetryRef = useRef(onTelemetry);
  telemetryRef.current = onTelemetry;
  const typeRef = useRef(selectedType);
  typeRef.current = selectedType;
  const spawnRef = useRef(onSpawn);
  spawnRef.current = onSpawn;
  const userOrbitRef = useRef(onUserOrbit);
  userOrbitRef.current = onUserOrbit;
  const nodeRef = useRef(selectedNode);
  nodeRef.current = selectedNode;
  useEffect(() => {
    const container = containerRef.current;
    const ctx = initThreeScene(container);
    if (!ctx) return undefined;
    const vehicleMeshes = new Map();
    const signalState = buildSignalPoles(ctx.scene);
    const overlayRig = createOverlayRig(ctx.scene);
    const cameraRig = createCameraRig();
    const detachOrbit = attachOrbit(ctx.renderer.domElement, ctx.camera, cameraRig, () => userOrbitRef.current?.());
    const onClick = (e) => handleWorldClick(e, ctx, simRef, typeRef, spawnRef, telemetryRef, cameraRig);
    ctx.renderer.domElement.addEventListener("click", onClick);
    const stopLoop = startRenderLoop(ctx, simRef, playRef, speedRef, telemetryRef, vehicleMeshes, signalState, presetRef, cameraRig, overlayRig, modeRef, stepRef, dataRef, subRef, nodeRef);
    const ro = observeResize(container, ctx);
    return () => {
      ro.disconnect();
      ctx.renderer.domElement.removeEventListener("click", onClick);
      detachOrbit();
      stopLoop();
      vehicleMeshes.clear();
      // Free geometries, materials and canvas textures before the context goes.
      disposeThreeScene(ctx.scene);
      ctx.renderer.dispose();
      if (container.contains(ctx.renderer.domElement)) container.removeChild(ctx.renderer.domElement);
    };
  }, [containerRef, simRef]);
}

// 3D scene core: roads, curbside HUD boards and stepper overlays.
export default function Corridor3DCanvas({
  simRef,
  isPlaying = false,
  simSpeed = 1,
  selectedType = "car",
  selectedNode = 1,
  onSpawn,
  onTelemetry,
  simMode = "continuous",
  currentStep = 1,
  stepData = null,
  subPhase = "freeze",
  cameraPreset = "default",
  onCameraPreset,
}) {
  const containerRef = useRef(null);
  const modeRef = useRef(simMode);
  modeRef.current = simMode;
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;
  const dataRef = useRef(stepData);
  dataRef.current = stepData;
  const subRef = useRef(subPhase);
  subRef.current = subPhase;
  const presetRef = useRef(cameraPreset);
  presetRef.current = cameraPreset;
  // Stable orbit callback via ref mirror; notifies parent to sync label.
  const onPresetRef = useRef(onCameraPreset);
  onPresetRef.current = onCameraPreset;
  const orbitRef = useRef(null);
  if (!orbitRef.current) orbitRef.current = () => onPresetRef.current?.("free");
  useThreeLoop(containerRef, simRef, isPlaying, simSpeed, onTelemetry, selectedType, onSpawn, presetRef, modeRef, stepRef, dataRef, subRef, selectedNode, orbitRef.current);
  return <div ref={containerRef} className="w-full h-full relative" />;
}
