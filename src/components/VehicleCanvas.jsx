import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import {
  STOPPED_SPEED,
  V_INDEX,
  interpolateVehicles,
} from "../lib/data.js";
import { mppEff, mppLen, VEH_LENS, VEH_WIDS } from "../lib/scale.js";
import { laneShiftM } from "../lib/lane.js";

const VEH_COLORS = ["#f59e0b", "#38bdf8", "#ec4899"];
const VEH_EDGES = ["#92610a", "#1d5f8a", "#8a2c55"];

function drawVehicle(ctx, v, mppE, mppL, pt) {
  const t = v[V_INDEX.TYPE];
  const tt = VEH_COLORS[t] ? t : 0;
  const len = Math.max(VEH_LENS[tt] / mppL, 1.6);
  const wid = Math.max(VEH_WIDS[tt] / mppE, 1.2);
  const detailed = len >= 4;
  const stopped = (v[V_INDEX.SPEED] ?? 99) < STOPPED_SPEED;
  ctx.save();
  ctx.translate(pt.x, pt.y);
  ctx.rotate(((v[V_INDEX.HEADING] || 0) * Math.PI) / 180);
  const r = Math.min(wid / 2, 1.5);
  if (detailed) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-len / 2 + 1, -wid / 2 + 1.5, len, wid, r);
    else ctx.rect(-len / 2 + 1, -wid / 2 + 1.5, len, wid);
    ctx.fill();
  }
  ctx.fillStyle = VEH_COLORS[tt];
  ctx.globalAlpha = detailed ? 0.92 : 1;
  ctx.strokeStyle = VEH_EDGES[tt];
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-len / 2, -wid / 2, len, wid, r);
  else ctx.rect(-len / 2, -wid / 2, len, wid);
  ctx.fill();
  if (detailed) ctx.stroke();
  if (detailed) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(len * 0.18, -wid / 2, Math.max(len * 0.08, 1), wid);
  }
  if (detailed && stopped) {
    ctx.fillStyle = "#ff2222";
    const br = Math.max(wid * 0.16, 1);
    ctx.beginPath();
    ctx.arc(-len / 2, -wid / 4, br, 0, Math.PI * 2);
    ctx.arc(-len / 2, wid / 4, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFrame(map, canvas, frames, maps, t) {
  const ctx = canvas.getContext("2d");
  const w = map.getContainer().clientWidth;
  const h = map.getContainer().clientHeight;
  // Canvas sits inside the transformed mapPane: re-anchor it to the
  // viewport origin every frame so container points stay pixel-exact.
  const tl = map.containerPointToLayerPoint([0, 0]);
  canvas.style.transform = `translate(${tl.x}px, ${tl.y}px)`;
  ctx.clearRect(0, 0, w, h);
  const vehicles = interpolateVehicles(frames, t, maps);
  const zoom = map.getZoom();
  const mppE = mppEff(zoom);
  const mppL = mppLen(zoom);
  const m = 30;
  for (let pass = 0; pass < 3; pass++) {
    const type = 2 - pass;
    for (const v of vehicles) {
      if (v[V_INDEX.TYPE] !== type) continue;
      // Container points already include the map pane offset (Map.js),
      // so they stay correct while the pane is transformed by pan/zoom.
      const pt = map.latLngToContainerPoint([v[V_INDEX.LAT], v[V_INDEX.LNG]]);
      const hr = ((v[V_INDEX.HEADING] || 0) * Math.PI) / 180;
      const shiftPx = laneShiftM(v[V_INDEX.TYPE], v[V_INDEX.ID]) / mppE;
      const sp = { x: pt.x - Math.sin(hr) * shiftPx, y: pt.y + Math.cos(hr) * shiftPx };
      if (sp.x < -m || sp.y < -m || sp.x > w + m || sp.y > h + m) continue;
      drawVehicle(ctx, v, mppE, mppL, sp);
    }
  }
  ctx.globalAlpha = 1;
  return vehicles.length;
}

export default function VehicleCanvas({ frames, timeRef, onCount }) {
  const map = useMap();
  const dataRef = useRef({ frames, maps: [] });
  dataRef.current.frames = frames;

  useEffect(() => {
    dataRef.current.maps = frames.map(
      (f) => new Map(f.vehicles.map((v) => [v[V_INDEX.ID], v]))
    );
  }, [frames]);

  useEffect(() => {
    const pane =
      map.getPane("vehiclePane") || map.createPane("vehiclePane");
    pane.style.zIndex = "450";
    pane.style.pointerEvents = "none";
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.pointerEvents = "none";
    pane.appendChild(canvas);
    const fit = () => {
      const el = map.getContainer();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = el.clientWidth * dpr;
      canvas.height = el.clientHeight * dpr;
      canvas.style.width = `${el.clientWidth}px`;
      canvas.style.height = `${el.clientHeight}px`;
      canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);
    let raf = 0;
    let lastCount = -1;
    const loop = () => {
      const d = dataRef.current;
      const n = drawFrame(map, canvas, d.frames, d.maps, timeRef.current);
      if (n !== lastCount) { lastCount = n; onCount?.(n); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      canvas.remove();
    };
  }, [map, timeRef, onCount]);

  return null;
}
