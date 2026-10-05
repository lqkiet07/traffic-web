import assert from "node:assert";
import { createCorridorSim, seekSim, spawnVehicle, recalculateNode } from "../src/lib/corridorSim.js";

// Test 1: Seek at cycle 1 (sim.time = 0) to 30s -> Phase 1 green
{
  const sim = createCorridorSim();
  seekSim(sim, 30);
  assert.strictEqual(sim.time, 30);
  assert.strictEqual(sim.nodes.node1.phase, 1);
  assert.strictEqual(sim.nodes.node1.timeRemaining, sim.nodes.node1.g1 - 30);
  assert.strictEqual(sim.nodes.node1.isYellow, false);
}

// Test 2: Cycle preservation at cycle 3 (sim.time = 250s) seeking to 50s
{
  const sim = createCorridorSim();
  sim.time = 250;
  seekSim(sim, 50);
  assert.strictEqual(sim.time, 274);
  assert.strictEqual(Math.floor(sim.time / 112) + 1, 3);
}

// Test 3: Phase 2 transition at 70s (g1 = 64s, g2 = 48s)
{
  const sim = createCorridorSim();
  sim.nodes.node1.g1 = 64;
  sim.nodes.node1.g2 = 48;
  seekSim(sim, 70);
  assert.strictEqual(sim.nodes.node1.phase, 2);
  assert.strictEqual(sim.nodes.node1.timeRemaining, 112 - 70);
  assert.strictEqual(sim.nodes.node1.isYellow, false);
}

// Test 4: Yellow light warning within last 3s of Phase 1
{
  const sim = createCorridorSim();
  sim.nodes.node1.g1 = 64;
  seekSim(sim, 62);
  assert.strictEqual(sim.nodes.node1.phase, 1);
  assert.strictEqual(sim.nodes.node1.timeRemaining, 2);
  assert.strictEqual(sim.nodes.node1.isYellow, true);
}

// Test 5: Safe clamping (<0 to 0, >112 to 112)
{
  const sim = createCorridorSim();
  seekSim(sim, -10);
  assert.strictEqual(sim.time, 0);
  seekSim(sim, 200);
  assert.strictEqual(sim.time, 112);
}

// Test 6: Vehicles advance along with time when seeking
{
  const sim = createCorridorSim();
  spawnVehicle(sim, { approach: "west", type: "moto", x: 100, y: 170 });
  const startX = sim.vehicles[0].x;
  sim.initialVehicles = sim.vehicles.map((v) => ({ ...v }));

  seekSim(sim, 2);
  assert.strictEqual(sim.time, 2);
  assert.ok(
    sim.vehicles[0].x > startX,
    `Vehicle should advance forward during seek (start: ${startX}, after: ${sim.vehicles[0].x})`
  );
  assert.strictEqual(sim.vehicles[0].id, 1, "Vehicle ID must be preserved to prevent Three.js mesh churn");
}

// Test 7: Repeated seeks stay deterministic despite post-seek node replanning (poisoned g1)
{
  const sim = createCorridorSim();
  for (let i = 0; i < 26; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    spawnVehicle(sim, { approach: "west", type: "moto", x: 205 - row * 16, y: 162 + col * 8 });
  }
  for (let i = 0; i < 12; i++) {
    spawnVehicle(sim, { approach: "north1", type: "moto", x: 231 + ((i % 3) - 1) * 4, y: 130 - Math.floor(i / 3) * 11 });
  }
  for (let i = 0; i < 6; i++) {
    spawnVehicle(sim, { approach: "south1", type: "moto", x: 250 + ((i % 2) - 0.5) * 6, y: 195 + i * 14 });
  }
  recalculateNode(sim, 1);
  recalculateNode(sim, 2);
  sim.initialVehicles = sim.vehicles.map((v) => ({ ...v }));
  sim.initialThroughput = sim.throughput ?? 0;

  // First seek depletes west inflow; production sync() then replans nodes from depleted demand
  seekSim(sim, 31);
  assert.strictEqual(sim.vehicles.length, 18);
  recalculateNode(sim, 1);
  recalculateNode(sim, 2);
  assert.strictEqual(sim.nodes.node1.g1, 10);

  // Second seek MUST reproduce the same 18-vehicle state, not evacuate to 0
  seekSim(sim, 31);
  assert.strictEqual(sim.vehicles.length, 18);
  assert.strictEqual(sim.nodes.node1.phase, 1);
}

console.log("[lab_slider_seek.test] all assertions passed");
