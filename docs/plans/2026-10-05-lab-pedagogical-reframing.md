# Lab Pedagogical Reframing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the Algorithm Lab copy from heroic overselling to honest, paper-grounded technical language: a 2-column Sim-vs-Real card in Step 1, subscript annotations for model constants (150 m², 0.70, 2.5), a physical-capacity note in Step 4, and a 3-bullet WhyBox matching Table 1 of the paper.

**Architecture:** Presentation-only edits inside `src/components/LabAnalysisPanel.jsx` (Step1Math, PhaseCard, Step2Math, Step3Math, Step4Math, WhyBoxMessage, ParadoxNote replacement) plus one Vietnamese diacritics fix in `src/components/Corridor3DCanvas.jsx`. Zero changes to simulation, math, or algorithm logic.

**Tech Stack:** React 19, Tailwind CSS v4, Node built-in test runner (`node:assert`).

**Spec:** The paper `samplepaper.txt` (Table 1, Section 4.3, Section 5 Threats to Validity): delay reduction 6.01% (Low) / 11.90% (Medium), throughput non-inferiority ±2%, VDZ 150 m, turn ratio 70/15/15, c_l,m = 2.5, network plateau ~17,800 veh/2h.

## Global Constraints

- No new npm dependencies.
- Zero changes to `src/lib/corridorSim.js` and `src/lib/cbmp.js` (no algorithm, simulation, or formula changes).
- All 21 existing test suites must keep passing.
- No emotive/absolutist wording anywhere ("vượt trội", "thần thánh", "đúng 100%", "mù hoàn toàn", "miễn nhiễm").
- Vietnamese strings use real UTF-8 characters directly, never `\uXXXX` escapes.
- Functions under 50 lines, nesting under 4 levels, early returns.
- Verification for copy tasks: full 21-suite run + `npm run build` exit 0 (no meaningful unit test exists for label strings).

---

## File Structure

- Modify `src/components/LabAnalysisPanel.jsx`:
  - Replace `ParadoxNote` long paragraph with `SimVsRealComparison` 2-column card; update `Step1Math` pills (drop "Đúng 100%").
  - Add subscript caption lines for `150` (PhaseCard), `0.70` (Step2Math), `2.5` (Step3Math).
  - Add physical-capacity note line in `Step4Math`.
  - Rewrite `WhyBoxMessage` into 3 concise technical bullets (baseline + CAO branches).
- Modify `src/components/Corridor3DCanvas.jsx`:
  - `buildStep2Overlay`: `paintBoard(board, "Doi nguoc ha luu", ...)` → `"Dội ngược hạ lưu"`.

---

### Task 1: Sim-vs-Real card in Step 1 + Step 4 capacity note

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx` (ParadoxNote region ~316-323, Step1Math pills ~359-370, Step4Math ~500-522)

**Interfaces:**
- Consumes: existing `Step1Math({ data })` props (`data.occlusionP2.visibleCount/lossPercentage`, `phiIn2`) and `Step4Math({ data })` props. No signature changes.
- Produces: exported `SimVsRealComparison` component; `ParadoxNote` may be removed only if grep proves zero external importers, otherwise keep it exported but unused by Step1Math.

- [ ] **Step 1: Replace `ParadoxNote` usage with `SimVsRealComparison`**

Add this component (keep it under 50 lines) and render it in `Step1Math` where `<ParadoxNote p1Area={p1Area} />` currently sits:

```jsx
export function SimVsRealComparison() {
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px] leading-relaxed font-mono">
      <div className="rounded-lg border border-[#1e293b] bg-slate-950/70 p-2.5">
        <div className="font-bold text-sky-300">🎮 Trong mô phỏng (GAMA)</div>
        <div className="mt-1 text-slate-300">• Baseline đếm xe lý tưởng (100%)</div>
        <div className="text-slate-400">• CAO tối ưu theo diện tích chiếm dụng (m²)</div>
      </div>
      <div className="rounded-lg border border-[#1e293b] bg-slate-950/70 p-2.5">
        <div className="font-bold text-amber-300">📷 Ngoài thực tế (CCTV)</div>
        <div className="mt-1 text-slate-300">• Bbox bị che khuất hụt 35–50% xe máy</div>
        <div className="text-slate-400">• CAO đo mặt đường, bền vững góc quay</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Fix the occlusion pills in `Step1Math`**

