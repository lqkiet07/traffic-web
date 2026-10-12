# P0 (tru slider) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nhan chu ky + gat algo/scenario noi dung du lieu replay hien co (CAO - Medium_900, 61 cycle traj), zero thay doi runtime replay.

**Architecture:** Them 3 export nho trong `src/lib/data.js` (`REPLAY_ALGOS`, `REPLAY_SCENARIOS`, `replayAvailable`, `formatClock`), truyen `maxCycle` xuong nhan, them banner trung thuc o `App.jsx`. Khong cham clock, `getGamaSignal`, `VehicleCanvas`, time-base 120-vs-112.

**Tech Stack:** React 19 + Vite 6, Leaflet, Recharts, Node assert tests (.mjs).

**Spec:** `HANDOFF.md:54-56` + `HANDOFF-REPLAY-MODULE-2026-09-30.md:52-56` (dinh nghia vo); data truth da verify: `trajectories/cao/cycle_1..61.json` (61 file), `kpi_summary` cycles 1-64, `junction_kpis` chi `cao/Medium_900`, `TRAJECTORY_ALGO="cao"` (`useTrajectoryLoader.js:45`).

## Global Constraints

- Every function <= 50 lines.
- Nesting <= 4 levels.
- English-only comments, no console.log.
- Verification before completion: fresh build + unit-test evidence required.
- NEVER commit unless explicitly asked.
- Khong cham `getGamaSignal`, `usePlaybackClock`, `VehicleCanvas`, time-base 120-vs-112, num phase offset.

---

## File Structure

| File | Trach nhiem | Hanh dong |
|---|---|---|
| `src/lib/data.js` | Source of truth replay + clock format | Them `REPLAY_ALGOS`, `REPLAY_SCENARIOS`, `replayAvailable`, `formatClock` (~15 dong) |
| `src/hooks/useCyclePlayer.js:14` | `maxCycle` khoi tao cung 60 | Doi 60 -> 61 (khop 61 file traj; `onMissing` van clamp khi thieu) |
| `src/App.jsx:42-52` | Truyen prop + banner | Truyen `maxCycle` vao `Header`; them banner replay khi `!replayAvailable` |
| `src/components/Header.jsx:15` | Subtitle cung "60 chu ky" | Nhan `maxCycle`, render `{maxCycle} chu ky`; them `title` tooltip len toggle/select |
| `src/components/ComparisonCharts.jsx:70` | Title cung "60 chu ky" | Render `Doi dau - {data.cycles.length} chu ky` (truth cua chart = 64) |
| `src/components/ReplayControls.jsx:69` | Total cung `/ 02:00:00` | Dung `formatClock(maxCycle * CYCLE_LEN)` |
| `tests/replay_meta.test.mjs` | Test moi (duy nhat) | Assert `replayAvailable` + `formatClock` |

---

### Task 1: Dynamic maxCycle + nhan theo data that

**Files:**
- Modify: `src/lib/data.js` (them `formatClock`)
- Modify: `src/hooks/useCyclePlayer.js:14`
- Modify: `src/App.jsx:42-47`, `src/components/Header.jsx:15`, `src/components/ComparisonCharts.jsx:70`, `src/components/ReplayControls.jsx:60-69`
- Test: `tests/replay_meta.test.mjs` (chi test `formatClock` phan nay; `replayAvailable` o Task 2 cung file)

**Interfaces:**
- Consumes: `CYCLE_LEN` (`data.js:8`), `player.maxCycle`, `data.cycles.length`.
- Produces: `formatClock(totalSeconds) -> "HH:MM:SS"` dung o `ReplayControls`.

- [ ] **Step 1: Probe data truth (read-only, 1 phut)**

```powershell
(ls public\data\trajectories\cao\cycle_*.json).Count
rg -o '"cycle":61' public\data\signals_cao.json | Select-Object -First 1
node -e "const k=require('./public/data/kpi_summary.json'); console.log(Object.entries(k).map(([s,v])=>s+':'+v.cycles.length).join(' '))"
```

