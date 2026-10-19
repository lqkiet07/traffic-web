import { FlaskConical, Video } from "lucide-react";
import { SCENARIOS } from "../lib/data.js";

function SystemStatusBadge() {
  return (
    <div className="flex items-center">
      <h1 className="text-[15px] font-semibold tracking-wide text-slate-100">
        Traffic<span className="font-bold text-emerald-400">DT</span>{" "}
        <span className="font-normal text-slate-400">· Digital Twin Cần Thơ</span>
      </h1>
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

function TabSwitcher({ activeTab, onTabChange }) {
  const tabs = [
    { id: "replay", label: "Replay Mô Phỏng" },
    { id: "lab", label: "Lab Thuật Toán" },
    { id: "camera", label: "Camera CCTV", icon: Video },
  ];
  return (
    <nav className="flex items-center gap-1 rounded-lg border border-[#1e293b] bg-[#0f172a] p-1">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        const base = active
          ? "bg-emerald-500 text-slate-950"
          : "text-slate-400 hover:text-slate-200";
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium ${base}`}
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function Header({ scenario, setScenario, algo, setAlgo, maxCycle = 60, activeTab = "replay", onTabChange = () => {} }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-[#1e293b] bg-[#090d16] px-4 py-2.5">
      <SystemStatusBadge />
      <TabSwitcher activeTab={activeTab} onTabChange={onTabChange} />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {activeTab === "replay" && (
          <>
            <ScenarioSelect scenario={scenario} setScenario={setScenario} />
            <AlgoToggle algo={algo} setAlgo={setAlgo} />
          </>
        )}
      </div>
    </header>
  );
}
