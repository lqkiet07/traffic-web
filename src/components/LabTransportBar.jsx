import { useState } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { formatClock } from "../lib/data.js";

const SPEEDS = [1, 2, 5];
const TICKS = ["0s", "28s", "56s", "84s", "112s"];
const LEGEND_ITEMS = [
  { label: "Xe máy", color: "#f59e0b", shape: "rounded-sm h-2.5 w-4" },
  { label: "Ô tô", color: "#38bdf8", shape: "rounded-sm h-2.5 w-4" },
  { label: "Xe tải", color: "#ec4899", shape: "rounded-sm h-2.5 w-4" },
  { label: "Đèn đỏ (dừng)", color: "#ef4444", shape: "rounded-full h-2.5 w-2.5" },
  { label: "Đèn xanh (đi)", color: "#10b981", shape: "rounded-full h-2.5 w-2.5" },
];

function iconBtn(title, onClick, children, highlight = false) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={
        highlight
          ? "flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"
          : "flex h-8 w-8 items-center justify-center rounded-md border border-[#1e293b] text-slate-300 hover:bg-slate-800"
      }
    >
      {children}
    </button>
  );
}

export function PlaybackButtons({
  isPlaying,
  onTogglePlay,
  simSpeed,
  onSetSpeed,
  onReset,
  onStepBack,
  onStepForward,
}) {
  return (
    <div className="flex items-center gap-1.5">
      {iconBtn("Đặt lại (0s)", onReset, <RotateCcw size={15} />)}
      {iconBtn("Lùi 10s", onStepBack, <SkipBack size={15} />)}
      {iconBtn(
        isPlaying ? "Tạm dừng" : "Phát",
        onTogglePlay,
        isPlaying ? <Pause size={17} /> : <Play size={17} />,
        true
      )}
      {iconBtn("Tiến 10s", onStepForward, <SkipForward size={15} />)}
      <div className="ml-1 flex overflow-hidden rounded-md border border-[#1e293b] font-mono text-xs">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSetSpeed?.(s)}
            className={`px-2.5 py-1.5 font-semibold tabular-nums ${
              simSpeed === s
                ? "bg-slate-700 text-slate-100"
                : "text-slate-500 hover:bg-slate-800"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

export function TimeReadout({ simTime = 0, vehicleCount = 0 }) {
  const cycleNum = Math.floor((simTime || 0) / 112) + 1;
  const currentSec = Math.round((simTime || 0) % 112);
  return (
    <div className="ml-auto text-right font-mono text-xs tabular-nums text-slate-400">
      <div>
        CK <span className="font-bold text-slate-100">{cycleNum}</span> · t {currentSec}s/112s
      </div>
      <div>
        {formatClock(simTime || 0)} · {vehicleCount} xe
      </div>
    </div>
  );
}

export function CycleScrubber({ simTime = 0, onSeek, onPause }) {
  // Keep local drag value to avoid per-pixel seeks, commit once on release
  const [dragSec, setDragSec] = useState(null);
  const currentSec = Math.min(112, Math.max(0, Math.round((simTime || 0) % 112)));
  const shownSec = dragSec ?? currentSec;
  const handlePointerDown = (e) => {
    // Pause playback on scrub start so seek lands on a frozen clock
    onPause?.();
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture unsupported, drag state still tracks value
    }
    setDragSec(Number(e.target.value));
  };
  const handlePointerUp = (e) => {
    const val = dragSec ?? Number(e.target.value);
    onSeek?.(val);
    setDragSec(null);
  };
  return (
    <div>
      <input
        type="range"
        min={0}
        max={112}
        value={shownSec}
        onChange={(e) => setDragSec(Number(e.target.value))}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            onSeek?.(dragSec ?? currentSec);
            setDragSec(null);
          }
        }}
        className="transport-scrubber mt-3"
        aria-label="Thời gian chu kỳ"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-slate-600">
        {TICKS.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}

export function LabLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block ${item.shape}`}
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ModeToggle({ simMode = "continuous", onToggleMode }) {
  const isContinuous = simMode === "continuous";
  const isStepper = simMode === "stepper";

  return (
    <div className="inline-flex rounded-lg border border-[#1e293b] bg-slate-900/80 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => {
          if (!isContinuous) onToggleMode?.("continuous");
        }}
        className={`rounded-md px-3 py-1 text-xs transition-colors ${
          isContinuous
            ? "bg-emerald-500 font-semibold text-slate-950"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
        }`}
      >
        ▶ Thời gian thực 60fps
      </button>
      <button
        type="button"
        onClick={() => onToggleMode?.("stepper")}
        className={`rounded-md px-3 py-1 text-xs transition-colors ${
          isStepper
            ? "bg-cyan-500 font-semibold text-slate-950"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
        }`}
      >
        🔍 Từng bước thuật toán (Stepper)
      </button>
    </div>
  );
}

