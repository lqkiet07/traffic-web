import { useEffect, useRef, useState } from "react";
import CorridorCanvas from "./CorridorCanvas.jsx";
import Corridor3DCanvas from "./Corridor3DCanvas.jsx";
import LabTransportBar from "./LabTransportBar.jsx";
import LabAnalysisPanel from "./LabAnalysisPanel.jsx";
import {
  VEHICLE_SPECS,
  advanceSimStep,
  createCorridorSim,
  getAlgorithmStepData,
  getCorridorTelemetry,
  recalculateNode,
  resetCorridorSim,
  seekSim,
  spawnVehicle,
  updateCorridorSim,
} from "../lib/corridorSim.js";

function spawnBatchVehicles(sim, approach, type, count) {
  const spec = VEHICLE_SPECS[type] || VEHICLE_SPECS.car;
  for (let i = 0; i < count; i++) {
    const spacing = i * (spec.length + 8);
    let x;
    let y;
    if (approach === "west") x = Math.max(0, 180 - spacing);
    else if (approach === "corridor") x = Math.max(280, 500 - spacing);
    else if (approach === "north2") y = Math.max(0, 120 - spacing);
    spawnVehicle(sim, { approach, type, x, y });
  }
}

function applyPresetVehicles(sim, key) {
  const targetKey = (!key || key === "custom") ? "paradox" : key;
  resetCorridorSim(sim);
  if (targetKey === "paradox") {
    // West 26-moto swarming cluster in 3 lanes, dense without lane discipline
    for (let i = 0; i < 26; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      spawnVehicle(sim, { approach: "west", type: "moto", x: 205 - row * 16, y: 162 + col * 8 });
    }
    // North1 motos use staggered lane around x231 for gap filling
    for (let i = 0; i < 12; i++) spawnVehicle(sim, {
      approach: "north1",
      type: "moto",
      x: 231 + ((i % 3) - 1) * 4,
      y: 130 - Math.floor(i / 3) * 11,
    });
    // South1 motos use staggered lane around x250 for cross occlusion
    for (let i = 0; i < 6; i++) spawnVehicle(sim, {
      approach: "south1",
      type: "moto",
      x: 250 + ((i % 2) - 0.5) * 6,
      y: 195 + i * 14,
    });
  } else if (targetKey === "corridor_jam") {
    // Corridor trucks use EW lane y170 to show link saturation
    for (let i = 0; i < 6; i++) spawnVehicle(sim, { approach: "corridor", type: "truck", x: 500 - i * 42, y: 170 });
    // West cars use EW lane y170 as competing inflow queue
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "car", x: 170 - i * 36, y: 170 });
  } else if (targetKey === "balanced") {
    // Balanced EW flows share lane y170 for consistent rendering
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "car", x: 170 - i * 32, y: 170 });
    for (let i = 0; i < 8; i++) spawnVehicle(sim, { approach: "west", type: "moto", x: 65 - i * 8, y: 170 });
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "corridor", type: "car", x: 480 - i * 40, y: 170 });
    // North1 motos queue in 2 lanes to avoid overlap
    for (let i = 0; i < 6; i++) spawnVehicle(sim, {
      approach: "north1",
      type: "moto",
      x: i % 2 === 0 ? 227 : 237,
      y: 125 - Math.floor(i / 2) * 14,
    });
  }
  recalculateNode(sim, 1);
  recalculateNode(sim, 2);
  sim.nodes.node1.timeRemaining = sim.nodes.node1.g1;
  sim.nodes.node2.timeRemaining = sim.nodes.node2.g1;
  sim.initialVehicles = sim.vehicles.map((v) => ({ ...v }));
  sim.initialThroughput = sim.throughput ?? 0;
}

function syncSimState(sim, setTelemetry) {
  recalculateNode(sim, 1);
  recalculateNode(sim, 2);
  setTelemetry(getCorridorTelemetry(sim));
}

function stepSimForward(sim, seconds) {
  const dt = 0.2;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    updateCorridorSim(sim, dt);
  }
}

