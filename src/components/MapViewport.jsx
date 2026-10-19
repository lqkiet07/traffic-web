import MapView from "./MapView.jsx";
import ReplayControls from "./ReplayControls.jsx";
import JunctionInspector from "./JunctionInspector.jsx";

// Left viewport: interactive map + inspector + transport bar.
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
        <div className="absolute bottom-3 left-3 z-[500] pointer-events-none flex items-center gap-3 rounded-md border border-[#1e293b]/80 bg-[#090d16]/85 px-2.5 py-1 text-[11px] text-slate-300 backdrop-blur-sm">
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-[#f59e0b]" />Xe máy</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-[#38bdf8]" />Ô tô</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-[#ec4899]" />Xe tải</span>
        </div>
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
    </section>
  );
}
