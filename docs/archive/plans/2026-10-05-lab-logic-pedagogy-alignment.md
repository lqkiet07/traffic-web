# Lab Logic + Pedagogy Alignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 logic defects in the Algorithm Lab (Baseline-disconnected StepData, 112s clock drift, 2D canvas missing Node 2, unaccented coordination bar) and polish the pedagogical annotations (dedup 150 m² footnote, ParameterStrip, sans-serif Sim-vs-Real card), without changing core math.

**Architecture:** Branch `getAlgorithmStepData` on `sim.algo` returning both baseline and CAO allocations; standardize the Lab transport clock on the 112s effective cycle; thread `selectedNode` into `CorridorCanvas` with a baseX offset (240 / 560); replace asterisk footnotes with a `ParameterNote` strip component.

**Tech Stack:** React 19, Tailwind CSS v4, Three.js 0.186, HTML5 Canvas 2D, Node built-in test runner.

**Spec:** Paper `samplepaper.txt` Table 1 / Section 4.3 / Section 5; `src/lib/data.js` (`CYCLE_LEN = 120` web clock vs `GAMA_CYCLE_LEN = 112` sim clock); the systematic-debugging review identifying the 4 defects.

## Global Constraints

- No new npm dependencies.
- All 21 existing test suites must keep passing (plus 1 new test = 22).
- Real UTF-8 Vietnamese directly, never `\uXXXX` escapes.
- No emotive/absolutist wording ("vượt trội", "thần thánh", "đúng 100%", "mù hoàn toàn").
- Functions under 50 lines, nesting under 4 levels, early returns.
- Do NOT change core math: phi/gamma formulas, constants (150, 0.70, 2.5, 120/112/8/10/92), vehicle areas.

---

## File Structure

- Modify `src/lib/corridorSim.js` — `getAlgorithmStepData`: branch on `sim.algo`, add `algo/baseline/cbmp/p1Count/p2Count` to step4.
- Modify `src/components/LabAnalysisPanel.jsx` — Step4Math algo-aware formula + comparison line; remove `* 150 m²` span from PhaseCard; add `ParameterNote` strips in Steps 1-3; SimVsRealComparison font change.
- Modify `src/components/LabTransportBar.jsx` — 112s clock, cycle number, scrubber max/ticks.
- Modify `src/components/AlgorithmLab.jsx` — `seekSim` clamp 112; CorridorCoordinationBar diacritics; pass `selectedNode` to CorridorCanvas.
- Modify `src/components/CorridorCanvas.jsx` — accept `selectedNode`, offset step overlays by baseX.
- Modify `tests/algorithm_stepper.test.mjs` — append Test 10 (baseline step4 contract).

---

### Task 1: Baseline-aware `getAlgorithmStepData` + Step4Math display

**Files:**
- Modify: `src/lib/corridorSim.js` (`getAlgorithmStepData` ~186-235)
- Modify: `src/components/LabAnalysisPanel.jsx` (`Step4Math` ~484-530)
- Modify: `tests/algorithm_stepper.test.mjs` (append Test 10)

**Interfaces:**
- Consumes: existing `allocateBaselineGreen(p1Counts, p2Counts)` and `allocateCbmpGreen(gamma1, gamma2)` from `./cbmp.js`; existing `totalVehicles()` helper.
- Produces: `step4 = { algo, g1, g2, baseline: {g1,g2}, cbmp: {g1,g2}, p1Count, p2Count, minGreen, availRemainder, totalCycle, lostTime }`. `g1/g2/greenDuration` follow the ACTIVE algo; both allocations always present for comparison.

- [ ] **Step 1: Append the failing Test 10 to `tests/algorithm_stepper.test.mjs`**