function createLabActions(simRef, activeScenario, { setTelemetry, setActiveScenario, setAlgo }) {
  const sync = () => syncSimState(simRef.current, setTelemetry);
  const onCustom = () => {
    const sim = simRef.current;
    sim.initialVehicles = sim.vehicles.map((v) => ({ ...v }));
    sim.initialThroughput = sim.throughput ?? 0;
    setActiveScenario("custom");
    sync();
  };
  return {
    handlePreset: (key) => {
      applyPresetVehicles(simRef.current, key);
      setActiveScenario(key);
      sync();
    },
    handleAlgoChange: (nextAlgo) => {
      setAlgo(nextAlgo);
      simRef.current.algo = nextAlgo;
      sync();
    },
    handleBatchSpawn: (approach, type, count) => {
      spawnBatchVehicles(simRef.current, approach, type, count);
      onCustom();
    },
    handleClear: () => {
      resetCorridorSim(simRef.current);
      onCustom();
    },
    handleCanvasSpawn: onCustom,
    handleStepForward: () => {
      stepSimForward(simRef.current, 10);
      sync();
    },
    handleStepBack: () => {
      const currentSec = (simRef.current?.time ?? 0) % 112;
      seekSim(simRef.current, Math.max(0, currentSec - 10));
      sync();
    },
    handleSeek: (targetSec) => {
      seekSim(simRef.current, targetSec);
      sync();
    },
  };
}

const VEHICLE_LABELS = {
  moto: "Xe máy 1.5m²",
  car: "Ô tô 7.5m²",
  truck: "Xe tải 18m²",
};

function clampStep(step) {
  // Keep stepper index inside 1..5 range
  return Math.max(1, Math.min(5, step));
}

function clampNode(node) {
  // Restrict node selector to dual-node HUD (1 or 2)
  return node === 2 ? 2 : 1;
}

// Mirror of STEPPER_MOTION_DURATIONS in corridorSim.js (kept local: sim lib does not export it)
const STEP_DURATIONS = { 1: 1.5, 2: 1.5, 3: 0, 4: 0.8, 5: 2.5 };

function useSubPhase() {
  // Track motion vs freeze for transport button state
  const [subPhase, setSubPhaseState] = useState("freeze");
  const durationRef = useRef(1.5);
  const setSubPhase = (phase, duration) => {
    if (duration !== undefined && duration !== null) durationRef.current = duration;
    setSubPhaseState(phase);
  };
  useEffect(() => {
    if (subPhase !== "motion") return;
    // Per-step motion window, clamped to stay tappable on 0s steps
    const t = setTimeout(() => setSubPhaseState("freeze"), Math.max(200, (durationRef.current || 1.5) * 1000));
    return () => clearTimeout(t);
  }, [subPhase]);
  return [subPhase, setSubPhase];
}

function useAutoStepping(isAutoStepping, simMode, nextStep) {
  const nextRef = useRef(nextStep);
  nextRef.current = nextStep;

  useEffect(() => {
    if (!isAutoStepping || simMode !== "stepper") return;
    // 3s rhythm = motion 1.5s + freeze 1.5s for reading
    const timer = setInterval(() => nextRef.current?.(), 3000);
    return () => clearInterval(timer);
  }, [isAutoStepping, simMode]);
}

function resetToSpawn(simRef, activeScenario) {
  // Restore preset vehicles to spawn positions
  applyPresetVehicles(simRef.current, activeScenario || "paradox");
}

function buildNextStep(simRef, activeScenario, stepRef, setStep) {
  // Replenish fresh batch when wrapping from step 5 to step 1
  return () => {
    if (stepRef.current >= 5) {
      applyPresetVehicles(simRef.current, activeScenario || "paradox");
      setStep(1);
      return;
    }
    setStep(stepRef.current + 1);
  };
}

function createSimModeToggler({ simRef, activeScenario, simMode, setSimMode, setIsPlaying, setIsAutoStepping, setStep }) {
  return (mode) => {
    // Same-mode click: stepper restarts at step 1, continuous is a no-op
    if (mode === simMode) {
      if (simMode === "stepper") {
        applyPresetVehicles(simRef.current, activeScenario || "paradox");
        setStep(1);
      }
      return;
    }
    // Prefer explicit mode, else toggle (backward compat)
    const next = mode || (simMode === "continuous" ? "stepper" : "continuous");
    if (next === "stepper") {
      setSimMode("stepper");
      setIsPlaying(false);
      applyPresetVehicles(simRef.current, activeScenario || "paradox");
      setStep(1);
    } else {
      setSimMode("continuous");
      setIsAutoStepping(false);
      setIsPlaying(true);
      if (simRef.current) {
        simRef.current.stepper = null;
        simRef.current.spawnTimer = 0;
      }
    }
  };
}

