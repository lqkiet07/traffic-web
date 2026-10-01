import assert from "node:assert";
import {
  createCorridorSim,
  spawnVehicle,
  updateCorridorSim,
  resetCorridorSim,
  getCorridorTelemetry,
  recalculateNode,
  VEHICLE_SPECS,
} from "../src/lib/corridorSim.js";

// Test 1: Initialize sim - check initial node signals
{
  const sim = createCorridorSim();
  assert.strictEqual(sim.algo, "cao");
  assert.strictEqual(sim.time, 0);
  assert.strictEqual(sim.throughput, 0);
  assert.strictEqual(sim.vehicles.length, 0);

  const n1 = sim.nodes.node1;
  const n2 = sim.nodes.node2;
  assert.strictEqual(n1.g1, 56);
  assert.strictEqual(n1.g2, 56);
  assert.strictEqual(n1.phase, 1);
  assert.strictEqual(n1.timeRemaining, 56);

  assert.strictEqual(n2.g1, 56);
  assert.strictEqual(n2.g2, 56);
  assert.strictEqual(n2.phase, 1);
  assert.strictEqual(n2.timeRemaining, 56);

  const t = getCorridorTelemetry(sim);
  assert.strictEqual(t.phiNode1P1, 0);
  assert.strictEqual(t.phiCorridor, 0);
  assert.strictEqual(t.node1Green.g1, 56);
  assert.strictEqual(t.node1Green.phase, 1);
}

// Test 2: Spawn vehicles on west and corridor, check vehicle counts and specs
{
  const sim = createCorridorSim();
  const v1 = spawnVehicle(sim, { node: 1, approach: "west", type: "car" });
  const v2 = spawnVehicle(sim, { node: 2, approach: "corridor", type: "truck" });

  assert.strictEqual(sim.vehicles.length, 2);
  assert.strictEqual(v1.length, VEHICLE_SPECS.car.length);
  assert.strictEqual(v1.width, VEHICLE_SPECS.car.width);
  assert.strictEqual(v1.maxSpeed, VEHICLE_SPECS.car.maxSpeed);
  assert.strictEqual(v1.direction, "east");

  assert.strictEqual(v2.length, VEHICLE_SPECS.truck.length);
  assert.strictEqual(v2.area, VEHICLE_SPECS.truck.area);
  assert.strictEqual(v2.direction, "east");
}

// Test 3: Red light stopping on north1 (red when phase=1)
{
  const sim = createCorridorSim();
  const vNorth = spawnVehicle(sim, { node: 1, approach: "north1", type: "car", y: 80 });
  assert.ok(vNorth.speed > 0);

  for (let i = 0; i < 20; i++) {
    updateCorridorSim(sim, 0.5);
  }

  assert.strictEqual(vNorth.speed, 0, "Vehicle should stop on red light");
  assert.ok(vNorth.y <= vNorth.stopLine, `Vehicle stopped before stopline: y=${vNorth.y}, stopLine=${vNorth.stopLine}`);
  assert.ok(vNorth.y >= vNorth.stopLine - 25, "Vehicle stopped near stopline");
}

// Test 4: Green light passing on west (green when phase=1)
{
  const sim = createCorridorSim();
  const vWest = spawnVehicle(sim, { node: 1, approach: "west", type: "car", x: 180 });

  for (let i = 0; i < 10; i++) {
    updateCorridorSim(sim, 0.5);
  }

  assert.ok(vWest.x > vWest.stopLine, `Vehicle passed stopline: x=${vWest.x}, stopLine=${vWest.stopLine}`);
  assert.ok(vWest.speed > 0, "Vehicle kept moving on green");
}

// Test 5: Downstream pressure test
{
  const sim = createCorridorSim({ algo: "cao" });
  spawnVehicle(sim, { node: 1, approach: "west", type: "car" });
  spawnVehicle(sim, { node: 1, approach: "west", type: "car" });
  spawnVehicle(sim, { node: 1, approach: "north1", type: "car" });
  spawnVehicle(sim, { node: 1, approach: "north1", type: "car" });

  recalculateNode(sim, 1);
  const g1Zero = sim.nodes.node1.g1;

  for (let i = 0; i < 6; i++) {
    spawnVehicle(sim, { node: 2, approach: "corridor", type: "truck", x: 300 + i * 40 });
  }

  recalculateNode(sim, 1);
  assert.ok(
    sim.nodes.node1.g1 < g1Zero,
    `CAO g1 with corridor trucks (${sim.nodes.node1.g1}) should be less than g1 without (${g1Zero})`
  );

  const t = getCorridorTelemetry(sim);
  assert.ok(t.phiCorridor > 0.5, "Corridor occupancy should be high with 6 trucks");
}

// Test 6: Reset and baseline comparison
{
  const sim = createCorridorSim({ algo: "baseline" });
  spawnVehicle(sim, { node: 1, approach: "west", type: "car" });
  spawnVehicle(sim, { node: 1, approach: "north1", type: "car" });
  recalculateNode(sim, 1);
  const baseG1 = sim.nodes.node1.g1;

  for (let i = 0; i < 6; i++) {
    spawnVehicle(sim, { node: 2, approach: "corridor", type: "truck" });
  }
  recalculateNode(sim, 1);
  assert.strictEqual(
    sim.nodes.node1.g1,
    baseG1,
    "Baseline does not reduce g1 due to corridor downstream occupancy"
  );

  resetCorridorSim(sim);
  assert.strictEqual(sim.vehicles.length, 0);
  assert.strictEqual(sim.time, 0);
  assert.strictEqual(sim.throughput, 0);
  assert.strictEqual(sim.nodes.node1.timeRemaining, 56);
}

console.log("[corridor_sim.test] all assertions passed");
