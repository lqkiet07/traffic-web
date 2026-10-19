import { memo } from "react";
import { AlertTriangle, Check, CheckCircle2, Info, StepBack, StepForward } from "lucide-react";

const PRESET_OPTIONS = [
  {
    key: "paradox",
    label: "1. Giờ cao điểm xe máy",
    activeClass: "bg-emerald-500 font-semibold text-slate-950 shadow-sm",
  },
  {
    key: "corridor_jam",
    label: "2. Kẹt xe dây chuyền",
    activeClass: "bg-amber-500 font-semibold text-slate-950 shadow-sm",
  },
];

function TelemetryCell({ label, value, subtext }) {
  return (
    <div className="px-3 py-2.5">
      <div className="truncate text-[11px] font-medium text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[20px] font-bold tabular-nums text-slate-100">
        {value}
      </div>
      <div className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-slate-500">
        {subtext}
      </div>
    </div>
  );
}

export const LabStatCards = memo(function LabStatCards({ telemetry }) {
  const phiIn = Number(telemetry?.phiNode1P1 ?? 0);
  const phiCorridor = Number(telemetry?.phiCorridor ?? 0);
  const tp = Number(telemetry?.throughput ?? 0);

  return (
    <div className="grid grid-cols-3 divide-x divide-[#1e293b] rounded-lg border border-[#1e293b] bg-[#0f172a]">
      <TelemetryCell
        label="Áp suất vào φ_in"
        value={`${Math.round(phiIn * 100)}%`}
        subtext="Nút 1 Nhánh Tây"
      />
      <TelemetryCell
        label="Hạ lưu nối φ_out"
        value={`${Math.round(phiCorridor * 100)}%`}
        subtext="Hành lang Nút 1-2"
      />
      <TelemetryCell
        label="Thông lượng thoát"
        value={tp}
        subtext="xe đã thoát mạng"
      />
    </div>
  );
});

export function LabPresetBar({ activeScenario, onSelectPreset }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#1e293b] bg-slate-950/80 p-1 text-xs">
      {PRESET_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onSelectPreset?.(opt.key)}
          className={`rounded-md py-1.5 text-center font-medium transition ${
            activeScenario === opt.key
              ? opt.activeClass
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PhaseCard({ title, badge, lines, areaLabel, areaValue, phiLabel, phiValue, tone }) {
  const isAmber = tone === "amber";
  const wrapTone = isAmber ? "border-amber-500/30" : "border-sky-500/30";
  const headTone = isAmber ? "text-amber-300" : "text-sky-300";
  const badgeTone = isAmber ? "bg-amber-500/20 text-amber-300" : "bg-sky-500/20 text-sky-300";
  const areaTone = isAmber ? "text-amber-400" : "text-sky-400";
  return (
    <div className={`rounded-xl border ${wrapTone} bg-slate-950/70 p-3 font-mono`}>
      <div className={`flex items-center justify-between text-xs ${headTone} font-semibold mb-1.5`}>
        <span>{title}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeTone}`}>{badge}</span>
      </div>
      <div className="text-xs text-slate-400">{lines && lines.length ? lines.join(" ") : "0 xe"}</div>
      <div className={`mt-1.5 text-base font-bold ${areaTone}`}>
        {areaLabel} = {areaValue} m²
      </div>
      <div className="mt-1 text-xs text-cyan-300">
        {phiLabel} = <strong className="text-cyan-400">{phiValue}</strong>
      </div>
    </div>
  );
}

