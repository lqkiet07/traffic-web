import { useCallback, useEffect, useRef } from "react";
import { isStubChunk, loadCycle, loadCycleLegacy } from "../lib/data.js";

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

function prefetch(cache, algo, scenario, cycle) {
  const key = `${algo}:${scenario}:${cycle}`;
  if (!cache[key]) {
    loadCycle(algo, scenario, cycle)
      .then((p) => {
        cache[key] = p;
      })
      .catch(() => {});
  }
}

// Per-cycle trajectory chunk with memory cache + next-cycle prefetch.
// Calls onMissing(cycle) when the chunk file does not exist.
export function useTrajectoryLoader(algo, scenario, cycle, onLoaded, onMissing) {
  const cacheRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    const key = `${algo}:${scenario}:${cycle}`;
    const cached = cacheRef.current[key];
    const apply = (payload) => {
      if (cancelled) return;
      const f = payload.frames || [];
      // Stub cycle (single frame) has no motion: clamp like a missing chunk.
      if (isStubChunk(f)) {
        onMissing(cycle);
        return;
      }
      onLoaded(f);
      prefetch(cacheRef.current, algo, scenario, cycle + 1);
    };
    if (cached) {
      apply(cached);
      return () => {
        cancelled = true;
      };
    }
    loadCycle(algo, scenario, cycle)
      .then((payload) => {
        cacheRef.current[key] = payload;
        apply(payload);
      })
      .catch(() => {
        loadCycleLegacy(algo, cycle)
          .then((payload) => {
            cacheRef.current[key] = payload;
            apply(payload);
          })
          .catch(() => {
            if (!cancelled) onMissing(cycle);
          });
      });
    return () => {
      cancelled = true;
    };
  }, [algo, scenario, cycle, onLoaded, onMissing]);
}
