# Interpolate Crash Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Het replay tua lai khong con mat xe vinh vien (fix crash `interpolateVehicles` + loop canvas chet theo).

**Architecture:** Fix goc 1 dong tai `data.js:177` (fallback khi `maps[i+1]` thieu) + luoi an toan `try/finally` trong loop rAF de 1 frame xau khong bao gio giet vong ve nua. Khong doi clock, `getGamaSignal`, time-base.

**Tech Stack:** React 19 + Vite 6, Leaflet canvas 60fps, Node assert tests (.mjs).

**Spec:** Console evidence: `Uncaught TypeError: Cannot read properties of undefined (reading 'get')` tai `interpolateVehicles (data.js:180)` <- `drawFrame (VehicleCanvas.jsx:71)` <- `loop (VehicleCanvas.jsx:129)`. Trigger data: `cycle_61.json` frame dau `t=0.0` vs `cycle_1.json` frame dau `t=2.0` (do dai frames khac nhau giua 2 cycle, khui ra sau khi P0 mo maxCycle 60->61).

## Global Constraints

- Every function <= 50 lines.
- Nesting <= 4 levels.
- English-only comments, no console.log.
- Verification before completion: fresh build + unit-test evidence required.
- NEVER commit unless explicitly asked.
- Single root-cause fix, no bundled refactoring; stop after 3 failed fix attempts and re-evaluate.

---

## Root cause (da chot bang evidence, khong phai guess)

1. Crash point `src/lib/data.js:180`: `bById.get(...)` voi `bById = maps[i+1]` la `undefined`. Guard `if (!w)` chi cuu key thieu, khong cuu ca Map thieu.
2. Race sinh ra `undefined` (`VehicleCanvas.jsx:143-151`): `dataRef.current.frames = frames` gan trong render, `maps` build lai trong `useEffect` chay sau. Giua 2 nhip, loop 60fps doc cap lech (frames moi + maps cu ngan hon) -> index vuot -> throw. Doi cycle 61 (t=0) <-> cycle 1 (t=2) lam so frame lech nhau nen crash.
3. Vi sao mat xe vinh vien (`VehicleCanvas.jsx:127-132`): `raf = requestAnimationFrame(loop)` nam SAU `drawFrame`. Mot lan throw la loop chet luon; clock/den chay bang React state rieng nen van chop. Khop anh user: CK 61/61, `674 xe` dong cung (so cuoi truoc crash), ban do trong, time van chay toi 02:02:00.

---

## File Structure

| File | Trach nhiem | Hanh dong |
|---|---|---|
| `src/lib/data.js:177` | Lookup map theo index trong `interpolateVehicles` | 1 dong: fallback khi `maps[i+1]` thieu (fix goc) |
| `src/components/VehicleCanvas.jsx:127-132` | Loop rAF ve xe 60fps | Boc `try/finally` de rAF luon reschedule (luoi an toan) |
| `tests/interpolate_maps_mismatch.test.mjs` | Test moi duy nhat | Tai hien frames dai + maps ngan -> assert khong throw |

Deliberately skipped: dong bo frames+maps trong cung 1 render pass (ton Map allocation moi render, trai tradeoff 60fps da chot); fallback + loop-guard la du re va du chac.

---

### Task 1: Fix goc `maps[i+1]` undefined + regression test

**Files:**
- Modify: `src/lib/data.js:177` (1 dong)
- Test: `tests/interpolate_maps_mismatch.test.mjs` (tao moi)

**Interfaces:**
- Consumes: `V_INDEX` (`data.js:44`), `mod`/`lerpAngle` noi bo (khong doi signature).
- Produces: `interpolateVehicles(frames, simTime, maps)` khong bao gio throw khi `maps` ngan/hong hon `frames` - `VehicleCanvas.jsx:71` huong truc tiep.

- [ ] **Step 1: Write the failing test**

```js
// tests/interpolate_maps_mismatch.test.mjs
import assert from "node:assert";
import { interpolateVehicles } from "../src/lib/data.js";

const V = (id, speed = 5) => [id, 0, 10.03, 105.76, speed, 90];
const frames = [
  { time: 0, vehicles: [V("a")] },
  { time: 2, vehicles: [V("a")] },
  { time: 4, vehicles: [V("a")] },
];

const staleMaps = [new Map([["a", frames[0].vehicles[0]]])];
const out = interpolateVehicles(frames, 3, staleMaps);
assert(Array.isArray(out) && out.length === 1, "falls back when maps shorter than frames");

const none = interpolateVehicles(frames, 3, []);
assert(none.length === 1, "empty maps falls back");

console.log("[interpolate_maps_mismatch.test] all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/interpolate_maps_mismatch.test.mjs`
Expected: FAIL voi `TypeError: Cannot read properties of undefined (reading 'get')` tai `data.js:180` - dung stack trong console user.