export function Step1Math({ data }) {
  const occ1 = data?.occlusionP1;
  const occ2 = data?.occlusionP2;
  const rawP1 = occ1?.rawCount ?? (data?.p1Counts?.moto ?? 0);
  const visP1 = occ1?.visibleCount ?? rawP1;
  const rawP2 = occ2?.rawCount ?? (data?.p2Counts?.moto ?? 0);
  const visP2 = occ2?.visibleCount ?? rawP2;
  const p1Area = (data?.p1Area || 0).toFixed(1);
  const phiIn1 = (data?.phiIn1 || 0).toFixed(2);
  const p2Area = (data?.p2Area || 0).toFixed(1);
  const phiIn2 = (data?.phiIn2 || 0).toFixed(2);
  const loss1 = occ1?.lossPercentage ?? 0;
  const loss2 = occ2?.lossPercentage ?? 0;
  return (
    <div className="grid grid-cols-2 gap-2 font-mono text-[11px] leading-relaxed">
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5">
        <div className="font-bold text-rose-300">Baseline (Camera Bbox)</div>
        <div className="mt-1.5 text-slate-200">P1: {visP1}/{rawP1} xe (thấy được/tổng)</div>
        <div className="mt-1 text-slate-200">P2: {visP2}/{rawP2} xe (thấy được/tổng)</div>
        <div className="mt-2 rounded-md bg-rose-500/15 px-2 py-1 font-bold tabular-nums text-rose-300">
          <AlertTriangle size={13} className="inline mr-1 text-amber-400" />
          Hụt ~{loss1}% (P1) / ~{loss2}% (P2) do che khuất tương hỗ
        </div>
      </div>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
        <div className="font-bold text-emerald-300">CAO (Độ đo diện tích)</div>
        <div className="mt-1.5 text-slate-200">φ_in1 = {phiIn1} (A₁ = {p1Area} m²)</div>
        <div className="mt-1 text-slate-200">φ_in2 = {phiIn2} (A₂ = {p2Area} m²)</div>
        <div className="mt-2 rounded-md bg-emerald-500/15 px-2 py-1 font-bold text-emerald-300">
          <Check size={13} className="inline mr-1 text-emerald-400" />
          Miễn nhiễm che khuất — đo mặt đường
        </div>
      </div>
    </div>
  );
}

