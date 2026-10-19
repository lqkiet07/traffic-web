import { memo } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { improvementPct } from "../lib/data.js";

const avg = (arr) => (arr && arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

function SummaryCell({ label, unit, propAvg, baseAvg, higherIsBetter }) {
  const imp = improvementPct(propAvg, baseAvg, higherIsBetter);
  const Icon = imp >= 0 ? ArrowUpRight : ArrowDownRight;
  const isPositive = higherIsBetter ? imp >= 0 : imp >= 0;
  const badgeColor = Math.abs(imp) < 1
    ? "bg-slate-800 text-slate-400"
    : isPositive
      ? "bg-emerald-500/15 text-emerald-300"
      : "bg-rose-500/15 text-rose-300";

  return (
    <div className="px-3 py-2">
      <div className="text-[11px] font-medium text-slate-400">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="font-mono text-base font-bold tabular-nums text-slate-100">
          {propAvg.toFixed(2)}
        </span>
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${badgeColor}`}>
          <Icon size={11} className="mr-0.5 shrink-0" />
          {Math.abs(imp).toFixed(1)}%
        </span>
      </div>
      <div className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-500">
        {unit} · Gốc: {baseAvg.toFixed(2)}
      </div>
    </div>
  );
}

const NetworkSummaryCard = memo(function NetworkSummaryCard({ kpi, scenario }) {
  const data = kpi?.[scenario];
  if (!data) return null;

  const delayProp = avg(data.proposed.delay);
  const delayBase = avg(data.baseline.delay);
  const queueProp = avg(data.proposed.queue);
  const queueBase = avg(data.baseline.queue);
  const tpProp = avg(data.proposed.throughput);
  const tpBase = avg(data.baseline.throughput);

  return (
    <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-2.5">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-slate-300">
          Tổng kết toàn mạng · Trung bình {data.cycles.length} chu kỳ
        </span>
        <span className="font-mono text-[10px] text-slate-500">Replicate đại diện</span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-[#1e293b] rounded border border-[#1e293b]/70 bg-slate-950/60">
        <SummaryCell label="Độ trễ TB" unit="giây/xe" propAvg={delayProp} baseAvg={delayBase} higherIsBetter={false} />
        <SummaryCell label="Hàng chờ TB" unit="xe" propAvg={queueProp} baseAvg={queueBase} higherIsBetter={false} />
        <SummaryCell label="Thông lượng" unit="xe/CK" propAvg={tpProp} baseAvg={tpBase} higherIsBetter={true} />
      </div>
    </div>
  );
});

export default NetworkSummaryCard;
