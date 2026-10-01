import { useEffect, useRef, useState } from "react";
import CorridorCanvas from "./CorridorCanvas.jsx";
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
  resetCorridorSim(sim);
  if (key === "paradox") {
    // West trucks spread along approach for paradox demo
    const westX = [30, 75, 120, 165];
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "truck", x: westX[i] });
    // North1 motos queue in 2 lanes to avoid overlap
    for (let i = 0; i < 12; i++) spawnVehicle(sim, {
      approach: "north1",
      type: "moto",
      x: i % 2 === 0 ? 233 : 247,
      y: 125 - Math.floor(i / 2) * 14,
    });
    for (let i = 0; i < 6; i++) spawnVehicle(sim, { approach: "south1", type: "moto", y: 195 + i * 20 });
  } else if (key === "corridor_jam") {
    for (let i = 0; i < 6; i++) spawnVehicle(sim, { approach: "corridor", type: "truck", x: 500 - i * 42 });
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "car", x: 170 - i * 36 });
  } else if (key === "balanced") {
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "car", x: 170 - i * 32 });
    for (let i = 0; i < 8; i++) spawnVehicle(sim, { approach: "west", type: "moto", x: 65 - i * 8 });
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "corridor", type: "car", x: 480 - i * 40 });
    // North1 motos queue in 2 lanes to avoid overlap
    for (let i = 0; i < 6; i++) spawnVehicle(sim, {
      approach: "north1",
      type: "moto",
      x: i % 2 === 0 ? 233 : 247,
      y: 125 - Math.floor(i / 2) * 14,
    });
  }
  recalculateNode(sim, 1);
  recalculateNode(sim, 2);
  sim.nodes.node1.timeRemaining = sim.nodes.node1.g1;
  sim.nodes.node2.timeRemaining = sim.nodes.node2.g1;
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

function seekSim(sim, activeScenario, targetSec) {
  const target = Math.max(0, Math.min(120, targetSec));
  if (activeScenario && activeScenario !== "custom") {
    applyPresetVehicles(sim, activeScenario);
    stepSimForward(sim, target);
  } else {
    sim.time = target;
  }
}

function createLabActions(simRef, activeScenario, { setTelemetry, setActiveScenario, setAlgo }) {
  const sync = () => syncSimState(simRef.current, setTelemetry);
  const onCustom = () => { setActiveScenario("custom"); sync(); };
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
      seekSim(simRef.current, activeScenario, (simRef.current?.time ?? 0) - 10);
      sync();
    },
    handleSeek: (targetSec) => {
      seekSim(simRef.current, activeScenario, targetSec);
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

function useSubPhase() {
  // Track motion vs freeze for transport button state
  const [subPhase, setSubPhase] = useState("freeze");
  useEffect(() => {
    if (subPhase !== "motion") return;
    // Motion 1.5s then latch to freeze for reading
    const t = setTimeout(() => setSubPhase("freeze"), 1500);
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

function useStepper(simRef, setTelemetry, setIsPlaying, activeScenario) {
  const [simMode, setSimMode] = useState("continuous");
  const [currentStep, setCurrentStep] = useState(1);
  const [isAutoStepping, setIsAutoStepping] = useState(false);
  const [subPhase, setSubPhase] = useSubPhase();
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;
  const setStep = (step) => {
    // Advance sim and sync telemetry plus phase for UI
    const next = clampStep(step);
    advanceSimStep(simRef.current, next);
    setSubPhase(simRef.current?.stepper?.subPhase ?? "freeze");
    setCurrentStep(next);
    setTelemetry(getCorridorTelemetry(simRef.current));
  };
  const prevStep = () => setStep(stepRef.current - 1);
  const nextStep = buildNextStep(simRef, activeScenario, stepRef, setStep);
  const handleReset = () => {
    // Return vehicles to spawn then restart at step 1
    applyPresetVehicles(simRef.current, activeScenario || "paradox");
    setStep(1);
  };
  const toggleSimMode = () => {
    // Enter stepper paused at step 1, exit back to play
    if (simMode === "continuous") {
      setSimMode("stepper");
      setIsPlaying(false);
      applyPresetVehicles(simRef.current, activeScenario || "paradox");
      setStep(1);
    } else {
      setSimMode("continuous");
      setIsAutoStepping(false);
      setIsPlaying(true);
    }
  };
  useAutoStepping(isAutoStepping, simMode, nextStep);
  return {
    simMode, currentStep, subPhase, isAutoStepping, toggleSimMode,
    setStep, prevStep, nextStep, handleReset,
    toggleAutoStep: () => setIsAutoStepping((p) => !p),
    stepData: getAlgorithmStepData(simRef.current, currentStep),
  };
}

function useLabSim() {
  const simRef = useRef(null);
  if (!simRef.current) simRef.current = createCorridorSim({ algo: "cao" });

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
    ...stepper,
    ...actions,
  };
}

function LabCanvasBox({ lab, vLabel }) {
  const hintText = lab.simMode === "stepper"
    ? `Chế độ từng bước: Quan sát thuật toán CAO-CBMP phân tích mặt đường • Đang ở Bước [${lab.currentStep}/5]`
    : `Click trực tiếp lên nhánh đường để thả xe (${vLabel})`;

  return (
    <div className="relative flex-1 rounded-xl border border-[#1e293b] bg-[#090d16] p-2 flex flex-col justify-center items-center overflow-hidden">
      <div className="w-full flex items-center justify-between text-xs text-slate-400 px-2 py-1 mb-1">
        <span>{hintText}</span>
        <span className="text-emerald-400 font-mono text-[11px]">Hành lang 2 ngã tư Cần Thơ</span>
      </div>
      <CorridorCanvas
        simRef={lab.simRef}
        isPlaying={lab.isPlaying}
        simSpeed={lab.simSpeed}
        selectedType={lab.selectedType}
        onSpawn={lab.handleCanvasSpawn}
        onTelemetry={lab.setTelemetry}
        simMode={lab.simMode}
        currentStep={lab.currentStep}
        subPhase={lab.subPhase}
        stepData={lab.stepData}
      />
    </div>
  );
}

function handleBarStep(lab, step) {
  // Đầu button returns vehicles to spawn before step 1
  if (step === 1 && lab.simMode === "stepper" && lab.handleReset) lab.handleReset();
  else lab.setStep(step);
}

function LabControlBar({ lab }) {
  return (
    <LabTransportBar
      isPlaying={lab.isPlaying}
      onTogglePlay={() => lab.setIsPlaying((p) => !p)}
      simSpeed={lab.simSpeed}
      onSetSpeed={lab.setSimSpeed}
      onReset={lab.handleClear}
      onStepBack={lab.handleStepBack}
      onStepForward={lab.handleStepForward}
      simTime={lab.simRef.current?.time ?? 0}
      vehicleCount={lab.telemetry.totalVehicles}
      onSeek={lab.handleSeek}
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
