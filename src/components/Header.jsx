import { Activity, FlaskConical } from "lucide-react";
import { SCENARIOS } from "../lib/data.js";

function SystemStatusBadge({ maxCycle = 60 }) {
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
        <p className="text-xs text-slate-500">CAO-CBMP vs Đếm xe · 8 nút giao · {maxCycle} chu kỳ (replay)</p>
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
        title="Replay xe/đèn chỉ có Medium_900 — Low/High đổi số tổng + chart"
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
    <div title="Replay xe/đèn chỉ có CAO-CBMP — baseline đổi đường chart + KPI" className="flex overflow-hidden rounded-md border border-[#1e293b] text-[13px]">
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

function TabSwitcher({ activeTab, onTabChange }) {
  const tabs = [
    { key: "replay", label: "Replay Mô Phỏng" },
    { key: "lab", label: "Lab Thuật Toán" },
    { key: "camera", label: "Camera YOLO" },
  ];
  return (
    <nav className="flex items-center gap-1 rounded-lg border border-[#1e293b] bg-[#0f172a] p-1">
      {tabs.map((t) => {
        const active = activeTab === t.key;
        const base = active
          ? "bg-emerald-500 text-slate-950"
          : "text-slate-400 hover:text-slate-200";
        return (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium ${base}`}
          >
            {t.label}
            {t.key === "camera" && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                Live AI
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default function Header({ scenario, setScenario, algo, setAlgo, maxCycle = 60, activeTab = "replay", onTabChange = () => {} }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-[#1e293b] bg-[#090d16] px-4 py-2.5">
      <SystemStatusBadge maxCycle={maxCycle} />
      <TabSwitcher activeTab={activeTab} onTabChange={onTabChange} />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {activeTab === "replay" ? (
          <>
            <ScenarioSelect scenario={scenario} setScenario={setScenario} />
            <AlgoToggle algo={algo} setAlgo={setAlgo} />
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-[#1e293b] bg-[#0f172a] px-3 py-1.5 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{activeTab === "camera" ? "Chế độ Camera Replay" : "Chế độ Sandbox độc lập"}</span>
          </div>
        )}
      </div>
    </header>
  );
}
