// Single source of truth for meter->pixel; roads, vehicles, stop bars MUST all use mppEff so proportions stay zoom-invariant.
export const ROAD_W_M = 7;
export const VEH_LENS = [1.9, 4.5, 8.0];
export const VEH_WIDS = [0.7, 1.8, 2.4];

// ponytail: roads.geojson has no per-road `lanes` attr; upgrade path is re-running export_roads_geojson.py with shape properties.
export function mppAt(zoom) {
  return (156543.03 * Math.cos((10.033 * Math.PI) / 180)) / Math.pow(2, zoom);
}

export function exagg(zoom) {
  return Math.min(Math.max(6.5 - (zoom - 12) * 0.7, 1.3), 6.5);
}

export function mppEff(zoom) {
  return mppAt(zoom) / exagg(zoom);
}

// Length exaggeration kept near true scale so drawn bodies fit real gaps:
// a 4.5m car must render shorter than a 6m gap at close zoom.
export function lenExagg(zoom) {
  return Math.min(Math.max(1.6 - (zoom - 12) * 0.15, 1.0), 1.6);
}

export function mppLen(zoom) {
  return mppAt(zoom) / lenExagg(zoom);
}
