import { useCallback, useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { loadRoads, latestCycleEntry, V_INDEX } from "../lib/data.js";
import { mppEff, ROAD_W_M } from "../lib/scale.js";
import VehicleCanvas from "./VehicleCanvas.jsx";
import { JunctionLabel, SignalPoleLayer } from "./RealisticSignalPole.jsx";

const CENTER = [10.033, 105.765];

const ROAD_CASING = { color: "#334155", opacity: 1 };
const ROAD_ASPHALT = { color: "#1b2436", opacity: 1 };

// Double-stroke asphalt: concrete curb casing underneath + dark roadbed
// on top. Width follows zoom so asphalt stays proportional to vehicles.
// Fixed key: style updates apply without tearing down 203 segments.
function RoadLayer({ roads, zoom }) {
  const roadW = ROAD_W_M / mppEff(zoom);
  return (
    <>
      <GeoJSON key="gama-roads-casing" data={roads} style={{ ...ROAD_CASING, weight: roadW * 1.4 }} />
      <GeoJSON key="gama-roads" data={roads} style={{ ...ROAD_ASPHALT, weight: roadW }} />
    </>
  );
}

// Custom panes must exist before any layer onAdd runs. whenReady fires
// right after map creation, ahead of all child effects.
function ensurePanes(map) {
  if (!map || typeof map.getPane !== "function") return;
  const sat = map.getPane("satPane") || map.createPane("satPane");
  sat.style.zIndex = "201";
  const veh = map.getPane("vehiclePane") || map.createPane("vehiclePane");
  veh.style.zIndex = "450";
  veh.style.pointerEvents = "none";
}

// Ref callback: fires right after map creation, before any child layer
// onAdd. The only point early enough to guarantee custom panes exist.
function usePaneRef() {
  return useCallback((map) => {
    if (map) ensurePanes(map);
  }, []);
}

// Median vehicle position of the last frame for follow mode.
function medianLatLng(frames) {
  const last = frames?.length ? frames[frames.length - 1].vehicles : null;
  if (!last?.length) return null;
  const mid = (a) => a[Math.floor(a.length / 2)];
  const lats = last.map((v) => v[V_INDEX.LAT]).sort((a, b) => a - b);
  const lngs = last.map((v) => v[V_INDEX.LNG]).sort((a, b) => a - b);
  return [mid(lats), mid(lngs)];
}

// Single zoom source for all LOD layers (poles, labels, road width).
function MapInner(props) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [follow, setFollow] = useState(false);
  useEffect(() => {
    const sync = () => setZoom(map.getZoom());
    map.on("zoomend", sync);
    return () => map.off("zoomend", sync);
  }, [map]);
  useEffect(() => {
    const stop = () => setFollow(false);
    map.on("dragstart", stop);
    return () => map.off("dragstart", stop);
  }, [map]);
  const { roads, frames, timeRef, onCount, junctions, signals, cycle, simTime, globalSimTime = 0, offsetS = 0 } = props;
  useEffect(() => {
    if (!follow || zoom < 17) return;
    const id = setInterval(() => {
      const c = medianLatLng(frames);
      if (c) map.setView(c, map.getZoom(), { animate: true });
    }, 500);
    return () => clearInterval(id);
  }, [map, follow, zoom, frames]);
  const chip = "absolute left-3 top-3 z-[600] rounded-lg border border-[#1e293b] bg-[#090d16]/90 px-3 py-2 font-mono text-[11px] text-slate-300";
  return (
    <>
      {zoom >= 17 && (
        <button onClick={() => setFollow(!follow)} className={follow ? `${chip} border-cyan-700 text-slate-100` : chip}>
          Theo xe
        </button>
      )}
      {roads && <RoadLayer roads={roads} zoom={zoom} />}
      <SignalPoleLayer junctions={junctions} signals={signals} cycle={cycle} simTime={simTime} globalSimTime={globalSimTime} zoom={zoom} offsetS={offsetS} />
      <JunctionLayer {...props} zoom={zoom} globalSimTime={globalSimTime} offsetS={offsetS} />
      <VehicleCanvas frames={frames} timeRef={timeRef} onCount={onCount} />
    </>
  );
}

function formatLocalKpi(entry) {
  if (!entry) return "Chưa có KPI chu kỳ này";
  return `Q: ${entry.queue.toFixed(2)} xe · D: ${entry.delay.toFixed(2)}s · T: ${entry.throughput}`;
}

// One pass over junctions: floating code label + tooltip with local KPI.
function JunctionLayer({ junctions, signals, localKpis, cycle, globalSimTime = 0, selected, onSelect, zoom, offsetS = 0 }) {
  const map = useMap();
  const handleSelect = (code, j) => {
    const z = Math.max(map.getZoom(), 16);
    map.flyTo([j.lat, j.lng], z, { duration: 0.6 });
    onSelect(code);
  };
  return (
    <>
      {junctions.map((j) => {
        const kpiEntry = latestCycleEntry(localKpis[j.code], cycle);
        return (
          <JunctionLabel
            key={j.code}
            junction={j}
            signalsForJunction={signals?.[j.code]}
            globalSimTime={globalSimTime}
            zoom={zoom}
            selected={selected === j.code}
            onSelect={() => handleSelect(j.code, j)}
            offsetS={offsetS}
          >
            <Tooltip direction="top" offset={[0, -18]}>
              <b>{j.code}</b>
              <br />
              {j.name}
              <br />
              <span className="font-mono">{formatLocalKpi(kpiEntry)}</span>
            </Tooltip>
          </JunctionLabel>
        );
      })}
    </>
  );
}

// Can Tho dark basemap + GAMA road network + 32 physical signal poles
// with live 2-lamp heads + vehicle canvas.
export default function MapView(props) {
  const [roads, setRoads] = useState(null);

  useEffect(() => {
    loadRoads().then(setRoads).catch(() => setRoads(null));
  }, []);

  const paneRef = usePaneRef();

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-800">
      <MapContainer
        ref={paneRef}
        center={CENTER}
        zoom={14}
        minZoom={12}
        maxZoom={19}
        maxBounds={[
          [9.99, 105.72],
          [10.07, 105.8],
        ]}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          maxZoom={15}
        />
        <TileLayer
          pane="satPane"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics"
          minZoom={16}
          maxZoom={19}
          maxNativeZoom={19}
        />
        <MapInner {...props} roads={roads} />
      </MapContainer>
    </div>
  );
}
