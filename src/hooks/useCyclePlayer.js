import { useCallback, useRef, useState } from "react";
import { CYCLE_LEN } from "../lib/data.js";
import { usePlaybackClock } from "./usePlaybackClock.js";
import { useReplayData } from "./useReplayData.js";
import { useChunkHandlers, useTrajectoryLoader } from "./useTrajectoryLoader.js";

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

  const { junctions, kpi, junctionKpis, signals } = useReplayData(algo, setNotice);
  const handleWrap = useCallback(
    (overflow) => {
      if (cycleRef.current >= maxCycle) {
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
  useTrajectoryLoader(algo, cycle, onLoaded, onMissing);
  const gotoCycle = useCallback(
    (c) => {
      setCycle(Math.min(Math.max(1, c), maxCycle));
      setSimTime(0);
      setNotice("");
    },
    [maxCycle]
  );
  const globalSimTime = (cycle - 1) * CYCLE_LEN + simTime;

  return {
    scenario, setScenario, algo, setAlgo, cycle, simTime, globalSimTime,
    isPlaying, setIsPlaying, speed, setSpeed, junctions, kpi, junctionKpis,
    signals, frames, timeRef, vehicleCount, handleCount,
    maxCycle, notice, gotoCycle, frameCount: frames.length,
  };
}
