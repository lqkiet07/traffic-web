import { useEffect, useRef, useState } from "react";
import Corridor3DCanvas from "./Corridor3DCanvas.jsx";
import LabAnalysisPanel from "./LabAnalysisPanel.jsx";
import {
  VEHICLE_SPECS,
  advanceSimStep,
  applyPresetVehicles,
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

function clampStep(step) {
  // Keep stepper index inside 1..5 range
  return Math.max(1, Math.min(5, step));
}

function clampNode(node) {
  // Restrict node selector to dual-node HUD (1 or 2)
  return node === 2 ? 2 : 1;
}

// Mirror of STEPPER_MOTION_DURATIONS in corridorSim.js (kept local: sim lib does not export it)
const STEP_DURATIONS = { 1: 0.0, 2: 1.5, 3: 0, 4: 0.8, 5: 2.5 };

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
  const [simMode, setSimMode] = useState("stepper");
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [algo, setAlgo] = useState("cao");
  const [selectedType, setSelectedType] = useState("moto");
  const [activeScenario, setActiveScenario] = useState("paradox");
  const [telemetry, setTelemetry] = useState(() => getCorridorTelemetry(simRef.current));

  useEffect(() => {
    applyPresetVehicles(simRef.current, "paradox");
    advanceSimStep(simRef.current, 1);
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
    { key: "junction1", label: "Cận cảnh Nút 1" },
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

function LabCanvasView({ lab, cameraPreset, onCameraPresetChange }) {
  return (
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
  );
}

function LabCanvasBox({ lab }) {
  const [cameraPreset, setCameraPreset] = useState("overview");
  const camBtn = (active) =>
    active
      ? "px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 font-medium"
      : "px-2 py-0.5 rounded-md bg-transparent text-slate-400 border border-[#1e293b] hover:text-slate-200";
  return (
    <div className="relative flex-1 min-h-[440px] rounded-xl border border-[#1e293b] bg-[#090d16] flex flex-col overflow-hidden">
      <div className="w-full flex items-center justify-between gap-2 px-3 py-2 border-b border-[#1e293b] bg-slate-900/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Góc nhìn 3D:</span>
          <CameraPresetBar cameraPreset={cameraPreset} onPreset={setCameraPreset} camBtn={camBtn} />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Hành lang Nút 1-2:</span>
          <span className="font-mono font-bold text-sky-400">{Math.round((lab.telemetry?.phiCorridor ?? 0) * 100)}%</span>
          {Number(lab.telemetry?.phiCorridor ?? 0) >= 0.7 ? (
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">Nghẽn dội ngược</span>
          ) : null}
        </div>
      </div>
      <div className="relative flex-1 w-full h-full min-h-[340px] overflow-hidden bg-[#090d16]">
        <LabCanvasView lab={lab} cameraPreset={cameraPreset} onCameraPresetChange={setCameraPreset} />
      </div>
    </div>
  );
}

function resolveBarReset(lab) {
  // Transport reset follows active mode: stepper restarts steps, continuous resumes loop
  if (lab.simMode === "stepper") return (lab.handleStepperReset || lab.handleReset)?.();
  return (lab.handleContinuousReset || lab.handleReset)?.();
}

function LabSidePanel({ lab }) {
  return (
    <section className="flex flex-col gap-3 lg:col-span-4 min-h-0 lg:overflow-y-auto pr-1">
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

  return (
    <>
      <section className="flex min-h-[480px] flex-col lg:col-span-8 lg:min-h-0">
        <LabCanvasBox lab={lab} />
      </section>
      <LabSidePanel lab={lab} />
    </>
  );
}
