# Algorithm Lab Complete Physics & Transport Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix decisively all slider-related defects in the Algorithm Lab: (1) scrub moves vehicles in real physics instead of freezing them; (2) auto-resume playback on slider release; (3) fix `corridor_jam` logic so Node 1 truly squeezes to 10s; (4) remove PCE-trap text remnants and dedup stepper controls.

**Architecture:**
1. Upgrade `seekSim` in `corridorSim.js`: snapshot preset vehicle list (`sim.initialVehicles`), on seek fast-forward physics to `targetSec` (<0.5ms) reusing original vehicle IDs so Three.js reuses meshes (zero GC, zero mesh creation).
2. Add `wasPlayingRef` mechanism in `LabTransportBar.jsx` & `AlgorithmLab.jsx`: release-to-resume if previously playing; smooth arrow-key seeking.
3. Add Phase-2 cross-traffic to `corridor_jam` so gamma2 > 0, triggering exact g1 = 10s (squeezed) and g2 = 102s (fully open).
4. Replace PCE text at line 248 `LabAnalysisPanel.jsx` with CAO area-measurement copy resistant to mutual occlusion; collapse transport-bar stepper branch into a sync banner.

**Tech Stack:** React 19, Three.js 0.186, Vite 6, Tailwind CSS 4, Node.js assert test runner.

**Spec:** Systematic-debugging Phase 1 & 2 findings; `samplepaper (6).pdf` Table 1; Three.js `syncVehicles` mesh-reuse constraints.

## Global Constraints
- Do NOT revert unrelated in-progress files (~26 modified files and `vid/` untracked); stage only task files per commit.
- All 22/22 test suites must PASS after every commit.
- Keep design tokens (`#090d16`, `#0f172a`, `#1e293b`, `#38bdf8`, `#10b981`).
- No redundant paraphrase comments in code.

---

### Task 1: Real Vehicle Motion on Seek (`src/lib/corridorSim.js`)

**Files:**
- Modify: `src/lib/corridorSim.js` (`seekSim`)
- Modify: `tests/lab_slider_seek.test.mjs`

**Interfaces:**
- Consumes: `sim.initialVehicles`, `updateCorridorSim(sim, dt)`.
- Produces: `seekSim(sim, targetSec)` syncs clock, signals AND `sim.vehicles` coordinates (preserves original IDs, creates no new Three.js meshes).

- [ ] **Step 1: Write vehicle-motion test in `tests/lab_slider_seek.test.mjs`**

```javascript
// Test 6: Vehicles advance along with time when seeking
{
  const sim = createCorridorSim();
  spawnVehicle(sim, { approach: "west", type: "moto", x: 100, y: 170 });
  const startX = sim.vehicles[0].x;
  sim.initialVehicles = sim.vehicles.map((v) => ({ ...v }));

  seekSim(sim, 2);
  assert.strictEqual(sim.time, 2);
  assert.ok(
    sim.vehicles[0].x > startX,
    `Vehicle should advance forward during seek (start: ${startX}, after: ${sim.vehicles[0].x})`
  );
  assert.strictEqual(sim.vehicles[0].id, 1, "Vehicle ID must be preserved to prevent Three.js mesh churn");
}
```

- [ ] **Step 2: Run test to confirm FAIL**

Run: `node tests/lab_slider_seek.test.mjs`
Expected: FAIL because `sim.vehicles[0].x` currently never changes on seek.

- [ ] **Step 3: Implement ID-preserving fast-forward in `seekSim`**

```javascript
export function seekSim(sim, targetSec) {
  const target = Math.max(0, Math.min(112, targetSec));
  const currentCycleIndex = Math.floor((sim?.time || 0) / 112);
  sim.time = currentCycleIndex * 112 + target;

  // Restore initial vehicles with preserved IDs to avoid Three.js mesh churn
  if (sim.initialVehicles && sim.initialVehicles.length > 0) {
    sim.vehicles = sim.initialVehicles.map((v) => ({ ...v }));
    // Reset nodes to cycle start
    for (const node of [sim.nodes.node1, sim.nodes.node2]) {
      node.phase = 1;
      node.timer = 0;
      node.timeRemaining = node.g1;
      node.isYellow = false;
    }
    // Fast-forward physics to target (takes < 0.5ms)
    const dt = 0.2;
    const steps = Math.round(target / dt);
    const origAutoSpawn = sim.autoSpawn;
    sim.autoSpawn = false; // suspend random generation during seek
    for (let i = 0; i < steps; i++) {
      updateCorridorSim(sim, dt);
    }
    sim.autoSpawn = origAutoSpawn;
  }

  // Ensure exact time and signal sync at target point
  sim.time = currentCycleIndex * 112 + target;
  for (const node of [sim.nodes.node1, sim.nodes.node2]) {
    const inPhase1 = target < node.g1;
    node.phase = inPhase1 ? 1 : 2;
    node.timeRemaining = inPhase1 ? node.g1 - target : Math.max(0, 112 - target);
    node.isYellow = node.timeRemaining <= 3 && node.timeRemaining > 0;
  }
  return sim;
}
```

