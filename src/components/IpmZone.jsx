import { useEffect, useRef } from "react";
import { Grid3x3, ScanEye } from "lucide-react";
import { applyHomography } from "../lib/homography.js";

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function drawFlowArrow(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 4);
  ctx.lineTo(x, y - 2);
  ctx.lineTo(x + 4, y + 4);
  ctx.stroke();
  ctx.restore();
}

function drawRoadPlane(ctx, width, height) {
  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.lineTo(1, height);
  ctx.moveTo(width - 1, 0);
  ctx.lineTo(width - 1, height);
  ctx.stroke();

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(width, 6);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, width - 20, 100);

  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VẠCH DỪNG CHỜ XE MÁY", width / 2, 60);

  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(200, 110);
  ctx.lineTo(200, height);
  ctx.stroke();
  ctx.restore();

  drawFlowArrow(ctx, 100, 200);
  drawFlowArrow(ctx, 300, 200);
}

function drawContinuousFootprints(ctx, vehicles, H) {
  ctx.save();
  ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
  for (const v of vehicles) {
    if (!v.bbox || v.bbox.length !== 4) continue;
    const [x, y, w, h] = v.bbox;
    const [u, vCoord] = applyHomography(H, [x + w / 2, y + h]);
    if (v.type === "car") {
      drawRoundedRect(ctx, u - 15, vCoord - 40, 30, 44, 8);
    } else {
      drawRoundedRect(ctx, u - 9, vCoord - 20, 18, 22, 6);
    }
    ctx.fill();
  }
  ctx.restore();
}

function drawVehicleMarker(ctx, v, u, vCoord) {
  if (v.type === "car") {
    ctx.fillStyle = "#38bdf8";
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, u - 11, vCoord - 38, 22, 38, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(u - 8, vCoord - 25, 16, 7);

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(u - 8, vCoord - 36, 4, 2);
    ctx.fillRect(u + 4, vCoord - 36, 4, 2);
  } else {
    ctx.fillStyle = "#10b981";
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, u - 5, vCoord - 16, 10, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(u, vCoord - 13, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectedVehicles(ctx, vehicles, H) {
  for (const v of vehicles) {
    if (!v.bbox || v.bbox.length !== 4) continue;
    const [x, y, w, h] = v.bbox;
    const [u, vCoord] = applyHomography(H, [x + w / 2, y + h]);
    drawVehicleMarker(ctx, v, u, vCoord);
  }
}

function IpmCanvas({ vehicles, homography }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawRoadPlane(ctx, canvas.width, canvas.height);
    if (vehicles && homography) {
      drawContinuousFootprints(ctx, vehicles, homography);
      drawProjectedVehicles(ctx, vehicles, homography);
    }
  }, [vehicles, homography]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      className="block aspect-[4/3] w-full rounded-lg border border-[#1e293b] bg-slate-950 shadow-inner"
    />
  );
}

function IpmOccupancyBar({ phi, area }) {
  const phiPercent = Math.round(phi * 100);
  return (
    <div className="mt-2.5">
      <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
        <span className="text-slate-400">
          Mức chiếm dụng φ = {phi.toFixed(2)} ({phiPercent}%)
        </span>
        <span className="font-bold tabular-nums text-emerald-400">
          {phiPercent}% · {area.toFixed(1)} m²
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-150"
          style={{ width: `${Math.min(100, Math.max(0, phiPercent))}%` }}
        />
      </div>
    </div>
  );
}

function IpmComparisonCards({ bboxCount, occlusionPct, phi, area }) {
  return (
    <div className="mt-2.5 flex flex-col gap-1.5 font-mono text-[11px]">
      <span className="flex items-center gap-1.5 text-slate-500">
        <ScanEye size={13} className="text-slate-500" />
        Đối chiếu đếm xe vs diện tích chiếm dụng
      </span>
      <div className="flex items-center justify-between rounded-md border border-rose-500/20 bg-rose-950/20 px-2.5 py-1.5 font-bold tabular-nums text-rose-300">
        <span className="text-[11px] font-medium text-rose-300/90">Bbox đếm xe</span>
        <span>~{bboxCount} xe (hụt {occlusionPct}%)</span>
      </div>
      <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-1.5 font-bold tabular-nums text-emerald-300">
        <span className="text-[11px] font-medium text-emerald-300/90">CAO diện tích</span>
        <span>φ = {phi.toFixed(2)} ({Math.round(phi * 100)}%) · A = {area.toFixed(1)} m²</span>
      </div>
    </div>
  );
}

export function IpmZone({ activeFrame, metadata, currentTime = 0 }) {
  const roadArea = metadata?.roadAreaM2 ?? 150;
  const homography = metadata?.homography;
  const vehicles = activeFrame?.vehicles ?? [];
  const phi = activeFrame?.occupancy_phi ?? 0.48;
  const bboxCount = activeFrame?.bbox_count ?? vehicles.length;
  const gtCount = activeFrame?.ground_truth_count ?? 26;
  const occlusionPct = gtCount > 0 ? Math.round(((gtCount - bboxCount) / gtCount) * 100) : 40;
  const area = phi * roadArea;

  return (
    <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 lg:col-span-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Grid3x3 size={14} className="text-emerald-400" />
          Phẳng chim IPM (Homography)
        </span>
        <span className="font-mono text-[10px] tabular-nums text-slate-500">
          t = {currentTime.toFixed(1)}s
        </span>
      </div>
      <IpmCanvas vehicles={vehicles} homography={homography} />
      <IpmOccupancyBar phi={phi} area={area} />
      <IpmComparisonCards
        bboxCount={bboxCount}
        occlusionPct={occlusionPct}
        phi={phi}
        area={area}
      />
    </section>
  );
}

export default IpmZone;
