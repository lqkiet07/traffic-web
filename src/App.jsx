import { useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import MapViewport from "./components/MapViewport.jsx";
import StatCards from "./components/StatCards.jsx";
import ComparisonCharts from "./components/ComparisonCharts.jsx";
import { useCyclePlayer } from "./hooks/useCyclePlayer.js";
import { usePhaseOffset } from "./hooks/usePhaseOffset.js";
import { getGamaSignal, latestCycleEntry } from "./lib/data.js";

function AnalysisPanel({ player }) {
  return (
    <section className="flex flex-col gap-3 lg:col-span-4 lg:overflow-auto">
      <StatCards kpi={player.kpi} scenario={player.scenario} cycle={player.cycle} />
      <ComparisonCharts kpi={player.kpi} scenario={player.scenario} cycle={player.cycle} />
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs leading-relaxed text-slate-400">
        <b className="text-slate-200">Hướng dẫn học tập:</b> bấm <b>Phát</b> để xem dòng xe Cần
        Thơ chạy theo nhịp đèn CAO-CBMP · kéo slider tới chu kỳ cao điểm (40–60) · click vào
        từng nút giao để mổ xẻ nguyên lý Max Pressure · chuyển kịch bản Low/Medium/High để kiểm
        chứng lý thuyết bão hòa.
      </div>
    </section>
  );
}

export default function App() {
  const player = useCyclePlayer();
  const [selected, setSelected] = useState(null);
  const phaseTune = usePhaseOffset();

  const junction = useMemo(
    () => player.junctions.find((j) => j.code === selected) || null,
    [player.junctions, selected]
  );
  const localKpis = player.junctionKpis?.[player.algo]?.[player.scenario] || {};
  const sigCycle = getGamaSignal([], player.globalSimTime).gamaCycle;
  const localKpi = selected
    ? latestCycleEntry(localKpis[selected], sigCycle)
    : null;

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <Header
        scenario={player.scenario}
        setScenario={player.setScenario}
        algo={player.algo}
        setAlgo={player.setAlgo}
      />
      {player.notice && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-200">
          {player.notice}
        </div>
      )}
      <main className="grid flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-12 lg:overflow-hidden">
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
      </main>
    </div>
  );
}
