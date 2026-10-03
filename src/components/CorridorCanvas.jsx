import { useEffect, useRef } from "react";
import {
  getCorridorTelemetry,
  spawnVehicle,
  updateCorridorSim,
} from "../lib/corridorSim.js";

const VEHICLE_STYLES = {
  moto: { color: "#f59e0b", edge: "#92610a" },
  car: { color: "#38bdf8", edge: "#1d5f8a" },
  truck: { color: "#ec4899", edge: "#8a2c55" },
  0: { color: "#f59e0b", edge: "#92610a" },
  1: { color: "#38bdf8", edge: "#1d5f8a" },
  2: { color: "#ec4899", edge: "#8a2c55" },
};

const VEHICLE_COLORS = {
  moto: "#f59e0b",
  car: "#38bdf8",
  truck: "#ec4899",
};

const LAMPS = [
  { key: "red", color: "#ef4444" },
  { key: "yellow", color: "#f59e0b" },
  { key: "green", color: "#10b981" },
];

const ROIS = [
  { id: "west", name: "West Approach", x: 0, y: 140, w: 220, h: 40 },
  { id: "corridor", name: "Corridor Link", x: 260, y: 140, w: 280, h: 40 },
  { id: "north1", name: "North 1", x: 220, y: 0, w: 40, h: 140 },
  { id: "south1", name: "South 1", x: 220, y: 180, w: 40, h: 140 },
  { id: "north2", name: "North 2", x: 540, y: 0, w: 40, h: 140 },
  { id: "south2", name: "South 2", x: 540, y: 180, w: 40, h: 140 },
];

function drawRoads(ctx) {
  // Casing fill (foundation for double-stroke asphalt)
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, 138, 800, 44);
  ctx.fillRect(218, 0, 44, 320);
  ctx.fillRect(538, 0, 44, 320);

  // Roadbed asphalt fill
  ctx.fillStyle = "#1b2436";
  ctx.fillRect(0, 140, 800, 40);
  ctx.fillRect(220, 0, 40, 320);
  ctx.fillRect(540, 0, 40, 320);

  // Clean intersection box borders
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.strokeRect(220, 140, 40, 40);
  ctx.strokeRect(540, 140, 40, 40);

  // Lane dividers (dashed centerline)
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, 160); ctx.lineTo(220, 160);
  ctx.moveTo(260, 160); ctx.lineTo(540, 160);
  ctx.moveTo(580, 160); ctx.lineTo(800, 160);
  ctx.moveTo(240, 0); ctx.lineTo(240, 140);
  ctx.moveTo(240, 180); ctx.lineTo(240, 320);
  ctx.moveTo(560, 0); ctx.lineTo(560, 140);
  ctx.moveTo(560, 180); ctx.lineTo(560, 320);
  ctx.stroke();

  // Stop lines at intersection entrances
  ctx.setLineDash([]);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(220, 140); ctx.lineTo(220, 180);
  ctx.moveTo(220, 140); ctx.lineTo(260, 140);
  ctx.moveTo(220, 180); ctx.lineTo(260, 180);
  ctx.moveTo(540, 140); ctx.lineTo(540, 180);
  ctx.moveTo(540, 140); ctx.lineTo(580, 140);
  ctx.moveTo(540, 180); ctx.lineTo(580, 180);
  ctx.stroke();
}

function getApproachCounts(vehicles) {
  // Count only vehicles still upstream of stop lines (mirrors countApproach)
  const counts = { west: 0, corridor: 0, north1: 0, south1: 0, north2: 0, south2: 0 };
  for (const v of vehicles) {
    // Derive upstream approach from position and direction
    let app = null;
    if (v.direction === "east") {
      if (v.x < 220) app = "west";
      else if (v.x >= 240 && v.x < 540) app = "corridor";
    } else if (v.direction === "south" && v.y < 140) {
      app = v.node === 2 ? "north2" : "north1";
    } else if (v.direction === "north" && v.y > 180) {
      app = v.node === 2 ? "south2" : "south1";
    }
    if (app && counts[app] !== undefined) counts[app]++;
  }
  return counts;
}

