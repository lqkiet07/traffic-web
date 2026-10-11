import assert from "node:assert";
import {
  createCorridorSim,
  applyPresetVehicles,
  getCorridorTelemetry,
  getAlgorithmStepData,
} from "../src/lib/corridorSim.js";

// Check paradox scenario: motorcycle swarm occlusion — CAO full-area green vs baseline Bbox-cut green.
// Both live timing (recalculateNode) and stepper (step4) source baseline from
// camera Bbox visible counts, so the occlusion contrast holds at node level.
{
  const simCao = createCorridorSim({ algo: "cao" });
  applyPresetVehicles(simCao, "paradox");
  const simBase = createCorridorSim({ algo: "baseline" });
  applyPresetVehicles(simBase, "paradox");

  assert.ok(
    simCao.nodes.node1.g1 > simBase.nodes.node1.g1,
    `CAO g1 (${simCao.nodes.node1.g1}) should be higher than Baseline g1 (${simBase.nodes.node1.g1}) for paradox`
  );
  assert.ok(
    simCao.vehicles.filter((v) => v.node === 1).length >= 26,
    "Node 1 should have >= 26 vehicles in paradox"
  );
  assert.ok(
    simCao.vehicles.filter((v) => v.node === 2).length >= 6,
    "Node 2 should have >= 6 vehicles in paradox"
  );
  const n2Step = getAlgorithmStepData(simCao, 2);
  assert.ok(
    n2Step.step4.p1Count > 0 || n2Step.step4.p2Count > 0,
    "Node 2 step data should reflect vehicles"
  );
}

// Check corridor_jam scenario: high corridor occupancy, Node 1 squeezed to 10s, Node 2 opened to 78s
{
  const sim = createCorridorSim({ algo: "cao" });
  applyPresetVehicles(sim, "corridor_jam");
  const telemetry = getCorridorTelemetry(sim);

  assert.ok(telemetry.phiCorridor >= 0.7, `phiCorridor should be >= 0.7 (got ${telemetry.phiCorridor})`);
  assert.strictEqual(sim.nodes.node1.g1, 10, "Node 1 must be squeezed to min green (10s) by backpressure");
  assert.strictEqual(sim.nodes.node2.g1, 78, "Node 2 should give 78s green considering corridor demand and cross traffic");
  assert.ok(
    sim.vehicles.filter((v) => v.approach === "north2" || v.approach === "south2").length > 0,
    "Node 2 should have cross traffic in corridor_jam"
  );
}

// Check balanced scenario: vehicles at both nodes
{
  const sim = createCorridorSim({ algo: "cao" });
  applyPresetVehicles(sim, "balanced");
  const telemetry = getCorridorTelemetry(sim);
  assert.ok(telemetry.totalVehicles >= 20, `Total vehicles should be >= 20 (got ${telemetry.totalVehicles})`);
  assert.ok(
    sim.vehicles.filter((v) => v.node === 1).length > 0 &&
    sim.vehicles.filter((v) => v.node === 2).length > 0,
    "Both Node 1 and Node 2 must have vehicles in balanced scenario"
  );
}

console.log("[algorithm_lab_presets.test] all assertions passed");
