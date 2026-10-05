import assert from "node:assert";
import {
  createCorridorSim,
  resetCorridorSim,
  spawnVehicle,
  recalculateNode,
  getCorridorTelemetry,
} from "../src/lib/corridorSim.js";

function applyPreset(sim, key) {
  resetCorridorSim(sim);
  if (key === "paradox") {
    for (let i = 0; i < 26; i++) spawnVehicle(sim, { approach: "west", type: "moto", x: 205 - Math.floor(i / 3) * 16 });
    for (let i = 0; i < 18; i++) spawnVehicle(sim, { approach: "north1", type: "moto", y: 125 - i * 6 });
  } else if (key === "corridor_jam") {
    for (let i = 0; i < 6; i++) spawnVehicle(sim, { approach: "corridor", type: "truck", x: 500 - i * 42 });
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "car", x: 170 - i * 36 });
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "north1", type: "car", y: 120 - i * 25 });
  } else if (key === "balanced") {
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "car", x: 170 - i * 32 });
    for (let i = 0; i < 8; i++) spawnVehicle(sim, { approach: "west", type: "moto", x: 65 - i * 8 });
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "corridor", type: "car", x: 480 - i * 40 });
    for (let i = 0; i < 6; i++) spawnVehicle(sim, { approach: "north1", type: "moto", y: 120 - i * 16 });
  }
  recalculateNode(sim, 1);
  recalculateNode(sim, 2);
}

// Check paradox scenario: motorcycle swarm occlusion — CAO full-area green vs baseline Bbox-cut green.
// Both live timing (recalculateNode) and stepper (step4) source baseline from
// camera Bbox visible counts, so the occlusion contrast holds at node level.
{
  const simCao = createCorridorSim({ algo: "cao" });
  applyPreset(simCao, "paradox");
  const simBase = createCorridorSim({ algo: "baseline" });
  applyPreset(simBase, "paradox");

  assert.ok(
    simCao.nodes.node1.g1 > simBase.nodes.node1.g1,
    `CAO g1 (${simCao.nodes.node1.g1}) should be higher than Baseline g1 (${simBase.nodes.node1.g1}) for paradox`
  );
}

// Check corridor_jam scenario: high corridor occupancy, Node 1 squeezed to 10s, Node 2 opened to 102s
{
  const sim = createCorridorSim({ algo: "cao" });
  applyPreset(sim, "corridor_jam");
  const telemetry = getCorridorTelemetry(sim);

  assert.ok(telemetry.phiCorridor >= 0.7, `phiCorridor should be >= 0.7 (got ${telemetry.phiCorridor})`);
  assert.strictEqual(sim.nodes.node1.g1, 10, "Node 1 must be squeezed to min green (10s) by backpressure");
  assert.strictEqual(sim.nodes.node2.g1, 102, "Node 2 should give max green (102s) to flush the jammed corridor");
}

// Check balanced scenario: 22 vehicles total
{
  const sim = createCorridorSim({ algo: "cao" });
  applyPreset(sim, "balanced");
  const telemetry = getCorridorTelemetry(sim);
  assert.strictEqual(telemetry.totalVehicles, 22);
}

console.log("[algorithm_lab_presets.test] all assertions passed");