function useStepper(simRef, setTelemetry, setIsPlaying, activeScenario) {
  const [simMode, setSimMode] = useState("continuous");
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedNode, setSelectedNodeState] = useState(1);
  const [isAutoStepping, setIsAutoStepping] = useState(false);
  const [subPhase, setSubPhase] = useSubPhase();
  const setSelectedNode = (node) => setSelectedNodeState(clampNode(node));
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;
  const setStep = (step) => {
    const next = clampStep(step);
    // Restore spawn layout when navigating back so vehicles reappear
    if (next < stepRef.current) resetToSpawn(simRef, activeScenario);
    advanceSimStep(simRef.current, next);
    const dur = simRef.current?.stepper?.motionDuration ?? STEP_DURATIONS[next] ?? 1.5;
    setSubPhase(simRef.current?.stepper?.subPhase ?? "freeze", dur);
    setCurrentStep(next);
    setTelemetry(getCorridorTelemetry(simRef.current));
  };
  const prevStep = () => setStep(stepRef.current - 1);
  const nextStep = buildNextStep(simRef, activeScenario, stepRef, setStep);
  const handleStepperReset = () => {
    // Stepper-only reset: restore spawns then restart at step 1
    applyPresetVehicles(simRef.current, activeScenario || "paradox");
    setStep(1);
  };
  const handleContinuousReset = () => {
    // Continuous reset: clear stepper state so the 60fps loop resumes
    applyPresetVehicles(simRef.current, activeScenario || "paradox");
    simRef.current.time = 0;
    simRef.current.stepper = null;
    simRef.current.spawnTimer = 0;
    setIsPlaying(true);
    setTelemetry(getCorridorTelemetry(simRef.current));
  };
  const handleResetFor = (mode) => {
    if (mode === "stepper") handleStepperReset();
    else handleContinuousReset();
  };
  const toggleSimMode = createSimModeToggler({ simRef, activeScenario, simMode, setSimMode, setIsPlaying, setIsAutoStepping, setStep });
  useAutoStepping(isAutoStepping, simMode, nextStep);
  return {
    simMode, currentStep, subPhase, isAutoStepping, toggleSimMode,
    setStep, prevStep, nextStep,
    selectedNode, setSelectedNode,
    handleReset: handleStepperReset, handleStepperReset, handleContinuousReset, handleResetFor,
    toggleAutoStep: () => setIsAutoStepping((p) => !p),
    stepData: getAlgorithmStepData(simRef.current, selectedNode),
  };
}

function useLabSim() {
  const simRef = useRef(null);
  if (!simRef.current) simRef.current = createCorridorSim({ algo: "cao", autoSpawn: true });

  const [isPlaying, setIsPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1);
  const [algo, setAlgo] = useState("cao");
  const [selectedType, setSelectedType] = useState("moto");
  const [activeScenario, setActiveScenario] = useState("paradox");
  const [telemetry, setTelemetry] = useState(() => getCorridorTelemetry(simRef.current));

  useEffect(() => {
    applyPresetVehicles(simRef.current, "paradox");
    setTelemetry(getCorridorTelemetry(simRef.current));
  }, []);

  const stepper = useStepper(simRef, setTelemetry, setIsPlaying, activeScenario);
  const actions = createLabActions(simRef, activeScenario, { setTelemetry, setActiveScenario, setAlgo });

  const wasPlayingRef = useRef(false);
  const handleSeekStart = () => {
    wasPlayingRef.current = isPlaying;
    setIsPlaying(false);
  };
  const handleSeekEnd = () => {
    if (wasPlayingRef.current) {
      setIsPlaying(true);
    }
  };

  return {
    simRef,
    isPlaying,
    setIsPlaying,
    simSpeed,
    setSimSpeed,
    algo,
    selectedType,
    setSelectedType,
    activeScenario,
    telemetry,
    setTelemetry,
    handleSeekStart,
    handleSeekEnd,
    ...stepper,
    ...actions,
  };
}

