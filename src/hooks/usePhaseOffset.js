import { useCallback, useState } from "react";

// Schedule rewritten pure-GAMA (green/red, accumulated lookup) so old tuned values no longer apply — fresh key starts clean.
const KEY = "trafficdt.phaseOffsetS.v2";

// Manual eye-alignment offset (seconds) for the reconstructed signal
// schedule. GAMA logs only per-cycle green totals, not true switch
// instants, so the user nudges lamp timing to match vehicle behavior.
export function usePhaseOffset() {
  const [offsetS, setOffsetS] = useState(() => {
    try {
      const v = Number(localStorage.getItem(KEY));
      return Number.isFinite(v) ? Math.min(Math.max(v, -15), 15) : 0;
    } catch {
      return 0;
    }
  });
  const set = useCallback((v) => {
    const c = Math.min(Math.max(v, -15), 15);
    setOffsetS(c);
    try {
      localStorage.setItem(KEY, String(c));
    } catch {}
  }, []);
  const reset = useCallback(() => set(0), [set]);
  return { offsetS, setOffsetS: set, resetOffset: reset };
}
