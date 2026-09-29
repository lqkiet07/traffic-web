import { memo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const METRICS = [
  { key: "queue", label: "Hàng chờ (xe)", color: "#f59e0b" },
  { key: "delay", label: "Độ trễ (giây/xe)", color: "#38bdf8" },
  { key: "throughput", label: "Thông lượng (xe/CK)", color: "#a78bfa" },
];

function safeNum(arr, i) {
  const v = arr?.[i];
  return v != null && !Number.isNaN(v) ? Number(Number(v).toFixed(2)) : 0;
}

function buildRows(data, metric) {
  const pArr = data.proposed[metric] || [];
  const bArr = data.baseline[metric] || [];
  return data.cycles.map((c, i) => ({
    cycle: c,
    CAO: safeNum(pArr, i),
    Baseline: safeNum(bArr, i),
  }));
}

function MetricTabs({ metric, setMetric }) {
  return (
    <div className="ml-auto flex gap-1">
      {METRICS.map((m) => (
        <button
          key={m.key}
          onClick={() => setMetric(m.key)}
          className={`rounded px-2 py-1 text-[11px] font-medium ${
            metric === m.key
              ? "bg-[#1e293b] text-slate-100"
              : "text-slate-500 hover:bg-slate-800/60"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// Head-to-head chart over 60 cycles with a time cursor synced to replay.
// Memoized: only re-renders when cycle/scenario changes, not every frame.
const ComparisonCharts = memo(function ComparisonCharts({ kpi, scenario, cycle }) {
  const [metric, setMetric] = useState("queue");
  const data = kpi?.[scenario];
  const meta = METRICS.find((m) => m.key === metric);

  if (!data) return <div className="text-sm text-slate-400">Đang tải biểu đồ…</div>;

  const rows = buildRows(data, metric);

  return (
    <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Đối đầu · 60 chu kỳ
        </span>
        <MetricTabs metric={metric} setMetric={setMetric} />
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="#172033" strokeDasharray="2 4" />
            <XAxis dataKey="cycle" stroke="#475569" fontSize={10} />
            <YAxis stroke="#475569" fontSize={10} width={40} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", fontSize: 12 }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={cycle} stroke="#facc15" strokeWidth={1.5} label={{ value: `CK ${cycle}`, fill: "#facc15", fontSize: 11, position: "top" }} />
            <Line type="monotone" dataKey="CAO" stroke="#10b981" strokeWidth={2.5} dot={false} name="CAO-CBMP" />
            <Line type="monotone" dataKey="Baseline" stroke="#6366f1" strokeWidth={2} dot={false} name="Đếm xe" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-slate-600">
        Vạch vàng = chu kỳ đang phát trên bản đồ · {meta.label}
      </p>
    </div>
  );
});

export default ComparisonCharts;
