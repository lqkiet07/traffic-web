import { useEffect, useRef } from "react";
import { AlertTriangle, Grid3x3, ScanEye, SlidersHorizontal } from "lucide-react";
import { applyHomography } from "../lib/homography.js";
import { computeLiveCameraSignalSplit } from "../lib/cbmp.js";

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
  ctx.fillText("Vạch dừng xe máy", width / 2, 60);

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
        <span className="text-[11px] font-medium text-rose-300/90">Đếm theo Bounding Box</span>
        <span>~{bboxCount} xe (hụt {occlusionPct}%)</span>
      </div>
      <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-1.5 font-bold tabular-nums text-emerald-300">
        <span className="text-[11px] font-medium text-emerald-300/90">CAO diện tích</span>
        <span>φ = {phi.toFixed(2)} ({Math.round(phi * 100)}%) · A = {area.toFixed(1)} m²</span>
      </div>
    </div>
  );
}

function LiveSignalAllocation({ activeFrame }) {
  const split = computeLiveCameraSignalSplit(activeFrame);
  const { cao, baseline, deltaGreen, phi1, bboxCount1, gtCount1 } = split;

  const caoP1Pct = Math.round((cao.g1 / 112) * 100);
  const baseP1Pct = Math.round((baseline.g1 / 112) * 100);

  return (
    <div className="mt-2.5 rounded-lg border border-[#1e293b] bg-slate-900/60 p-2.5 font-mono text-[11px]">
      <div className="mb-2 flex items-center justify-between border-b border-[#1e293b] pb-1.5">
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <SlidersHorizontal size={13} className="text-emerald-400" />
          Phân bổ nhịp xanh Live (Digital Twin)
        </span>
        <span className="text-[10px] text-slate-400">Chu kỳ 120s (G=112s, Y=8s)</span>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="rounded bg-slate-950/60 p-1.5">
          <div className="text-slate-400">Pha 1 (Trục Camera)</div>
          <div className="mt-0.5 font-bold text-slate-200">
            φ₁ = {phi1.toFixed(2)} · Bbox: {bboxCount1} xe
          </div>
        </div>
        <div className="rounded bg-slate-950/60 p-1.5">
          <div className="text-slate-400">Pha 2 (Nhánh cắt ngang)</div>
          <div className="mt-0.5 font-bold text-slate-400">
            φ₂ = 0.35 · Ref: 14 xe
          </div>
        </div>
      </div>

      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="font-semibold text-emerald-400">CAO (Theo diện tích φ)</span>
          <span className="tabular-nums text-emerald-300">
            P1: {cao.g1}s ({caoP1Pct}%) · P2: {cao.g2}s
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-150"
            style={{ width: `${caoP1Pct}%` }}
          />
          <div className="h-full flex-1 bg-slate-700" />
        </div>
      </div>

      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="font-semibold text-rose-400">Baseline (Đếm xe truyền thống)</span>
          <span className="tabular-nums text-rose-300">
            P1: {baseline.g1}s ({baseP1Pct}%) · P2: {baseline.g2}s
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-rose-500 transition-all duration-150"
            style={{ width: `${baseP1Pct}%` }}
          />
          <div className="h-full flex-1 bg-slate-700" />
        </div>
      </div>

      {deltaGreen > 0 ? (
        <div className="flex items-start gap-1.5 rounded border border-amber-500/30 bg-amber-950/20 p-1.5 text-[10px] text-amber-300">
          <AlertTriangle size={13} className="shrink-0 text-amber-400 mt-0.5" />
          <span>
            Baseline cắt hụt <strong className="text-amber-200">+{deltaGreen}s xanh</strong> do bỏ sót {gtCount1 - bboxCount1} xe máy bị che khuất. CAO diện tích cấp đủ nhịp xả giải phóng ùn ứ.
          </span>
        </div>
      ) : (
        <div className="rounded border border-slate-700/40 bg-slate-950/40 p-1.5 text-center text-[10px] text-slate-400">
          Lưu lượng thấp hoặc hai pha cân bằng: Chênh lệch nhịp {deltaGreen}s.
        </div>
      )}
    </div>
  );
}

export function IpmZone({ activeFrame, metadata, currentTime = 0 }) {
  const roadArea = metadata?.roadAreaM2 ?? 150;
  const homography = metadata?.homography;
  const vehicles = activeFrame?.vehicles ?? [];
  const phi = Number.isFinite(activeFrame?.occupancy_phi) ? activeFrame.occupancy_phi : 0.48;
  const bboxCount = Number.isFinite(activeFrame?.bbox_count) ? activeFrame.bbox_count : vehicles.length;
  const gtCount = Number.isFinite(activeFrame?.ground_truth_count) ? activeFrame.ground_truth_count : 26;
  const occlusionPct = gtCount > 0 ? Math.round(((gtCount - bboxCount) / gtCount) * 100) : 40;
  const area = phi * roadArea;

  return (
    <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 lg:col-span-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Grid3x3 size={14} className="text-emerald-400" />
          Hình chiếu bằng IPM (BEV Homography)
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
      <LiveSignalAllocation activeFrame={activeFrame} />
    </section>
  );
}

export default IpmZone;
