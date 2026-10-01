# Deadcode Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xoa 3 file chet (SignalBeacon.jsx, flow.js, flow_phase.test.mjs), zero thay doi runtime replay.

**Architecture:** Xoa file + verify khong con importer. Khong sua data.js, MapView.jsx, RealisticSignalPole.jsx. File chet von khong duoc import nen bundle khong doi.

**Tech Stack:** React 19 + Vite 6, Leaflet, Node assert tests (.mjs).

**Spec:** HANDOFF.md:57,60 + HANDOFF-REPLAY-MODULE-2026-09-30.md:30,60-61 (dinh nghia deadcode).

## Global Constraints

- Every function <= 50 lines.
- Nesting <= 4 levels.
- English-only comments, no console.log.
- Verification before completion: fresh build + unit-test evidence required.
- NEVER commit unless explicitly asked.
- Tuyet doi khong cham src/lib/data.js (phaseCountdown/poleSignal/activePhase con duoc signals.test.mjs:47 assert).

---

## File Structure

| File | Trach nhiem | Hanh dong |
|---|---|---|
| src/components/SignalBeacon.jsx (47 dong) | Beacon cu, da thay bang RealisticSignalPole.jsx (MapView.jsx:6) | Xoa |
| src/lib/flow.js (27 dong) | inferPhaseFromFlow, override da go khoi getGamaSignal | Xoa |
| tests/flow_phase.test.mjs (25 dong) | Test duy nhat import flow.js | Xoa cung flow.js |

Zero importer da verify: rg chi hit 3 file tren + dong lich su trong HANDOFF*.md (bo qua).

---

### Task 1: Xoa SignalBeacon.jsx

**Files:**
- Delete: src/components/SignalBeacon.jsx
- Verify: src/components/MapView.jsx, src/components/RealisticSignalPole.jsx (read-only, khong sua)

**Interfaces:**
- Consumes: Khong co (0 importer).
- Produces: Khong co.

- [ ] **Step 1: Verify zero importer truoc xoa**

Run: rg -n "SignalBeacon" src tests
Expected: 1 hit duy nhat src/components/SignalBeacon.jsx:8 (dinh nghia). MapView.jsx import RealisticSignalPole.jsx, khong import SignalBeacon.

- [ ] **Step 2: Xoa file**

Run: del src\components\SignalBeacon.jsx
Expected: file bien mat, git status hien deleted.

- [ ] **Step 3: Verify sau xoa**

Run: rg -n "SignalBeacon" src tests
Expected: 0 hit trong src/ + tests/ (bo qua HANDOFF*.md).

---

### Task 2: Xoa cap flow.js + flow_phase.test.mjs

**Files:**
- Delete: src/lib/flow.js
- Delete: tests/flow_phase.test.mjs

**Interfaces:**
- Consumes: Khong co (flow.js chi duoc flow_phase.test.mjs:2 import; khong file src/ nao import).
- Produces: Khong co.

- [ ] **Step 1: Verify cap chet cung nhau**

Run: rg -n "inferPhaseFromFlow|lib/flow" src tests
Expected: chi 2 file src/lib/flow.js:10 + tests/flow_phase.test.mjs. Khong hit trong src/lib/data.js, VehicleCanvas.jsx, MapView.jsx.

- [ ] **Step 2: Xoa ca cap (khong xoa le)**

Run: del src\lib\flow.js tests\flow_phase.test.mjs
Expected: ca 2 file bien mat. Ly do xoa cap: xoa flow.js ma giu test -> test crash import; xoa test ma giu flow.js -> de lai deadcode.

- [ ] **Step 3: Chay 7 tests con lai, ky vong 7/7 PASS**

Run: node tests/scale.test.mjs; node tests/signal_timing.test.mjs; node tests/inspector_cycle.test.mjs; node tests/lane_shift.test.mjs; node tests/declutter.test.mjs; node tests/phase_offset.test.mjs; node tests/signals.test.mjs; node tests/signal_vehicle_alignment.test.mjs
Expected: moi dong all assertions passed, exit 0. Dac biet signals.test van PASS (no assert data.js, khong dinh flow.js).

- [ ] **Step 4: Build, ky vong exit 0**

Run: npm run build
Expected: exit 0, ~7s, bundle ~809-815kB / CSS ~38kB (khong doi vi file chet da bi tree-shake).

- [ ] **Step 5: Mat thuong 2 phut (npm run dev -> localhost:5173)**

Checklist: xe tach lan khong de; bam 1 nut 1 chu ky 112s (xe chay chieu nao den chieu do xanh); tua CK10/20/30 khong lech; pan/zoom muot.

---

## Self-Review

1. Spec coverage: HANDOFF.md:57 (SignalBeacon) -> Task 1; HANDOFF*.md:60 (flow pair) -> Task 2. Khong sot.
2. Placeholder scan: Khong co TBD/TODO. Moi step co lenh copy-paste + expected cu the.
3. Type consistency: Khong doi signature/interface nao. V_INDEX, phaseCountdown, design tokens giu nguyen.

Rui ro: ~0. Rollback: git status + git restore <file> (working tree dang sach, HEAD 69a9aae).