Expected: traj Count = 61; signals co `"cycle":61`; kpi moi scenario 64 cycles. Neu traj != 61 thi thay moi so 61 trong plan bang so thuc do duoc.

- [ ] **Step 2: Write the failing test**

```js
// tests/replay_meta.test.mjs
import assert from "node:assert";
import { formatClock, replayAvailable } from "../src/lib/data.js";

assert.strictEqual(formatClock(7200), "02:00:00", "60x120s legacy total");
assert.strictEqual(formatClock(7320), "02:02:00", "61x120s replay total");
assert.strictEqual(formatClock(0), "00:00:00", "zero guard");

assert.strictEqual(replayAvailable("cao", "Medium_900"), true, "current replay data");
assert.strictEqual(replayAvailable("baseline", "Medium_900"), false, "no baseline traj");
assert.strictEqual(replayAvailable("cao", "Low_400"), false, "no Low traj");

console.log("[replay_meta.test] all assertions passed");
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node tests/replay_meta.test.mjs`
Expected: FAIL voi `Error [ERR_MODULE_NOT_FOUND]` hoac `formatClock is not a function` (chua export).

- [ ] **Step 4: Minimal implementation - `data.js` (append cuoi file, ~15 dong)**

```js
export const REPLAY_ALGOS = ["cao"];
export const REPLAY_SCENARIOS = ["Medium_900"];
export function replayAvailable(algo, scenario) {
  return REPLAY_ALGOS.includes(algo) && REPLAY_SCENARIOS.includes(scenario);
}
export function formatClock(totalSeconds) {
  const s = Math.max(Math.floor(totalSeconds), 0);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
```

Ruling da chot: khong async probe manifest (over-engineering); hard-code 61 co `onMissing` lam luoi an toan. Upgrade khi re-export batch moi: bump `useCyclePlayer.js:14` + 2 mang tren.

- [ ] **Step 5: Minimal implementation - 5 sua UI (moi sua 1-3 dong)**

```js
// useCyclePlayer.js:14
const [maxCycle, setMaxCycle] = useState(61);
```

```jsx
// App.jsx:42-47 - truyen maxCycle
<Header
  scenario={player.scenario}
  setScenario={player.setScenario}
  algo={player.algo}
  setAlgo={player.setAlgo}
  maxCycle={player.maxCycle}
/>
```

```jsx
// Header.jsx:15 + signature dong 65
export default function Header({ scenario, setScenario, algo, setAlgo, maxCycle = 61 }) {
// ...
<p className="text-xs text-slate-500">CAO-CBMP vs Dem xe - 8 nut giao - {maxCycle} chu ky (replay)</p>
```

```jsx
// ComparisonCharts.jsx:70 - truth cua chart, khong phai cua replay
Doi dau - {data.cycles.length} chu ky
```

```jsx
// ReplayControls.jsx - import formatClock, thay dong 69
import { CYCLE_LEN, formatClock } from "../lib/data.js";
// ...
function TimeReadout({ player }) {
  const { cycle, maxCycle, simTime, globalSimTime, vehicleCount } = player;
  // ... dong total:
  {formatClock(globalSimTime)} / {formatClock(maxCycle * CYCLE_LEN)}{"  -  "}{vehicleCount} xe
```

`fmtClock` local trong `ReplayControls.jsx:6-12` giu nguyen cho `globalSimTime` hoac xoa neu thay het bang `formatClock` (khuyen nghi: TimeReadout dung `formatClock` ca hai ve, xoa `fmtClock` - it hon 1 ham trung).

- [ ] **Step 6: Run test + 7 tests cu, ky vong 8/8 PASS**