Replace the two pill spans so neither claims perfection:

```jsx
<span className="rounded-md bg-rose-500/15 px-2 py-1 font-bold tabular-nums text-rose-300">
  Camera Bbox (Góc nghiêng): ~{data?.occlusionP2?.visibleCount} xe (Hụt ~{data?.occlusionP2?.lossPercentage}% do che khuất)
</span>
<span className="rounded-md bg-emerald-500/15 px-2 py-1 font-bold tabular-nums text-emerald-300">
  Độ đo không gian (CAO): φ = {phiIn2}
</span>
```

Grep for remaining absolutist strings afterwards: `rg "Đúng 100%|mù hoàn toàn|miễn nhiễm|vượt trội" src/components/LabAnalysisPanel.jsx` must return zero matches.

- [ ] **Step 3: Add the physical-capacity note in `Step4Math`**

Directly below the cycle-allocation bar block (the `flex h-3` bar div), insert:

```jsx
<div className="mt-2 text-[11px] font-mono text-slate-500 leading-relaxed">
  ℹ️ Giới hạn vật lý: Thuật toán chỉ tái phân bổ 92s khả dụng giữa các hướng; khi lưu lượng bão hòa toàn mạng (v/c ≥ 1.0), thông lượng chạm trần vật lý (~17.800 xe/2h theo Table 1).
</div>
```

- [ ] **Step 4: Verify**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — expect 21/21 PASS.
Run: `npm run build` — expect exit 0.
Run: `rg "Đúng 100%|mù hoàn toàn|miễn nhiễm" src/components/LabAnalysisPanel.jsx` — expect zero matches.

- [ ] **Step 5: Commit**

```bash
git add src/components/LabAnalysisPanel.jsx
git commit -m "style(lab): reframe Step 1 sim-vs-real comparison and add Step 4 physical capacity note"
```

---

### Task 2: Annotate model constants (150 m², 0.70, 2.5)

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx` (`PhaseCard` ~293-314, `Step2Math` formula block ~416-422, `Step3Math` gamma block ~452-465)

**Interfaces:**
- Consumes: existing props of `PhaseCard`, `Step2Math`, `Step3Math`. No signature changes.

- [ ] **Step 1: Annotate `150` in `PhaseCard`**

Inside the phi display div, append a subscript caption (keep the existing `phiLabel`/`phiValue` rendering byte-identical):

```jsx
<div className="mt-1 text-xs text-cyan-300">
  {phiLabel} = <strong className="text-cyan-400">{phiValue}</strong>
  <span className="block text-[10px] text-slate-500 font-sans mt-0.5">
    * 150 m²: Diện tích vùng phát hiện chuẩn của camera (30m × 5m)
  </span>
</div>
```

- [ ] **Step 2: Annotate `0.70` in `Step2Math`**

Below `<div className="mt-1 text-slate-300 text-sm">w₁ = max(0, φ_in - 0.70 × φ_out)</div>` add:

```jsx
<div className="text-[10px] text-slate-500 font-sans mt-0.5">
  * 0.70: Tỷ lệ xe đi thẳng vào hành lang nối (Turn ratio R_m,p = 70%)
</div>
```

- [ ] **Step 3: Annotate `2.5` in `Step3Math`**

Below `<div className="mt-1 text-slate-300 text-sm">γ = 2.5 × w</div>` add:

```jsx
<div className="text-[10px] text-slate-500 font-sans mt-0.5">
  * 2.5: Hệ số dòng bão hòa tương đối của giao lộ (c_l,m = 2.5, Eq. 4)
</div>
```

- [ ] **Step 4: Verify**

Run: `npm run build` — expect exit 0.
Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — expect 21/21 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LabAnalysisPanel.jsx
git commit -m "style(lab): add mathematical annotations for model constants"
```

---

