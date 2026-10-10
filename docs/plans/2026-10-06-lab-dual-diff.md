# Kiến Trúc "1 Lab - Dual Diff": Đối Chiếu Song Song Cb-MP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the Stepper into a single side-by-side Dual Diff journey between Baseline (Count-based Cb-MP, Eq. 2) and CAO (Area-based Cb-MP, Eq. 3) per the paper: Step 1 (sensing input side-by-side), Steps 2-3 (isomorphic Max-Pressure math), Step 4 (actuation output side-by-side), and hide the algo toggle in Stepper mode.

**Architecture:**
1. Extend `getAlgorithmStepData` in `src/lib/corridorSim.js`: compute count-based weights (`w_count`, `gamma_count`, Eq. 2) in parallel with area weights (`w_area`, `gamma_area`, Eq. 3), keeping 100% backward compatibility with existing fields.
2. Restructure `Step1Math` and `Step4Math` in `src/components/LabAnalysisPanel.jsx` into 2-column visual comparison (left: Baseline Bbox undercount → 60s early cutoff; right: CAO full area → 64s full discharge).
3. Normalize `Step2Math` and `Step3Math`: present parallel Cb-MP formulas, stressing "identical Max-Pressure math, error originates at Step 1 sensing and propagates".
4. Lock/hide the `[ CAO ] | [ Baseline ]` toggle in Stepper mode (visible only in Continuous 60fps for live traffic dynamics).

**Tech Stack:** React 19, Tailwind CSS 4, Three.js 0.186, Vite 6, Node.js assert test runner.

**Spec:** `samplepaper (6).pdf` (Sections 3.1 & 3.2, Eq. 1-7, Table 1); `HANDOFF-2026-10-05-SESSION2.md`.

## Global Constraints
- Do NOT revert unrelated in-progress files (~26 modified files and `vid/` untracked); stage only task files per commit.
- All 22/22 test suites must PASS after every commit, no data regressions.
- Keep design tokens (`#090d16`, `#0f172a`, `#1e293b`, `#38bdf8`, `#10b981`, `#fbbf24`, `#f43f5e`).
- No obvious paraphrase comments; brief English-only comments for formula constraints.

---

### Task 1: Parallel Count-Based Weights in `getAlgorithmStepData`

**Files:**
- Modify: `src/lib/corridorSim.js` (getAlgorithmStepData step2/step3 blocks)
- Test: `tests/algorithm_stepper.test.mjs` (append dual-contract asserts to Test 1)

**Interfaces:**
- Consumes: `cameraCountsP1`, `cameraCountsP2`, `outCounts`, `phiIn1`, `phiIn2`, `phiOut`, `turnRatio`.
- Produces:
  - `step2`: keeps `w1, w2, turnRatio, backPressureDeduction` (CAO); adds `w1Count, w2Count, backPressureCount, xIn1, xIn2, xOut` (Baseline).
  - `step3`: keeps `gamma1, gamma2, totalGamma, cSat` (CAO); adds `gamma1Count, gamma2Count, totalGammaCount` (Baseline).

- [ ] **Step 1: Write the failing test**

Append to Test 1 in `tests/algorithm_stepper.test.mjs` (after the existing Step 3 asserts, before the Step 4 block):
```javascript
  // Step 2 dual contract: area weights vs count weights
  assert.strictEqual(typeof data.step2.w1Count, "number");
  assert.strictEqual(typeof data.step2.w2Count, "number");

  // Step 3 dual contract: area pressure vs count pressure
  assert.strictEqual(typeof data.step3.gamma1Count, "number");
  assert.strictEqual(typeof data.step3.gamma2Count, "number");
  assert.strictEqual(data.step3.gamma1Count, 2.5 * data.step2.w1Count);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/algorithm_stepper.test.mjs`
Expected: FAIL with `data.step2.w1Count` undefined.

- [ ] **Step 3: Write minimal implementation**

