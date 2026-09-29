import { useCallback, useEffect, useRef } from "react";
import { loadCycle } from "../lib/data.js";

// Stable chunk event handlers: success fills frames, missing clamps
// playback to the last available cycle.
export function useChunkHandlers(setFrames, setMaxCycle, setCycle, setSimTime, notify) {
  const onLoaded = useCallback(
    (f) => {
      setFrames(f);
      notify("");
    },
    [setFrames, notify]
  );
  const onMissing = useCallback(
    (c) => {
      if (c <= 1) {
        setFrames([]);
        notify("Không tìm thấy dữ liệu trajectories cho chu kỳ 1");
        return;
      }
      setMaxCycle(c - 1);
      setCycle(c - 1);
      setSimTime(0);
      notify(`Đã nạp tới chu kỳ ${c - 1} (dữ liệu hiện có)`);
    },
    [setFrames, setMaxCycle, setCycle, setSimTime, notify]
  );
  return { onLoaded, onMissing };
}

function prefetch(cache, algo, cycle) {
  const key = `${algo}:${cycle}`;
  if (!cache[key]) {
    loadCycle(algo, cycle)
      .then((p) => {
        cache[key] = p;
      })
      .catch(() => {});
  }
}

// Only CAO-CBMP has trajectory runs on disk. The algo toggle only
// switches KPI comparison lines — never the 3D vehicle layer — so the
// missing-baseline 404 can never clamp maxCycle down to 1.
const TRAJECTORY_ALGO = "cao";

// Per-cycle trajectory chunk with memory cache + next-cycle prefetch.
// Calls onMissing(cycle) when the chunk file does not exist.
export function useTrajectoryLoader(algo, cycle, onLoaded, onMissing) {
  const cacheRef = useRef({});

  useEffect(() => {
    void algo;
    let cancelled = false;
    const key = `${TRAJECTORY_ALGO}:${cycle}`;
    const cached = cacheRef.current[key];
    const apply = (payload) => {
      if (cancelled) return;
      onLoaded(payload.frames || []);
      prefetch(cacheRef.current, TRAJECTORY_ALGO, cycle + 1);
    };
    if (cached) {
      apply(cached);
      return () => {
        cancelled = true;
      };
    }
    loadCycle(TRAJECTORY_ALGO, cycle)
      .then((payload) => {
        cacheRef.current[key] = payload;
        apply(payload);
      })
      .catch(() => {
        if (!cancelled) onMissing(cycle);
      });
    return () => {
      cancelled = true;
    };
  }, [algo, cycle, onLoaded, onMissing]);
}
