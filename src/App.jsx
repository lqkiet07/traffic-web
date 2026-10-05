import { useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import AlgorithmLab from "./components/AlgorithmLab.jsx";
import CameraView from "./components/CameraView.jsx";
import MapViewport from "./components/MapViewport.jsx";
import StatCards from "./components/StatCards.jsx";
import ComparisonCharts from "./components/ComparisonCharts.jsx";
import { useCyclePlayer } from "./hooks/useCyclePlayer.js";
import { usePhaseOffset } from "./hooks/usePhaseOffset.js";
import { getGamaSignal, latestCycleEntry, replayAvailable } from "./lib/data.js";

function AnalysisPanel({ player }) {
  return (
    <section className="flex flex-col gap-3 lg:col-span-4 lg:overflow-auto">
      <StatCards kpi={player.kpi} scenario={player.scenario} globalSimTime={player.globalSimTime} />
      <ComparisonCharts kpi={player.kpi} scenario={player.scenario} globalSimTime={player.globalSimTime} />
      <div className="rounded-xl border border-[#1e293b] bg-slate-900/70 p-3 text-xs leading-relaxed text-slate-400">
        <b className="text-slate-200">Hướng dẫn học tập:</b> bấm <b>Phát</b> để xem dòng xe Cần
        Thơ chạy theo nhịp đèn CAO-CBMP · kéo slider tới chu kỳ cao điểm (40–60) · click vào
        từng nút giao để mổ xẻ nguyên lý Max Pressure · chuyển kịch bản Low/Medium/High để kiểm
        chứng lý thuyết bão hòa.
      </div>
    </section>
  );
}

function LabPanel() {
  return (
    <div data-testid="lab-placeholder" className="contents">
      <AlgorithmLab />
    </div>
  );
}

function CameraPlaceholder() {
  return (
    <div data-testid="camera-placeholder" className="rounded-xl border border-[#1e293b] bg-slate-900/70 p-6 text-sm text-slate-300 lg:col-span-12">
      <CameraView />
    </div>
  );
}

function ReplayView({ player, junction, localKpis, localKpi, selected, setSelected, phaseTune }) {
  return (
    <>
      <MapViewport
        player={player}
        junction={junction}
        localKpis={localKpis}
        localKpi={localKpi}
        scenario={player.scenario}
        selected={selected}
        onSelect={setSelected}
        offsetS={phaseTune.offsetS}
        phaseTune={phaseTune}
      />
      <AnalysisPanel player={player} />
    </>
  );
}

function TabContent({ activeTab, viewProps }) {
  if (activeTab === "lab") return <LabPanel />;
  if (activeTab === "camera") return <CameraPlaceholder />;
  return <ReplayView {...viewProps} />;
}

// Tab state with replay pause on exit; guarded for test mocks.
function useActiveTab(player) {
  const [activeTab, setActiveTab] = useState("replay");
  const handleTabChange = (tab) => {
    if (activeTab === "replay" && tab !== "replay") {
      if (typeof player.setIsPlaying === "function") player.setIsPlaying(false);
    }
    setActiveTab(tab);
  };
  return [activeTab, handleTabChange];
}

export default function App() {
  const player = useCyclePlayer();
  const [selected, setSelected] = useState(null);
  const [activeTab, handleTabChange] = useActiveTab(player);
  const phaseTune = usePhaseOffset();

  const junction = useMemo(
    () => player.junctions.find((j) => j.code === selected) || null,
    [player.junctions, selected]
  );
  const localKpis = player.junctionKpis?.[player.algo]?.[player.scenario] || {};
  const sigCycle = getGamaSignal([], player.globalSimTime).gamaCycle;
  const localKpi = selected ? latestCycleEntry(localKpis[selected], sigCycle) : null;

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <Header
        scenario={player.scenario}
        setScenario={player.setScenario}
        algo={player.algo}
        setAlgo={player.setAlgo}
        maxCycle={player.maxCycle}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      {player.notice && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-200">
          {player.notice}
        </div>
      )}
      {!replayAvailable(player.algo, player.scenario) && (
        <div className="border-b border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs text-sky-200">
          {`Chưa có dữ liệu replay cho tổ hợp ${player.algo} · ${player.scenario} — đang hiển thị KPI tổng hợp.`}
        </div>
      )}
      <main className="grid flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-12 lg:overflow-hidden">
        <TabContent
          activeTab={activeTab}
          viewProps={{ player, junction, localKpis, localKpi, selected, setSelected, phaseTune }}
        />
      </main>
    </div>
  );
}
