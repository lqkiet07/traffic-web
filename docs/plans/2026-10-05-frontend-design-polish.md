# Frontend Design & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove AI-slop visual defects (fragmented border tokens, neon glow shadows, stacked stepper navigation), establish one consistent design-token system, and replace the empty Camera YOLO placeholder with a professional technical interface.

**Architecture:** Standardize color/border tokens in `src/index.css`; unify borders and primary color across Replay components (`Header`, `StatCards`, `ComparisonCharts`, `ReplayControls`); merge the 4 stacked navigation layers of `LiveMathBox` in `LabAnalysisPanel` into one compact 2-row controller; build a new `CameraView.jsx` mocking the Homography IPM + YOLOv8 pipeline and mount it in `src/App.jsx`.

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React, Three.js 0.186, Leaflet, Recharts.

**Spec:** The frontend-design review in the 2026-10-05 conversation (4 principles: restrained palette, ordered typography, hierarchical information architecture, technical UX copy).

## Global Constraints

- No new npm dependencies.
- All 21 existing test suites must keep passing (no regressions).
- Single primary color: Emerald `#10b981`. Supporting domain colors only: Sky `#38bdf8` (phi params), Amber `#f59e0b` (motos/warnings), Rose `#ef4444` (red lights/backpressure).
- Uniform surfaces: page background `#090d16`, card surface `#0f172a`, borders `#1e293b`.
- Remove every neon glow shadow (`shadow-[0_0_10px_...]`).
- Functions under 50 lines, nesting under 4 levels, early returns.
- Vietnamese strings use real UTF-8 characters, never `\uXXXX` escapes.
- Do NOT change algorithm, simulation or math logic in `src/lib/*`.
- Verification for UI tasks (no meaningful unit test exists for class-name restyles): full 21-suite run + `npm run build` exit 0.

---

## File Structure

- Modify `src/index.css` — design tokens, focus/selection, scrubber.
- Modify `src/components/Header.jsx` — unified tabs, scenario, algo toggle.
- Modify `src/components/StatCards.jsx` — border token check.
- Modify `src/components/ComparisonCharts.jsx` — metric tab tokens.
- Modify `src/components/ReplayControls.jsx` — border token check.
- Modify `src/components/LabAnalysisPanel.jsx` — merge StepTabs + StepNav + StepBadge into one UnifiedStepHeader.
- Modify `src/components/LabTransportBar.jsx` — stepper breadcrumb Emerald, no glow.
- Modify `src/components/AlgorithmLab.jsx` — only if the LabCanvasBox header needs border unification.
- Create `src/components/CameraView.jsx` — technical IPM/YOLO interface.
- Modify `src/App.jsx` — mount `<CameraView />` in the camera tab.

---

### Task 1: Standardize design tokens and clean fragmented borders

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/Header.jsx`
- Modify: `src/components/StatCards.jsx`
- Modify: `src/components/ComparisonCharts.jsx`
- Modify: `src/components/ReplayControls.jsx`

**Interfaces:**
- Consumes: existing Tailwind v4 setup (`@import "tailwindcss"` in index.css).
- Produces: one border token `#1e293b` used everywhere; Emerald as the single primary across tabs and active buttons; zero `shadow-[0_0_10px` occurrences in `src/`.

- [ ] **Step 1: Add token comments and focus/selection styles in `src/index.css`**

Keep the existing imports, body background, scrollbars and scrubber untouched. Append a token block and accessible focus/selection:

```css
/* Design tokens: single source of truth for the console theme.
   void #090d16 = page/canvas, surface #0f172a = cards,
   border #1e293b = every divider, primary emerald #10b981 = actions/CAO. */
:root {
  --dt-void: #090d16;
  --dt-surface: #0f172a;
  --dt-border: #1e293b;
  --dt-primary: #10b981;
  --dt-accent: #38bdf8;
  --dt-caution: #f59e0b;
  --dt-critical: #ef4444;
}

::selection {
  background: rgba(16, 185, 129, 0.35);
}

:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 1px;
}
```

- [ ] **Step 2: Unify `Header.jsx` tabs on Emerald**

In `TabSwitcher`, change the camera-tab active style from `bg-amber-500/20 text-amber-200` to `bg-emerald-500 text-slate-950` so all three tabs share one active treatment. Keep the amber `Chờ clip` badge exactly as is. Verify `ScenarioSelect` select element and `AlgoToggle` container/border already use `border-[#1e293b]` and `bg-[#0f172a]`; change any `border-slate-800` found there to `border-[#1e293b]`.

- [ ] **Step 3: Sweep every listed component for fragmented border tokens**

