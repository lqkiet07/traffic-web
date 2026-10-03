import { useCallback, useEffect, useRef, useState } from "react";
import { CYCLE_LEN } from "../lib/data.js";
import { usePlaybackClock } from "./usePlaybackClock.js";
import { useReplayData } from "./useReplayData.js";
import { useChunkHandlers, useTrajectoryLoader } from "./useTrajectoryLoader.js";

// Pure playback rules (unit-tested): keep React state transitions in the hook.
export function shouldStopOnWrap(cycle, maxCycle) {
  return cycle >= maxCycle;
}
export function clampCycle(c, maxCycle) {
  return Math.min(Math.max(1, c), maxCycle);
}
export function globalSimTimeFor(cycle, simTime) {
  return (cycle - 1) * CYCLE_LEN + simTime;
}

// Playback engine: composes reference data, trajectory chunks and sim clock.
export function useCyclePlayer() {
  const [scenario, setScenario] = useState("Medium_900");
  const [algo, setAlgo] = useState("cao");
  const [cycle, setCycle] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [maxCycle, setMaxCycle] = useState(60);
  const [notice, setNotice] = useState("");
  const [frames, setFrames] = useState([]);
  const [vehicleCount, setVehicleCount] = useState(0);
  const cycleRef = useRef(cycle);
  cycleRef.current = cycle;
  const handleCount = useCallback((n) => setVehicleCount(n), []);

  const { junctions, kpi, junctionKpis, signals } = useReplayData(algo, scenario, setNotice);
  const handleWrap = useCallback(
    (overflow) => {
      if (shouldStopOnWrap(cycleRef.current, maxCycle)) {
        setIsPlaying(false);
        setNotice(`Đã phát hết chu kỳ ${maxCycle} (toàn bộ dữ liệu hiện có)`);
        return true;
      }
      setCycle(cycleRef.current + 1);
      return false;
    },
    [maxCycle]
  );
  const { simTime, setSimTime, timeRef } = usePlaybackClock(isPlaying, speed, handleWrap);
  const { onLoaded, onMissing } = useChunkHandlers(
    setFrames, setMaxCycle, setCycle, setSimTime, setNotice
  );
  useTrajectoryLoader(algo, scenario, cycle, onLoaded, onMissing);
  useEffect(() => {
    setCycle(1);
    setSimTime(0);
    setMaxCycle(60);
    setNotice("");
  }, [algo, scenario]);
  const gotoCycle = useCallback(
    (c) => {
      setCycle(clampCycle(c, maxCycle));
      setSimTime(0);
      setNotice("");
    },
    [maxCycle]
  );
  const globalSimTime = globalSimTimeFor(cycle, simTime);

  return {
    scenario, setScenario, algo, setAlgo, cycle, simTime, globalSimTime,
    isPlaying, setIsPlaying, speed, setSpeed, junctions, kpi, junctionKpis,
    signals, frames, timeRef, vehicleCount, handleCount,
    maxCycle, notice, gotoCycle, frameCount: frames.length,
  };
}
