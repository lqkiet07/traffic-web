// Pure helpers for the Algorithm Lab 3D view: node anchors, overlay layout,
// HUD board text and scene disposal. No React, DOM or Three.js imports so the
// Node test suites can import this module directly.

const HUD_LABELS = { truck: "Xe tải", car: "Ô tô", moto: "Xe máy" };

// Heaviest first so the metric reads as a descending pressure summary.
const HUD_ORDER = ["truck", "car", "moto"];

export function formatVehicleCountSummary(counts) {
  const parts = [];
  for (const type of HUD_ORDER) {
    const n = counts?.[type] ?? 0;
    if (n > 0) parts.push(`${n} ${HUD_LABELS[type]}`);
  }
  return parts.length > 0 ? parts.join(", ") : "0 xe";
}

export function formatApproachSummary({ title, counts, area, phi, color = "#38bdf8" }) {
  const pct = Math.round((phi ?? 0) * 100);
  return {
    title,
    metric: `${formatVehicleCountSummary(counts)} · ${(area ?? 0).toFixed(0)} m² (${pct}%)`,
    color,
  };
}

// World X of each signalised node (see simToWorld in Corridor3DCanvas.jsx).
export function getNodeBaseX(nodeId) {
  return nodeId === 2 ? 16 : -16;
}

// Overlay anchor points for one node, so switching nodes translates the meshes
// instead of rebuilding them. Node 1 phase 1 is fed by the West arterial;
// node 2 phase 1 is fed by the corridor link.
export function getStepOverlayPositions(nodeId) {
  const baseX = getNodeBaseX(nodeId);
  return {
    baseX,
    inflowPlaneX: baseX - 12,
    inflowCrossZ: -8,
    gammaBar1X: baseX - 0.6,
    gammaBar2X: baseX + 0.6,
    phaseBoardX: baseX,
    releaseStartX: baseX - 3,
    releaseHeadX: baseX + 4.2,
  };
}

// Release GPU resources for every mesh so toggling 2D/3D does not leak VRAM.
// A single Set dedupes geometries, materials and textures because one material
// (e.g. the shared step-1 plane material) or one texture can back many meshes.
export function disposeThreeScene(scene) {
  if (typeof scene?.traverse !== "function") return;
  const seen = new Set();
  const once = (disposable) => {
    if (!disposable || seen.has(disposable)) return;
    seen.add(disposable);
    disposable.dispose?.();
  };
  scene.traverse((obj) => {
    once(obj.geometry);
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of materials) {
      if (!mat) continue;
      once(mat.map);
      once(mat.emissiveMap);
      once(mat.normalMap);
      once(mat);
    }
  });
}
