import { ArrowRight, Cpu } from "lucide-react";
import { PIPELINE_STAGES } from "../lib/homography.js";

export { PIPELINE_STAGES };

function PipelineHeader({ isPlaying }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
        <Cpu size={14} className="text-emerald-400" />
        Pipeline xử lý YOLO → GAMA
      </div>
      <div
        className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold transition ${
          isPlaying
            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border border-slate-700 bg-slate-800 text-slate-400"
        }`}
      >
        {isPlaying ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Đang xử lý (30 FPS)</span>
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            <span>Tạm dừng</span>
          </>
        )}
      </div>
    </div>
  );
}

function StageBadge({ stage, isPlaying }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition ${
        isPlaying
          ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 shadow-sm shadow-emerald-950/50"
          : "border border-[#1e293b] bg-slate-950 text-slate-400"
      }`}
    >
      {isPlaying ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
      )}
      {stage}
    </span>
  );
}

export function PipelineStrip({ isPlaying = false }) {
  return (
    <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 lg:col-span-12">
      <PipelineHeader isPlaying={isPlaying} />
      <div className="flex flex-wrap items-center gap-1.5">
        {PIPELINE_STAGES.map((stage, idx) => (
          <span key={stage} className="flex items-center gap-1.5">
            {idx > 0 ? (
              <ArrowRight
                size={14}
                className={isPlaying ? "text-emerald-500/60" : "text-slate-600"}
              />
            ) : null}
            <StageBadge stage={stage} isPlaying={isPlaying} />
          </span>
        ))}
      </div>
    </section>
  );
}

export default PipelineStrip;
