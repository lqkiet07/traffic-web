import { Fragment, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Marker } from "react-leaflet";
import { loadPoles, getGamaSignal } from "../lib/data.js";

// Physical signal head: vertical 2-lamp box, active lamp glows.
function SignalHead({ pole, state }) {
  const lamps = [
    ["red", "#ef4444", state === "red"],
    ["green", "#10b981", state === "green"],
  ];
  const dots = lamps
    .map(
      ([, color, on]) =>
        `<span style="display:block;width:10px;height:10px;border-radius:99px;` +
        `background:${color};opacity:${on ? "1" : "0.25"};` +
        `${on ? `box-shadow:0 0 6px ${color};` : ""}"></span>`
    )
    .join("");
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "signal-head",
        html:
          `<div style="display:flex;flex-direction:column;gap:3px;` +
          `background:rgba(2,6,23,0.9);border:1px solid #334155;border-radius:4px;` +
          `padding:4px;transform:translate(-50%,-50%);">${dots}</div>`,
        iconSize: [0, 0],
      }),
    [dots]
  );
  return <Marker position={[pole.lat, pole.lng]} icon={icon} interactive={false} zIndexOffset={1000} />;
}

function JunctionPoles({ poles, signalsForJunction, globalSimTime, offsetS = 0 }) {
  const sig = getGamaSignal(signalsForJunction, globalSimTime, offsetS);
  return (
    <Fragment>
      {poles.map((pole) => {
        const poleState = sig[pole.axis]?.state || "red";
        return <SignalHead key={pole.id} pole={pole} state={poleState} />;
      })}
    </Fragment>
  );
}

// Semantic LOD: poles render only at close zoom (>= 15).
// At overview zoom the center badge alone carries the signal state.
export function SignalPoleLayer({ signals, cycle, globalSimTime, zoom, offsetS = 0 }) {
  const [poles, setPoles] = useState({});
  useEffect(() => {
    loadPoles().then(setPoles).catch(() => setPoles({}));
  }, []);

  if (zoom < 15) return null;
  return (
    <>
      {Object.entries(poles).map(([code, list]) => (
        <JunctionPoles
          key={code}
          poles={list}
          signalsForJunction={signals?.[code]}
          globalSimTime={globalSimTime}
          offsetS={offsetS}
        />
      ))}
    </>
  );
}

// Badge dot: phase-1 green vs phase-2 sky (minor axis green, not a stop).
const PHASE_DOT = ["#22c55e", "#38bdf8"];

// Junction badge: full [dot code · secs] at overview zoom, fading
// watermark at close zoom where micro poles take the spotlight.
export function JunctionLabel({ junction, signalsForJunction, globalSimTime, zoom, selected, onSelect, offsetS = 0, children }) {
  const sig = getGamaSignal(signalsForJunction, globalSimTime, offsetS);
  const dot = sig ? PHASE_DOT[sig.activePhase] : "#64748b";
  const secs = sig ? Math.max(Math.ceil(sig.remaining), 0) : 0;
  const close = zoom >= 15;
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "junction-label",
        html:
          `<div style="background:rgba(2,6,23,${close ? "0.45" : "0.85"});border:1px solid ` +
          `${selected ? "#22d3ee" : "#334155"};border-radius:6px;padding:1px 6px;` +
          `font:700 ${selected ? "12px" : "11px"} ui-monospace,monospace;color:#e2e8f0;white-space:nowrap;` +
          `transform:translate(-50%,-50%);cursor:pointer;` +
          `${selected ? "box-shadow:0 0 12px #22d3ee88;" : ""}` +
          `${close ? "opacity:0.6;" : ""}">` +
          `<span style="display:inline-block;width:7px;height:7px;border-radius:99px;` +
          `background:${dot};margin-right:4px;"></span>${junction.code}` +
          `${close ? "" : ` · <span>${secs}s</span>`}` +
          `</div>`,
        iconSize: [0, 0],
      }),
    [junction.code, selected, close, dot, secs]
  );
  return (
    <Marker
      position={[junction.lat, junction.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(junction.code) }}
      zIndexOffset={selected ? 1000 : 0}
    >
      {children}
    </Marker>
  );
}
