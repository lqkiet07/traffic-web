import { ArrowRight, Cpu, Grid3x3, ScanEye, Upload, Video } from "lucide-react";

const PIPELINE_STAGES = [
  "YOLOv8 Segmentation",
  "ByteTrack",
  "Homography H(3×3)",
  "CAO Occupancy",
  "GAMA Engine",
];

function AnchorChip({ label, className }) {
  return (
    <span className={`absolute rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300 ${className}`}>
      {label}
    </span>
  );
}

function CameraStreamZone() {
  return (
    <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 lg:col-span-7">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Video size={14} className="text-emerald-400" />
          Luồng camera phối cảnh
        </span>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-200">
          CAM-CTU-01
        </span>
        <span className="font-mono text-[10px] tabular-nums text-slate-500">
          1920×1080 · 30 FPS
        </span>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-lg border border-[#1e293b] bg-slate-950">
        <div className="absolute inset-x-8 top-1/3 h-px bg-slate-700/60" />
        <div className="absolute inset-x-16 top-1/2 h-px bg-slate-700/60" />
        <div className="absolute inset-y-6 left-1/4 w-px bg-slate-700/60" />
        <div className="absolute inset-y-6 right-1/4 w-px bg-slate-700/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[11px] text-slate-600">
            Chờ luồng video — khung hiệu chuẩn phối cảnh
          </span>
        </div>
        <AnchorChip label="P1" className="left-2 top-2" />
        <AnchorChip label="P2" className="right-2 top-2" />
        <AnchorChip label="P3" className="bottom-2 left-2" />
        <AnchorChip label="P4" className="bottom-2 right-2" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex-1 rounded-lg border border-dashed border-[#1e293b] px-3 py-2 text-center text-xs text-slate-500">
          Kéo thả video .mp4 vào đây
        </div>
        <button
          type="button"
          title="Chờ triển khai pipeline YOLOv8 + ByteTrack"
          className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
        >
          <Upload size={14} />
          Chọn video thử nghiệm
        </button>
      </div>
    </section>
  );
}

function IpmZone() {
  return (
    <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 lg:col-span-5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
        <Grid3x3 size={14} className="text-emerald-400" />
        Phẳng chim IPM (Homography)
      </div>
      <div
        className="rounded-lg border border-[#1e293b] bg-slate-950"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <div className="flex h-28 items-center justify-center">
          <span className="font-mono text-[11px] text-slate-600">
            Mặt đường trực giao mô phỏng — lưới IPM
          </span>
        </div>
      </div>
      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
          <span className="text-slate-400">Mức chiếm dụng φ = 0.48 (48%)</span>
          <span className="font-bold text-emerald-400">48%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: "48%" }} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-col gap-1.5 font-mono text-[11px]">
        <span className="flex items-center gap-1.5 text-slate-500">
          <ScanEye size={13} className="text-slate-500" />
          Đối chiếu đếm xe vs diện tích chiếm dụng
        </span>
        <span className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 font-bold tabular-nums text-rose-300">
          Bbox: ~14 xe (hụt ~40%)
        </span>
        <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-bold tabular-nums text-emerald-300">
          CAO: φ = 0.48 (đúng 100%)
        </span>
      </div>
    </section>
  );
}

function PipelineStrip() {
  return (
    <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 lg:col-span-12">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
        <Cpu size={14} className="text-emerald-400" />
        Pipeline xử lý YOLO → GAMA
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PIPELINE_STAGES.map((stage, idx) => (
          <span key={stage} className="flex items-center gap-1.5">
            {idx > 0 ? <ArrowRight size={14} className="text-slate-500" /> : null}
            <span className="rounded-md border border-[#1e293b] bg-slate-950 px-2.5 py-1 font-mono text-[11px] text-slate-300">
              {stage}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

export default function CameraView() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
      <CameraStreamZone />
      <IpmZone />
      <PipelineStrip />
    </div>
  );
}