Replace ALL of these with `border-[#1e293b]` (and `divide-[#1e293b]` for dividers) in the five files: `border-slate-800`, `border-slate-800/80`, `border-slate-700`, `border-cyan-500/30`, `border-cyan-500/20`, `border-cyan-400/40`, `border-emerald-500/40`, `border-slate-800/80`, `hover:border-slate-700`, `hover:border-slate-500`. Do NOT touch semantic state borders that encode meaning (rose/amber/green status chips in StatCards badges, phase cards, backpressure alerts). Do NOT touch `LabAnalysisPanel.jsx`, `LabTransportBar.jsx`, `AlgorithmLab.jsx` — those belong to Task 2.

- [ ] **Step 4: Remove neon glow shadows in the five files**

Delete every `shadow-[0_0_10px...]` class in the five files. Keep structural `shadow-md`/`shadow-xl` where they give panels depth.

- [ ] **Step 5: Verify no leftovers and nothing broke**

Run: `rg "shadow-\[0_0_10px" src/` — expect zero matches.
Run: `rg "border-slate-800|border-slate-700|border-cyan-500|border-cyan-400" src/components/Header.jsx src/components/StatCards.jsx src/components/ComparisonCharts.jsx src/components/ReplayControls.jsx` — expect zero matches.
Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — expect 21/21 PASS.
Run: `npm run build` — expect exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/components/Header.jsx src/components/StatCards.jsx src/components/ComparisonCharts.jsx src/components/ReplayControls.jsx
git commit -m "style: standardize design tokens, borders and header tabs"
```

---

### Task 2: Merge LiveMathBox navigation into one compact controller

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx`
- Modify: `src/components/LabTransportBar.jsx`
- Modify: `src/components/AlgorithmLab.jsx` (only if its canvas header needs the same border treatment)

**Interfaces:**
- Consumes: existing props of `LiveMathBox` (`currentStep`, `stepData`, `algo`, `subPhase`, `onSetStep`, `onPrevStep`, `onNextStep`, `isAutoStepping`, `onToggleAutoStep`, `onReset`, `selectedNode`, `onSelectNode`). All downstream consumers (`Step1Math`..`Step5Math`, `StepMathContent`) stay untouched.
- Produces: `UnifiedStepHeader` replacing `StepTabs` + `StepNav` + `StepBadge`; `LiveMathBox` keeps the identical prop interface so `AlgorithmLab.jsx` needs no logic change.

- [ ] **Step 1: Build `UnifiedStepHeader` in `LabAnalysisPanel.jsx`**

Replace the three stacked blocks (`StepTabs`, `StepNav`, `StepBadge`) with one component rendering two rows:

Row 1 — node segmented control (keep the existing `NodeSelectorBar` markup and behaviour verbatim, only ensure its border is `border-[#1e293b]`).

Row 2 — single controller row containing, in order: reset button (`↺ Đầu`, calls `onReset`), prev button (`|< Lùi`, calls `onPrevStep`, disabled when `currentStep <= 1`), the five step breadcrumb buttons (labels `1. Quét ROI`, `2. Trừ hạ lưu`, `3. Áp suất γ`, `4. Cấp giây`, `5. Giải phóng`, each calls `onSetStep(s)`), next/action button (when `subPhase === "motion"` render the disabled waiting pill `Đang di chuyển...`, otherwise the primary next button `Bước tiếp theo >|` calling `onNextStep`), auto toggle (`▶ Tự động (3s)` / `⏸ Dừng`, calls `onToggleAutoStep`), and the step title text `Bước {currentStep}/5: {STEP_TITLES[currentStep]}` plus algo tag rendered as plain caption text (no glowing badge).

Active step style: `border-emerald-400 bg-emerald-500 font-bold text-slate-950` with NO glow shadow. Past steps: `border-[#1e293b] bg-slate-800/80 text-slate-300 hover:bg-slate-700`. Future steps: `border-[#1e293b] bg-transparent text-slate-500 hover:text-slate-400`. Primary next button: `bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold` (replacing the old cyan). Keep every `title` tooltip attribute from the old buttons.

Keep the old exported names working: leave `StepTabs`, `StepNav`, `StepBadge` exported (re-implemented as thin wrappers over `UnifiedStepHeader` or deleted only if nothing imports them — verify with grep first; `StepNav`/`StepTabs`-style duplicates also exist in `LabTransportBar.jsx` as `StepperControls`/`StepperBreadcrumbs` and must keep working).

- [ ] **Step 2: Fix `LabTransportBar.jsx` stepper colors**

In `StepperBreadcrumbs`, change the active crumb from `border-cyan-400 bg-cyan-500 ... shadow-[0_0_10px_rgba(6,182,212,0.4)]` to `border-emerald-400 bg-emerald-500 font-bold text-slate-950` with no shadow. In `StepperMotionWait`/`StepperNextButton`, change cyan treatments to Emerald (`border-emerald-500/40 bg-emerald-500/15 text-emerald-300` for wait, `bg-emerald-500 text-slate-950 hover:bg-emerald-400` for next). Remove any remaining `shadow-[0_0_10px` in this file.

