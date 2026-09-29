import { memo } from "react";
import { improvementPct } from "../lib/data.js";

function badgeTone(value) {
  if (value === 0) return "bg-slate-700/50 text-slate-300";
  return value > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300";
}

function DeltaBadge({ value, higherIsBetter }) {
  const arrow = higherIsBetter
    ? value >= 0 ? "↑ " : "↓ "
    : value >= 0 ? "↓ " : "↑ ";
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${badgeTone(value)}`}
    >
      {arrow}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function metricRows(data, idx) {
  return [
    { label: "Hàng chờ", unit: "xe", kind: "float", prop: data.proposed.queue[idx], base: data.baseline.queue[idx], higherIsBetter: false },
    { label: "Độ trễ", unit: "giây/xe", kind: "float", prop: data.proposed.delay[idx], base: data.baseline.delay[idx], higherIsBetter: false },
    { label: "Thông lượng", unit: "xe/CK", kind: "int", prop: data.proposed.throughput[idx], base: data.baseline.throughput[idx], higherIsBetter: true },
  ];
}

function isValidNumber(v) {
  return v != null && !Number.isNaN(v) && Number.isFinite(v);
}

function TelemetryCell({ row }) {
  const imp = improvementPct(row.prop, row.base, row.higherIsBetter);
  const fmt = (v) => {
    if (!isValidNumber(v)) return "0";
    return row.kind === "int" ? Number(v).toFixed(0) : Number(v).toFixed(2);
  };
  return (
    <div className="px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{row.label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="font-mono text-[22px] font-bold tabular-nums text-slate-100">
          {fmt(row.prop)}
        </span>
        <DeltaBadge value={imp} higherIsBetter={row.higherIsBetter} />
      </div>
      <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
        {row.unit} · Gốc: {fmt(row.base)}
      </div>
    </div>
  );
}

// Unified telemetry matrix: CAO value + delta vs baseline per row.
const StatCards = memo(function StatCards({ kpi, scenario, cycle }) {
  const data = kpi?.[scenario];
  const idx = Math.min(Math.max(cycle - 1, 0), (data?.cycles.length || 1) - 1);
  if (!data) {
    return <div className="text-[13px] text-slate-500">Đang tải KPI…</div>;
  }
  return (
    <div className="grid grid-cols-3 divide-x divide-[#1e293b] rounded-lg border border-[#1e293b] bg-[#0f172a]">
      {metricRows(data, idx).map((row) => (
        <TelemetryCell key={row.label} row={row} />
      ))}
    </div>
  );
});

export default StatCards;
