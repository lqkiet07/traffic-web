import { useCallback, useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import { loadRoads } from "../lib/data.js";
import { mppEff } from "../lib/scale.js";
import VehicleCanvas from "./VehicleCanvas.jsx";
import { JunctionLabel, SignalPoleLayer } from "./RealisticSignalPole.jsx";

const CENTER = [10.033, 105.765];

const ROAD_CASING = { color: "#334155", opacity: 1 };
const ROAD_ASPHALT = { color: "#1b2436", opacity: 1 };

// Double-stroke asphalt: concrete curb casing underneath + dark roadbed
// on top. Width follows zoom so asphalt stays proportional to vehicles.
// Fixed key: style updates apply without tearing down 203 segments.
function RoadLayer({ roads, zoom }) {
  const roadW = (f) => ((f?.properties?.lanes || 2) * 3.5) / mppEff(zoom);
  return (
    <>
      <GeoJSON key="gama-roads-casing" data={roads} style={(f) => ({ ...ROAD_CASING, weight: roadW(f) * 1.4 })} />
      <GeoJSON key="gama-roads" data={roads} style={(f) => ({ ...ROAD_ASPHALT, weight: roadW(f) })} />
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

// Single zoom source for all LOD layers (poles, labels, road width).
function MapInner(props) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const sync = () => setZoom(map.getZoom());
    map.on("zoomend", sync);
    return () => map.off("zoomend", sync);
  }, [map]);
  const { roads, frames, timeRef, onCount, junctions, signals, cycle, simTime, globalSimTime = 0, offsetS = 0 } = props;
  return (
    <>
      {roads && <RoadLayer roads={roads} zoom={zoom} />}
      <SignalPoleLayer junctions={junctions} signals={signals} cycle={cycle} simTime={simTime} globalSimTime={globalSimTime} zoom={zoom} offsetS={offsetS} />
      <JunctionLayer {...props} zoom={zoom} globalSimTime={globalSimTime} offsetS={offsetS} />
      <VehicleCanvas frames={frames} timeRef={timeRef} onCount={onCount} />
    </>
  );
}

// One pass over junctions: floating code label.
function JunctionLayer({ junctions, signals, globalSimTime = 0, selected, onSelect, zoom, offsetS = 0 }) {
  const map = useMap();
  const handleSelect = (code, j) => {
    const z = Math.max(map.getZoom(), 16);
    map.flyTo([j.lat, j.lng], z, { duration: 0.6 });
    onSelect(code);
  };
  return (
    <>
      {junctions.map((j) => (
        <JunctionLabel
          key={j.code}
          junction={j}
          signalsForJunction={signals?.[j.code]}
          globalSimTime={globalSimTime}
          zoom={zoom}
          selected={selected === j.code}
          onSelect={() => handleSelect(j.code, j)}
          offsetS={offsetS}
        />
      ))}
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
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-[#1e293b]">
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