In `getAlgorithmStepData` (after the existing gamma block, before the baseline/cameraCounts block — order so `turnRatio` is already defined):
```javascript
  // Baseline count-based Max-Pressure (Eq. 2 in paper)
  const xIn1 = totalVehicles(cameraCountsP1);
  const xIn2 = totalVehicles(cameraCountsP2);
  const xOut = totalVehicles(outCounts);
  const backPressureCount = isNode1 ? turnRatio * xOut : 0;
  const w1Count = Math.max(0, xIn1 - backPressureCount);
  const w2Count = xIn2;
  const gamma1Count = C_SATURATION * w1Count;
  const gamma2Count = C_SATURATION * w2Count;
  const totalGammaCount = gamma1Count + gamma2Count;
```
Extend the returned payloads (existing fields byte-identical):
```javascript
  step2: {
    w1, w2, turnRatio, backPressureDeduction,
    w1Count, w2Count, backPressureCount, xIn1, xIn2, xOut,
  },
  step3: {
    gamma1, gamma2, totalGamma, cSat: C_SATURATION,
    gamma1Count, gamma2Count, totalGammaCount,
  },
```
NOTE: `cameraCountsP1/P2` are currently computed AFTER the gamma block (for the baseline allocation). Either move their computation above this new block or compute xIn1/xIn2 from them — keep it simple: place the new count-weight block AFTER the existing cameraCounts lines, and only extend step2/step3 object literals (which appear later in the return statement). Do NOT reorder existing logic.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/algorithm_stepper.test.mjs`
Expected: PASS all assertions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/corridorSim.js tests/algorithm_stepper.test.mjs
git commit -m "feat(sim): enrich step2 and step3 with parallel count-based Max-Pressure weights"
```

### Task 2: Step 1 Dual-Column Sensing Comparison

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx` (`Step1Math` only, ~lines 328-390)

**Interfaces:**
- Consumes: `data.p1Counts, data.p2Counts, data.p1Area, data.p2Area, data.phiIn1, data.phiIn2, data.occlusionP1, data.occlusionP2`.
- Produces: 2-column grid — left rose Baseline Bbox column, right emerald CAO column — plus existing `SimVsRealComparison` + `ParameterNote` (keep both, update note to cite Eq. 1).

- [ ] **Step 1: Rewrite `Step1Math` as dual-column**

Use the exact JSX from the approved design: header row per column (`📷 BASELINE (CAMERA BBOX)` / `📐 CAO (ĐỘ ĐO DIỆN TÍCH)`), P1/P2 rows (visible vs raw counts left; phi + area right), warning footers (rose occlusion loss left; emerald occlusion-immune right). Derive with fallbacks:
```javascript
  const rawP1 = occ1?.rawCount ?? (data?.p1Counts?.moto ?? 0);
  const visP1 = occ1?.visibleCount ?? rawP1;
  const rawP2 = occ2?.rawCount ?? (data?.p2Counts?.moto ?? 0);
  const visP2 = occ2?.visibleCount ?? rawP2;
```
Keep `SimVsRealComparison` and `ParameterNote` below the grid; update note text to `S_zone = 150 m² (vùng quan sát camera 30m × 5m, Eq. 1 trong Paper)`. Remove the old `PhaseCard` rows and the old separate occlusion chips (their content moves into the columns). Keep exported function name and `data` prop signature.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/LabAnalysisPanel.jsx
git commit -m "feat(ui): redesign step 1 math into side-by-side dual sensing comparison"
```

