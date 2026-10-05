import { memo } from "react";

const VEHICLE_TYPES = [
  { type: "moto", label: "Xe máy", color: "#f59e0b", size: "1.5 m²" },
  { type: "car", label: "Ô tô", color: "#38bdf8", size: "7.5 m²" },
  { type: "truck", label: "Xe tải", color: "#ec4899", size: "18.0 m²" },
];

const PRESET_OPTIONS = [
  {
    key: "paradox",
    label: "Nghịch lý xe máy che khuất",
    activeClass: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500",
  },
  {
    key: "corridor_jam",
    label: "Kẹt dội ngược liên nút",
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
      <div className="flex items-center rounded-lg border border-[#1e293b] bg-slate-900/90 p-0.5 text-xs">
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
                : "border border-[#1e293b] bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
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
          : "border border-[#1e293b] bg-slate-800/80 text-slate-200 hover:bg-slate-700"
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
                  : "border border-[#1e293b] bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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
    <div className="space-y-2 border-t border-[#1e293b] pt-2.5">
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
      <div className="border-t border-[#1e293b] pt-1">
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
      <div className="space-y-1.5 text-xs text-slate-300">
        <div>• <strong>Đếm xe truyền thống:</strong> Mỗi phương tiện tính trọng số 1.0 bất kể kích thước thực tế (xe tải 18 m² ngang với xe máy 1.5 m²).</div>
        <div>• <strong>Đặc tính nhận diện:</strong> Phụ thuộc hoàn toàn vào số lượng Bounding Box phát hiện được; dễ chịu ảnh hưởng bởi che khuất dưới góc camera nghiêng.</div>
        <div>• <strong>Phạm vi điều tiết:</strong> Phân bổ pha độc lập, không khấu trừ áp lực dội ngược từ đoạn nối hạ lưu.</div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-xs text-slate-300">
      <div>• <strong>Độ đo không gian (CAO):</strong> Đo tỷ lệ diện tích mặt đường bị chiếm dụng (φ) thay vì đếm đầu xe rời rạc; chống chịu sai số do che khuất tương hỗ của bầy xe máy dưới góc camera nghiêng.</div>
      <div>• <strong>Hiệu quả mô phỏng (Table 1):</strong> Giảm trễ trung bình 6.01% (tải thấp) và 11.90% (tải vừa); thông lượng toàn mạng bảo toàn tương đương (±2%).</div>
      <div>• <strong>Phối hợp liên nút (Eq. 3):</strong> Tự động điều tiết giảm xanh Nút 1 khi hành lang nối đạt ngưỡng nghẽn (φ_corridor ≥ 70%) nhằm giảm nguy cơ tắc nghẽn dây chuyền.</div>
    </div>
  );
}