export function Step2Math({ data, step1 }) {
  const phiInNum = Number(step1?.phiIn1 ?? 0) || 0;
  const phiOutVal = Number(step1?.phiOut ?? 0) || 0;
  const phiIn = phiInNum.toFixed(2);
  const phiOut = phiOutVal.toFixed(2);
  const wArea = (Number(data?.w1 ?? 0) || 0).toFixed(2);
  const bpArea = (Number(data?.backPressureDeduction ?? 0.70 * phiOutVal ?? 0) || 0).toFixed(2);
  const xIn1Num = Math.round(Number(data?.xIn1 ?? step1?.occlusionP1?.visibleCount ?? 0) || 0);
  const xOutNum = Math.round(Number(data?.xOut ?? ((step1?.outCounts?.moto ?? 0) + (step1?.outCounts?.car ?? 0) + (step1?.outCounts?.truck ?? 0)) ?? 0) || 0);
  const wCountNum = Number(data?.w1Count ?? Math.max(0, xIn1Num - 0.70 * xOutNum) ?? 0) || 0;
  const bpCountNum = Number(data?.backPressureCount ?? 0.70 * xOutNum ?? 0) || 0;
  const wCount = wCountNum.toFixed(1);
  const bpCount = bpCountNum.toFixed(1);
  const isBackpressure = phiOutVal >= 0.7;
  // Node 2 is corridor receiver: no downstream link, drains to network
  const isReceiver = data?.isCorridorReceiver === true;
  const outflowName = data?.outflowName || "Hành lang Nút 1-2";
  const approachName = data?.approachName || "Nhánh Tây";

  return (
    <div className="space-y-3">
      {isReceiver ? <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-xs text-cyan-200">Nút 2 xả hành lang ra mạng lưới — không bị dội ngược ({outflowName})</div> : null}
      <div className="flex flex-col gap-2.5 font-mono">
        <div className="rounded-xl border border-cyan-500/30 bg-slate-950/70 p-3">
          <div className="text-xs text-slate-400">Áp lực hướng vào ({approachName}):</div>
          <div className="mt-1 text-base font-bold text-cyan-400">φ_in = {phiIn}</div>
        </div>
        <div className={`rounded-xl border p-3 ${isBackpressure ? "border-rose-500/40 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-slate-950/70 text-emerald-400"}`}>
          <div className="text-xs text-slate-400">Áp lực hạ lưu ({outflowName}):</div>
          <div className="mt-1 text-base font-bold">φ_out = {phiOut}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-2.5">
          <div className="text-[11px] font-bold text-indigo-300">Baseline (Eq. 2, đếm xe)</div>
          <div className="mt-1 text-slate-300 text-[11px]">w₁_count = max(0, x_in − 0.70 × x_out)</div>
          <div className="mt-1 text-sm font-bold text-indigo-200">
            w₁ = max(0, {xIn1Num} − 0.70 × {xOutNum}) = {wCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Khấu trừ dội ngược: {bpCount}</div>
        </div>
        <div className="rounded-lg border border-cyan-500/30 bg-slate-900 p-2.5">
          <div className="text-[11px] font-bold text-emerald-300">CAO (Eq. 3, diện tích)</div>
          <div className="mt-1 text-slate-300 text-[11px]">w₁_area = max(0, φ_in − 0.70 × φ_out)</div>
          <div className="mt-1 text-sm font-bold text-emerald-300">
            w₁ = max(0, {phiIn} − 0.70 × {phiOut}) = {wArea}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Khấu trừ dội ngược: {bpArea}</div>
        </div>
      </div>

      {isBackpressure ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/15 p-2.5 text-xs font-semibold text-rose-300">
          <AlertTriangle size={13} className="inline mr-1 text-amber-400" />
          Cơ chế dội ngược kích hoạt: Hành lang nối Nút 1-2 bị nghẽn (φ_out ≥ 0.70). Thuật toán tự động cắt giảm thời gian xanh cấp cho Nút 1 để tránh dồn xe vào điểm nghẽn!
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
          <CheckCircle2 size={13} className="inline mr-1 text-emerald-400" />
          Hạ lưu thông thoáng (φ_out &lt; 0.70): Không phát sinh áp lực dội ngược, xe được giải phóng tối đa qua hành lang.
        </div>
      )}
    </div>
  );
}

export function Step3Math({ data, step2 }) {
  const wA1Num = Number(data?.w1 ?? step2?.w1 ?? (data?.gamma1 != null ? data.gamma1 / 2.5 : 0) ?? 0) || 0;
  const wA2Num = Number(data?.w2 ?? step2?.w2 ?? (data?.gamma2 != null ? data.gamma2 / 2.5 : 0) ?? 0) || 0;
  const g1Num = Number(data?.gamma1 ?? 2.5 * wA1Num ?? 0) || 0;
  const g2Num = Number(data?.gamma2 ?? 2.5 * wA2Num ?? 0) || 0;
  const wC1Num = Number(step2?.w1Count ?? (data?.gamma1Count != null ? data.gamma1Count / 2.5 : 0) ?? 0) || 0;
  const wC2Num = Number(step2?.w2Count ?? (data?.gamma2Count != null ? data.gamma2Count / 2.5 : 0) ?? 0) || 0;
  const gC1Num = Number(data?.gamma1Count ?? 2.5 * wC1Num ?? 0) || 0;
  const gC2Num = Number(data?.gamma2Count ?? 2.5 * wC2Num ?? 0) || 0;
  const w1 = wA1Num.toFixed(2);
  const w2 = wA2Num.toFixed(2);
  const gamma1 = g1Num.toFixed(2);
  const gamma2 = g2Num.toFixed(2);
  const wC1 = wC1Num.toFixed(1);
  const wC2 = wC2Num.toFixed(1);
  const gC1 = gC1Num.toFixed(1);
  const gC2 = gC2Num.toFixed(1);
  const total = g1Num + g2Num;
  const ratio1 = total > 0 ? Math.round((g1Num / total) * 100) : 50;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#1e293b] bg-slate-950/70 p-3 font-mono text-xs">
        <div className="text-slate-400">Áp suất bão hòa song song (Hệ số bão hòa C_sat = 2.5): γ = 2.5 × w</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-2.5">
            <div className="text-[11px] font-bold text-indigo-300">Baseline (đếm xe)</div>
            <div className="mt-1 text-sm font-bold text-indigo-200">γ₁ = 2.5 × {wC1} = {gC1}</div>
            <div className="mt-1 text-sm font-bold text-slate-300">γ₂ = 2.5 × {wC2} = {gC2}</div>
          </div>
          <div className="rounded-lg bg-slate-900 p-2.5 border border-emerald-500/30">
            <div className="text-[11px] font-bold text-emerald-300">CAO (diện tích)</div>
            <div className="mt-1 text-sm font-bold text-emerald-400">γ₁ = 2.5 × {w1} = {gamma1}</div>
            <div className="mt-1 text-sm font-bold text-slate-300">γ₂ = 2.5 × {w2} = {gamma2}</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-slate-950/70 p-3 text-xs">
        <div className="flex justify-between items-center mb-1 text-slate-400 font-mono">
          <span>Tỷ lệ áp lực cạnh tranh (CAO):</span>
          <span className="text-emerald-400 font-bold">Pha 1 {ratio1}% vs Pha 2 {100 - ratio1}%</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${ratio1}%` }} title={`Pha 1: ${ratio1}%`} />
          <div className="bg-slate-600 transition-all duration-300" style={{ width: `${100 - ratio1}%` }} title={`Pha 2: ${100 - ratio1}%`} />
        </div>
      </div>
    </div>
  );
}

export function Step4Math({ data }) {
  const bG1 = Number(data?.baseline?.g1 ?? 60) || 60;
  const bG2 = Number(data?.baseline?.g2 ?? 52) || 52;
  const cG1 = Number(data?.cbmp?.g1 ?? 64) || 64;
  const cG2 = Number(data?.cbmp?.g2 ?? 48) || 48;
  const total = Number(data?.totalCycle ?? 120) || 120;
  const lost = Number(data?.lostTime ?? 8) || 8;
  const avail = total - lost > 0 ? total - lost : 112;
  const pct = (g) => Math.min(100, Math.max(0, (g / avail) * 100));

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#1e293b] bg-slate-950/70 p-3 font-mono text-xs">
        <div className="text-slate-400">Công thức phân bổ xanh (C = {total}s, L = {lost}s, khả dụng {avail}s): g = 10 + 92 × thị phần γ</div>
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] leading-relaxed">
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-2.5">
          <div className="font-bold text-indigo-300">Baseline (Bbox rời rạc)</div>
          <div className="mt-1.5 text-sm font-bold text-indigo-200">g₁ = {bG1}s · g₂ = {bG2}s</div>
          <div className="mt-2 space-y-1.5">
            <div>
              <div className="mb-0.5 flex justify-between text-slate-300"><span>Pha 1</span><span className="tabular-nums">{bG1}s</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-rose-500 transition-all duration-300" style={{ width: `${pct(bG1)}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-0.5 flex justify-between text-slate-300"><span>Pha 2</span><span className="tabular-nums">{bG2}s</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-slate-500 transition-all duration-300" style={{ width: `${pct(bG2)}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-2 rounded-md bg-rose-500/15 px-2 py-1 font-bold text-rose-300">
            {bG1 < cG1 ? (
              <>
                <AlertTriangle size={13} className="inline mr-1 text-amber-400" />
                Cắt xanh sớm — bbox hụt xe máy, xả chưa hết
              </>
            ) : bG1 === cG1 ? (
              <>
                <Check size={13} className="inline mr-1 text-emerald-400" />
                Cấp thời lượng tương đương CAO
              </>
            ) : (
              <>
                <Info size={13} className="inline mr-1 text-sky-400" />
                Ưu tiên thời lượng xanh cho pha này
              </>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
          <div className="font-bold text-emerald-300">CAO (Diện tích liên tục)</div>
          <div className="mt-1.5 text-sm font-bold text-emerald-300">g₁ = {cG1}s · g₂ = {cG2}s</div>
          <div className="mt-2 space-y-1.5">
            <div>
              <div className="mb-0.5 flex justify-between text-slate-300"><span>Pha 1</span><span className="tabular-nums">{cG1}s</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct(cG1)}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-0.5 flex justify-between text-slate-300"><span>Pha 2</span><span className="tabular-nums">{cG2}s</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-slate-500 transition-all duration-300" style={{ width: `${pct(cG2)}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-2 rounded-md bg-emerald-500/15 px-2 py-1 font-bold text-emerald-300">
            {cG1 > bG1 ? (
              <>
                <Check size={13} className="inline mr-1 text-emerald-400" />
                Xả sạch toàn bộ — đo đủ diện tích chiếm dụng
              </>
            ) : (
              <>
                <Check size={13} className="inline mr-1 text-emerald-400" />
                Cấp thời lượng tối ưu theo diện tích chiếm dụng
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step5Math({ data }) {
  const green = data?.greenDuration ?? 56;
  const queue = data?.queueCount ?? 0;
  const phase = data?.activePhase ?? 1;

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 font-mono">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-emerald-300">Kích Hoạt Pha {phase} Xanh ({green}s)</span>
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>
      <div className="text-xs text-slate-300 leading-relaxed">
        Đèn tín hiệu giao lộ chính thức mở xanh cho <strong className="text-emerald-400">Pha {phase}</strong> trong <strong className="text-emerald-400">{green} giây</strong>.
      </div>
      <div className="mt-3 p-3 rounded-lg bg-slate-950/70 border border-emerald-500/20 text-xs">
        <span className="text-slate-400">Giải phóng hàng chờ: </span>
        <strong className="text-emerald-400 text-sm font-bold">{queue} xe</strong>
        <span className="text-slate-400"> trên nhánh tiếp cận thoát qua giao lộ nhịp nhàng.</span>
      </div>
    </div>
  );
}

const STEP_TITLES = {
  1: "Quét diện tích vùng chờ (Footprint ROI)",
  2: "Khấu trừ áp lực dội ngược (Downstream Back-pressure)",
  3: "Tính áp suất bão hòa (Saturation Pressure γ)",
  4: "Phân bổ thời lượng đèn xanh (Green Split)",
  5: "Kích hoạt pha & Giải phóng dòng xe (Execution)",
};

const STEPPER_STEPS = [
  "1. Quét ROI",
  "2. Trừ hạ lưu",
  "3. Áp suất γ",
  "4. Cấp giây",
  "5. Giải phóng",
];

function StepMathContent({ currentStep, stepData }) {
  // Enrich step payloads with node metadata, fallback safe for legacy callers
  if (currentStep === 1) return <Step1Math data={{ ...stepData?.step1, approachName: stepData?.approachName, outflowName: stepData?.outflowName }} />;
  if (currentStep === 2) return <Step2Math data={{ ...stepData?.step2, isCorridorReceiver: stepData?.isCorridorReceiver, outflowName: stepData?.outflowName, approachName: stepData?.approachName }} step1={stepData?.step1} />;
  if (currentStep === 3) {
    return (
      <Step3Math
        data={{
          ...stepData?.step3,
          w1: stepData?.step3?.w1 ?? stepData?.step2?.w1,
          w2: stepData?.step3?.w2 ?? stepData?.step2?.w2,
        }}
        step2={stepData?.step2}
      />
    );
  }
  if (currentStep === 4) return <Step4Math data={stepData?.step4} />;
  if (currentStep === 5) return <Step5Math data={stepData?.step5} />;
  return null;
}

function StepCrumb({ s, label, currentStep, onSetStep }) {
  if (s === currentStep) {
    return (
      <button key={s} type="button" onClick={() => onSetStep?.(s)} className="rounded-md border border-emerald-400 bg-emerald-500 px-2.5 py-1 font-mono text-xs font-bold text-slate-950 transition">
        {label}
      </button>
    );
  }
  if (s < currentStep) {
    return (
      <button key={s} type="button" onClick={() => onSetStep?.(s)} className="rounded-md border border-[#1e293b] bg-slate-800/80 px-2.5 py-1 font-mono text-xs text-slate-300 transition hover:bg-slate-700">
        {label}
      </button>
    );
  }
  return (
    <button key={s} type="button" onClick={() => onSetStep?.(s)} className="rounded-md border border-[#1e293b] bg-transparent px-2.5 py-1 font-mono text-xs text-slate-500 transition hover:text-slate-400">
      {label}
    </button>
  );
}

function StepperAction({ subPhase, onNextStep }) {
  if (subPhase === "motion") {
    return (
      <button type="button" disabled className="flex cursor-wait items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300" title="Xe đang di chuyển vào vị trí, vui lòng chờ">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-300" />
        <span>Đang di chuyển...</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onNextStep} className="flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400" title="Sang bước tiếp theo">
      <span>Bước tiếp theo</span>
      <StepForward size={13} className="ml-1" />
    </button>
  );
}

export function UnifiedStepHeader({
  currentStep = 1,
  algo = "cao",
  subPhase = "freeze",
  onSetStep,
  onPrevStep,
  onNextStep,
  isAutoStepping = false,
  onToggleAutoStep,
  onReset,
  selectedNode = 1,
  onSelectNode,
}) {
  const stepTitle = STEP_TITLES[currentStep] || `Bước ${currentStep}`;
  return (
    <div className="mb-3 border-b border-[#1e293b] pb-2.5">
      <NodeSelectorBar selectedNode={selectedNode} onSelectNode={onSelectNode} />
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onPrevStep}
          disabled={currentStep <= 1}
          className="rounded-md border border-[#1e293b] bg-slate-950 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          title="Lùi về bước trước"
        >
          <StepBack size={12} className="inline mr-1" />
          Lùi bước
        </button>
        {STEPPER_STEPS.map((label, idx) => (
          <StepCrumb key={idx + 1} s={idx + 1} label={label} currentStep={currentStep} onSetStep={onSetStep} />
        ))}
        <StepperAction subPhase={subPhase} onNextStep={onNextStep} />
      </div>
      <div className="mt-2 font-mono text-[11px] text-slate-400">
        Bước {currentStep}/5: {stepTitle}
      </div>
    </div>
  );
}

export function NodeSelectorBar({ selectedNode = 1, onSelectNode }) {
  // Dual-node toggle: upstream Node 1 vs downstream Node 2
  const base = "flex-1 rounded-md px-2.5 py-1.5 font-medium transition";
  const n1Tone = selectedNode === 1
    ? "bg-emerald-500 font-semibold text-slate-950"
    : "text-slate-400 hover:text-slate-200";
  const n2Tone = selectedNode === 2
    ? "bg-emerald-500 font-semibold text-slate-950"
    : "text-slate-400 hover:text-slate-200";
  return (
    <div className="mb-2.5 flex items-center gap-1 rounded-lg border border-[#1e293b] bg-slate-950/60 p-1 text-xs">
      <button type="button" onClick={() => onSelectNode?.(1)} className={`${base} ${n1Tone}`}>
        Nút 1 Thượng lưu
      </button>
      <button type="button" onClick={() => onSelectNode?.(2)} className={`${base} ${n2Tone}`}>
        Nút 2 Hạ lưu
      </button>
    </div>
  );
}

export function LiveMathBox({
  currentStep = 1,
  stepData = null,
  algo = "cao",
  subPhase = "freeze",
  onSetStep,
  onPrevStep,
  onNextStep,
  isAutoStepping = false,
  onToggleAutoStep,
  onReset,
  selectedNode = 1,
  onSelectNode,
}) {
  return (
    <div className="rounded-xl border border-[#1e293b] bg-slate-900/90 p-3.5 text-xs leading-relaxed text-slate-300">
      <UnifiedStepHeader
        currentStep={currentStep}
        algo={algo}
        subPhase={subPhase}
        onSetStep={onSetStep}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        isAutoStepping={isAutoStepping}
        onToggleAutoStep={onToggleAutoStep}
        onReset={onReset}
        selectedNode={selectedNode}
        onSelectNode={onSelectNode}
      />
      <StepMathContent currentStep={currentStep} stepData={stepData} />
    </div>
  );
}

export default function LabAnalysisPanel({
  telemetry,
  algo,
  onAlgoChange,
  activeScenario,
  onSelectPreset,
  currentStep = 1,
  stepData = null,
  subPhase = "freeze",
  onSetStep,
  onPrevStep,
  onNextStep,
  isAutoStepping = false,
  onToggleAutoStep,
  onReset,
  selectedNode = 1,
  onSelectNode,
}) {
  return (
    <div className="flex flex-col gap-3">
      <LabStatCards telemetry={telemetry} />
      <LabPresetBar
        algo={algo}
        onAlgoChange={onAlgoChange}
        activeScenario={activeScenario}
        onSelectPreset={onSelectPreset}
        showAlgoToggle={false}
      />
      <LiveMathBox
        currentStep={currentStep}
        stepData={stepData}
        algo={algo}
        subPhase={subPhase}
        onSetStep={onSetStep}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        isAutoStepping={isAutoStepping}
        onToggleAutoStep={onToggleAutoStep}
        onReset={onReset}
        selectedNode={selectedNode}
        onSelectNode={onSelectNode}
      />
    </div>
  );
}