```javascript
// Test 10: baseline step4 contract (algo-aware allocation)
{
  const sim = createCorridorSim({ algo: "baseline" });
  for (let i = 0; i < 4; i++) spawnVehicle(sim, { node: 1, approach: "west", type: "truck" });
  for (let i = 0; i < 24; i++) spawnVehicle(sim, { node: 1, approach: "north1", type: "moto" });

  const data = getAlgorithmStepData(sim, 1);
  assert.strictEqual(data.step4.algo, "baseline");
  // 4 vehicles / 28 vehicles -> g1 = 10 + 92 * (4/28) = 23s (rounded)
  assert.strictEqual(data.step4.g1, 23);
  assert.strictEqual(data.step4.g2, 89);
  assert.strictEqual(data.step4.p1Count, 4);
  assert.strictEqual(data.step4.p2Count, 24);
  // CAO allocation preserved for comparison (72m2 vs 36m2 -> g1 = 10 + round(92*72/108) = 71)
  assert.strictEqual(data.step4.cbmp.g1, 71);
  assert.strictEqual(data.step4.baseline.g1, 23);
}
console.log("[algorithm_stepper_baseline.test] all assertions passed");
```

NOTE: do NOT add a second `console.log("[algorithm_stepper.test]...")` line — the file already ends with one. Either append assertions to the existing flow without a new log line, or keep the new block log-free. The existing tail log line must remain the single file-level success message.

- [ ] **Step 2: Run test to verify it FAILS**

Run: `node tests/algorithm_stepper.test.mjs`
Expected: FAIL — `data.step4.algo` is undefined (strictEqual undefined vs "baseline").

- [ ] **Step 3: Branch `getAlgorithmStepData` on `sim.algo`**

In `src/lib/corridorSim.js`, replace the allocation block:

```javascript
  const isBaseline = sim?.algo === "baseline";
  const baselineAllocation = allocateBaselineGreen(p1Counts, p2Counts);
  const cbmpAllocation = allocateCbmpGreen(gamma1, gamma2);
  const allocation = isBaseline ? baselineAllocation : cbmpAllocation;
```

And replace the `step4` / `step5` return payload with:

```javascript
    step4: {
      algo: sim?.algo ?? "cao",
      g1: allocation.g1,
      g2: allocation.g2,
      baseline: baselineAllocation,
      cbmp: cbmpAllocation,
      p1Count: totalVehicles(p1Counts),
      p2Count: totalVehicles(p2Counts),
      minGreen: MIN_GREEN,
      availRemainder: AVAILABLE_GREEN,
      totalCycle: CYCLE_DURATION,
      lostTime: LOST_TIME,
    },
    step5: {
      activePhase: node.phase,
      greenDuration: node.phase === 1 ? allocation.g1 : allocation.g2,
      queueCount: totalVehicles(activeCounts),
    },
```

`step1/step2/step3` and everything else in the return object stay byte-identical.

- [ ] **Step 4: Make `Step4Math` algo-aware with a comparison line**

`Step4Math` currently receives `data` = step4 only (via StepMathContent: `if (currentStep === 4) return <Step4Math data={stepData?.step4} />`). It does NOT receive `algo`. Change the call site to also pass the algo:

```jsx
if (currentStep === 4) return <Step4Math data={stepData?.step4} algo={stepData?.algo ?? "cao"} />;
```

Wait — `getAlgorithmStepData` returns `{ nodeId, ..., step4 }` with NO top-level `algo` field. Options: (a) add top-level `algo` to the return, or (b) read `stepData.step4.algo`. Option (b) needs no extra change: `StepMathContent` already spreads step4 which now contains `algo`. So:

```jsx
if (currentStep === 4) return <Step4Math data={stepData?.step4} algo={stepData?.step4?.algo ?? "cao"} />;
```

Then in `Step4Math({ data, algo })`, render the formula block conditionally:

```jsx
{algo === "baseline" ? (
  <div className="mt-1 text-slate-300 text-sm">g₁ = g_min + 92 × (n₁ / (n₁ + n₂))</div>
) : (
  <div className="mt-1 text-slate-300 text-sm">g₁ = g_min + (C - L - 2·g_min) × (γ₁ / γ_total)</div>
)}
```

