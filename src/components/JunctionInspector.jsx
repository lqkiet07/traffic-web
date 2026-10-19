import { X } from "lucide-react";
import { getGamaSignal, GAMA_CYCLE_LEN } from "../lib/data.js";

function LocalKpiRow({ localKpi }) {
  if (!localKpi) {
    return <p className="mt-2 text-[11px] text-slate-500">Chưa có dữ liệu KPI cho kịch bản này.</p>;
  }
  const cells = [
    ["Q", `${localKpi.queue.toFixed(2)} xe`],
    ["D", `${localKpi.delay.toFixed(2)}s`],
    ["T", `${localKpi.throughput}`],
  ];
  return (
    <div className="mt-2 grid grid-cols-3 gap-1.5" title="Trung bình chu kỳ 112s (GAMA)">
      {cells.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-slate-900 px-2 py-1.5 text-center">
          <div className="text-[10px] text-slate-500">
            {k === "Q" ? "Hàng chờ TB" : k === "D" ? "Trễ TB/xe" : "Xe thoát/CK"}
          </div>
          <div className="font-mono text-sm font-bold tabular-nums text-slate-100">{v}</div>
        </div>
      ))}
    </div>
  );
}

function PhaseSplitBar({ g1, g2, gamaCycle, phase, isYellow }) {
  const p1 = (g1 / Math.max(g1 + g2, 1)) * 100;
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-[11px] text-slate-400">
        <span>
          Pha 1: <b className="font-mono tabular-nums text-emerald-300">{Math.round(g1)}s</b>
        </span>
        <span>
          Pha 2: <b className="font-mono tabular-nums text-sky-300">{Math.round(g2)}s</b>
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${p1}%` }} />
        <div className="bg-sky-500 transition-all duration-300" style={{ width: `${100 - p1}%` }} />
      </div>
      <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
        CK{gamaCycle} · C={GAMA_CYCLE_LEN}s · {isYellow ? "Vàng" : "Xanh"}:{" "}
        <b className={isYellow ? "text-amber-300" : phase === 0 ? "text-emerald-300" : "text-sky-300"}>
          Pha {phase + 1}
        </b>
      </p>
    </div>
  );
}

export default function JunctionInspector({ junction, signals, localKpi, globalSimTime = 0, onClose, offsetS = 0 }) {
  if (!junction) return null;

  const sig = getGamaSignal(signals?.[junction.code], globalSimTime, offsetS);
  const g1 = sig.split?.g1 ?? 56;
  const g2 = sig.split?.g2 ?? 56;
  const phase = sig.activePhase;
  const gamaCycle = sig.gamaCycle;

  return (
    <div className="absolute right-3 top-3 z-[1001] max-h-[calc(100%-24px)] overflow-y-auto w-80 rounded-lg border border-[#1e293b] bg-[#090d16]/98 p-3.5 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono font-bold text-emerald-400">{junction.code}</span>
          <span className="text-xs text-slate-200">{junction.name}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <X size={15} />
        </button>
      </div>
      <PhaseSplitBar g1={g1} g2={g2} gamaCycle={gamaCycle} phase={phase} isYellow={sig.isYellow} />
      <LocalKpiRow localKpi={localKpi} />
    </div>
  );
}
