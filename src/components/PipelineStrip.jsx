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
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isPlaying ? "bg-emerald-400" : "bg-slate-500"
          }`}
        />
        <span>{isPlaying ? "Đang phát" : "Tạm dừng"}</span>
      </div>
    </div>
  );
}

function StageBadge({ stage, isPlaying }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition ${
        isPlaying
          ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
          : "border border-[#1e293b] bg-slate-950 text-slate-400"
      }`}
    >
      {stage}
    </span>
  );
}

export function PipelineStrip({ isPlaying = false, embedded = false }) {
  const content = (
    <>
      <PipelineHeader isPlaying={isPlaying} />
      <div className="flex flex-wrap items-center gap-1.5">
        {PIPELINE_STAGES.map((stage, idx) => (
          <div key={stage} className="flex items-center gap-1.5">
            <StageBadge stage={stage} isPlaying={isPlaying} />
            {idx < PIPELINE_STAGES.length - 1 && (
              <ArrowRight size={13} className="text-slate-600 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return <div className="mt-2 border-t border-[#1e293b] pt-2">{content}</div>;
  }

  return (
    <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
      {content}
    </section>
  );
}

export default PipelineStrip;