function CameraPresetBar({ cameraPreset, onPreset, camBtn }) {
  // Preset list keeps bar data-driven for short render logic
  const presets = [
    { key: "overview", label: "Toàn cảnh" },
    { key: "junction1", label: "Nút 1" },
    { key: "node2", label: "Nút 2" },
    { key: "corridor", label: "Hành lang" },
    { key: "chase", label: "Bám xe" },
    { key: "free", label: "Xoay 360" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {presets.map((p) => (
        <button key={p.key} type="button" className={camBtn(cameraPreset === p.key)} onClick={() => onPreset(p.key)}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

function MouseHintChip({ cameraPreset }) {
  // Floating glass badge over viewport — pointer-events-none to avoid blocking orbit
  return (
    <div className="absolute bottom-2 left-2 right-2 pointer-events-none flex items-center justify-between text-[11px] text-slate-400 px-3 py-1 bg-slate-950/80 backdrop-blur-sm rounded-lg border border-[#1e293b]">
      <span>Chuột trái: Xoay 360° · Chuột phải: Lia góc nhìn · Cuộn: Zoom vào con trỏ · Nhấp đúp: Lấy nét</span>
      <span className="font-mono text-cyan-300">Camera: {cameraPreset}</span>
    </div>
  );
}

function LabCanvasView({ lab, view3D, cameraPreset, onCameraPresetChange }) {
  // Split canvas switch to keep parent function short
  if (view3D) {
    return (
      <>
        <Corridor3DCanvas
          simRef={lab.simRef}
          isPlaying={lab.isPlaying}
          simSpeed={lab.simSpeed}
          selectedType={lab.selectedType}
          selectedNode={lab.selectedNode}
          onSpawn={lab.handleCanvasSpawn}
          onTelemetry={lab.setTelemetry}
          simMode={lab.simMode}
          currentStep={lab.currentStep}
          subPhase={lab.subPhase}
          stepData={lab.stepData}
          cameraPreset={cameraPreset}
          onCameraPreset={onCameraPresetChange}
        />
        <MouseHintChip cameraPreset={cameraPreset} />
      </>
    );
  }
  return (
    <CorridorCanvas
      simRef={lab.simRef}
      isPlaying={lab.isPlaying}
      simSpeed={lab.simSpeed}
      selectedType={lab.selectedType}
      selectedNode={lab.selectedNode}
      onSpawn={lab.handleCanvasSpawn}
      onTelemetry={lab.setTelemetry}
      simMode={lab.simMode}
      currentStep={lab.currentStep}
      subPhase={lab.subPhase}
      stepData={lab.stepData}
    />
  );
}

function CorridorCoordinationBar({ telemetry, selectedNode, onSelectNode }) {
  // Corridor pressure drives jam tags and backpressure readout
  const phi = Number(telemetry?.phiCorridor ?? 0);
  const jam = phi >= 0.7;
  const pct = `${Math.round(phi * 100)}%`;
  const n1 = telemetry?.node1Green?.g1 ?? 56;
  const n2 = telemetry?.node2Green?.g1 ?? 56;
  const cut = Math.max(0, Math.round((phi - 0.7) * 100));
  const chip = (active) =>
    active
      ? "flex items-center gap-2 px-2 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-xs"
      : "flex items-center gap-2 px-2 py-1 rounded-md border border-[#1e293b] bg-slate-900/60 text-xs";
  return (
    <div className="w-full flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-[#1e293b] bg-slate-950/60 text-xs text-slate-300">
      <button type="button" className={chip(selectedNode === 1)} onClick={() => onSelectNode?.(1)}>
        <span className="font-medium">NÚT 1</span>
        <span className="font-mono text-emerald-300">{n1}s</span>
        {jam ? <span className="text-amber-300">BỊ BÓP GIẢM</span> : null}
      </button>
      <span className="font-mono text-slate-500">{"-->"}</span>
      <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-[#1e293b] bg-slate-900/60">
        <span className="font-medium">HÀNH LANG NỐI</span>
        <span className="font-mono text-sky-300">{pct}</span>
        {jam ? <span className="font-mono text-rose-300">-{cut}% ÁP LỰC DỘI</span> : null}
      </div>
      <span className="font-mono text-slate-500">{"-->"}</span>
      <button type="button" className={chip(selectedNode === 2)} onClick={() => onSelectNode?.(2)}>
        <span className="font-medium">NÚT 2</span>
        <span className="font-mono text-emerald-300">{n2}s</span>
        {jam ? <span className="text-sky-300">MỞ TỐI ĐA</span> : null}
      </button>
    </div>
  );
}

function LabCanvasBox({ lab, vLabel }) {
  const [view3D, setView3D] = useState(true);
  const [cameraPreset, setCameraPreset] = useState("overview");
  const hintText = lab.simMode === "stepper"
    ? `Chế độ từng bước: Quan sát thuật toán CAO-CBMP phân tích mặt đường • Đang ở Bước [${lab.currentStep}/5]`
    : `Click trực tiếp lên nhánh đường để thả xe (${vLabel})`;
  const viewBtn = (active) =>
    active
      ? "px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium"
      : "px-2 py-0.5 rounded-md bg-transparent text-slate-400 border border-[#1e293b] hover:text-slate-200";
  const camBtn = (active) =>
    active
      ? "px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 font-medium"
      : "px-2 py-0.5 rounded-md bg-transparent text-slate-400 border border-[#1e293b] hover:text-slate-200";
  return (
    <div className="relative flex-1 min-h-[440px] rounded-xl border border-[#1e293b] bg-[#090d16] flex flex-col overflow-hidden">
      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#1e293b] bg-slate-900/60 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button type="button" className={viewBtn(!view3D)} onClick={() => setView3D(false)}>
              2D
            </button>
            <button type="button" className={viewBtn(view3D)} onClick={() => setView3D(true)}>
              3D
            </button>
          </div>
          {view3D && (
            <CameraPresetBar cameraPreset={cameraPreset} onPreset={setCameraPreset} camBtn={camBtn} />
          )}
        </div>
        <span className="text-emerald-400 font-mono text-[11px]">{hintText}</span>
      </div>
      <CorridorCoordinationBar telemetry={lab.telemetry} selectedNode={lab.selectedNode} onSelectNode={lab.setSelectedNode} />
      <div className="relative flex-1 w-full h-full min-h-[340px] overflow-hidden bg-[#090d16]">
        <LabCanvasView lab={lab} view3D={view3D} cameraPreset={cameraPreset} onCameraPresetChange={setCameraPreset} />
      </div>
    </div>
  );
}

function handleBarStep(lab, step) {
  // Step-1 button restores spawn positions before analysis
  const resetFn = lab.handleStepperReset || lab.handleReset;
  if (step === 1 && lab.simMode === "stepper" && resetFn) resetFn();
  else lab.setStep(step);
}

function resolveBarReset(lab) {
  // Transport reset follows active mode: stepper restarts steps, continuous resumes loop
  if (lab.simMode === "stepper") return (lab.handleStepperReset || lab.handleReset)?.();
  return (lab.handleContinuousReset || lab.handleReset)?.();
}

function LabControlBar({ lab }) {
  return (
    <LabTransportBar
      isPlaying={lab.isPlaying}
      onTogglePlay={() => lab.setIsPlaying((p) => !p)}
      simSpeed={lab.simSpeed}
      onSetSpeed={lab.setSimSpeed}
      onReset={() => resolveBarReset(lab)}
      onStepBack={lab.handleStepBack}
      onStepForward={lab.handleStepForward}
      simTime={lab.simRef.current?.time ?? 0}
      vehicleCount={lab.telemetry.totalVehicles}
      onSeek={lab.handleSeek}
      onSeekStart={lab.handleSeekStart}
      onSeekEnd={lab.handleSeekEnd}
      simMode={lab.simMode}
      currentStep={lab.currentStep}
      subPhase={lab.subPhase}
      stepData={lab.stepData}
      onToggleMode={lab.toggleSimMode}
      onSetStep={(step) => handleBarStep(lab, step)}
      onPrevStep={lab.prevStep}
      onNextStep={lab.nextStep}
      isAutoStepping={lab.isAutoStepping}
      onToggleAutoStep={lab.toggleAutoStep}
    />
  );
}

function LabSidePanel({ lab }) {
  return (
    <section className="flex flex-col gap-3 lg:col-span-4 lg:overflow-auto">
      <LabAnalysisPanel
        telemetry={lab.telemetry}
        algo={lab.algo}
        onAlgoChange={lab.handleAlgoChange}
        activeScenario={lab.activeScenario}
        onSelectPreset={lab.handlePreset}
        selectedType={lab.selectedType}
        onSelectType={lab.setSelectedType}
        onBatchSpawn={lab.handleBatchSpawn}
        onClear={lab.handleClear}
        simMode={lab.simMode}
        currentStep={lab.currentStep}
        subPhase={lab.subPhase}
        stepData={lab.stepData}
        onSetStep={lab.setStep}
        onPrevStep={lab.prevStep}
        onNextStep={lab.nextStep}
        isAutoStepping={lab.isAutoStepping}
        onToggleAutoStep={lab.toggleAutoStep}
        onReset={() => resolveBarReset(lab)}
        selectedNode={lab.selectedNode}
        onSelectNode={lab.setSelectedNode}
      />
    </section>
  );
}

export default function AlgorithmLab() {
  const lab = useLabSim();
  const vLabel = VEHICLE_LABELS[lab.selectedType] || VEHICLE_LABELS.moto;

  return (
    <>
      <section className="flex min-h-[480px] flex-col gap-3 lg:col-span-8 lg:min-h-0">
        <LabCanvasBox lab={lab} vLabel={vLabel} />
        <LabControlBar lab={lab} />
      </section>
      <LabSidePanel lab={lab} />
    </>
  );
}
