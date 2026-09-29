import { Activity, FlaskConical } from "lucide-react";
import { SCENARIOS } from "../lib/data.js";

function SystemStatusBadge() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
        <Activity size={20} />
      </span>
      <div>
        <h1 className="text-[15px] font-semibold tracking-wide text-slate-100">
          TRAFFICDT <span className="text-emerald-400">· CẦN THƠ TWIN CONSOLE</span>
        </h1>
        <p className="text-xs text-slate-500">CAO-CBMP vs Đếm xe · 8 nút giao · 60 chu kỳ</p>
      </div>
    </div>
  );
}

function ScenarioSelect({ scenario, setScenario }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-1 text-xs text-slate-500">
        <FlaskConical size={14} />
        Kịch bản
      </span>
      <select
        value={scenario}
        onChange={(e) => setScenario(e.target.value)}
        className="rounded-md border border-[#1e293b] bg-[#0f172a] px-2 py-1.5 text-[13px] text-slate-100"
      >
        {SCENARIOS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AlgoToggle({ algo, setAlgo }) {
  const opts = [
    ["cao", "CAO-CBMP (Đề xuất)", "bg-emerald-500/15 text-emerald-300"],
    ["baseline", "Đếm xe (Gốc)", "bg-indigo-500/15 text-indigo-300"],
  ];
  return (
    <div className="flex overflow-hidden rounded-md border border-[#1e293b] text-[13px]">
      {opts.map(([key, label, active]) => (
        <button
          key={key}
          onClick={() => setAlgo(key)}
          className={`px-3 py-1.5 font-medium ${
            algo === key ? active : "bg-[#0f172a] text-slate-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Header({ scenario, setScenario, algo, setAlgo }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-[#1e293b] bg-[#090d16] px-4 py-2.5">
      <SystemStatusBadge />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ScenarioSelect scenario={scenario} setScenario={setScenario} />
        <AlgoToggle algo={algo} setAlgo={setAlgo} />
      </div>
    </header>
  );
}