export function LabWhyBox({ algo, telemetry, activeScenario }) {
  const phiCorridor = Number(telemetry?.phiCorridor ?? 0);
  const n1P1 = telemetry?.node1Green?.g1 ?? 56;
  const n1P2 = telemetry?.node1Green?.g2 ?? 56;
  const isBackpressure = phiCorridor >= 0.7;

  return (
    <div className="rounded-xl border border-[#1e293b] bg-slate-900/70 p-3 text-xs leading-relaxed text-slate-400">
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

function ParameterNote({ children }) {
  return (
    <div className="mt-2 flex items-center gap-1.5 rounded border border-[#1e293b] bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400">
      <span className="text-slate-500">🏷️ Tham số:</span>
      <span>{children}</span>
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

export function SimVsRealComparison() {
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px] leading-relaxed">
      <div className="rounded-lg border border-[#1e293b] bg-slate-950/70 p-2.5">
        <div className="font-bold text-sky-300">🎮 Trong mô phỏng (GAMA)</div>
        <div className="mt-1 text-slate-300">• Baseline đếm xe lý tưởng (100%)</div>
        <div className="text-slate-400">• CAO tối ưu theo diện tích chiếm dụng (m²)</div>
      </div>
      <div className="rounded-lg border border-[#1e293b] bg-slate-950/70 p-2.5">
        <div className="font-bold text-amber-300">📷 Ngoài thực tế (CCTV)</div>
        <div className="mt-1 text-slate-300">• Bbox bị che khuất hụt 35–50% xe máy</div>
        <div className="text-slate-400">• CAO đo mặt đường, bền vững góc quay</div>
      </div>
    </div>
  );
}

export function Step1Math({ data }) {
  const p1 = data?.p1Counts;
  const p2 = data?.p2Counts;
  const p1Moto = p1?.moto || 0;
  const p1Car = p1?.car || 0;
  const p1Truck = p1?.truck || 0;
  const p1Area = (data?.p1Area || 0).toFixed(1);
  const phiIn1 = (data?.phiIn1 || 0).toFixed(2);
  const p2Moto = p2?.moto || 0;
  const p2Car = p2?.car || 0;
  const p2Truck = p2?.truck || 0;
  const p2Area = (data?.p2Area || 0).toFixed(1);
  const phiIn2 = (data?.phiIn2 || 0).toFixed(2);
  const p1Lines = [];
  if (p1Truck > 0) p1Lines.push(`${p1Truck} Xe Tải`);
  if (p1Car > 0) p1Lines.push(`${p1Car} Ô Tô`);
  if (p1Moto > 0) p1Lines.push(`${p1Moto} Xe Máy`);
  const p2Lines = [];
  if (p2Moto > 0) p2Lines.push(`${p2Moto} Xe Máy`);
  if (p2Car > 0) p2Lines.push(`${p2Car} Ô Tô`);
  if (p2Truck > 0) p2Lines.push(`${p2Truck} Xe Tải`);
  // Node-aware titles: prefer upstream approach name, fallback legacy copy
  const p1Title = data?.approachName ? `Pha 1 · ${data.approachName}` : "Pha 1 · Nhánh Tây";
  const p2Title = "Pha 2 · Nhánh Bắc & Nam";
  const outflowHint = data?.outflowName ? `Hạ lưu: ${data.outflowName}` : null;
  const p1Badge = p1Truck > 0 ? "Nhánh xe tải" : p1Moto >= 10 ? "Bầy xe máy ken đặc" : "Nhánh hỗn hợp";
  const p2Badge = p2Truck > 0 ? "Nhánh xe tải" : p2Moto >= 10 ? "Bầy xe máy ken đặc" : "Nhánh hỗn hợp";
  const occlusionP1 = data?.occlusionP1;
  return (
    <div className="space-y-3">
      {outflowHint ? (
        <div className="font-mono text-[11px] text-slate-500">{outflowHint}</div>
      ) : null}
      <div className="flex flex-col gap-2.5">
        <PhaseCard title={p1Title} badge={p1Badge} lines={p1Lines} areaLabel="A₁" areaValue={p1Area} phiLabel={`φ_in1 = min(1.0, ${p1Area}/150)`} phiValue={phiIn1} tone="amber" />
        <PhaseCard title={p2Title} badge={p2Badge} lines={p2Lines} areaLabel="A₂" areaValue={p2Area} phiLabel={`φ_in2 = min(1.0, ${p2Area}/150)`} phiValue={phiIn2} tone="sky" />
      </div>
      {occlusionP1?.lossPercentage > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#1e293b] bg-slate-950/50 p-2 font-mono text-[11px]">
          <span className="rounded-md bg-rose-500/15 px-2 py-1 font-bold tabular-nums text-rose-300">
            Camera Bbox (Góc nghiêng): ~{occlusionP1?.visibleCount} xe (Hụt ~{occlusionP1?.lossPercentage}% do che khuất tương hỗ)
          </span>
          <span className="rounded-md bg-emerald-500/15 px-2 py-1 font-bold tabular-nums text-emerald-300">
            Độ đo không gian (CAO): φ = {phiIn1} (Diện tích A₁ = {p1Area} m²)
          </span>
        </div>
      ) : null}
      {data?.occlusionP2?.occludedMotos > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#1e293b] bg-slate-950/50 p-2 font-mono text-[11px]">
          <span className="rounded-md bg-rose-500/15 px-2 py-1 font-bold tabular-nums text-rose-300">
            Camera Bbox (Góc nghiêng): ~{data?.occlusionP2?.visibleCount} xe (Hụt ~{data?.occlusionP2?.lossPercentage}% do che khuất)
          </span>
          <span className="rounded-md bg-emerald-500/15 px-2 py-1 font-bold tabular-nums text-emerald-300">
            Độ đo không gian (CAO): φ = {phiIn2}
          </span>
        </div>
      ) : null}
      <SimVsRealComparison />
      <ParameterNote>S_zone = 150 m² (vùng quan sát camera 30m × 5m)</ParameterNote>
    </div>
  );
}

