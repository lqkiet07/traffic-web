import { useCallback, useEffect, useRef, useState } from "react";
import { CYCLE_LEN } from "../lib/data.js";

// Dual-rate clock: timeRef advances every animation frame (60fps canvas
// path) while React state flushes at 20Hz (50ms) for text/slider/chart updates.
// setSimTime writes both clocks so external seeks stay in sync.
function resolveWrap(liveRef, t) {
  const finished = liveRef.current.onWrap(t - CYCLE_LEN);
  if (finished) return { finished: true, value: CYCLE_LEN };
  return { finished: false, value: t - CYCLE_LEN };
}
export function usePlaybackClock(isPlaying, speed, onWrap) {
  const [simTime, setSimTimeState] = useState(0);
  const timeRef = useRef(0);
  const liveRef = useRef({ speed, onWrap });
  liveRef.current.speed = speed;
  liveRef.current.onWrap = onWrap;

  const setSimTime = useCallback((t) => {
    timeRef.current = t;
    setSimTimeState(t);
  }, []);

  useEffect(() => {
    if (!isPlaying) return undefined;
    // Replay after finish: restart the ending cycle instead of freezing.
    if (timeRef.current >= CYCLE_LEN) {
      timeRef.current = 0;
      setSimTimeState(0);
    }
    let raf = 0;
    let prev = performance.now();
    let lastFlush = prev;
    const step = (now) => {
      const dt = (now - prev) / 1000;
      prev = now;
      const t = timeRef.current + dt * liveRef.current.speed;
      if (t < CYCLE_LEN) {
        timeRef.current = t;
        // Flush at 20Hz so lamps/badges track the 60fps canvas more closely (worst-case lag ~50ms).
        if (now - lastFlush >= 50) {
          lastFlush = now;
          setSimTimeState(t);
        }
        raf = requestAnimationFrame(step);
        return;
      }
      const { finished, value } = resolveWrap(liveRef, t);
      timeRef.current = value;
      setSimTimeState(value);
      if (finished) return;
      lastFlush = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  return { simTime, setSimTime, timeRef };
}