### Task 3: Unified Cb-MP Formulas in Steps 2 & 3

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx` (`Step2Math` & `Step3Math` only)

**Interfaces:**
- Consumes: `data.w1/w2/w1Count/w2Count`, `data.gamma1/gamma2/gamma1Count/gamma2Count` (Task 1 fields; fall back to computing from step1/step2 props if absent so UI never renders NaN).
- Produces: Parallel Eq. 2 vs Eq. 3 presentation with the inheritance message "identical Cb-MP frame, divergence originates at Step 1 sensing".

- [ ] **Step 1: Update `Step2Math` and `Step3Math`**

- `Step2Math`: show both formulas — Baseline (Eq. 2): `w1_count = max(0, x_in - 0.70 · x_out)` with live numbers; CAO (Eq. 3): `w1_area = max(0, φ_in - 0.70 · φ_out)` with live numbers. Keep existing backpressure explanation; add one-line note: khung Cb-MP đồng dạng, cả hai đều khấu trừ dội ngược với R = 0.70.
- `Step3Math`: show `γ = 2.5 × w` for both tracks with live numbers; add competition-ratio contrast: Baseline sees P2 dominant from counts (13 vs 18) while CAO correctly sees P1 dominant from area (0.26 vs 0.18). Derive counts/areas from the `step1`/`step2` props already passed (do NOT add new props to StepMathContent).
- Keep all existing component names, prop signatures, and the `BackpressureCauseEffect` block behavior unchanged.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/LabAnalysisPanel.jsx
git commit -m "style(ui): align step 2 and step 3 math with unified Cb-MP formulas"
```

### Task 4: Step 4 Dual Output + Algo-Toggle Lock in Stepper

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx` (`Step4Math`, `UnifiedStepHeader`, `LabPresetBar` + its call site in `LabSidePanel`)

**Interfaces:**
- Consumes: `data.baseline, data.cbmp, data.totalCycle, data.lostTime`; `isStepper` state at the preset-bar call site.
- Produces:
  - `Step4Math`: 2-column output (rose Baseline g1=60 early-cut vs emerald CAO g1=64 full discharge) with parallel progress bars + Table 1 note. New signature: `Step4Math({ data })` — drop the `algo` prop branching (both formulas always shown); update the single `StepMathContent` call site accordingly.
  - `LabPresetBar`: new opt-in prop `showAlgoToggle = true`; when false, renders only preset buttons. `LabSidePanel` passes `showAlgoToggle={!isStepper}` (isStepper already in scope there).
  - `UnifiedStepHeader`: title suffix becomes `· Đối chiếu Max-Pressure` (remove per-algo `· CAO-CBMP` / `· Baseline` suffix, keep `Bước {n}/5: {title}` prefix).

- [ ] **Step 1: Rewrite `Step4Math` as dual-column + lock toggle + retitle header**

Use the exact JSX from the approved design for the two output columns (rose `BASELINE (BBOX RỜI RẠC)` g1=60/g2=52 with early-cut warning; emerald `CAO (DIỆN TÍCH LIÊN TỤC)` g1=64/g2=48 with full-discharge note; widths relative to 112s available green) plus the Table 1 footnote (6.01% low / 11.90% medium / ±2% throughput). Guard every number with `??` fallbacks so empty stepData never renders NaN.

- [ ] **Step 2: Run all 22 suites & production build**

Run each `node tests/<name>.test.mjs` (22 files: lab_slider_seek, algorithm_stepper, algorithm_lab_presets, cbmp_math, clock_contract, corridor_sim, corridor3d_scene_dispose, corridor3d_scene_hud, corridor3d_scene_layout, cycle_timebase, declutter, inspector_cycle, interpolate_maps_mismatch, kpi_rep1, lane_shift, phase_offset, player_logic, replay_meta, scale, signal_timing, signal_vehicle_alignment, signals) then `npm run build`.
Expected: 22/22 print "all assertions passed", build exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/LabAnalysisPanel.jsx
git commit -m "feat(ui): complete side-by-side dual comparison architecture in step 4 and presets bar"
```

## Self-Review
1. Spec coverage: Eq. 2/Eq. 3 (Task 1+3), side-by-side input/output (Task 2+4), toggle lock (Task 4). Table 1 numbers cited in Step 4 footnote.
2. Placeholders: none — every step ships exact code/asserts/commands.
3. Type consistency: new step2/step3 fields are numbers; Step4Math reads data.baseline/data.cbmp already produced by getAlgorithmStepData; showAlgoToggle boolean default true.
