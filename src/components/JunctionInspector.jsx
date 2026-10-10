import { useEffect, useState } from "react";
import { GraduationCap, X } from "lucide-react";
import { getGamaSignal, GAMA_CYCLE_LEN } from "../lib/data.js";

function WhyBox({ g1, g2 }) {
  const bigT = Math.round(Math.max(g1, g2));
  const smallT = Math.round(Math.min(g1, g2));
  const equal = bigT === smallT;
  const big = g1 >= g2 ? 1 : 2;
  const color = big === 1 ? "text-emerald-300" : "text-rose-300";
  return (
    <div className="mt-3 rounded-lg bg-slate-900 p-2.5 text-[12px] leading-relaxed text-slate-300">
      <b className="text-slate-100">Vì sao phân bổ như vậy?</b>
      <br />
      {equal ? (
        <>Chu kỳ này chia đều {bigT}s mỗi pha.</>
      ) : (
        <>Chu kỳ này pha {big} được phân bổ <b className={color}>{bigT}s xanh</b> (so {smallT}s của pha còn lại).</>
      )}{" "}
      CAO-CBMP phân bổ theo áp lực Max Pressure (
      <code className="rounded bg-slate-800 px-1 text-cyan-300">P = áp lực vào − áp lực ra</code>)
      đo bằng diện tích chiếm dụng thực (m²): 1 ô tô được tính nặng hơn 1 xe máy — đúng bản
      chất dòng xe hỗn hợp Việt Nam.
    </div>
  );
}

function LocalKpiRow({ localKpi, scenario }) {
  if (!localKpi) {
    return <p className="mt-2 text-[11px] text-slate-500">Chưa có dữ liệu nút cho kịch bản {scenario} — mới có CAO/Medium_900.</p>;
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

function PhaseSplitBar({ g1, g2, gamaCycle, phase }) {
  const p1 = (g1 / Math.max(g1 + g2, 1)) * 100;
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-[11px] text-slate-400">
        <span>
          Pha 1: <b className="font-mono tabular-nums text-emerald-300">{Math.round(g1)}s</b>
        </span>
        <span>
          Pha 2: <b className="font-mono tabular-nums text-rose-300">{Math.round(g2)}s</b>
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="bg-emerald-500" style={{ width: `${p1}%` }} />
        <div className="bg-rose-500" style={{ width: `${100 - p1}%` }} />
      </div>
      <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
        CK{gamaCycle} · C={GAMA_CYCLE_LEN}s · Xanh:{" "}
        <b className={phase === 0 ? "text-emerald-300" : "text-rose-300"}>Pha {phase + 1}</b>
      </p>
    </div>
  );
}

function PhaseTuneBox({ offsetS, setOffsetS, resetOffset }) {
  return (
    <div className="mt-3 rounded-lg bg-slate-900 p-2.5">
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>Căn giờ đèn (thủ công)</span>
        <span className="font-mono tabular-nums text-slate-200">{offsetS >= 0 ? "+" : ""}{offsetS}s</span>
      </div>
      <input
        type="range" min={-15} max={15} step={1} value={offsetS}
        onChange={(e) => setOffsetS(Number(e.target.value))}
        className="transport-scrubber w-full"
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-600">
        <span>-15s</span>
        <button onClick={resetOffset} className="text-slate-400 underline hover:text-slate-200">về 0</button>
        <span>+15s</span>
      </div>
    </div>
  );
}

// Per-junction panel: live green split + local KPI + Max Pressure explainer.
function HintChip() {
  return (
    <div className="absolute right-3 top-3 z-[1001] rounded-lg border border-[#1e293b] bg-[#090d16]/90 px-3 py-2 font-mono text-[11px] text-slate-500">
      Click nút giao để mổ xẻ
    </div>
  );
}

function CollapsedChip({ code, onExpand }) {
  return (
    <button
      onClick={onExpand}
      className="absolute right-3 top-3 z-[1001] rounded-lg border border-[#1e293b] bg-[#090d16]/95 px-3 py-2 font-mono text-[11px] font-bold text-slate-200 hover:border-cyan-700"
    >
      {code} ▾
    </button>
  );
}

export default function JunctionInspector({ junction, signals, localKpi, scenario, cycle, simTime, globalSimTime = 0, onClose, phaseTune, offsetS = 0 }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (junction) setOpen(true);
  }, [junction]);
  if (!junction) return <HintChip />;
  if (!open) return <CollapsedChip code={junction.code} onExpand={() => setOpen(true)} />;
  const sig = getGamaSignal(signals[junction.code], globalSimTime, offsetS);
  const g1 = sig.split?.g1 ?? 56;
  const g2 = sig.split?.g2 ?? 56;
  const phase = sig.activePhase;
  const gamaCycle = sig.gamaCycle;

  return (
    <div className="absolute right-3 top-3 z-[1001] max-h-[calc(100%-24px)] overflow-y-auto w-80 rounded-lg border border-[#1e293b] bg-[#090d16]/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-amber-300">
          <GraduationCap size={18} />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-slate-100">{junction.code}</h3>
          <p className="text-xs text-slate-500">{junction.name}</p>
          <p className="font-mono text-[11px] tabular-nums text-slate-600">
            {junction.lat.toFixed(6)}, {junction.lng.toFixed(6)}
          </p>
        </div>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-slate-500 hover:bg-slate-800"
          >
            ▴
          </button>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>
      </div>
      <PhaseSplitBar g1={g1} g2={g2} gamaCycle={gamaCycle} phase={phase} />
      <LocalKpiRow localKpi={localKpi} scenario={scenario} />
      <WhyBox g1={g1} g2={g2} />
      {phaseTune && (
        <PhaseTuneBox
          offsetS={phaseTune.offsetS ?? offsetS}
          setOffsetS={phaseTune.setOffsetS}
          resetOffset={phaseTune.resetOffset}
        />
      )}
    </div>
  );
}