function stepperAutoClass(isAutoStepping) {
  return isAutoStepping
    ? "border-amber-500/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
    : "border-[#1e293b] text-slate-300 hover:bg-slate-800";
}

function StepperMotionWait() {
  return (
    <button
      type="button"
      disabled
      className="flex cursor-wait items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 shadow-sm"
      title="Xe đang nổ máy di chuyển vào vị trí..."
    >
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-300" />
      <span>Xe đang di chuyển...</span>
    </button>
  );
}

function StepperNextButton({ onNextStep }) {
  return (
    <button
      type="button"
      onClick={onNextStep}
      className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-emerald-400 active:scale-95"
      title="Sang bước tiếp theo của thuật toán"
    >
      <span>Bước tiếp theo</span>
      <span className="font-mono text-sm">&gt;|</span>
    </button>
  );
}

export function StepperControls({
  currentStep = 1,
  onSetStep,
  onPrevStep,
  onNextStep,
  isAutoStepping = false,
  onToggleAutoStep,
  subPhase = "freeze",
}) {
  const autoClass = stepperAutoClass(isAutoStepping);
  const isMotion = subPhase === "motion";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onSetStep?.(1)}
        className="rounded-md border border-[#1e293b] px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800"
        title="Quay về bước 1"
      >
        ↺ Đầu
      </button>
      <button
        type="button"
        onClick={onPrevStep}
        disabled={currentStep <= 1}
        className="rounded-md border border-[#1e293b] px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title="Lùi về bước trước"
      >
        {"|< Lùi"}
      </button>
      {isMotion ? <StepperMotionWait /> : <StepperNextButton onNextStep={onNextStep} />}
      <button
        type="button"
        onClick={onToggleAutoStep}
        className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${autoClass}`}
        title={isAutoStepping ? "Dừng tự động chuyển bước" : "Tự động chuyển bước sau 3s"}
      >
        {isAutoStepping ? "⏸ Dừng tự động" : "▶ Tự động (3s)"}
      </button>
    </div>
  );
}

const STEPPER_STEPS = [
  "1. Quét ROI",
  "2. Trừ hạ lưu",
  "3. Áp suất γ",
  "4. Cấp giây",
  "5. Giải phóng",
];

export function StepperBreadcrumbs({ currentStep = 1, onSetStep }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STEPPER_STEPS.map((label, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isPast = stepNum < currentStep;

        const stateClass = isActive
          ? "border-emerald-400 bg-emerald-500 text-slate-950 font-bold"
          : isPast
            ? "border-[#1e293b] bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            : "border-[#1e293b] bg-transparent text-slate-500 hover:text-slate-400";

        return (
          <button
            key={stepNum}
            type="button"
            onClick={() => onSetStep?.(stepNum)}
            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-all ${stateClass}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ContinuousControls({
  isPlaying = false,
  onTogglePlay,
  simSpeed = 1,
  onSetSpeed,
  onReset,
  onStepBack,
  onStepForward,
  simTime = 0,
  onSeek,
  onPause,
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <PlaybackButtons
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        simSpeed={simSpeed}
        onSetSpeed={onSetSpeed}
        onReset={onReset}
        onStepBack={onStepBack}
        onStepForward={onStepForward}
      />
      <CycleScrubber simTime={simTime} onSeek={onSeek} onPause={onPause} />
    </div>
  );
}

export default function LabTransportBar(props) {
  const {
    simMode = "continuous",
    onToggleMode,
    simTime = 0,
    vehicleCount = 0,
  } = props;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b]/70 pb-2">
        <ModeToggle simMode={simMode} onToggleMode={onToggleMode} />
        <TimeReadout simTime={simTime} vehicleCount={vehicleCount} />
      </div>

      {simMode === "stepper" ? (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400 bg-slate-900/60 rounded-lg border border-[#1e293b]">
          <span>🔍 Chế độ từng bước đang hoạt động</span>
          <span className="text-cyan-400 font-mono text-[11px]">Điều hướng & xem phân tích ở cột bên phải 👉</span>
        </div>
      ) : (
        <ContinuousControls {...props} />
      )}

      <LabLegend />
    </div>
  );
}
