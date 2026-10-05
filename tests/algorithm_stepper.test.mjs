import assert from "node:assert";
import {
  createCorridorSim,
  spawnVehicle,
  getAlgorithmStepData,
  advanceSimStep,
  updateCorridorSim,
} from "../src/lib/corridorSim.js";
import { allocateCbmpGreen } from "../src/lib/cbmp.js";

// Test 1: Snapshot structure and contract for Node 1
{
  const sim = createCorridorSim();
  const data = getAlgorithmStepData(sim, 1);

  // Step 1: Area occupancy
  assert.ok(data.step1, "step1 should exist");
  assert.deepStrictEqual(data.step1.p1Counts, { moto: 0, car: 0, truck: 0 });
  assert.deepStrictEqual(data.step1.p2Counts, { moto: 0, car: 0, truck: 0 });
  assert.deepStrictEqual(data.step1.outCounts, { moto: 0, car: 0, truck: 0 });
  assert.strictEqual(typeof data.step1.p1Area, "number");
  assert.strictEqual(typeof data.step1.p2Area, "number");
  assert.strictEqual(typeof data.step1.outArea, "number");
  assert.strictEqual(typeof data.step1.phiIn1, "number");
  assert.strictEqual(typeof data.step1.phiIn2, "number");
  assert.strictEqual(typeof data.step1.phiOut, "number");

  // Step 2: Effective weight & back-pressure
  assert.ok(data.step2, "step2 should exist");
  assert.strictEqual(data.step2.turnRatio, 0.70);
  assert.strictEqual(typeof data.step2.backPressureDeduction, "number");
  assert.strictEqual(typeof data.step2.w1, "number");
  assert.strictEqual(typeof data.step2.w2, "number");

  // Step 3: Saturation pressure (Gamma)
  assert.ok(data.step3, "step3 should exist");
  assert.strictEqual(data.step3.cSat, 2.5);
  assert.strictEqual(data.step3.gamma1, 2.5 * data.step2.w1);
  assert.strictEqual(data.step3.gamma2, 2.5 * data.step2.w2);
  assert.strictEqual(data.step3.totalGamma, data.step3.gamma1 + data.step3.gamma2);

  // Step 4: Green split allocation
  assert.ok(data.step4, "step4 should exist");
  assert.strictEqual(data.step4.minGreen, 10);
  assert.strictEqual(data.step4.availRemainder, 92);
  assert.strictEqual(data.step4.totalCycle, 120);
  assert.strictEqual(data.step4.lostTime, 8);
  const expectedAlloc = allocateCbmpGreen(data.step3.gamma1, data.step3.gamma2);
  assert.strictEqual(data.step4.g1, expectedAlloc.g1);
  assert.strictEqual(data.step4.g2, expectedAlloc.g2);

  // Step 5: Active phase execution
  assert.ok(data.step5, "step5 should exist");
  assert.strictEqual(data.step5.activePhase, 1);
  assert.strictEqual(data.step5.greenDuration, data.step4.g1);
  assert.strictEqual(typeof data.step5.queueCount, "number");
}

// Test 2: Motorcycle swarm & CCTV occlusion paradox (26 west moto vs 18 north1 moto)
{
  const sim = createCorridorSim();
  for (let i = 0; i < 26; i++) {
    spawnVehicle(sim, { node: 1, approach: "west", type: "moto" });
  }
  for (let i = 0; i < 18; i++) {
    spawnVehicle(sim, { node: 1, approach: "north1", type: "moto" });
  }

  const data = getAlgorithmStepData(sim, 1);

  // Raw counts: 26-moto swarm west vs 18-moto north1
  assert.strictEqual(data.step1.p1Counts.moto, 26);
  assert.strictEqual(data.step1.p2Counts.moto, 18);

  // CCTV Bbox occlusion: ~13 visible (50% loss)
  assert.strictEqual(data.step1.occlusionP1.rawCount, 26);
  assert.strictEqual(data.step1.occlusionP1.visibleCount, 13);
  assert.strictEqual(data.step1.occlusionP1.lossPercentage, 50);

  // CAO full area: 26 * 1.5 = 39.0 vs 18 * 1.5 = 27.0
  assert.strictEqual(data.step1.p1Area, 39.0);
  assert.strictEqual(data.step1.p2Area, 27.0);

  // CAO allocates more green to Phase 1 (full area), baseline cuts early (visible count)
  assert.ok(
    data.step4.cbmp.g1 > data.step4.cbmp.g2,
    `CAO allocates more green to Phase 1 (${data.step4.cbmp.g1}s) than Phase 2 (${data.step4.cbmp.g2}s)`
  );
  assert.ok(
    data.step4.baseline.g1 < data.step4.cbmp.g1,
    `Baseline cuts early (${data.step4.baseline.g1}s) vs CAO full area (${data.step4.cbmp.g1}s)`
  );
}