function getRoiColor(count) {
  if (count >= 5) return "rgba(244, 63, 94, 0.18)";
  if (count >= 3) return "rgba(245, 158, 11, 0.14)";
  return "rgba(16, 185, 129, 0.08)";
}

function drawROIs(ctx, sim) {
  const counts = getApproachCounts(sim?.vehicles || []);
  ctx.save();
  for (const roi of ROIS) {
    const count = counts[roi.id] || 0;
    ctx.fillStyle = getRoiColor(count);
    ctx.fillRect(roi.x, roi.y, roi.w, roi.h);

    ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(roi.name, roi.x + roi.w / 2, roi.y + roi.h / 2);
  }
  ctx.restore();
}

function drawLamps(ctx, x, y, activeColor) {
  const cx = x + 7;
  const lampYs = [y + 7, y + 17, y + 27];
  LAMPS.forEach((lamp, i) => {
    const isActive = lamp.key === activeColor;
    ctx.save();
    ctx.fillStyle = lamp.color;
    if (isActive) {
      ctx.shadowColor = lamp.color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 1;
    } else {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.25;
    }
    ctx.beginPath();
    ctx.arc(cx, lampYs[i], 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawSignalPole(ctx, x, y, label, activeColor, sec) {
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 34);
  ctx.lineTo(x + 7, 138);
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.95)";
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, 14, 34, 3);
  else ctx.rect(x, y, 14, 34);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  drawLamps(ctx, x, y, activeColor);

  const bx = x + 18;
  const by = y + 8;
  const bw = 46;
  const bh = 18;
  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.95)";
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 3);
  else ctx.rect(bx, by, bw, bh);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${label} ${sec}s`, bx + bw / 2, by + bh / 2);
  ctx.restore();
}

function drawNodeSignals(ctx, node) {
  const sec = Math.max(0, Math.ceil(node.timeRemaining || 0));
  const isP1 = node.phase === 1;
  const p1Color = isP1 ? (sec <= 3 ? "yellow" : "green") : "red";
  const p2Color = !isP1 ? (sec <= 3 ? "yellow" : "green") : "red";

  drawSignalPole(ctx, node.x - 90, 96, "P1", p1Color, sec);
  drawSignalPole(ctx, node.x + 30, 96, "P2", p2Color, sec);

  ctx.save();
  ctx.fillStyle = p1Color === "green" ? "#10b981" : p1Color === "yellow" ? "#f59e0b" : "#ef4444";
  ctx.beginPath();
  ctx.arc(node.x - 20, 143, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p2Color === "green" ? "#10b981" : p2Color === "yellow" ? "#f59e0b" : "#ef4444";
  ctx.beginPath();
  ctx.arc(node.x + 20, 137, 3, 0, Math.PI * 2);
  ctx.arc(node.x + 20, 183, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSignals(ctx, nodes) {
  if (!nodes) return;
  const list = Array.isArray(nodes) ? nodes : [nodes.node1, nodes.node2].filter(Boolean);
  for (const node of list) {
    drawNodeSignals(ctx, node);
  }
}

function getVehicleAngle(v) {
  if (typeof v.heading === "number") return (v.heading * Math.PI) / 180;
  if (v.direction === "south") return Math.PI / 2;
  if (v.direction === "north") return -Math.PI / 2;
  if (v.direction === "west") return Math.PI;
  return 0;
}

function drawVehicleInterior(ctx, v, style, len, wid) {
  const isCar = v.type === "car" || v.type === 1;
  const isTruck = v.type === "truck" || v.type === 2;

  if (isCar || isTruck) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    const wx = isTruck ? len * 0.2 : len * 0.15;
    const ww = Math.max(len * 0.08, 2);
    ctx.fillRect(wx, -wid / 2 + 1, ww, wid - 2);
  }

  if (isTruck) {
    ctx.strokeStyle = style.edge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-len * 0.05, -wid / 2);
    ctx.lineTo(-len * 0.05, wid / 2);
    ctx.stroke();
  }
}

function drawBrakeLights(ctx, len, wid) {
  ctx.fillStyle = "#ff2222";
  const br = Math.max(wid * 0.16, 1.2);
  ctx.beginPath();
  ctx.arc(-len / 2, -wid / 4, br, 0, Math.PI * 2);
  ctx.arc(-len / 2, wid / 4, br, 0, Math.PI * 2);
  ctx.fill();
}

function drawSingleVehicle(ctx, v) {
  const style = VEHICLE_STYLES[v.type] || VEHICLE_STYLES.car;
  const len = v.length || 24;
  const wid = v.width || 12;
  const r = Math.min(wid / 2, 2);
  const angle = getVehicleAngle(v);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(angle);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-len / 2 + 1, -wid / 2 + 1.5, len, wid, r);
  else ctx.rect(-len / 2 + 1, -wid / 2 + 1.5, len, wid);
  ctx.fill();

  ctx.fillStyle = style.color;
  ctx.strokeStyle = style.edge;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-len / 2, -wid / 2, len, wid, r);
  else ctx.rect(-len / 2, -wid / 2, len, wid);
  ctx.fill();
  ctx.stroke();

  drawVehicleInterior(ctx, v, style, len, wid);

  if (v.speed < 1) {
    drawBrakeLights(ctx, len, wid);
  }

  ctx.restore();
}

function drawVehicles(ctx, vehicles) {
  if (!vehicles) return;
  for (const v of vehicles) {
    drawSingleVehicle(ctx, v);
  }
}

function drawRipples(ctx, ripples) {
  if (!ripples.length) return;
  ctx.save();
  ctx.lineWidth = 2;
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rip = ripples[i];
    rip.r += 1.5;
    rip.alpha -= 0.03;
    if (rip.alpha <= 0) {
      ripples.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = `rgba(56, 189, 248, ${rip.alpha})`;
    ctx.beginPath();
    ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function getApproachAt(x, y) {
  if (x < 230 && Math.abs(y - 160) <= 35) return "west";
  if (x >= 260 && x <= 530 && Math.abs(y - 160) <= 35) return "corridor";
  if (Math.abs(x - 240) <= 30 && y < 140) return "north1";
  if (Math.abs(x - 240) <= 30 && y > 180) return "south1";
  if (Math.abs(x - 560) <= 30 && y < 140) return "north2";
  if (Math.abs(x - 560) <= 30 && y > 180) return "south2";
  return null;
}

function drawFloatingTag(ctx, x, y, text, color) {
  ctx.save();
  ctx.font = "bold 10px monospace, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tw = ctx.measureText(text).width + 12;
  ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - tw / 2, y - 9, tw, 18, 4);
  else ctx.rect(x - tw / 2, y - 9, tw, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function getVehicleAreaTag(type) {
  if (type === "moto" || type === 0) return "1.5m²";
  if (type === "truck" || type === 2) return "18m²";
  return "7.5m²";
}

function drawStep1Overlays(ctx, sim, stepData) {
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 250);
  ctx.save();
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#10b981";
  ctx.shadowBlur = 6 + 4 * pulse;
  ctx.globalAlpha = 0.5 + 0.5 * pulse;
  ctx.strokeRect(1, 141, 218, 38);
  ctx.restore();

  const phi = (stepData?.step1?.phiIn1 ?? 0).toFixed(2);
  drawFloatingTag(ctx, 110, 150, `Quét diện tích: φ = ${phi}`, "#10b981");

  const vehicles = sim?.vehicles || [];
  for (const v of vehicles) {
    const inWest = v.x < 220 && (v.approach === "west" || Math.abs(v.y - 160) <= 25);
    const inNorth1 = v.y < 140 && (v.approach === "north1" || Math.abs(v.x - 240) <= 25);
    if (inWest || inNorth1) {
      const style = VEHICLE_STYLES[v.type] || VEHICLE_STYLES.car;
      const tag = getVehicleAreaTag(v.type);
      drawFloatingTag(ctx, v.x, v.y - 14, tag, style.color);
    }
  }
}

function drawStep2Overlays(ctx, sim, stepData) {
  ctx.save();
  ctx.strokeStyle = "#f43f5e";
  ctx.fillStyle = "#f43f5e";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#f43f5e";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(460, 160);
  ctx.lineTo(306, 160);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(300, 160);
  ctx.lineTo(312, 154);
  ctx.lineTo(312, 166);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const ratio = stepData?.step2?.turnRatio || 0.7;
  const phiOut = stepData?.step1?.phiOut || 0;
  const pushback = (ratio * phiOut).toFixed(2);
  drawFloatingTag(ctx, 380, 146, `Dội ngược hạ lưu: -${pushback}`, "#f43f5e");

  const w1 = (stepData?.step2?.w1 ?? 0).toFixed(2);
  drawFloatingTag(ctx, 210, 160, `w₁ = ${w1}`, "#f59e0b");
}

function drawStep3Overlays(ctx, sim, stepData) {
  const g1 = (stepData?.step3?.gamma1 ?? 0).toFixed(2);
  const g2 = (stepData?.step3?.gamma2 ?? 0).toFixed(2);
  drawFloatingTag(ctx, 240, 150, `γ₁ = ${g1}`, "#10b981");
  drawFloatingTag(ctx, 240, 170, `γ₂ = ${g2}`, "#f59e0b");
}

function drawStep4Overlays(ctx, sim, stepData) {
  ctx.save();
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#10b981";
  ctx.shadowBlur = 16;
  if (ctx.roundRect) ctx.roundRect(148, 94, 18, 38, 4);
  else ctx.rect(148, 94, 18, 38);
  ctx.stroke();

  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.arc(157, 123, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const g1 = stepData?.step4?.g1 ?? 56;
  const g2 = stepData?.step4?.g2 ?? 56;
  drawFloatingTag(ctx, 240, 60, `Cấp giây xanh: P1 = ${g1}s | P2 = ${g2}s`, "#10b981");
}

function drawStep5Overlays(ctx, sim, stepData) {
  ctx.save();
  ctx.strokeStyle = "#10b981";
  ctx.fillStyle = "#10b981";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#10b981";
  ctx.shadowBlur = 8;
  [152, 168].forEach((ay) => {
    ctx.beginPath();
    ctx.moveTo(222, ay);
    ctx.lineTo(252, ay);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(258, ay);
    ctx.lineTo(250, ay - 4);
    ctx.lineTo(250, ay + 4);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  const g1 = stepData?.step4?.g1 ?? 56;
  const banner = `Pha 1 XANH (${g1}s) — Dòng xe tăng tốc qua nút`;
  drawFloatingTag(ctx, 240, 60, banner, "#10b981");
}

function isMotionPhase(sim) {
  // True only during stepper motion window
  return sim?.stepper?.subPhase === "motion";
}

function shouldAdvanceSim(isPlaying, simMode, sim) {
  // Play always advances; stepper advances only in motion
  if (isPlaying) return true;
  return simMode === "stepper" && isMotionPhase(sim);
}

function drawMotionBanner(ctx, sim) {
  // Mini progress banner shown during motion
  const dur = sim?.stepper?.motionDuration ?? 0;
  const elapsed = sim?.stepper?.motionElapsed ?? 0;
  const remain = Math.max(0, dur - elapsed).toFixed(1);
  const msg = `Dang di chuyen vao vi tri (${remain}s)...`;
  drawFloatingTag(ctx, 400, 30, msg, "#38bdf8");
}

function drawFreezeOverlays(ctx, sim, currentStep, stepData) {
  // Full math overlays shown only when frozen
  if (currentStep === 1) drawStep1Overlays(ctx, sim, stepData);
  else if (currentStep === 2) drawStep2Overlays(ctx, sim, stepData);
  else if (currentStep === 3) drawStep3Overlays(ctx, sim, stepData);
  else if (currentStep === 4) drawStep4Overlays(ctx, sim, stepData);
  else if (currentStep === 5) drawStep5Overlays(ctx, sim, stepData);
}

function drawStepOverlays(ctx, sim, currentStep, stepData) {
  // Motion shows banner only; freeze shows static math
  if (isMotionPhase(sim)) {
    drawMotionBanner(ctx, sim);
    return;
  }
  drawFreezeOverlays(ctx, sim, currentStep, stepData);
}

function tickSim(sim, dt, isPlaying, simMode) {
  // Advance corridor sim during play or stepper motion
  if (!sim) return;
  if (shouldAdvanceSim(isPlaying, simMode, sim)) updateCorridorSim(sim, dt);
}

function drawScene(ctx, sim, ripplesRef, simMode, step, data) {
  // Paint background, roads, signals, vehicles and overlays
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, 800, 320);
  drawRoads(ctx);
  drawROIs(ctx, sim);
  if (sim?.nodes) drawSignals(ctx, sim.nodes);
  if (sim?.vehicles) drawVehicles(ctx, sim.vehicles);
  drawRipples(ctx, ripplesRef.current);
  if (simMode === "stepper") drawStepOverlays(ctx, sim, step, data);
}

function useCanvasLoop(
  canvasRef,
  simRef,
  isPlaying,
  simSpeed,
  onTelemetry,
  ripplesRef,
  simMode = "continuous",
  currentStep = 1,
  stepData = null
) {
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying; // Sync play flag for rAF closure
  const simSpeedRef = useRef(simSpeed);
  simSpeedRef.current = simSpeed; // Sync speed multiplier
  const onTelemetryRef = useRef(onTelemetry);
  onTelemetryRef.current = onTelemetry; // Sync telemetry callback
  const simModeRef = useRef(simMode);
  simModeRef.current = simMode; // Sync canvas mode
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep; // Sync stepper step
  const stepDataRef = useRef(stepData);
  stepDataRef.current = stepData; // Sync stepper math data
  useEffect(() => {
    const canvas = canvasRef.current; // Resolve canvas element
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let lastTime = performance.now();
    let frameCount = 0;
    let animId = null;
    const render = (now) => {
      const sim = simRef?.current ?? simRef; // Unwrap ref or raw sim
      const dt = Math.min((now - lastTime) / 1000, 0.1); // Clamp delta
      lastTime = now;
      const scaled = dt * (simSpeedRef.current || 1); // Apply speed
      tickSim(sim, scaled, isPlayingRef.current, simModeRef.current);
      if (sim && ++frameCount % 10 === 0) {
        onTelemetryRef.current?.(getCorridorTelemetry(sim)); // Throttle telemetry
      }
      drawScene(ctx, sim, ripplesRef, simModeRef.current, currentStepRef.current, stepDataRef.current);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [canvasRef, simRef, ripplesRef]);
}

function handleCanvasClick(e, canvasRef, simRef, selectedType, ripplesRef, onSpawn, onTelemetry) {
  const canvas = canvasRef.current;
  const sim = simRef?.current ?? simRef;
  if (!canvas || !sim) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = Math.min(rect.width / 800, rect.height / 320);
  const dispW = 800 * scale;
  const dispH = 320 * scale;
  const offsetX = (rect.width - dispW) / 2;
  const offsetY = (rect.height - dispH) / 2;
  const px = e.clientX - rect.left - offsetX;
  const py = e.clientY - rect.top - offsetY;
  if (px < 0 || py < 0 || px > dispW || py > dispH) return;
  const x = px / scale;
  const y = py / scale;
  const approach = getApproachAt(x, y);
  if (!approach) return;

  spawnVehicle(sim, { approach, type: selectedType });
  ripplesRef.current.push({ x, y, r: 6, alpha: 1 });
  onSpawn?.(approach, selectedType);
  onTelemetry?.(getCorridorTelemetry(sim));
}

export default function CorridorCanvas({
  simRef,
  isPlaying = false,
  simSpeed = 1,
  selectedType = "car",
  onSpawn,
  onTelemetry,
  simMode = "continuous",
  currentStep = 1,
  stepData = null,
}) {
  const canvasRef = useRef(null);
  const ripplesRef = useRef([]);

  useCanvasLoop(
    canvasRef,
    simRef,
    isPlaying,
    simSpeed,
    onTelemetry,
    ripplesRef,
    simMode,
    currentStep,
    stepData
  );

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={320}
      onClick={(e) => handleCanvasClick(e, canvasRef, simRef, selectedType, ripplesRef, onSpawn, onTelemetry)}
      className="w-full h-full object-contain block cursor-crosshair"
    />
  );
}

export { CorridorCanvas };