function BackpressureCauseEffect() {
  // Cause-effect comparison when backpressure is active
  return (
    <div className="grid grid-cols-2 gap-2 font-mono text-[11px] leading-relaxed">
      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5">
        <div className="font-bold text-rose-300">Hệ quả lên Nút 1 (Thượng lưu)</div>
        <div className="mt-1 text-slate-300">{"Xanh bị bóp: 56s -> 10s"}</div>
        <div className="mt-1 text-slate-400">Ngăn xe dồn thêm vào điểm nghẽn</div>
      </div>
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
        <div className="font-bold text-emerald-300">Phản ứng của Nút 2 (Hạ lưu)</div>
        <div className="mt-1 text-slate-300">{"Xanh tăng vọt: 56s -> 102s"}</div>
        <div className="mt-1 text-slate-400">Mở tối đa để xả kẹt cho hành lang</div>
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
  // Node 2 is corridor receiver: no downstream link, drains to network
  const isReceiver = data?.isCorridorReceiver === true;
  const outflowName = data?.outflowName || "Hành lang Nút 1-2";

  return (
    <div className="space-y-3">
      {isReceiver ? <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-xs text-cyan-200">Nút 2 xả hành lang ra mạng lưới — không bị dội ngược ({outflowName})</div> : null}
      <div className="flex flex-col gap-2.5 font-mono">
        <div className="rounded-xl border border-cyan-500/30 bg-slate-950/70 p-3">
          <div className="text-xs text-slate-400">Áp lực hướng vào (Nhánh Tây):</div>
          <div className="mt-1 text-base font-bold text-cyan-400">φ_in = {phiIn}</div>
        </div>
        <div className={`rounded-xl border p-3 ${isBackpressure ? "border-rose-500/40 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-slate-950/70 text-emerald-400"}`}>
          <div className="text-xs text-slate-400">Áp lực hạ lưu ({outflowName}):</div>
          <div className="mt-1 text-base font-bold">φ_out = {phiOut}</div>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-slate-950/70 p-3 font-mono text-xs">
        <div className="text-slate-400">Công thức khấu trừ áp lực dội ngược (Downstream Back-Pressure):</div>
        <div className="mt-1 text-slate-300 text-sm">w₁ = max(0, φ_in - 0.70 × φ_out)</div>
        <div className="mt-1.5 text-base font-bold text-cyan-300">
          w₁ = max(0, {phiIn} - 0.70 × {phiOut}) = {w1}
        </div>
        <ParameterNote>R_thẳng = 0.70 (70% xe vào hành lang nối, Eq. 3)</ParameterNote>
      </div>

      {isBackpressure ? (
        <div className="space-y-2.5">
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/15 p-2.5 text-xs font-semibold text-rose-300">
            ⚠️ Cơ chế dội ngược kích hoạt: Hành lang nối Nút 1-2 bị nghẽn (φ_out ≥ 0.70). Thuật toán tự động cắt giảm thời gian xanh cấp cho Nút 1 để tránh dồn xe vào điểm nghẽn!
          </div>
          <BackpressureCauseEffect />
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
          ✅ Hạ lưu thông thoáng (φ_out &lt; 0.70): Không phát sinh áp lực dội ngược, xe được giải phóng tối đa qua hành lang.
        </div>
      )}
    </div>
  );
}

export function Step3Math({ data, step2 }) {
  const w1 = Number(data?.w1 ?? step2?.w1 ?? (data?.gamma1 != null ? data.gamma1 / 2.5 : 0)).toFixed(2);
  const w2 = Number(data?.w2 ?? step2?.w2 ?? (data?.gamma2 != null ? data.gamma2 / 2.5 : 0)).toFixed(2);
  const gamma1 = (data?.gamma1 || 0).toFixed(2);
  const gamma2 = (data?.gamma2 || 0).toFixed(2);
  const g1Num = Number(gamma1);
  const g2Num = Number(gamma2);
  const total = g1Num + g2Num;
  const ratio1 = total > 0 ? Math.round((g1Num / total) * 100) : 50;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#1e293b] bg-slate-950/70 p-3 font-mono text-xs">
        <div className="text-slate-400">Áp suất bão hòa (Hệ số bão hòa C_sat = 2.5):</div>
        <div className="mt-1 text-slate-300 text-sm">γ = 2.5 × w</div>
        <div className="mt-2 flex flex-col gap-2.5">
          <div className="rounded-lg bg-slate-900 p-2.5 border border-emerald-500/30">
            <span className="text-slate-400 text-xs">Pha 1 (Nhánh Tây):</span>
            <div className="text-base font-bold text-emerald-400">γ₁ = 2.5 × {w1} = {gamma1}</div>
          </div>
          <div className="rounded-lg bg-slate-900 p-2.5 border border-[#1e293b]">
            <span className="text-slate-400 text-xs">Pha 2 (Nhánh Bắc/Nam):</span>
            <div className="text-base font-bold text-slate-300">γ₂ = 2.5 × {w2} = {gamma2}</div>
          </div>
        </div>
        <ParameterNote>c_sat = 2.5 (hệ số dòng bão hòa, Eq. 4)</ParameterNote>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-slate-950/70 p-3 text-xs">
        <div className="flex justify-between items-center mb-1 text-slate-400 font-mono">
          <span>Tỷ lệ áp lực cạnh tranh:</span>
          <span className="text-emerald-400 font-bold">{ratio1}% vs {100 - ratio1}%</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${ratio1}%` }} title={`Pha 1: ${ratio1}%`} />
          <div className="bg-slate-600 transition-all duration-300" style={{ width: `${100 - ratio1}%` }} title={`Pha 2: ${100 - ratio1}%`} />
        </div>
        <div className="mt-2 text-slate-400 leading-relaxed">
          Pha 1 chiếm <strong className="text-emerald-400">{ratio1}%</strong> tổng áp lực toàn giao lộ ({gamma1} trên tổng {(total).toFixed(2)}), do đó sẽ được ưu tiên nhận phần lớn thời lượng đèn xanh khả dụng.
        </div>
      </div>
    </div>
  );
}

export function Step4Math({ data, algo, step1 }) {
  const g1 = data?.g1 ?? 56;
  const g2 = data?.g2 ?? 56;
  const total = data?.totalCycle ?? 120;
  const lost = data?.lostTime ?? 8;
  const greenSum = total - lost;
  // Live occlusion comes via the step1 prop (threaded by StepMathContent);
  // fallbacks match the 26-moto swarm scenario (50% loss -> 13 visible, 39 m2).
  const occVisible = step1?.occlusionP1?.visibleCount ?? data?.step1?.occlusionP1?.visibleCount ?? 13;
  const occArea = step1?.p1Area ?? data?.step1?.p1Area ?? 39;
  const p1Pct = greenSum > 0 ? Math.round((g1 / greenSum) * 100) : 50;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#1e293b] bg-slate-950/70 p-3 font-mono text-xs">
        <div className="text-slate-400">Công thức phân bổ thời lượng đèn xanh (Chu kỳ C = 120s, L = 8s):</div>
        {algo === "baseline" ? (
          <div className="mt-1 text-slate-300 text-sm">g₁ = g_min + 92 × (n₁ / (n₁ + n₂))</div>
        ) : (
          <div className="mt-1 text-slate-300 text-sm">g₁ = g_min + (C - L - 2·g_min) × (γ₁ / γ_total)</div>
        )}
        {algo === "baseline" ? (
          <div className="mt-1 text-cyan-300 text-xs">g₁ = 10 + 92 × (n₁ / (n₁ + n₂)) = {g1}s</div>
        ) : (
          <div className="mt-1 text-cyan-300 text-xs">g₁ = 10 + 92 × (γ₁ / γ_total) = {g1}s</div>
        )}
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-slate-950/70 p-3 text-xs">
        <div className="text-slate-400 mb-2">Phân bổ thời lượng chu kỳ 120s:</div>
        <div className="grid grid-cols-3 gap-2 text-center font-mono mb-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
            <div className="text-[11px] text-emerald-300">Pha 1 (Xanh)</div>
            <div className="text-lg font-bold text-emerald-400">{g1}s</div>
          </div>
          <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
            <div className="text-[11px] text-cyan-300">Pha 2 (Xanh)</div>
            <div className="text-lg font-bold text-cyan-400">{g2}s</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-800 border border-[#1e293b]">
            <div className="text-[11px] text-slate-400">Mất mát (Vàng+Đỏ)</div>
            <div className="text-lg font-bold text-slate-300">{lost}s</div>
          </div>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${(g1 / total) * 100}%` }} title={`Pha 1: ${g1}s`} />
          <div className="bg-cyan-500 transition-all duration-300" style={{ width: `${(g2 / total) * 100}%` }} title={`Pha 2: ${g2}s`} />
          <div className="bg-slate-600 transition-all duration-300" style={{ width: `${(lost / total) * 100}%` }} title={`Mất mát: ${lost}s`} />
        </div>
        <div className="mt-2 text-[11px] font-mono text-slate-500 leading-relaxed">
          ℹ️ Giới hạn vật lý: Thuật toán chỉ tái phân bổ 92s khả dụng giữa các hướng; khi lưu lượng bão hòa toàn mạng (v/c ≥ 1.0), thông lượng chạm trần vật lý (~17.800 xe/2h theo Table 1).
        </div>
        <div className="mt-2 text-[11px] font-mono text-slate-500 leading-relaxed">
          Đối chiếu cùng luồng xe: Baseline {data?.baseline?.g1 ?? 56}s (đếm đầu xe) · CAO {data?.cbmp?.g1 ?? 56}s (diện tích chiếm dụng).
        </div>
        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] font-mono leading-relaxed text-slate-300">
          🐝 Bầy xe máy ken đặc: Camera Bbox chỉ thấy ~{occVisible} xe (trên A₁ = {occArea} m²) nên Baseline cắt xanh sớm — CAO đo diện tích đầy đủ nên cấp đủ xanh xả sạch.
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
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 font-mono">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-emerald-300">Kích Hoạt Pha {phase} Xanh ({green}s)</span>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
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

      <div className="rounded-lg border border-[#1e293b] bg-slate-950/50 p-2.5 text-xs text-slate-400 leading-relaxed">
        Chu trình tính toán 5 bước kết thúc. Bấm <strong className="text-cyan-400">Bước tiếp theo &gt;|</strong> để nạp đợt xe mới hoặc chuyển sang <strong className="text-emerald-400">Thời gian thực 60fps</strong> để xem xe lưu thông tự động liên tục.
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
  if (currentStep === 2) return <Step2Math data={{ ...stepData?.step2, isCorridorReceiver: stepData?.isCorridorReceiver, outflowName: stepData?.outflowName }} step1={stepData?.step1} />;
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
  if (currentStep === 4) return <Step4Math data={stepData?.step4} algo={stepData?.step4?.algo ?? "cao"} step1={stepData?.step1} />;
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
    <button type="button" onClick={onNextStep} className="flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 active:scale-95" title="Sang bước tiếp theo">
      <span>Bước tiếp theo</span>
      <span className="font-mono text-sm">&gt;|</span>
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
  const autoTitle = isAutoStepping ? "Dừng tự động chuyển bước" : "Tự động chuyển bước sau 3s";
  return (
    <div className="mb-3 border-b border-[#1e293b] pb-2.5">
      <NodeSelectorBar selectedNode={selectedNode} onSelectNode={onSelectNode} />
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={onReset} className="rounded-md border border-[#1e293b] bg-slate-950 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800" title="Quay về Bước 1 & Nạp lại xe xuất phát">↺ Đầu</button>
        <button type="button" onClick={onPrevStep} disabled={currentStep <= 1} className="rounded-md border border-[#1e293b] bg-slate-950 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40" title="Lùi về bước trước">|&lt; Lùi</button>
        {STEPPER_STEPS.map((label, idx) => (
          <StepCrumb key={idx + 1} s={idx + 1} label={label} currentStep={currentStep} onSetStep={onSetStep} />
        ))}
        <StepperAction subPhase={subPhase} onNextStep={onNextStep} />
        <button type="button" onClick={onToggleAutoStep} className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${isAutoStepping ? "border-amber-400/50 bg-amber-500/20 text-amber-300 font-semibold animate-pulse" : "border-[#1e293b] bg-slate-950 text-slate-300 hover:bg-slate-800"}`} title={autoTitle}>{isAutoStepping ? "⏸ Dừng" : "▶ Tự động (3s)"}</button>
        <span className="font-mono text-[11px] text-slate-500">Bước {currentStep}/5: {stepTitle} · {algo === "baseline" ? "Baseline" : "CAO-CBMP"}</span>
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
    ? "bg-cyan-500 font-semibold text-slate-950"
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
    <div className="rounded-xl border border-[#1e293b] bg-slate-900/90 p-3.5 text-xs leading-relaxed text-slate-300 shadow-xl">
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
  selectedType,
  onSelectType,
  onBatchSpawn,
  onClear,
  simMode = "continuous",
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
  const isStepper = simMode === "stepper";

  return (
    <div className="flex flex-col gap-3">
      <LabStatCards telemetry={telemetry} />
      {isStepper ? (
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
      ) : null}
      <LabPresetBar
        algo={algo}
        onAlgoChange={onAlgoChange}
        activeScenario={activeScenario}
        onSelectPreset={onSelectPreset}
      />
      {isStepper ? (
        <details className="group rounded-xl border border-[#1e293b] bg-slate-900/40 p-2.5 text-xs text-slate-400">
          <summary className="cursor-pointer select-none font-medium text-slate-400 transition-colors hover:text-slate-200">
            ➕ Thêm xe thủ công (Tùy chọn)
          </summary>
          <div className="mt-2.5">
            <LabSpawnerDock
              selectedType={selectedType}
              onSelectType={onSelectType}
              onBatchSpawn={onBatchSpawn}
              onClear={onClear}
            />
          </div>
        </details>
      ) : (
        <LabSpawnerDock
          selectedType={selectedType}
          onSelectType={onSelectType}
          onBatchSpawn={onBatchSpawn}
          onClear={onClear}
        />
      )}
      {!isStepper ? (
        <LabWhyBox
          algo={algo}
          telemetry={telemetry}
          activeScenario={activeScenario}
        />
      ) : null}
    </div>
  );
}