// Test 3: Downstream back-pressure in Step 2 & 4
{
  const sim = createCorridorSim();
  for (let i = 0; i < 4; i++) {
    spawnVehicle(sim, { node: 1, approach: "west", type: "truck" });
  }
  const beforeBlocked = getAlgorithmStepData(sim, 1);
  assert.strictEqual(beforeBlocked.step1.phiOut, 0);
  assert.strictEqual(beforeBlocked.step2.backPressureDeduction, 0);

  // Add 6 trucks on corridor
  for (let i = 0; i < 6; i++) {
    spawnVehicle(sim, { node: 2, approach: "corridor", type: "truck" });
  }

  const afterBlocked = getAlgorithmStepData(sim, 1);
  assert.ok(afterBlocked.step1.phiOut > 0.5, "Corridor phiOut is high with 6 trucks");
  assert.ok(
    afterBlocked.step2.backPressureDeduction > 0,
    "Back pressure deduction is positive when downstream is occupied"
  );
  assert.ok(
    afterBlocked.step2.w1 < beforeBlocked.step2.w1,
    `w1 with downstream pressure (${afterBlocked.step2.w1}) should be less than without (${beforeBlocked.step2.w1})`
  );
  assert.ok(
    afterBlocked.step4.g1 < beforeBlocked.step4.g1,
    `g1 with downstream pressure (${afterBlocked.step4.g1}) should be less than without (${beforeBlocked.step4.g1})`
  );
}

// Test 4: advanceSimStep state transition and node signal updates
{
  const sim = createCorridorSim();
  for (let i = 0; i < 4; i++) {
    spawnVehicle(sim, { node: 1, approach: "west", type: "truck" });
  }

  advanceSimStep(sim, 1);
  assert.strictEqual(sim.stepper.currentStep, 1);
  assert.strictEqual(sim.stepper.active, true);
  assert.strictEqual(sim.stepper.subPhase, "motion");
  assert.strictEqual(sim.stepper.motionDuration, 1.5);
  assert.strictEqual(sim.stepper.motionElapsed, 0);

  advanceSimStep(sim, 2);
  assert.strictEqual(sim.stepper.currentStep, 2);
  assert.strictEqual(sim.stepper.subPhase, "motion");
  assert.strictEqual(sim.stepper.motionDuration, 1.5);

  advanceSimStep(sim, 3);
  assert.strictEqual(sim.stepper.currentStep, 3);
  assert.strictEqual(sim.stepper.subPhase, "freeze");
  assert.strictEqual(sim.stepper.motionDuration, 0);

  // Initial node1.g1 is 56 before step 4
  assert.strictEqual(sim.nodes.node1.g1, 56);

  advanceSimStep(sim, 4);
  assert.strictEqual(sim.stepper.currentStep, 4);
  assert.strictEqual(sim.stepper.subPhase, "motion");
  assert.strictEqual(sim.stepper.motionDuration, 0.8);
  assert.ok(sim.nodes.node1.g1 > 56, "step 4 recalculates and updates node1 g1");

  advanceSimStep(sim, 5);
  assert.strictEqual(sim.stepper.currentStep, 5);
  assert.strictEqual(sim.stepper.subPhase, "motion");
  assert.strictEqual(sim.stepper.motionDuration, 2.5);
  assert.strictEqual(
    sim.nodes.node1.timeRemaining,
    sim.nodes.node1.g1,
    "step 5 synchronizes timeRemaining with active green duration"
  );
}