- [ ] **Step 4: Run test to confirm PASS**

Run: `node tests/lab_slider_seek.test.mjs`
Expected: `[lab_slider_seek.test] all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add tests/lab_slider_seek.test.mjs src/lib/corridorSim.js
git commit -m "feat(sim): enable instant vehicle position scrub in seekSim without mesh churn"
```

### Task 2: Auto-Resume Playback on Release (`src/components/LabTransportBar.jsx` & `AlgorithmLab.jsx`)

**Files:**
- Modify: `src/components/LabTransportBar.jsx` (`CycleScrubber`)
- Modify: `src/components/AlgorithmLab.jsx` (`useLabSim` & `applyPresetVehicles`)

**Interfaces:**
- Consumes: `isPlaying`, `setIsPlaying`.
- Produces: `onSeekStart` pauses and records `wasPlaying`, `onSeekEnd` resumes if previously playing.

- [ ] **Step 1: Record `initialVehicles` in `applyPresetVehicles`**

```javascript
  sim.initialVehicles = sim.vehicles.map((v) => ({ ...v }));
```

- [ ] **Step 2: Update `CycleScrubber` with `onSeekStart` / `onSeekEnd`**

```jsx
export function CycleScrubber({ simTime = 0, onSeek, onSeekStart, onSeekEnd }) {
  const currentSec = Math.min(112, Math.max(0, Math.round((simTime || 0) % 112)));
  return (
    <div>
      <input
        type="range"
        min={0}
        max={112}
        value={currentSec}
        onChange={(e) => onSeek?.(Number(e.target.value))}
        onPointerDown={() => onSeekStart?.()}
        onPointerUp={() => onSeekEnd?.()}
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

- [ ] **Step 3: Manage `wasPlayingRef` in `AlgorithmLab.jsx`**

```javascript
  const wasPlayingRef = useRef(false);
  const handleSeekStart = () => {
    wasPlayingRef.current = isPlaying;
    setIsPlaying(false);
  };
  const handleSeekEnd = () => {
    if (wasPlayingRef.current) {
      setIsPlaying(true);
    }
  };
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/LabTransportBar.jsx src/components/AlgorithmLab.jsx
git commit -m "feat(lab): resume playback on scrubber release and record initial vehicles"
```

### Task 3: Trigger Correct Green Squeeze in `corridor_jam`

**Files:**
- Modify: `src/components/AlgorithmLab.jsx` (`applyPresetVehicles` `corridor_jam` branch)
- Modify: `tests/algorithm_lab_presets.test.mjs`

**Interfaces:**
- Consumes: `recalculateNode(sim, 1)` with corridor backpressure phi >= 0.70.
- Produces: Node 1 g1 = 10s (fully squeezed), Node 2 g1 = 102s (fully open to flush).

- [ ] **Step 1: Write squeeze test in `tests/algorithm_lab_presets.test.mjs`**

```javascript
// Check corridor_jam scenario: high corridor occupancy, Node 1 squeezed to 10s, Node 2 opened to 102s
{
  const sim = createCorridorSim({ algo: "cao" });
  applyPreset(sim, "corridor_jam");
  const telemetry = getCorridorTelemetry(sim);

  assert.ok(telemetry.phiCorridor >= 0.7, `phiCorridor should be >= 0.7 (got ${telemetry.phiCorridor})`);
  assert.strictEqual(sim.nodes.node1.g1, 10, "Node 1 must be squeezed to min green (10s) by backpressure");
  assert.strictEqual(sim.nodes.node2.g1, 102, "Node 2 should give max green (102s) to flush the jammed corridor");
}
```

- [ ] **Step 2: Run test to confirm FAIL**

Run: `node tests/algorithm_lab_presets.test.mjs`
Expected: FAIL because Node 1 currently returns 56s instead of 10s.

- [ ] **Step 3: Add Phase-2 cross-traffic to `corridor_jam`**

```javascript
  } else if (targetKey === "corridor_jam") {
    // Corridor trucks: 6 trucks saturate corridor link (phi >= 0.70)
    for (let i = 0; i < 6; i++) spawnVehicle(sim, { approach: "corridor", type: "truck", x: 500 - i * 42, y: 170 });
    // West inflow cars suppressed by downstream blockage
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "west", type: "car", x: 170 - i * 36, y: 170 });
    // North1 cross-traffic ensures Phase 2 has active demand so Node 1 cuts Phase 1 to 10s
    for (let i = 0; i < 4; i++) spawnVehicle(sim, { approach: "north1", type: "car", y: 120 - i * 25 });
  }
