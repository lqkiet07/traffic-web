// Pure CAO-CBMP math ported from GAMA (Main.gaml + Intersection.gaml).
// No DOM or React dependency; safe for unit tests and UI sandbox.
export const VEHICLE_AREAS = { moto: 1.5, car: 7.5, truck: 18.0 };
export const DEFAULT_ZONE_AREA = 150.0;
export const CYCLE_DURATION = 120;
export const LOST_TIME = 8;
export const MIN_GREEN = 10;
export const AVAILABLE_GREEN = 92;
export const C_SATURATION = 2.5;

// Area occupancy ratio capped at 1.0.
export function computeOccupancy(counts, zoneArea = DEFAULT_ZONE_AREA) {
  const moto = counts?.moto ?? 0;
  const car = counts?.car ?? 0;
  const truck = counts?.truck ?? 0;
  const total = moto * VEHICLE_AREAS.moto + car * VEHICLE_AREAS.car + truck * VEHICLE_AREAS.truck;
  return Math.min(1.0, total / zoneArea);
}

// Upstream pressure minus weighted downstream blockage, floored at 0, scaled by saturation flow.
export function computePressure(phiIn, phiOut = 0, turnRatio = 0.7) {
  return C_SATURATION * Math.max(0, phiIn - turnRatio * phiOut);
}

// Split available green proportionally to gamma weights.
export function allocateCbmpGreen(gamma1, gamma2) {
  const total = (gamma1 ?? 0) + (gamma2 ?? 0);
  if (total < 0.05) return { g1: 56, g2: 56 };
  const g1 = Math.round(MIN_GREEN + AVAILABLE_GREEN * (gamma1 / total));
  const g2 = 112 - g1;
  return { g1, g2 };
}

// Count-based baseline: every vehicle weighs 1.0 regardless of size.
function toBaselineCount(input) {
  if (typeof input === "number") return input;
  if (!input) return 0;
  return (input.moto ?? 0) + (input.car ?? 0) + (input.truck ?? 0);
}

// Split available green proportionally to raw vehicle counts.
export function allocateBaselineGreen(countsP1, countsP2) {
  const n1 = toBaselineCount(countsP1);
  const n2 = toBaselineCount(countsP2);
  const sum = n1 + n2;
  if (sum < 0.05) return { g1: 56, g2: 56 };
  const g1 = Math.round(MIN_GREEN + AVAILABLE_GREEN * (n1 / sum));
  const g2 = 112 - g1;
  return { g1, g2 };
}

// Estimate visible vs occluded vehicles under inter-vehicle occlusion.
export function estimateOccludedCount(counts, occlusionRate = 0.4) {
  const moto = counts?.moto ?? 0;
  const car = counts?.car ?? 0;
  const truck = counts?.truck ?? 0;
  const rawCount = moto + car + truck;
  if (rawCount === 0) {
    return { rawCount: 0, visibleCount: 0, visibleMotos: 0, occludedMotos: 0, lossPercentage: 0 };
  }
  const visibleMotos = Math.max(0, Math.round(moto * (1 - occlusionRate)));
  const occludedMotos = moto - visibleMotos;
  const visibleCount = visibleMotos + car + truck;
  const lossPercentage = Math.round((occludedMotos / rawCount) * 100);
  return { rawCount, visibleCount, visibleMotos, occludedMotos, lossPercentage };
}

// Demo scenarios for the Algorithm Lab sandbox.
export const PRESETS = {
  paradox: {
    desc: "Bầy xe máy ken dày ở Pha 2 (20 xe = 30 m²) bị góc quay camera nghiêng che khuất lẫn nhau (occlusion). Bounding Box truyền thống chỉ đếm được ~12 xe (hụt 40%), dẫn đến Baseline cắt đèn sớm gây ùn ứ. CAO ước lượng diện tích mặt đường bị chiếm dụng.",
    p1: { moto: 0, car: 2, truck: 2 },
    p2: { moto: 20, car: 0, truck: 0 },
  },
  balanced: {
    desc: "Lưu lượng và loại phương tiện hai pha tương đương nhau. Cả hai bộ điều khiển đều chia đều 56s / 56s.",
    p1: { moto: 10, car: 2, truck: 0 },
    p2: { moto: 10, car: 2, truck: 0 },
  },
  saturated: {
    desc: "Pha 1 bão hòa hoàn toàn diện tích nút, Pha 2 vắng xe. CAO cấp thời gian xanh tối đa 102s cho Pha 1 và tối thiểu 10s cho Pha 2.",
    p1: { moto: 20, car: 10, truck: 5 },
    p2: { moto: 0, car: 0, truck: 0 },
  },
};