// Test 5: LiveMathBox step math formulas contract
{
  const sim = createCorridorSim();
  for (let i = 0; i < 4; i++) spawnVehicle(sim, { node: 1, approach: "west", type: "truck" });
  for (let i = 0; i < 2; i++) spawnVehicle(sim, { node: 1, approach: "west", type: "car" });
  for (let i = 0; i < 6; i++) spawnVehicle(sim, { node: 1, approach: "corridor", type: "truck" });

  const stepData = getAlgorithmStepData(sim, 1);

  // Step 1 math
  const p1Area = stepData.step1.p1Counts.moto * 1.5 + stepData.step1.p1Counts.car * 7.5 + stepData.step1.p1Counts.truck * 18.0;
  assert.strictEqual(stepData.step1.p1Area, p1Area);
  assert.strictEqual(stepData.step1.phiIn1, Math.min(1.0, p1Area / 150));

  // Step 2 math
  const expectedW1 = Math.max(0, stepData.step1.phiIn1 - 0.70 * stepData.step1.phiOut);
  assert.strictEqual(stepData.step2.w1, expectedW1);
  assert.ok(stepData.step1.phiOut >= 0.70, "Downstream back-pressure trigger is active");

  // Step 3 math
  assert.strictEqual(stepData.step3.gamma1, 2.5 * stepData.step2.w1);

  // Step 4 math
  assert.strictEqual(typeof stepData.step4.g1, "number");
  assert.strictEqual(typeof stepData.step4.g2, "number");
  assert.strictEqual(stepData.step4.totalCycle, 120);

  // Step 5 math
  assert.strictEqual(stepData.step5.activePhase, 1);
  assert.strictEqual(stepData.step5.greenDuration, stepData.step4.g1);
}

// Test 6: motion-freeze lifecycle (step 1 motion 1.5s then freeze)
{
  const sim = createCorridorSim();
  spawnVehicle(sim, { approach: "west", type: "car", x: 100 });
  const startX = sim.vehicles[0].x;

  advanceSimStep(sim, 1);
  assert.strictEqual(sim.stepper.subPhase, "motion");

  updateCorridorSim(sim, 0.5);
  const afterMotionX = sim.vehicles[0].x;
  assert.ok(afterMotionX > startX, "vehicle advances during motion subPhase");

  updateCorridorSim(sim, 1.5);
  assert.strictEqual(sim.stepper.subPhase, "freeze");
  const frozenX = sim.vehicles[0].x;

  updateCorridorSim(sim, 0.5);
  assert.strictEqual(sim.vehicles[0].x, frozenX, "vehicle holds position during freeze");
}

// Test 7: spawn reset + 2-lane moto queuing (paradox preset)
{
  const sim = createCorridorSim();
  const westX = [30, 75, 120, 165];
  for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "truck", x: westX[i] });
  for (let i = 0; i < 12; i++) {
    spawnVehicle(sim, {
      approach: "north1",
      type: "moto",
      x: i % 2 === 0 ? 233 : 247,
      y: 125 - Math.floor(i / 2) * 14,
    });
  }
  for (let i = 0; i < 6; i++) spawnVehicle(sim, { approach: "south1", type: "moto", y: 195 + i * 20 });

  // After reset positions: west trucks at expected x
  const westTrucks = sim.vehicles.filter((v) => v.approach === "west");
  assert.strictEqual(westTrucks.length, 4);
  assert.deepStrictEqual(westTrucks.map((v) => v.x), westX);

  // North1 motos queue in 2 lanes (x 233/247)
  const northMotos = sim.vehicles.filter((v) => v.approach === "north1");
  assert.strictEqual(northMotos.length, 12);
  for (let i = 0; i < 12; i++) {
    const expectedX = i % 2 === 0 ? 233 : 247;
    const expectedY = 125 - Math.floor(i / 2) * 14;
    assert.strictEqual(northMotos[i].x, expectedX);
    assert.strictEqual(northMotos[i].y, expectedY);
  }
  assert.strictEqual(northMotos.filter((v) => v.x === 233).length, 6);
  assert.strictEqual(northMotos.filter((v) => v.x === 247).length, 6);

  // Occupancy from 4 trucks (72m2/150) gives phiIn1 near 0.48
  const data = getAlgorithmStepData(sim, 1);
  assert.strictEqual(data.step1.p1Area, 72);
  assert.ok(Math.abs(data.step1.phiIn1 - 0.48) < 1e-9, "phiIn1 is 0.48 for 4 trucks");

  // Step 1 motion 1.5s moves x forward then freezes
  advanceSimStep(sim, 1);
  assert.strictEqual(sim.stepper.subPhase, "motion");
  assert.strictEqual(sim.stepper.motionDuration, 1.5);
  const leadTruck = westTrucks[westTrucks.length - 1];
  const startLeadX = leadTruck.x;
  updateCorridorSim(sim, 0.5);
  assert.ok(leadTruck.x > startLeadX, "lead truck advances during motion");
  updateCorridorSim(sim, 1.5);
  assert.strictEqual(sim.stepper.subPhase, "freeze");
  const frozenLeadX = leadTruck.x;
  updateCorridorSim(sim, 0.5);
  assert.strictEqual(leadTruck.x, frozenLeadX, "lead truck holds position during freeze");
}

