import assert from "node:assert";
import { createCorridorSim, spawnVehicle, updateCorridorSim } from "../src/lib/corridorSim.js";

// 1. Lateral Drift: Motorcycle exhibits small lateral oscillation while moving
{
  const sim = createCorridorSim();
  const moto = spawnVehicle(sim, { approach: "west", type: "moto", x: 50, y: 170 });
  const initialY = moto.y;
  let hasDrifted = false;

  for (let i = 0; i < 30; i++) {
    updateCorridorSim(sim, 0.1);
    if (Math.abs(moto.y - initialY) > 0.3) {
      hasDrifted = true;
    }
  }

  assert.ok(hasDrifted, "Motorcycle should have subtle lateral drift while traveling");
  assert.ok(moto.y >= 160 && moto.y <= 180, "Lateral drift must remain within road boundaries");
}

// 2. Gap Filtering: Trailing motorcycle filters around stopped car to advance toward stop line
{
  const sim = createCorridorSim();
  // Stopped car on west approach before stop line (220)
  const car = spawnVehicle(sim, { approach: "west", type: "car", x: 200, y: 170 });
  car.speed = 0;

  // Trailing moto right behind the car on the same line
  const moto = spawnVehicle(sim, { approach: "west", type: "moto", x: 175, y: 170 });

  for (let i = 0; i < 30; i++) {
    updateCorridorSim(sim, 0.1);
  }

  assert.ok(
    Math.abs(moto.y - car.y) >= 4,
    `Motorcycle should filter sideways around stopped car (moto.y=${moto.y}, car.y=${car.y})`
  );
  assert.ok(
    moto.x > 180,
    `Motorcycle should advance past the car's tail after filtering (moto.x=${moto.x})`
  );
}

// 3. Yellow Light: Vehicles far from stopline (> 25) decelerate smoothly
{
  const sim = createCorridorSim();
  sim.nodes.node1.isYellow = true;
  sim.nodes.node1.phase = 1;
  const vFar = spawnVehicle(sim, { approach: "west", type: "car", x: 160, y: 170 });
  const initialSpeed = vFar.speed;

  for (let i = 0; i < 15; i++) {
    updateCorridorSim(sim, 0.1);
  }

  assert.ok(
    vFar.speed < initialSpeed,
    `Vehicle far from yellow signal must decelerate (initial=${initialSpeed}, current=${vFar.speed})`
  );
  assert.ok(vFar.x <= 220, "Vehicle far from yellow signal must not blow past stop line");
}

console.log("[swarming_and_yellow.test] all assertions passed.");
