import { useMemo } from "react";
import L from "leaflet";
import { Marker } from "react-leaflet";
import { phaseCountdown } from "../lib/data.js";

// Junction beacon: code badge + live green countdown (seconds left),
// computed from the logged per-cycle green splits (g1, g2).
export default function SignalBeacon({ junction, split, simTime, selected, onSelect, offsetS = 0 }) {
  const { phase, remaining } = useMemo(
    () => (split ? phaseCountdown(split.g1, split.g2, simTime, offsetS) : { phase: 0, remaining: 0 }),
    [split, simTime, offsetS]
  );
  const secs = Math.max(Math.ceil(remaining), 0);
  const green = phase === 0;
  const ring = green ? "#22c55e" : "#f43f5e";

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "signal-beacon",
        html: `<div style="
            display:flex;align-items:center;gap:4px;
            background:rgba(2,6,23,0.88);
            border:1px solid ${ring};
            border-radius:8px;padding:2px 6px;
            box-shadow:0 0 10px ${ring}55;
            font:700 11px ui-monospace,monospace;color:#e2e8f0;
            white-space:nowrap;transform:translate(-50%,-130%);">
          <span style="width:8px;height:8px;border-radius:99px;background:${ring};display:inline-block;"></span>
          <span>${junction.code}</span>
          <span style="color:${ring};min-width:26px;text-align:right;">${secs}s</span>
        </div>`,
        iconSize: [0, 0],
      }),
    [junction.code, ring, secs]
  );

  return (
    <Marker
      position={[junction.lat, junction.lng]}
      icon={icon}
      eventHandlers={{ click: onSelect }}
      opacity={selected ? 1 : 0.92}
      zIndexOffset={selected ? 1000 : 0}
    />
  );
}
