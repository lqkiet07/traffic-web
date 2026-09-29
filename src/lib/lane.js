// Procedural lane separation: GAMA exports centerline positions only,
// so side-by-side vehicles collapse onto one line. Shift each vehicle
// laterally by type (VN traffic: motos right, cars middle, trucks left)
// plus a deterministic per-id stagger so same-type vehicles don't stack.
// ponytail: approximate; replace with surveyed/GAMA lane offsets when available.
export function laneShiftM(type, idStr) {
  let h = 0;
  const s = String(idStr ?? "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100;
  const j = h / 100;
  if (type === 0) return 0.8 + j * 1.0;
  if (type === 1) return -0.5 + (j - 0.5) * 0.4;
  if (type === 2) return -1.2 + (j - 0.5) * 0.4;
  return 0;
}
