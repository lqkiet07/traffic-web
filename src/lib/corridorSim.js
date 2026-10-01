import {
  computeOccupancy,
  computePressure,
  allocateCbmpGreen,
  allocateBaselineGreen,
  DEFAULT_ZONE_AREA,
  CYCLE_DURATION,
  LOST_TIME,
  MIN_GREEN,
  AVAILABLE_GREEN,
  C_SATURATION,
  VEHICLE_AREAS,
} from "./cbmp.js";

export const VEHICLE_SPECS = {
  moto: { length: 12, width: 6, maxSpeed: 60, area: 1.5 },
  car: { length: 24, width: 12, maxSpeed: 50, area: 7.5 },
  truck: { length: 44, width: 14, maxSpeed: 35, area: 18.0 },
};

const APPROACH_CONFIGS = {
  west: { node: 1, dir: "east", x: 0, y: 160, stopLine: 220 },
  corridor: { node: 2, dir: "east", x: 280, y: 160, stopLine: 540 },
  north1: { node: 1, dir: "south", x: 240, y: 0, stopLine: 140 },
  south1: { node: 1, dir: "north", x: 240, y: 320, stopLine: 180 },
  north2: { node: 2, dir: "south", x: 560, y: 0, stopLine: 140 },
  south2: { node: 2, dir: "north", x: 560, y: 320, stopLine: 180 },
};

export function createCorridorSim(options = {}) {
  const node1 = {
    id: 1,
    x: 240,
    y: 160,
    phase: 1,
    timer: 0,
    g1: 56,
    g2: 56,
    timeRemaining: 56,
  };
  const node2 = {
    id: 2,
    x: 560,
    y: 160,
    phase: 1,
    timer: 0,
    g1: 56,
    g2: 56,
    timeRemaining: 56,
  };
  const nodes = [node1, node2];
  nodes.node1 = node1;
  nodes.node2 = node2;

  return {
    algo: options.algo ?? "cao",
    nodes,
    vehicles: [],
    throughput: 0,
    time: 0,
    nextVehicleId: 1,
  };
}

export function resetCorridorSim(sim) {
  sim.vehicles = [];
  sim.throughput = 0;
  sim.time = 0;
  for (const node of [sim.nodes.node1, sim.nodes.node2]) {
    node.phase = 1;
    node.timer = 0;
    node.g1 = 56;
    node.g2 = 56;
    node.timeRemaining = 56;
  }
  return sim;
}

function countApproach(sim, approach) {
  const counts = { moto: 0, car: 0, truck: 0 };
  for (const v of sim.vehicles) {
    let currentApproach = v.approach;
    if (v.approach === "west" && v.x >= 240 && v.x < 560) {
      currentApproach = "corridor";
    }
    if (currentApproach === approach) {
      counts[v.type] = (counts[v.type] || 0) + 1;
    }
  }
  return counts;
}

function combineCounts(c1, c2) {
  return {
    moto: (c1.moto || 0) + (c2.moto || 0),
    car: (c1.car || 0) + (c2.car || 0),
    truck: (c1.truck || 0) + (c2.truck || 0),
  };
}

export function recalculateNode(sim, target) {
  const node = target === 2 || target === sim.nodes.node2 ? sim.nodes.node2 : sim.nodes.node1;
  const isNode1 = node.id === 1;

  const p1Counts = isNode1 ? countApproach(sim, "west") : countApproach(sim, "corridor");
  const p2Counts = isNode1
    ? combineCounts(countApproach(sim, "north1"), countApproach(sim, "south1"))
    : combineCounts(countApproach(sim, "north2"), countApproach(sim, "south2"));

  if (sim.algo === "baseline") {
    const allocation = allocateBaselineGreen(p1Counts, p2Counts);
    node.g1 = allocation.g1;
    node.g2 = allocation.g2;
    return;
  }

  const phiIn1 = computeOccupancy(p1Counts, DEFAULT_ZONE_AREA);
  const phiIn2 = computeOccupancy(p2Counts, DEFAULT_ZONE_AREA);
  const phiOut = isNode1 ? computeOccupancy(countApproach(sim, "corridor"), DEFAULT_ZONE_AREA) : 0;

  const gamma1 = computePressure(phiIn1, phiOut);
  const gamma2 = computePressure(phiIn2, 0);
  const allocation = allocateCbmpGreen(gamma1, gamma2);
  node.g1 = allocation.g1;
  node.g2 = allocation.g2;
}

