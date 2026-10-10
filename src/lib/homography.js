export const VEHICLE_AREAS = { moto: 1.5, car: 7.5, truck: 18.0 };

export const PIPELINE_STAGES = [
  "YOLOv8 Segmentation",
  "ByteTrack",
  "Homography H(3×3)",
  "CAO Occupancy",
  "GAMA Engine",
];

const IDENTITY_3X3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

export function applyHomography(H, [x, y]) {
  const xp = H[0][0] * x + H[0][1] * y + H[0][2];
  const yp = H[1][0] * x + H[1][1] * y + H[1][2];
  const wp = H[2][0] * x + H[2][1] * y + H[2][2];
  if (Math.abs(wp) <= 1e-8) return [0, 0];
  return [xp / wp, yp / wp];
}

export function invertHomography(H) {
  const [
    [a, b, c],
    [d, e, f],
    [g, h, i],
  ] = H;

  const A = e * i - f * h;
  const B = f * g - d * i;
  const C = d * h - e * g;
  const D = c * h - b * i;
  const E = a * i - c * g;
  const F = b * g - a * h;
  const G = b * f - c * e;
  const Hcof = c * d - a * f;
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) <= 1e-8) return IDENTITY_3X3.map((row) => [...row]);

  const invDet = 1 / det;
  return [
    [A * invDet, D * invDet, G * invDet],
    [B * invDet, E * invDet, Hcof * invDet],
    [C * invDet, F * invDet, I * invDet],
  ];
}

export function computeIpmOccupancy(vehicles, roadAreaM2) {
  if (!roadAreaM2 || roadAreaM2 <= 0 || !vehicles) return 0;
  let totalArea = 0;
  if (Array.isArray(vehicles)) {
    for (const v of vehicles) {
      const type = typeof v === "string" ? v : (v?.type ?? v?.class ?? v?.category);
      totalArea += VEHICLE_AREAS[type] ?? 0;
    }
  } else {
    totalArea =
      (vehicles.moto ?? 0) * VEHICLE_AREAS.moto +
      (vehicles.car ?? 0) * VEHICLE_AREAS.car +
      (vehicles.truck ?? 0) * VEHICLE_AREAS.truck;
  }
  return Math.min(1, Math.max(0, totalArea / roadAreaM2));
}
