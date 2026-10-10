# Algorithm Lab Slider & Transport Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix root-cause slider failures in the Algorithm Lab (dead drag, 4px hitbox, track-click jump-back, dead arrow keys, cycle reset on seek), enable instant scrub seek + stepper controls, and add TDD suite `tests/lab_slider_seek.test.mjs`.

**Architecture:**
1. Extract cycle-preserving `seekSim(sim, targetSec)` into `src/lib/corridorSim.js` (`sim.time = cycleIndex * 112 + target`, derives phase/timeRemaining/isYellow per node) with TDD contract tests.
2. Widen `.transport-scrubber` hitbox to 20px transparent input with 4px `#1e293b` runnable track and centered 18px sky thumb (`margin-top: -7px`).
3. Simplify `CycleScrubber` to a direct controlled input (drop `setPointerCapture`/`dragSec`/`onPointerUp`; `onChange` seeks instantly) and render `StepperControls` + `StepperBreadcrumbs` when `simMode === "stepper"`.
4. Rewire `AlgorithmLab.jsx` to import shared `seekSim` and make `handleStepBack` cycle-safe.

**Tech Stack:** React 19, Vite 6, Tailwind CSS 4, Three.js 0.186, Node.js assert test runner.

**Spec:** Systematic-debugging Phase 1+2 findings (Playwright-verified): drag shows no feedback (no onSeek during drag), 4px hitbox, pointer-capture conflicts with native range drag, stale-value jump-back on track click, arrow keys dead, `seekSim` resets `sim.time` to cycle 1, `handleStepBack` unclamped, stepper controls never rendered. Reference working pattern: `ReplayControls.jsx` direct `onChange -> gotoCycle`.

## Global Constraints
- Do NOT revert pre-existing unrelated modified files or `vid/` untracked; stage only task files per commit.
- All 21 existing suites + 1 new suite (22 total) must PASS after every commit.
- Keep design tokens (`#090d16`, `#0f172a`, `#1e293b`, `#38bdf8`, `#10b981`); no glow-shadow additions.
- No paraphrase comments; English-only comments explaining non-obvious WHY.

---

### Task 1: Extract & Standardize `seekSim` + TDD

**Files:**
- Create: `tests/lab_slider_seek.test.mjs`
- Modify: `src/lib/corridorSim.js` (append `seekSim` export near `seekSim`-adjacent helpers)

**Interfaces:**
- Consumes: `sim.nodes.node1/node2` with `g1/g2`, `sim.time`.
- Produces: `export function seekSim(sim, targetSec)` — clamps target to 0..112, preserves `Math.floor(sim.time/112)` cycle index, sets `sim.time = cycleIndex*112 + target`, derives per-node `phase/timeRemaining/isYellow`, returns `sim`.

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert";
import { createCorridorSim, seekSim } from "../src/lib/corridorSim.js";

// Test 1: Seek at cycle 1 (sim.time = 0) to 30s -> Phase 1 green
{
  const sim = createCorridorSim();
  seekSim(sim, 30);
  assert.strictEqual(sim.time, 30);
  assert.strictEqual(sim.nodes.node1.phase, 1);
  assert.strictEqual(sim.nodes.node1.timeRemaining, sim.nodes.node1.g1 - 30);
  assert.strictEqual(sim.nodes.node1.isYellow, false);
}

// Test 2: Cycle preservation at cycle 3 (sim.time = 250s) seeking to 50s
{
  const sim = createCorridorSim();
  sim.time = 250;
  seekSim(sim, 50);
  assert.strictEqual(sim.time, 274);
  assert.strictEqual(Math.floor(sim.time / 112) + 1, 3);
}

// Test 3: Phase 2 transition at 70s (g1 = 64s, g2 = 48s)
{
  const sim = createCorridorSim();
  sim.nodes.node1.g1 = 64;
  sim.nodes.node1.g2 = 48;
  seekSim(sim, 70);
  assert.strictEqual(sim.nodes.node1.phase, 2);
  assert.strictEqual(sim.nodes.node1.timeRemaining, 112 - 70);
  assert.strictEqual(sim.nodes.node1.isYellow, false);
}

// Test 4: Yellow light warning within last 3s of Phase 1
{
  const sim = createCorridorSim();
  sim.nodes.node1.g1 = 64;
  seekSim(sim, 62);
  assert.strictEqual(sim.nodes.node1.phase, 1);
  assert.strictEqual(sim.nodes.node1.timeRemaining, 2);
  assert.strictEqual(sim.nodes.node1.isYellow, true);
}

// Test 5: Safe clamping (<0 to 0, >112 to 112)
{
  const sim = createCorridorSim();
  seekSim(sim, -10);
  assert.strictEqual(sim.time, 0);
  seekSim(sim, 200);
  assert.strictEqual(sim.time, 112);
}