```

Mirror the same spawn in the test helper `applyPreset`.

- [ ] **Step 4: Run test to confirm PASS**

Run: `node tests/algorithm_lab_presets.test.mjs`
Expected: `[algorithm_lab_presets.test] all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/AlgorithmLab.jsx tests/algorithm_lab_presets.test.mjs
git commit -m "fix(sim): activate node 1 green squeeze to 10s under corridor jam"
```

### Task 4: Remove PCE Remnant & Deduplicate Stepper UI

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx:248`
- Modify: `src/components/LabTransportBar.jsx:315-325`

**Interfaces:**
- Produces: Paper-accurate academic copy with zero "1 truck = 12 motos" wording; no duplicated stepper buttons.

- [ ] **Step 1: Update line 248 `src/components/LabAnalysisPanel.jsx`**

Replace:
```jsx
<div>• <strong>Trọng số không gian (CAO):</strong> Quy đổi 1 xe tải (18 m²) ≈ 12 xe máy (1.5 m²) giúp cân bằng áp lực không gian thực tế hơn so với đếm đầu xe.</div>
```
With:
```jsx
<div>• <strong>Độ đo không gian (CAO):</strong> Đo tỷ lệ diện tích mặt đường bị chiếm dụng (φ) thay vì đếm đầu xe rời rạc; chống chịu sai số do che khuất tương hỗ của bầy xe máy dưới góc camera nghiêng.</div>
```

- [ ] **Step 2: Collapse transport stepper branch into sync banner**

```jsx
      {simMode === "stepper" ? (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 bg-slate-900/60 rounded-lg border border-[#1e293b]">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>🔍 Đang ở Bước [{props.currentStep}/5]</span>
          </span>
          <span className="text-cyan-400 font-mono text-[11px]">Điều khiển 5 bước & công thức toán ở cột bên phải 👉</span>
        </div>
      ) : (
        <ContinuousControls {...props} />
      )}
```

- [ ] **Step 3: Run all 22 suites & production build**

Run all `node tests/*.test.mjs` (22 files) then `npm run build`.
Expected: 22/22 print "all assertions passed", build exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/LabAnalysisPanel.jsx src/components/LabTransportBar.jsx
git commit -m "style(lab): remove legacy PCE text and clean up duplicate stepper bar"
```

---

### Task 5 (ad-hoc, found by browser smoke test): Kill Poisoned-g1 Chain Across Repeated Seeks

**Files:**
- Modify: `src/lib/corridorSim.js` (`seekSim` only)
- Modify: `tests/lab_slider_seek.test.mjs` (append Test 7 only)

**Interfaces:**
- Consumes: `recalculateNode` (same module).
- Produces: Deterministic seek — every seek to the same target from the same snapshot yields the identical vehicle set, regardless of intervening `sync()` replans or playback phase flips.

**Root cause:** `seekSim` reset `node.timeRemaining = node.g1` from the LIVE g1, but `sync()`/playback rewrites g1 from the depleted post-seek set (64→10). The next seek fast-forwarded under poisoned g1=10, flipped phase mid-FF, evacuated the network (seek 80 → seek 31 read 0 instead of 18).

- [ ] **Step 1: Append Test 7** (44-vehicle paradox spawn + snapshot, seek(31)→18, recalc→g1=10, re-seek(31)→18 + phase 1; needs `recalculateNode` import).
- [ ] **Step 2: RED** — second seek reads 0.
- [ ] **Step 3: Fix** — after vehicle/throughput restore, before node-reset loop, insert `recalculateNode(sim, 1); recalculateNode(sim, 2);` so the FF always runs under splits recomputed from restored full demand.
- [ ] **Step 4: GREEN** — 7/7 seek tests + stepper/presets/corridor_sim regressions PASS.
- [ ] **Step 5: Commit** — `fix(sim): replan splits from restored demand before seek fast-forward`.

**Rulings log (coordinator):**
- Ruling A (Task 1): `seekSim` stays 2-param; plan's `activeScenario` third param was a doc slip.
- Ruling B (Task 1): snapshot/restore `sim.throughput` (`initialThroughput`) to stop repeated-scrub metric inflation.
- Post-seek `rem/g` drift from `sync()` replanning matches pre-existing spawn-interaction behavior — out of scope, not a defect.