Run: `node tests/replay_meta.test.mjs; node tests/scale.test.mjs; node tests/signal_timing.test.mjs; node tests/inspector_cycle.test.mjs; node tests/lane_shift.test.mjs; node tests/declutter.test.mjs; node tests/phase_offset.test.mjs; node tests/signals.test.mjs; node tests/signal_vehicle_alignment.test.mjs`
Expected: moi dong `all assertions passed`, exit 0; alignment ratio van 0.919.

---

### Task 2: Banner trung thuc cho algo/scenario thieu replay

**Files:**
- Modify: `src/App.jsx:48-52` (them banner, dung `replayAvailable`)
- Modify: `src/components/Header.jsx:28-62` (them `title` tooltip, khong disable - quyet dinh duoi day)
- Test: dung chung `tests/replay_meta.test.mjs` (3 assert `replayAvailable` da viet o Task 1)

**Interfaces:**
- Consumes: `replayAvailable` (Task 1), `player.algo`, `player.scenario`, `player.notice` hien co.
- Produces: Khong co (terminal UI task).

Ruling da chot (khong disable): `kpi_summary` co du 3 scenario voi ca 2 duong proposed/baseline nen gat scenario cho chart that - disable se xoa functionality that. Banner la du.

- [ ] **Step 1: Run test hien tai (da PASS tu Task 1 thi bo qua, ghi evidence)**

Run: `node tests/replay_meta.test.mjs`
Expected: PASS (3 assert `replayAvailable`).

- [ ] **Step 2: Minimal implementation - banner `App.jsx` (duoi notice hien co)**

```jsx
import { getGamaSignal, latestCycleEntry, replayAvailable } from "../lib/data.js";
// ... trong return, ngay sau block {player.notice && (...)}:
{!replayAvailable(player.algo, player.scenario) && (
  <div className="border-b border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs text-sky-200">
    Replay xe/den: CAO - Medium_900 (du lieu hien co) - doi kich ban/thuat toan chi doi so tong + duong chart.
  </div>
)}
```

Khi o `cao/Medium_900` banner bien mat (dung trang thai demo chinh). Khong dung block `player.notice` (loi fetch) - hai banner doc lap, co the chong nhau, do la behavior dung.

- [ ] **Step 3: Minimal implementation - tooltip `Header.jsx` (2 thuoc tinh `title`, 0 logic)**

```jsx
// ScenarioSelect select:
title="Replay xe/den chi co Medium_900 - Low/High doi so tong + chart"
// AlgoToggle div bao ngoai:
title="Replay xe/den chi co CAO-CBMP - baseline doi duong chart + KPI"
```

- [ ] **Step 4: Verify mat (2 phut, `npm run dev`)**

Checklist: (a) mac dinh `cao/Medium_900` khong banner moi; (b) gat baseline -> banner sky hien, xe/den van chay, chart du 2 duong; (c) chon Low/High -> banner hien, StatCards/chart doi so, Inspector bao "moi co CAO/Medium_900"; (d) subtitle Header doc `61 chu ky (replay)`, chart doc `64 chu ky`, total clock `02:02:00` o CK cuoi.

- [ ] **Step 5: Full verification**

Run: `npm run build`
Expected: exit 0, ~7s, bundle ~813kB / CSS ~35kB (tang <1kB tu banner + helper).

---

## Self-Review

1. Spec coverage: Vo `maxCycle`/nhan (`HANDOFF-REPLAY-MODULE:56`) -> Task 1; vo algo/scenario (`:52-55`) -> Task 2. Slider ket loai tru theo yeu cau. Time-base 120-vs-112, phase knob, chunk split ngoai scope da khai bao.
2. Placeholder scan: Khong TBD/TODO. Moi step co code + lenh + expected cu the, ke ca fallback khi probe != 61.
3. Type consistency: `formatClock` dung chung thay vi 2 ham trung; `maxCycle` number tu `useCyclePlayer` -> `Header`/`ReplayControls`; `replayAvailable(algo, scenario) -> boolean`; khong doi signature `V_INDEX`, `getGamaSignal`, design tokens.