export function getCorridorTelemetry(sim) {
  const n1P1 = countApproach(sim, "west");
  const n1P2 = combineCounts(countApproach(sim, "north1"), countApproach(sim, "south1"));
  const corridor = countApproach(sim, "corridor");
  const n2P2 = combineCounts(countApproach(sim, "north2"), countApproach(sim, "south2"));

  return {
    phiNode1P1: computeOccupancy(n1P1, DEFAULT_ZONE_AREA),
    phiNode1P2: computeOccupancy(n1P2, DEFAULT_ZONE_AREA),
    phiCorridor: computeOccupancy(corridor, DEFAULT_ZONE_AREA),
    phiNode2P2: computeOccupancy(n2P2, DEFAULT_ZONE_AREA),
    node1Green: {
      g1: sim.nodes.node1.g1,
      g2: sim.nodes.node1.g2,
      phase: sim.nodes.node1.phase,
      remaining: sim.nodes.node1.timeRemaining,
    },
    node2Green: {
      g1: sim.nodes.node2.g1,
      g2: sim.nodes.node2.g2,
      phase: sim.nodes.node2.phase,
      remaining: sim.nodes.node2.timeRemaining,
    },
    throughput: sim.throughput,
    totalVehicles: sim.vehicles.length,
  };
}

function computeArea(counts) {
  return (
    (counts?.moto ?? 0) * VEHICLE_AREAS.moto +
    (counts?.car ?? 0) * VEHICLE_AREAS.car +
    (counts?.truck ?? 0) * VEHICLE_AREAS.truck
  );
}

function totalVehicles(counts) {
  return (counts?.moto ?? 0) + (counts?.car ?? 0) + (counts?.truck ?? 0);
}

export function getAlgorithmStepData(sim, nodeIndex = 1) {
  const node = nodeIndex === 2 || nodeIndex === sim.nodes?.node2 ? sim.nodes.node2 : sim.nodes.node1;
  const isNode1 = node.id === 1;

  const p1Counts = isNode1 ? countApproach(sim, "west") : countApproach(sim, "corridor");
  const p2Counts = isNode1
    ? combineCounts(countApproach(sim, "north1"), countApproach(sim, "south1"))
    : combineCounts(countApproach(sim, "north2"), countApproach(sim, "south2"));
  const outCounts = isNode1 ? countApproach(sim, "corridor") : { moto: 0, car: 0, truck: 0 };

  const p1Area = computeArea(p1Counts);
  const p2Area = computeArea(p2Counts);
  const outArea = computeArea(outCounts);

  const phiIn1 = computeOccupancy(p1Counts, DEFAULT_ZONE_AREA);
  const phiIn2 = computeOccupancy(p2Counts, DEFAULT_ZONE_AREA);
  const phiOut = isNode1 ? computeOccupancy(outCounts, DEFAULT_ZONE_AREA) : 0;

  const turnRatio = 0.70;
  const backPressureDeduction = turnRatio * phiOut;
  const w1 = Math.max(0, phiIn1 - backPressureDeduction);
  const w2 = phiIn2;

  const gamma1 = C_SATURATION * w1;
  const gamma2 = C_SATURATION * w2;
  const totalGamma = gamma1 + gamma2;

  const allocation = allocateCbmpGreen(gamma1, gamma2);
  const activeCounts = node.phase === 1 ? p1Counts : p2Counts;

  return {
    nodeId: node.id,
    step1: { p1Counts, p2Counts, outCounts, p1Area, p2Area, outArea, phiIn1, phiIn2, phiOut },
    step2: { w1, w2, turnRatio, backPressureDeduction },
    step3: { gamma1, gamma2, totalGamma, cSat: C_SATURATION },
    step4: {
      g1: allocation.g1,
      g2: allocation.g2,
      minGreen: MIN_GREEN,
      availRemainder: AVAILABLE_GREEN,
      totalCycle: CYCLE_DURATION,
      lostTime: LOST_TIME,
    },
    step5: {
      activePhase: node.phase,
      greenDuration: node.phase === 1 ? allocation.g1 : allocation.g2,
      queueCount: totalVehicles(activeCounts),
    },
  };
}

const STEPPER_MOTION_DURATIONS = { 1: 1.5, 2: 1.5, 3: 0.0, 4: 0.8, 5: 2.5 };

function applyStep5Green(sim) {
  // Force Phase 1 green so west approach can discharge
  for (const node of [sim.nodes.node1, sim.nodes.node2]) {
    node.phase = 1;
    node.timeRemaining = node.g1;
  }
}

export function advanceSimStep(sim, targetStep) {
  const duration = STEPPER_MOTION_DURATIONS[targetStep] ?? 0;
  // Fresh lifecycle always starts in motion unless duration is zero
  sim.stepper = {
    active: true,
    currentStep: targetStep,
    subPhase: duration > 0 ? "motion" : "freeze",
    motionDuration: duration,
    motionElapsed: 0,
  };
  if (targetStep === 4 || targetStep === 5) {
    recalculateNode(sim, 1);
    recalculateNode(sim, 2);
    if (targetStep === 5) {
      applyStep5Green(sim);
    }
  }
  return sim;
}