// Test 8: stepper stays pinned to Node 1 across steps 1..5 (paradox preset)
{
  const sim = createCorridorSim();
  const westX = [30, 75, 120, 165];
  for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "truck", x: westX[i] });
  for (let i = 0; i < 12; i++) {
    spawnVehicle(sim, {
      approach: "north1",
      type: "moto",
      x: i % 2 === 0 ? 233 : 247,
      y: 125 - Math.floor(i / 2) * 14,
    });
  }
  for (let step = 1; step <= 5; step++) {
    advanceSimStep(sim, step);
    const data = getAlgorithmStepData(sim, 1);
    assert.strictEqual(data.nodeId, 1, `step ${step} should stay on Node 1`);
    assert.strictEqual(data.step1.p1Counts.truck, 4, `step ${step} p1 truck count`);
    assert.strictEqual(data.step1.p1Area, 72, `step ${step} p1Area`);
    assert.ok(Math.abs(data.step2.w1 - 0.48) < 1e-9, `step ${step} w1 approx 0.48`);
  }
}

// Test 9: Node-2 corridor receiver role metadata (Dual-Node HUD Task 1)
{
  const sim = createCorridorSim();
  for (let i = 0; i < 4; i++) {
    spawnVehicle(sim, { node: 2, approach: "corridor", type: "truck", x: 400 + i * 30 });
  }
  const data = getAlgorithmStepData(sim, 2);
  assert.strictEqual(data.nodeId, 2);
  assert.strictEqual(data.isCorridorReceiver, true);
  assert.strictEqual(data.step1.p1Counts.truck, 4);
  assert.ok(data.step1.phiIn1 > 0.4, `phiIn1 (${data.step1.phiIn1}) should exceed 0.4`);
  assert.strictEqual(data.step1.phiOut, 0);
  assert.ok(data.step4.g1 > 56, `g1 (${data.step4.g1}) should exceed 56`);
}

// Test 10: baseline step4 contract (algo-aware allocation)
{
  const sim = createCorridorSim({ algo: "baseline" });
  for (let i = 0; i < 4; i++) spawnVehicle(sim, { node: 1, approach: "west", type: "truck" });
  for (let i = 0; i < 24; i++) spawnVehicle(sim, { node: 1, approach: "north1", type: "moto" });

  const data = getAlgorithmStepData(sim, 1);
  assert.strictEqual(data.step4.algo, "baseline");
  // 4 vehicles / 28 vehicles -> g1 = 10 + 92 * (4/28) = 23s (rounded)
  assert.strictEqual(data.step4.g1, 23);
  assert.strictEqual(data.step4.g2, 89);
  assert.strictEqual(data.step4.p1Count, 4);
  assert.strictEqual(data.step4.p2Count, 24);
  // CAO allocation preserved for comparison (72m2 vs 36m2 -> g1 = 10 + round(92*72/108) = 71)
  assert.strictEqual(data.step4.cbmp.g1, 71);
  assert.strictEqual(data.step4.baseline.g1, 23);
}

console.log("[algorithm_stepper.test] all assertions passed");