- [ ] **Step 3: Write minimal implementation (1 dong, `src/lib/data.js:177`)**

```js
const bById = maps?.[i + 1] ?? new Map(b.vehicles.map((v) => [v[V_INDEX.ID], v]));
```

Thay dong cu:

```js
const bById = maps ? maps[i + 1] : new Map(b.vehicles.map((v) => [v[V_INDEX.ID], v]));
```

Rationale: dung duong fallback da co (build Map tai cho) nhung gio bao luon truong hop entry `undefined`/lo hong, khong chi `maps == null`. Khong doi signature, khong doi behavior khi maps du.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/interpolate_maps_mismatch.test.mjs`
Expected: PASS, in `[interpolate_maps_mismatch.test] all assertions passed`, exit 0.

- [ ] **Step 5: Run 8 tests cu, ky vong 9/9 PASS**

Run: `node tests/replay_meta.test.mjs; node tests/scale.test.mjs; node tests/signal_timing.test.mjs; node tests/inspector_cycle.test.mjs; node tests/lane_shift.test.mjs; node tests/declutter.test.mjs; node tests/phase_offset.test.mjs; node tests/signals.test.mjs; node tests/signal_vehicle_alignment.test.mjs`
Expected: moi dong `all assertions passed`, exit 0; alignment ratio van 0.919 (328/357).

---

### Task 2: Luoi an toan - loop rAF khong bao gio chet theo 1 frame xau

**Files:**
- Modify: `src/components/VehicleCanvas.jsx:127-132` (loop trong `useCanvasLifecycle`)

**Interfaces:**
- Consumes: `drawFrame` (Task 1 da lam no khong throw voi case nay; task nay chan moi throw tuong lai).
- Produces: Khong co (terminal task - loop tu hoi phuc, loi van surface ra console de debug).

- [ ] **Step 1: Doc code hien tai (xac nhan dung hinh)**

Run: `rg -n "requestAnimationFrame" src/components/VehicleCanvas.jsx`
Expected: 2 hit - dong schedule trong `loop` va dong schedule khoi dong/cleanup quanh `useCanvasLifecycle` (dong ~131 va ~133). Sua dung block `loop`.

- [ ] **Step 2: Minimal implementation (boc `try/finally`, giu nguyen moi dong trong)**

```js
const loop = () => {
  try {
    const d = dataRef.current;
    const n = drawFrame(map, canvas, d.frames, d.maps, timeRef.current, segCache);
    if (n !== lastCount) { lastCount = n; onCount?.(n); }
  } finally {
    raf = requestAnimationFrame(loop);
  }
};
```

Rationale: `finally` (khong phai `catch` nuot loi) - loi van hien console de bat bug moi, nhung loop song tiep frame sau. Cleanup `cancelAnimationFrame(raf)` giu nguyen hieu luc vi `raf` van giu id moi nhat. Khong dung `catch` rong (che loi), khong them retry/backoff (over-engineering cho render loop).

- [ ] **Step 3: Full verification**

Run: `npm run build`
Expected: exit 0, ~6s, bundle ~814kB / CSS ~35kB (tang ~0, chi doi cau truc dieu khien).

- [ ] **Step 4: Verify mat - dung kich ban bug cua user (3 phut, `npm run dev`)**

Checklist: (a) phat toi het CK61, time chay qua 02:02:00; (b) keo slider ve CK1/10/30 - xe hien lai ngay, so `xe` nhay theo (khong dong cung); (c) F12 console khong con `TypeError ... reading 'get'`; (d) tua qua lai 61<->1 nhieu lan, den/xe van khop.

---

## Self-Review

1. Spec coverage: Crash `data.js:180` -> Task 1; loop chet vinh vien -> Task 2. Trigger data `cycle_61 t=0` vs `cycle_1 t=2` duoc test tai hien. Khong sot mat xich nao trong 3 mat da chot.
2. Placeholder scan: Khong TBD/TODO. Moi step co code + lenh + expected cu the, ke ca so dong va output console ky vong.
3. Type consistency: Khong doi signature `interpolateVehicles`, `V_INDEX`, `drawFrame`, design tokens. Test moi theo dung convention repo (`node:assert` + dong log `[name.test] all assertions passed`).