export function spawnVehicle(sim, options) {
  const { approach, type = "car" } = options;
  const cfg = APPROACH_CONFIGS[approach] || APPROACH_CONFIGS.west;
  const spec = VEHICLE_SPECS[type] || VEHICLE_SPECS.car;
  const vehicleNode = options.node ?? cfg.node;

  const vehicle = {
    id: sim.nextVehicleId++,
    type,
    approach,
    node: vehicleNode,
    direction: cfg.dir,
    x: options.x ?? cfg.x,
    y: options.y ?? cfg.y,
    speed: options.speed ?? spec.maxSpeed,
    maxSpeed: spec.maxSpeed,
    length: spec.length,
    width: spec.width,
    area: spec.area,
    stopLine: cfg.stopLine,
  };

  sim.vehicles.push(vehicle);
  return vehicle;
}

function updateSignals(sim, dt) {
  for (const node of [sim.nodes.node1, sim.nodes.node2]) {
    node.timer += dt;
    node.timeRemaining -= dt;
    if (node.timeRemaining <= 0) {
      if (node.phase === 1) {
        node.phase = 2;
        node.timeRemaining = node.g2;
      } else {
        node.phase = 1;
        recalculateNode(sim, node);
        node.timeRemaining = node.g1;
      }
    }
  }
}

function getActiveStop(sim, v) {
  if (v.direction === "east") {
    if (v.x < 240) return { stopLine: 220, node: sim.nodes.node1 };
    if (v.x < 560) return { stopLine: 540, node: sim.nodes.node2 };
    return { stopLine: Infinity, node: null };
  }
  const node = v.node === 2 ? sim.nodes.node2 : sim.nodes.node1;
  return { stopLine: v.stopLine, node };
}

function getLeadingDistance(v, sim) {
  let minGap = Infinity;
  for (const other of sim.vehicles) {
    if (other === v || other.direction !== v.direction) continue;
    let gap = Infinity;
    if (v.direction === "east" && Math.abs(other.y - v.y) < 20 && other.x > v.x) {
      gap = other.x - v.x - (other.length / 2 + v.length / 2);
    } else if (v.direction === "south" && Math.abs(other.x - v.x) < 20 && other.y > v.y) {
      gap = other.y - v.y - (other.length / 2 + v.length / 2);
    } else if (v.direction === "north" && Math.abs(other.x - v.x) < 20 && other.y < v.y) {
      gap = v.y - other.y - (other.length / 2 + v.length / 2);
    }
    if (gap >= 0 && gap < minGap) minGap = gap;
  }
  return minGap;
}

function computeVehicleMotion(sim, v, dt) {
  const active = getActiveStop(sim, v);
  const red = active.node
    ? (active.node.phase === 1 ? v.direction !== "east" : v.direction === "east")
    : false;
  const gap = getLeadingDistance(v, sim);
  let distToStop = Infinity;

  if (v.direction === "east") distToStop = active.stopLine - v.x;
  else if (v.direction === "south") distToStop = active.stopLine - v.y;
  else if (v.direction === "north") distToStop = v.y - active.stopLine;

  const mustStopAtSignal = red && distToStop > 0 && distToStop <= 20;
  const leadBlocked = gap < 12;

  if (mustStopAtSignal || leadBlocked) {
    v.speed = 0;
    return;
  }

  const speedCap = gap < 25 ? Math.min(v.maxSpeed, Math.max(0, (gap - 10) * 2)) : v.maxSpeed;
  v.speed = Math.min(speedCap, v.speed + 20 * dt);

  const maxTravel = red && distToStop > 0 ? Math.min(v.speed * dt, Math.max(0, distToStop - 1)) : v.speed * dt;
  if (v.direction === "east") v.x += maxTravel;
  else if (v.direction === "south") v.y += maxTravel;
  else if (v.direction === "north") v.y -= maxTravel;

  if (red && distToStop > 0 && (distToStop - maxTravel <= 1 || distToStop <= 20)) {
    v.speed = 0;
  }
}

function updateVehicles(sim, dt) {
  const remainingVehicles = [];
  for (const v of sim.vehicles) {
    computeVehicleMotion(sim, v, dt);

    if (v.x < 0 || v.x > 800 || v.y < 0 || v.y > 320) {
      sim.throughput++;
    } else {
      remainingVehicles.push(v);
    }
  }
  sim.vehicles = remainingVehicles;
}

export function updateCorridorSim(sim, dt) {
  const stepper = sim.stepper;
  // Frozen frame holds positions and clock steady
  if (stepper?.active && stepper.subPhase === "freeze") {
    return;
  }
  sim.time += dt;
  updateSignals(sim, dt);
  updateVehicles(sim, dt);
  // Track motion budget and latch into freeze when exhausted
  if (stepper?.active && stepper.subPhase === "motion") {
    stepper.motionElapsed += dt;
    if (stepper.motionElapsed >= stepper.motionDuration) {
      stepper.subPhase = "freeze";
    }
  }
}
