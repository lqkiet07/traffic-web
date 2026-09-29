import MapView from "./MapView.jsx";
import ReplayControls from "./ReplayControls.jsx";
import JunctionInspector from "./JunctionInspector.jsx";
import { VEH_DIMS } from "../lib/data.js";

const LAMP_LEGEND = [
  ["#ef4444", "Đèn đỏ (dừng)"],
  ["#22c55e", "Đèn xanh (đi)"],
];

function MapLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
      {Object.entries(VEH_DIMS).map(([k, s]) => (
        <span key={k} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-4 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          {s.label}
        </span>
      ))}
      {LAMP_LEGEND.map(([color, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

// Left viewport: interactive map + inspector + transport bar + legend.
export default function MapViewport({ player, junction, localKpis, localKpi, scenario, selected, onSelect, offsetS = 0, phaseTune }) {
  return (
    <section className="flex min-h-[480px] flex-col gap-3 lg:col-span-8 lg:min-h-0">
      <div className="relative min-h-[380px] flex-1 lg:min-h-0">
        <MapView
          junctions={player.junctions}
          frames={player.frames}
          timeRef={player.timeRef}
          onCount={player.handleCount}
          signals={player.signals}
          localKpis={localKpis}
          cycle={player.cycle}
          simTime={player.simTime}
          globalSimTime={player.globalSimTime}
          selected={selected}
          onSelect={onSelect}
          offsetS={offsetS}
        />
        <JunctionInspector
          junction={junction}
          signals={player.signals}
          localKpi={localKpi}
          scenario={scenario}
          cycle={player.cycle}
          simTime={player.simTime}
          globalSimTime={player.globalSimTime}
          onClose={() => onSelect(null)}
          phaseTune={phaseTune}
          offsetS={offsetS}
        />
      </div>
      <ReplayControls player={player} />
      <MapLegend />
    </section>
  );
}