- [ ] **Step 3: Unify borders in the touched regions**

Apply the same Task-1 border rule inside the edited regions of `LabAnalysisPanel.jsx` and `LabTransportBar.jsx`: every structural border becomes `border-[#1e293b]`. Keep semantic state borders (rose backpressure, amber caution, emerald success chips, phase-card tones).

- [ ] **Step 4: Verify behaviour is unchanged**

Run: `rg "shadow-\[0_0_10px" src/components/LabAnalysisPanel.jsx src/components/LabTransportBar.jsx` — expect zero matches.
Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — expect 21/21 PASS (especially `algorithm_stepper.test.mjs`).
Run: `npm run build` — expect exit 0.
Self-check the prop chain by reading: `LiveMathBox` still accepts and forwards all 11 documented props; `AlgorithmLab.jsx` still renders without prop changes.

- [ ] **Step 5: Commit**

```bash
git add src/components/LabAnalysisPanel.jsx src/components/LabTransportBar.jsx src/components/AlgorithmLab.jsx
git commit -m "refactor(ui): streamline LiveMathBox stepper header and remove neon slop"
```

---

### Task 3: Build the technical Camera YOLO interface

**Files:**
- Create: `src/components/CameraView.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: nothing (static presentational component, no props required; no backend, no video decoding).
- Produces: default-exported `CameraView` component rendered by the camera tab in place of `CameraPlaceholder`.

- [ ] **Step 1: Create `src/components/CameraView.jsx`**

Static layout only — no state, no effects, no new dependencies (Lucide icons already installed: `Video`, `Grid3x3`, `ScanEye`, `Cpu`, `ArrowRight`, `Upload`). Three zones:

Zone A — Perspective camera stream (left, 16:9 frame): dark video frame with HUD overlay rows showing `CAM-CTU-01`, `1920×1080 · 30 FPS`, and four calibration anchor chips `P1..P4` positioned at the frame corners (absolutely positioned mono labels, amber). Below the frame, an upload row: a bordered drop hint `Kéo thả video .mp4 vào đây` plus a solid Emerald button `Chọn video thử nghiệm` (non-functional `type="button"` with `title="Chờ triển khai pipeline YOLOv8 + ByteTrack"`).

Zone B — Bird's-eye IPM view (right): flat orthogonal road plane mock (bordered panel with a simple CSS grid suggesting the rectified surface), an occupancy bar showing `φ = 0.48 (48%)` with an Emerald fill at 48% width, and a two-row comparison: rose chip `Bbox: ~14 xe (hụt ~40%)` vs emerald chip `CAO: φ = 0.48 (đúng 100%)`.

Zone C — pipeline strip (bottom, full width): five mono stage labels joined by arrows: `YOLOv8 Segmentation → ByteTrack → Homography H(3×3) → CAO Occupancy → GAMA Engine`, each stage a bordered chip, arrows as slate `→` text.

All structural borders `border-[#1e293b]`, surfaces `bg-[#0f172a]`, page inherits `#090d16`. No glow shadows. Keep every function under 50 lines; split Zone A/B/C into small subcomponents in the same file.

- [ ] **Step 2: Mount in `src/App.jsx`**

Replace `CameraPlaceholder` body with `<CameraView />` (keep the `data-testid="camera-placeholder"` wrapper div so any test hook stays valid). Add `import CameraView from "./components/CameraView.jsx";`. Delete nothing else.

- [ ] **Step 3: Verify**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — expect 21/21 PASS.
Run: `npm run build` — expect exit 0.
Run: `rg "console\.log" src/components/CameraView.jsx src/App.jsx` — expect zero matches.

- [ ] **Step 4: Commit**

```bash
git add src/components/CameraView.jsx src/App.jsx
git commit -m "feat(ui): implement technical digital-twin interface for Camera YOLO tab"
```

---

### Task 4: Full regression and leftover sweep

- [ ] **Step 1: Full suite**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }`
Expected: 21/21 PASS, exit code 0.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 3: Slop sweep**

Run: `rg "shadow-\[0_0_10px" src/` — expect zero matches.
Run: `rg "console\.log" src/components/Header.jsx src/components/StatCards.jsx src/components/ComparisonCharts.jsx src/components/ReplayControls.jsx src/components/LabAnalysisPanel.jsx src/components/LabTransportBar.jsx src/components/AlgorithmLab.jsx src/components/CameraView.jsx src/App.jsx src/index.css` — expect zero matches.

---

## Self-Review

- Spec coverage: design-token system (Task 1), LiveMathBox destack (Task 2), Camera YOLO interface (Task 3), regression (Task 4). All four review sections covered.
- Placeholder scan: every step contains exact code, class strings, commands and expected outputs. No TBD/TODO.
- Type consistency: `LiveMathBox` keeps its 11-prop interface; `CameraView` takes no props; no signature changes anywhere.