console.log("[lab_slider_seek.test] all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/lab_slider_seek.test.mjs`
Expected: FAIL with `seekSim is not exported` (SyntaxError or TypeError on import).

- [ ] **Step 3: Write minimal implementation**

```javascript
export function seekSim(sim, targetSec) {
  const target = Math.max(0, Math.min(112, targetSec));
  const currentCycleIndex = Math.floor((sim?.time || 0) / 112);
  sim.time = currentCycleIndex * 112 + target;
  const nodes = [sim.nodes.node1, sim.nodes.node2];
  for (const node of nodes) {
    const inPhase1 = target < node.g1;
    node.phase = inPhase1 ? 1 : 2;
    node.timeRemaining = inPhase1 ? node.g1 - target : Math.max(0, 112 - target);
    node.isYellow = node.timeRemaining <= 3 && node.timeRemaining > 0;
  }
  return sim;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/lab_slider_seek.test.mjs`
Expected: `[lab_slider_seek.test] all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add tests/lab_slider_seek.test.mjs src/lib/corridorSim.js
git commit -m "feat(sim): extract and standardize cycle-preserving seekSim with unit tests"
```

### Task 2: Widen Scrubber Hitbox CSS

**Files:**
- Modify: `src/index.css` (`.transport-scrubber` block ~40-78)

**Interfaces:**
- Consumes: `input.transport-scrubber[type=range]` in `LabTransportBar.jsx`, `ReplayControls.jsx`, `JunctionInspector.jsx` (shared class — change benefits all three).
- Produces: 20px transparent click target, visible 4px `#1e293b` track, centered 12x18px sky thumb.

- [ ] **Step 1: Write the CSS**

```css
/* Transport scrubber: 20px clickable target, 4px track, centered glowing sky thumb */
.transport-scrubber {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  background: transparent;
  outline: none;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.transport-scrubber::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #1e293b;
}

.transport-scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 18px;
  margin-top: -7px; /* Center 18px thumb on 4px track: (4 - 18) / 2 */
  border-radius: 4px;
  background: #38bdf8;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.55);
  cursor: ew-resize;
}

.transport-scrubber::-moz-range-track {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #1e293b;
}

.transport-scrubber::-moz-range-thumb {
  width: 12px;
  height: 18px;
  border-radius: 4px;
  background: #38bdf8;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.55);
  cursor: ew-resize;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style(css): widen scrubber click target to 20px and center thumb"
```

### Task 3: Simplify `CycleScrubber` + Render Stepper Controls

**Files:**
- Modify: `src/components/LabTransportBar.jsx` (`CycleScrubber` ~87-133, stepper branch ~342-350)

**Interfaces:**
- Consumes: props `simTime, onSeek, onPause, simMode, currentStep, onSetStep, onPrevStep, onNextStep, isAutoStepping, onToggleAutoStep, subPhase` (all already passed via `{...props}` from `LabControlBar`; no prop plumbing changes).
- Produces: Instant-seek slider in continuous mode; `StepperControls` + `StepperBreadcrumbs` in stepper mode.

- [ ] **Step 1: Rewrite `CycleScrubber` (drop drag-buffer + pointer capture)**

```jsx
export function CycleScrubber({ simTime = 0, onSeek, onPause }) {
  const currentSec = Math.min(112, Math.max(0, Math.round((simTime || 0) % 112)));
  return (
    <div>
      <input
        type="range"
        min={0}
        max={112}
        value={currentSec}
        onChange={(e) => onSeek?.(Number(e.target.value))}
        onPointerDown={() => onPause?.()}
        className="transport-scrubber mt-2"
        aria-label="Thời gian chu kỳ"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-slate-600">
        {TICKS.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render stepper controls in the stepper branch**

```jsx
      {simMode === "stepper" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1e293b] bg-slate-900/60 px-3 py-2 text-xs">
          <StepperControls
            currentStep={props.currentStep}
            onSetStep={props.onSetStep}
            onPrevStep={props.onPrevStep}
            onNextStep={props.onNextStep}
            isAutoStepping={props.isAutoStepping}
            onToggleAutoStep={props.onToggleAutoStep}
            subPhase={props.subPhase}
          />
          <StepperBreadcrumbs currentStep={props.currentStep} onSetStep={props.onSetStep} />
        </div>
      ) : (
        <ContinuousControls {...props} />
      )}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/LabTransportBar.jsx
git commit -m "feat(lab): enable instant scrubber seek and render stepper controls in transport bar"
```

### Task 4: Rewire `AlgorithmLab.jsx` + Full Verification

**Files:**
- Modify: `src/components/AlgorithmLab.jsx` (import block, delete local `seekSim` ~93-104, `handleStepBack`/`handleSeek` ~133-140)

**Interfaces:**
- Consumes: `seekSim` from `./lib/corridorSim.js` (Task 1), `sync` closure.
- Produces: `handleSeek`/`handleStepBack` delegating to shared cycle-preserving `seekSim`; no duplicate local definition.

- [ ] **Step 1: Import shared `seekSim`, delete local duplicate, make step-back cycle-safe**

```javascript
    handleStepBack: () => {
      const currentSec = (simRef.current?.time ?? 0) % 112;
      seekSim(simRef.current, Math.max(0, currentSec - 10));
      sync();
    },
    handleSeek: (targetSec) => {
      seekSim(simRef.current, targetSec);
      sync();
    },
```

- [ ] **Step 2: Run all 22 test suites**

Run: `node tests/lab_slider_seek.test.mjs` then each of the 21 existing `node tests/*.test.mjs`
Expected: 22/22 print "all assertions passed".

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/AlgorithmLab.jsx
git commit -m "fix(lab): integrate standardized seekSim and cycle-safe step back"
```