Keep the existing numeric line `g₁ = 10 + 92 × ... = {g1}s` rendering the ACTIVE g1 in both branches (adjust the middle expression text per branch but keep `{g1}s`).

Below the allocation grid, add a compact comparison line using the always-present both-allocations (neutral wording, no hype):

```jsx
<div className="mt-2 text-[11px] font-mono text-slate-500 leading-relaxed">
  Đối chiếu cùng luồng xe: Baseline {data?.baseline?.g1 ?? 56}s (đếm đầu xe) · CAO {data?.cbmp?.g1 ?? 56}s (diện tích chiếm dụng).
</div>
```

- [ ] **Step 5: Run test to verify it PASSES**

Run: `node tests/algorithm_stepper.test.mjs`
Expected: PASS (all 10 tests including the 9 pre-existing).

- [ ] **Step 6: Full suite + build**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — expect 21 files PASS (algorithm_stepper now covers 10 tests internally).
Run: `npm run build` — expect exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/corridorSim.js src/components/LabAnalysisPanel.jsx tests/algorithm_stepper.test.mjs
git commit -m "fix(sim): align getAlgorithmStepData and Step4Math with active algorithm"
```

---

### Task 2: 112s clock sync + coordination bar diacritics

**Files:**
- Modify: `src/components/LabTransportBar.jsx` (`TimeReadout` ~72-84, `CycleScrubber` ~86-132, `TICKS` const ~line 6)
- Modify: `src/components/AlgorithmLab.jsx` (`seekSim` ~90-101, `CorridorCoordinationBar` ~392-425)

**Interfaces:**
- Consumes: existing `formatClock` from `../lib/data.js`, existing `onSeek/onPause` props.
- Produces: clock reading `CK {n} · t {s}s/112s`, scrubber 0..112, `seekSim` clamped to 112, accented bar labels. No prop changes.

- [ ] **Step 1: Retarget `TimeReadout` to the 112s effective cycle**

```jsx
export function TimeReadout({ simTime = 0, vehicleCount = 0 }) {
  const cycleNum = Math.floor((simTime || 0) / 112) + 1;
  const currentSec = Math.round((simTime || 0) % 112);
  return (
    <div className="ml-auto text-right font-mono text-xs tabular-nums text-slate-400">
      <div>
        CK <span className="font-bold text-slate-100">{cycleNum}</span> · t {currentSec}s/112s
      </div>
      <div>
        {formatClock(simTime || 0)} · {vehicleCount} xe
      </div>
    </div>
  );
}
```

This removes the hardcoded `CK 1` and the hardcoded `/ 00:02:00` total (which was wrong for any run longer than 120s).

- [ ] **Step 2: Retarget `CycleScrubber` to 0..112**

Change `TICKS` to `["0s", "28s", "56s", "84s", "112s"]`, input `min={0} max={112}`, and both second computations:

```jsx
const currentSec = Math.min(112, Math.max(0, Math.round((simTime || 0) % 112)));
```

Keep `onPause`/`setPointerCapture`/drag-commit behavior byte-identical.

- [ ] **Step 3: Clamp `seekSim` to 112 in `AlgorithmLab.jsx`**

```javascript
function seekSim(sim, activeScenario, targetSec) {
  // Lightweight seek: set clock and derive signal state, no resim
  const target = Math.max(0, Math.min(112, targetSec));
  ...rest unchanged...
}
```

One-line change (`120` → `112`).

- [ ] **Step 4: Accent the `CorridorCoordinationBar` labels**

Replace: `NUT 1` → `NÚT 1`, `BI BOP GIAM` → `BỊ BÓP GIẢM`, `HANH LANG` → `HÀNH LANG NỐI`, `-{cut}% BACKPRESSURE` → `-{cut}% ÁP LỰC DỘI`, `NUT 2` → `NÚT 2`, `BUNG TOI DA` → `MỞ TỐI ĐA`. Class names and layout untouched.

- [ ] **Step 5: Verify**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — 21 files PASS.
Run: `npm run build` — exit 0.
Run: `rg "NUT 1|HANH LANG|BACKPRESSURE|BUNG TOI DA|BI BOP GIAM" src/components/AlgorithmLab.jsx` — zero matches.

- [ ] **Step 6: Commit**

```bash
git add src/components/LabTransportBar.jsx src/components/AlgorithmLab.jsx
git commit -m "fix(lab): synchronize 112s cycle clock and localize coordination bar"
```

---

### Task 3: Dual-node step overlays for the 2D canvas

**Files:**
- Modify: `src/components/AlgorithmLab.jsx` (`LabCanvasView` ~353-390: pass `selectedNode` to `CorridorCanvas`)
- Modify: `src/components/CorridorCanvas.jsx` (overlay draw functions ~359-467, `drawFreezeOverlays`/`drawStepOverlays`/`drawScene` threading, component props ~597-607)

**Interfaces:**
- Consumes: new `selectedNode = 1` prop on `CorridorCanvas` (default 1 = Node 1, backward compatible).
- Produces: all 5 step overlays drawn at `baseX = selectedNode === 2 ? 560 : 240`. Step 1 inflow rect: Node 1 `strokeRect(1, 141, 218, 38)` unchanged; Node 2 corridor rect `strokeRect(262, 141, 276, 38)` (covers sim x 262..538 ≈ approach zone 240..540).

- [ ] **Step 1: Thread `selectedNode` through**

`LabCanvasView` 2D branch: add `selectedNode={lab.selectedNode}` to `<CorridorCanvas ... />`.
`CorridorCanvas` signature: add `selectedNode = 1` prop; thread through `useCanvasLoop` → `drawScene` → `drawStepOverlays` → `drawFreezeOverlays` → each `drawStepNOverlays` as a final `nodeId`/`baseX` parameter. Keep default `1` at every level so existing callers/tests are unaffected. Single call chain — update every function in the chain, no missed level.

- [ ] **Step 2: Offset the five overlay groups by `baseX`**

Define at top of `drawFreezeOverlays` (or pass in): `const baseX = nodeId === 2 ? 560 : 240;`

- Step 1: `if (nodeId === 2) ctx.strokeRect(262, 141, 276, 38); else ctx.strokeRect(1, 141, 218, 38);` and tag at `(nodeId === 2 ? 400 : 110, 150)`. Vehicle tag loop: keep Node-1 zones as-is; add Node-2 zones: `inCorridor = v.x >= 240 && v.x < 540 && (v.approach === "corridor" || Math.abs(v.y - 160) <= 25)` and `inCross2 = (v.y < 140 || v.y > 180) && (v.approach === "north2" || v.approach === "south2" || Math.abs(v.x - 560) <= 25)`; tag those when `nodeId === 2`.
- Step 2: arrow + tags reference the corridor, which is shared — leave UNCHANGED (it already depicts the inter-node link). Only the `w₁` tag moves: `drawFloatingTag(ctx, baseX - 30, 160, ...)`.
- Step 3: tags at `(baseX, 150)` and `(baseX, 170)`.
- Step 4: highlight rect centered on node: `(baseX - 92, 94, 18, 38)`, dot at `(baseX - 83, 123)`, tag at `(baseX, 60)`.
- Step 5: arrows relative to baseX: `moveTo(baseX - 18, ay) → lineTo(baseX + 12, ay)`, head at `baseX + 18`, banner tag at `(baseX, 60)`.

Verify Step-4 numbers against Node-1 originals: 148 = 240 - 92 ✓, 157 = 240 - 83 ✓. Step-5: 222 = 240 - 18 ✓, 252 = 240 + 12 ✓, 258 = 240 + 18 ✓. So the relative formulas reproduce Node-1 exactly.

- [ ] **Step 3: Verify**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — 21 files PASS.
Run: `npm run build` — exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/AlgorithmLab.jsx src/components/CorridorCanvas.jsx
git commit -m "feat(2d): support dual-node step overlays in CorridorCanvas"
```