### Task 3: Streamline WhyBox into 3 bullets + fix 3D Vietnamese text

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx` (`WhyBoxMessage` ~236-267)
- Modify: `src/components/Corridor3DCanvas.jsx` (`buildStep2Overlay` paintBoard line)

**Interfaces:**
- Consumes: `WhyBoxMessage({ algo, isBackpressure, phiCorridor, n1P1, n1P2, activeScenario })` — keep the prop list identical (parent `LabWhyBox` passes all of them); unused props inside the new body are acceptable but prefer using `algo` only for the branch and dropping references to the rest. Do NOT change `LabWhyBox`.
- Produces: 3-bullet technical copy matching paper Table 1 numbers (6.01% low, 11.90% medium, ±2% throughput band).

- [ ] **Step 1: Rewrite `WhyBoxMessage`**

Replace the whole function body with:

```jsx
function WhyBoxMessage({ algo }) {
  if (algo === "baseline") {
    return (
      <div className="space-y-1.5 text-xs text-slate-300">
        <div>• <strong>Đếm xe truyền thống:</strong> Mỗi phương tiện tính trọng số 1.0 bất kể kích thước thực tế (xe tải 18 m² ngang với xe máy 1.5 m²).</div>
        <div>• <strong>Đặc tính nhận diện:</strong> Phụ thuộc hoàn toàn vào số lượng Bounding Box phát hiện được; dễ chịu ảnh hưởng bởi che khuất dưới góc camera nghiêng.</div>
        <div>• <strong>Phạm vi điều tiết:</strong> Phân bổ pha độc lập, không khấu trừ áp lực dội ngược từ đoạn nối hạ lưu.</div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-xs text-slate-300">
      <div>• <strong>Trọng số không gian (CAO):</strong> Quy đổi 1 xe tải (18 m²) ≈ 12 xe máy (1.5 m²) giúp cân bằng áp lực không gian thực tế hơn so với đếm đầu xe.</div>
      <div>• <strong>Hiệu quả mô phỏng (Table 1):</strong> Giảm trễ trung bình 6.01% (tải thấp) và 11.90% (tải vừa); thông lượng toàn mạng bảo toàn tương đương (±2%).</div>
      <div>• <strong>Phối hợp liên nút (Eq. 3):</strong> Tự động điều tiết giảm xanh Nút 1 khi hành lang nối đạt ngưỡng nghẽn (φ_corridor ≥ 70%) nhằm giảm nguy cơ tắc nghẽn dây chuyền.</div>
    </div>
  );
}
```

Note: the old body had 4 branches (baseline / backpressure / paradox / default). The new body has 2 (baseline / CAO). This is intentional: the backpressure and paradox explanations now live where they belong — Step 2's `BackpressureCauseEffect` + alert and Step 1's `SimVsRealComparison`. Verify `BackpressureCauseEffect` and the Step-2 alert blocks are untouched.

- [ ] **Step 2: Fix the 3D board text**

In `src/components/Corridor3DCanvas.jsx`, in `buildStep2Overlay`, change:

```javascript
paintBoard(board, "Doi nguoc ha luu", "#ef4444");
```

to:

```javascript
paintBoard(board, "Dội ngược hạ lưu", "#ef4444");
```

- [ ] **Step 3: Verify**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }` — expect 21/21 PASS.
Run: `npm run build` — expect exit 0.
Run: `rg "Đúng 100%|mù hoàn toàn|miễn nhiễm|vượt trội|thần thánh" src/components/LabAnalysisPanel.jsx src/components/Corridor3DCanvas.jsx` — expect zero matches.

- [ ] **Step 4: Commit**

```bash
git add src/components/LabAnalysisPanel.jsx src/components/Corridor3DCanvas.jsx
git commit -m "style(lab): streamline why-box into technical bullet points and fix 3d text"
```

---

### Task 4: Full regression and wording sweep

- [ ] **Step 1: Full suite**

Run: `Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }`
Expected: 21/21 PASS, exit code 0.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 3: Wording + hygiene sweep**

Run: `rg "Đúng 100%|mù hoàn toàn|miễn nhiễm|vượt trội|thần thánh" src/` — expect zero matches.
Run: `rg "console\.log" src/components/LabAnalysisPanel.jsx src/components/Corridor3DCanvas.jsx` — expect zero matches.

---

## Self-Review

- Spec coverage: Sim-vs-Real card (Task 1), constant annotations (Task 2), WhyBox bullets + 3D text (Task 3), regression (Task 4). All four agreed points covered.
- Placeholder scan: every step has exact code, commands, and expected outputs. No TBD/TODO.
- Type consistency: no prop signature changes except none at all — `WhyBoxMessage` keeps its full prop list, `Step1Math`/`Step4Math`/`PhaseCard` unchanged.
