import { memo } from "react";

const VEHICLE_TYPES = [
  { type: "moto", label: "Xe máy", color: "#f59e0b", size: "1.5 m²" },
  { type: "car", label: "Ô tô", color: "#38bdf8", size: "7.5 m²" },
  { type: "truck", label: "Xe tải", color: "#ec4899", size: "18.0 m²" },
];

const PRESET_OPTIONS = [
  {
    key: "paradox",
    label: "Nghịch lý xe tải",
    activeClass: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500",
  },
  {
    key: "corridor_jam",
    label: "Kẹt dội ngược hạ lưu",
    activeClass: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500",
  },
  {
    key: "balanced",
    label: "Cân bằng",
    activeClass: "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500",
  },
];

function TelemetryCell({ label, value, badgeText, badgeTone, subtext }) {
  return (
    <div className="px-3 py-2.5">
      <div className="truncate text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
        <span className="font-mono text-[20px] font-bold tabular-nums text-slate-100">
          {value}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${badgeTone}`}
        >
          {badgeText}
        </span>
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

  const inHeavy = phiIn >= 0.7;
  const corridorJam = phiCorridor >= 0.7;

  return (
    <div className="grid grid-cols-3 divide-x divide-[#1e293b] rounded-lg border border-[#1e293b] bg-[#0f172a]">
      <TelemetryCell
        label="Áp suất vào (φ_in)"
        value={`${(phiIn * 100).toFixed(0)}%`}
        badgeText={inHeavy ? "ĐÔNG ĐÚC" : "THÔNG THOÁNG"}
        badgeTone={inHeavy ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}
        subtext="Nút 1 Nhánh Tây"
      />
      <TelemetryCell
        label="Hạ lưu nối (φ_corridor)"
        value={`${(phiCorridor * 100).toFixed(0)}%`}
        badgeText={corridorJam ? "KẸT DỘI NGƯỢC" : "BÌNH THƯỜNG"}
        badgeTone={corridorJam ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}
        subtext="Hành lang Nút 1-2"
      />
      <TelemetryCell
        label="Thông lượng thoát"
        value={`${tp}`}
        badgeText={tp > 0 ? "LƯU THÔNG" : "CHỜ XE"}
        badgeTone={tp > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/50 text-slate-300"}
        subtext="xe đã thoát mạng lưới"
      />
    </div>
  );
});

export function LabPresetBar({ algo, onAlgoChange, activeScenario, onSelectPreset }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
      <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => onAlgoChange?.("cao")}
          className={`flex-1 rounded-md px-2.5 py-1.5 font-medium transition ${
            algo === "cao"
              ? "bg-emerald-500 font-semibold text-slate-950"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          CAO-CBMP (Đề xuất)
        </button>
        <button
          type="button"
          onClick={() => onAlgoChange?.("baseline")}
          className={`flex-1 rounded-md px-2.5 py-1.5 font-medium transition ${
            algo === "baseline"
              ? "bg-indigo-600 font-semibold text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Đếm xe (Baseline)
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSelectPreset?.(opt.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              activeScenario === opt.key
                ? opt.activeClass
                : "border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpawnBtn({ label, onClick, isJam = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs transition ${
        isJam
          ? "border border-amber-500/40 bg-amber-500/10 font-medium text-amber-300 hover:bg-amber-500/20"
          : "border border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-500 hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function BatchRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="w-24 font-medium text-slate-400">{label}:</span>
      {children}
    </div>
  );
}

function VehiclePicker({ selectedType, onSelectType }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-slate-300">
        Loại phương tiện thủ công
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {VEHICLE_TYPES.map((opt) => {
          const isSelected = selectedType === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelectType?.(opt.type)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                isSelected
                  ? "border border-emerald-400 bg-slate-800 text-white shadow-sm ring-1 ring-emerald-400/50"
                  : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: opt.color }}
              />
              <span>{opt.label}</span>
              <span className="font-mono text-[10px] text-slate-500">({opt.size})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickBatchSection({ onBatchSpawn }) {
  return (
    <div className="space-y-2 border-t border-slate-800/80 pt-2.5">
      <div className="text-xs font-semibold text-slate-300">Thả xe nhanh (Quick Batch)</div>
      <BatchRow label="Nút 1">
        <SpawnBtn label="+5 Xe máy" onClick={() => onBatchSpawn?.("west", "moto", 5)} />
        <SpawnBtn label="+2 Ô tô" onClick={() => onBatchSpawn?.("west", "car", 2)} />
        <SpawnBtn label="+1 Xe tải" onClick={() => onBatchSpawn?.("west", "truck", 1)} />
      </BatchRow>
      <BatchRow label="Hành lang nối">
        <SpawnBtn
          label="+4 Xe tải (Gây nghẽn)"
          onClick={() => onBatchSpawn?.("corridor", "truck", 4)}
          isJam
        />
        <SpawnBtn label="+5 Xe máy" onClick={() => onBatchSpawn?.("corridor", "moto", 5)} />
      </BatchRow>
      <BatchRow label="Nút 2">
        <SpawnBtn label="+5 Xe máy" onClick={() => onBatchSpawn?.("north2", "moto", 5)} />
        <SpawnBtn label="+2 Ô tô" onClick={() => onBatchSpawn?.("north2", "car", 2)} />
        <SpawnBtn label="+1 Xe tải" onClick={() => onBatchSpawn?.("north2", "truck", 1)} />
      </BatchRow>
    </div>
  );
}

export function LabSpawnerDock({ selectedType, onSelectType, onBatchSpawn, onClear }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
      <VehiclePicker selectedType={selectedType} onSelectType={onSelectType} />
      <QuickBatchSection onBatchSpawn={onBatchSpawn} />
      <div className="border-t border-slate-800/80 pt-1">
        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-md border border-rose-500/40 bg-rose-500/10 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
        >
          Dọn sạch xe
        </button>
      </div>
    </div>
  );
}

function WhyBoxMessage({ algo, isBackpressure, phiCorridor, n1P1, n1P2, activeScenario }) {
  if (algo === "baseline") {
    return (
      <p>
        <strong className="text-indigo-400">Chế độ Baseline (Đếm xe): </strong>
        Hệ thống phân bổ pha đèn dựa trên số đầu xe thuần túy (mỗi xe trọng số 1.0) bất kể kích thước thực tế (xe tải 18 m² bị coi như xe máy 1.5 m²). Thuật toán không nhận biết áp lực dội ngược từ đoạn nối hạ lưu, dẫn đến nguy cơ tắc nghẽn dây chuyền.
      </p>
    );
  }
  if (isBackpressure) {
    return (
      <p>
        <strong className="text-rose-400">Cơ chế dội ngược (Downstream Back-pressure): </strong>
        Hành lang nối Nút 1-2 đang kẹt nặng (φ_corridor = {(phiCorridor * 100).toFixed(0)}% ≥ 70%). CAO-CBMP chủ động trừ áp lực đầu ra, giảm xanh Pha 1 Nút 1 xuống còn <strong className="text-emerald-400">{n1P1}s</strong> (nhường {n1P2}s cho Pha 2) nhằm ngăn tràn xe vào hành lang.
      </p>
    );
  }
  if (activeScenario === "paradox") {
    return (
      <p>
        <strong className="text-emerald-400">Nghịch lý xe tải (Truck Paradox): </strong>
        Nhánh Tây chỉ có 4 xe tải nhưng chiếm tới 72 m² diện tích đường, vượt trội so với 18 xe máy (27 m²) ở hướng cắt. CAO-CBMP ưu tiên cấp <strong className="text-emerald-400">{n1P1}s</strong> xanh giải phóng nhánh xe tải, trong khi thuật toán đếm xe sẽ mắc sai lầm ưu tiên số lượng xe máy.
      </p>
    );
  }
  return (
    <p>
      <strong className="text-emerald-400">Cân bằng áp suất (Max-Pressure): </strong>
      CAO-CBMP tính toán mức chiếm dụng diện tích thực tế (φ_in) dựa trên footprint xe, đồng thời giám sát hành lang nối (φ_corridor = {(phiCorridor * 100).toFixed(0)}%) để tối ưu chu kỳ Nút 1 ({n1P1}s / {n1P2}s) nhịp nhàng, tối đa hóa thông lượng mạng lưới.
    </p>
  );
}

export function LabWhyBox({ algo, telemetry, activeScenario }) {
  const phiCorridor = Number(telemetry?.phiCorridor ?? 0);
  const n1P1 = telemetry?.node1Green?.g1 ?? 56;
  const n1P2 = telemetry?.node1Green?.g2 ?? 56;
  const isBackpressure = phiCorridor >= 0.7;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs leading-relaxed text-slate-400">
      <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-200">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        <span>Hướng dẫn học tập · Giải thích Max-Pressure:</span>
      </div>
      <WhyBoxMessage
        algo={algo}
        isBackpressure={isBackpressure}
        phiCorridor={phiCorridor}
        n1P1={n1P1}
        n1P2={n1P2}
        activeScenario={activeScenario}
      />
    </div>
  );
}

export function Step1Math({ data }) {
  const moto = data?.p1Counts?.moto || 0;
  const car = data?.p1Counts?.car || 0;
  const truck = data?.p1Counts?.truck || 0;
  const area = (data?.p1Area || 0).toFixed(1);
  const phiIn = (data?.phiIn1 || 0).toFixed(2);

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-slate-950/60 p-2.5 font-mono text-[11px]">
        <div className="text-slate-400">Tổng footprint vùng chờ Pha 1:</div>
        <div className="mt-1 text-cyan-300">
          A₁ = ({moto} × 1.5) + ({car} × 7.5) + ({truck} × 18.0) = {area} m²
        </div>
      </div>
      <div className="rounded-lg bg-slate-950/60 p-2.5 font-mono text-[11px]">
        <div className="text-slate-400">Hệ số chiếm dụng không gian (Occupancy Ratio):</div>
        <div className="mt-1 text-cyan-300">
          φ_in = min(1.0, {area} / 150) = {phiIn}
        </div>
      </div>
      <div className="text-[11px] text-slate-400">
        Tính toán chiếm dụng theo footprint thực tế khắc phục triệt để thiên kiến đếm đầu xe.
      </div>
    </div>
  );
}

export function Step2Math({ data, step1 }) {
  const phiIn = (step1?.phiIn1 || 0).toFixed(2);
  const phiOutVal = step1?.phiOut || 0;
  const phiOut = phiOutVal.toFixed(2);
  const w1 = (data?.w1 || 0).toFixed(2);
  const isBackpressure = phiOutVal >= 0.7;

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-slate-950/60 p-2.5 font-mono text-[11px]">
        <div className="text-slate-400">Khấu trừ áp lực dội ngược:</div>
        <div className="mt-1 text-slate-300">w₁ = max(0, φ_in - 0.70·φ_out)</div>
        <div className="mt-1 text-cyan-300">
          w₁ = max(0, {phiIn} - 0.70 × {phiOut}) = {w1}
        </div>
      </div>
      {isBackpressure ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/15 p-2.5 text-[11px] font-semibold text-rose-300">
          Cơ chế dội ngược kích hoạt: Hạ lưu kẹt làm giảm áp suất ưu tiên!
        </div>
      ) : (
        <div className="text-[11px] text-slate-400">
          Hạ lưu thông thoáng (φ_out &lt; 0.70), không phát sinh áp lực dội ngược cản trở.
        </div>
      )}
    </div>
  );
}

export function Step3Math({ data, step2 }) {
  const w1 = (data?.w1 ?? step2?.w1 ?? (data?.gamma1 != null ? data.gamma1 / 2.5 : 0)).toFixed(2);
  const w2 = (data?.w2 ?? step2?.w2 ?? (data?.gamma2 != null ? data.gamma2 / 2.5 : 0)).toFixed(2);
  const gamma1 = (data?.gamma1 || 0).toFixed(2);
  const gamma2 = (data?.gamma2 || 0).toFixed(2);
  const g1Num = Number(gamma1);
  const g2Num = Number(gamma2);
  const total = g1Num + g2Num;
  const ratio = total > 0 ? ((g1Num / total) * 100).toFixed(0) : "50";

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-slate-950/60 p-2.5 font-mono text-[11px]">
        <div className="text-slate-400">Áp suất bão hòa (Saturation Pressure):</div>
        <div className="mt-1 text-slate-300">γ = 2.5 × w</div>
        <div className="mt-1 text-cyan-300">
          γ₁ = 2.5 × {w1} = {gamma1} vs γ₂ = 2.5 × {w2} = {gamma2}
        </div>
      </div>
      <div className="rounded-lg bg-slate-950/60 p-2.5 text-[11px]">
        <div className="text-slate-400">So sánh tỷ lệ áp suất:</div>
        <div className="mt-1 font-mono text-emerald-400">
          Pha 1 chiếm {ratio}% tổng áp lực giao lộ ({gamma1} vs {gamma2})
        </div>
      </div>
    </div>
  );
}

export function Step4Math({ data }) {
  const g1 = data?.g1 ?? 56;
  const g2 = data?.g2 ?? 56;
  const total = data?.totalCycle ?? 120;
  const lost = data?.lostTime ?? 8;
  const greenSum = total - lost;

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-slate-950/60 p-2.5 font-mono text-[11px]">
        <div className="text-slate-400">Công thức phân bổ thời lượng xanh:</div>
        <div className="mt-1 text-slate-300">g₁ = 10 + 92 × (γ₁ / γ_total)</div>
        <div className="mt-1 text-cyan-300">
          P1: {g1}s | P2: {g2}s (Tổng {greenSum}s + {lost}s mất mát = {total}s)
        </div>
      </div>
      <div className="text-[11px] text-slate-400">
        Mỗi pha nhận tối thiểu 10s bảo đảm an toàn, 92s còn lại phân bổ theo tỷ lệ áp suất γ.
      </div>
    </div>
  );
}

export function Step5Math({ data }) {
  const green = data?.greenDuration ?? 56;
  const queue = data?.queueCount ?? 0;
  const phase = data?.activePhase ?? 1;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 font-mono text-[11px] text-emerald-300">
        Pha {phase} Bật Xanh ({green}s) — Giải phóng {queue} xe trên nhánh.
      </div>
      <div className="text-[11px] text-slate-400">
        Đèn tín hiệu kích hoạt thời lượng xanh đã phân bổ, tối đa hóa thông lượng thoát giao lộ.
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

function StepMathContent({ currentStep, stepData }) {
  if (currentStep === 1) return <Step1Math data={stepData?.step1} />;
  if (currentStep === 2) return <Step2Math data={stepData?.step2} step1={stepData?.step1} />;
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

export function LiveMathBox({ currentStep = 1, stepData = null, algo = "cao" }) {
  const stepTitle = STEP_TITLES[currentStep] || `Bước ${currentStep}`;

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-slate-900/90 p-3 text-xs leading-relaxed text-slate-300 shadow-xl">
      <div className="mb-2.5 flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span>Bước {currentStep}/5: {stepTitle}</span>
        </div>
        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
          {algo === "baseline" ? "Baseline" : "CAO-CBMP"}
        </span>
      </div>
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
  selectedType,
  onSelectType,
  onBatchSpawn,
  onClear,
  simMode = "continuous",
  currentStep = 1,
  stepData = null,
}) {
  const isStepper = simMode === "stepper";

  return (
    <section className="flex flex-col gap-3 lg:col-span-4 lg:overflow-auto">
      <LabStatCards telemetry={telemetry} />
      {isStepper ? (
        <LiveMathBox
          currentStep={currentStep}
          stepData={stepData}
          algo={algo}
        />
      ) : null}
      <LabPresetBar
        algo={algo}
        onAlgoChange={onAlgoChange}
        activeScenario={activeScenario}
        onSelectPreset={onSelectPreset}
      />
      <LabSpawnerDock
        selectedType={selectedType}
        onSelectType={onSelectType}
        onBatchSpawn={onBatchSpawn}
        onClear={onClear}
      />
      {!isStepper ? (
        <LabWhyBox
          algo={algo}
          telemetry={telemetry}
          activeScenario={activeScenario}
        />
      ) : null}
    </section>
  );
}