---

### Task 4: Annotation polish (ParameterNote, dedup, font)

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx` (PhaseCard ~279-303, Step2Math ~413-422, Step3Math ~452-457, SimVsRealComparison ~305-320)

**Interfaces:**
- Consumes: nothing new. Produces: `ParameterNote({ children })` strip; PhaseCard without inline footnote.

- [ ] **Step 1: Remove the inline `* 150 m²` span from `PhaseCard`**

Delete the `<span className="block text-[10px] ...">* 150 m²: ...</span>` block, restoring the phi div to label + value only. (The info moves to the Step-1 strip in Step 3, so nothing is lost.)

- [ ] **Step 2: Move the `0.70` / `2.5` captions below their result lines**

In `Step2Math`, relocate the `* 0.70` caption div to AFTER the result line `w₁ = max(0, {phiIn} - 0.70 × {phiOut}) = {w1}` (keep formula → substitution → result → note order). Same in `Step3Math`: caption AFTER the `γ₁/γ₂` value boxes. Do not reword.

- [ ] **Step 3: Add the `ParameterNote` strip component + three usages**

```jsx
function ParameterNote({ children }) {
  return (
    <div className="mt-2 flex items-center gap-1.5 rounded border border-[#1e293b] bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400">
      <span className="text-slate-500">🏷️ Tham số:</span>
      <span>{children}</span>
    </div>
  );
}
```

Place: end of `Step1Math` (after SimVsRealComparison): `S_zone = 150 m² (vùng quan sát camera 30m × 5m)`; end of `Step2Math` formula card: `R_thẳng = 0.70 (70% xe vào hành lang nối, Eq. 3)`; end of `Step3Math` gamma card: `c_sat = 2.5 (hệ số dòng bão hòa, Eq. 4)`. Keep the relocated small captions from Step 2 as well (belt and suspenders is fine) — NO, remove duplication: the small inline captions added in the previous plan ARE the duplication source the user complained about. Decision: DELETE the inline `* 0.70` and `* 2.5` caption divs when adding the strips (single source of truth per step), and DELETE the inline `* 150 m²` span per Step 1 (replaced by the Step-1 strip).

- [ ] **Step 4: Sans-serif the SimVsRealComparison body**

Change root from `font-mono` to `font-sans`, keep numbers tabular via inner spans if needed — simplest: root `text-[11px] leading-relaxed` (inherits sans), headers keep `font-bold`. Remove `font-mono` from the root div only.

- [ ] **Step 5: Verify**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — 21 files PASS.
Run: `npm run build` — exit 0.
Run: `rg "\* 150 m²|\* 0\.70|\* 2\.5" src/components/LabAnalysisPanel.jsx` — zero matches (asterisk style gone).

- [ ] **Step 6: Commit**

```bash
git add src/components/LabAnalysisPanel.jsx
git commit -m "style(ui): clean up formula parameter annotations and enhance typography"
```

---

### Task 5: Full regression and final sweep

- [ ] **Step 1: Full suite**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }`
Expected: 21 files PASS (algorithm_stepper now asserts 10 internal tests).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 3: Sweeps**

Run: `rg "shadow-\[0_0_10px" src/` — zero matches.
Run: `rg "Đúng 100%|đúng 100%|mù hoàn toàn|miễn nhiễm|vượt trội|thần thánh" src/` — zero matches.
Run: `rg "console\.log" src/` — zero matches.
Run: `rg "NUT 1|HANH LANG|BACKPRESSURE|BUNG TOI DA|BI BOP GIAM" src/components/AlgorithmLab.jsx` — zero matches.

---

## Self-Review

- Spec coverage: Baseline StepData (Task 1), 112s clock + diacritics (Task 2), 2D dual-node (Task 3), annotation polish (Task 4), regression (Task 5). All 4 review defects + frontend polish covered.
- Placeholder scan: exact code/commands/expected outputs throughout. No TBD/TODO.
- Type consistency: step4 gains documented fields consumed by Step4Math; `selectedNode` defaults to 1 everywhere; no other signature changes.
