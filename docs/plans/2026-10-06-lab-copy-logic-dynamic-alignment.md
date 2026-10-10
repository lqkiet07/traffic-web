# Algorithm Lab Copy & Logic Dynamic Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Động hóa toàn bộ các câu chữ nhận định và cảnh báo trong Stepper (`LabAnalysisPanel.jsx`) theo đúng số liệu tính toán thực tế của từng Nút (Nút 1 vs Nút 2) và từng kịch bản, chấm dứt hoàn toàn hiện tượng câu chữ hardcode mâu thuẫn với số liệu (như "Hụt 50%" khi đếm đủ 100%, "thấy P2 trội" khi P1 đạt 100%, "Cắt xanh sớm" khi đã cấp tối đa 102s).

**Architecture:** 
1. Động hóa tỷ lệ mất mát trong `DilationPipelineVisual`: tính `lossPct = Math.round(((raw - vis)/raw)*100)` để hiển thị đúng `(Hụt ~X%)` hoặc `(Đủ 100%)`.
2. Truyền `approachName` vào `Step2Math` thông qua `StepMathContent`: hiển thị đúng tên nhánh hướng vào (`Hành lang Nối` ở Nút 2 thay vì luôn in `Nhánh Tây`).
3. Động hóa nhận định áp lực cạnh tranh trong `Step3Math`: chỉ nhận định "Baseline thấy P2 trội" khi $w_{count1} < w_{count2}$ và $w_{area1} \ge w_{area2}$; khi P1 chiếm ưu thế ($\ge 50\%$), hiển thị nhận định đồng thuận hoặc tỷ lệ áp lực thực tế.
4. Động hóa cảnh báo cấp thời lượng trong `Step4Math`: chỉ cảnh báo "Cắt xanh sớm" khi $g_{1}^{base} < g_{1}^{cao}$; khi $g_{1}^{base} \ge g_{1}^{cao}$ (như Nút 2 cấp tối đa $102\text{s}$), hiển thị trạng thái tối ưu tương ứng.

**Tech Stack:** React 19, Vite 6, Tailwind CSS 4, Node.js assert test runner.

**Spec:** Systematic Debugging Phase 1 & 2 phát hiện qua ảnh chụp màn hình và duyệt dữ liệu Nút 2 trong Stepper.

## Global Constraints
- **Phạm vi cô lập:** Chỉ chỉnh sửa duy nhất `src/components/LabAnalysisPanel.jsx`, không đụng chạm bất kỳ file nào khác.
- Toàn bộ 23/23 test suites hiện có phải PASS sau mỗi commit.
- Giữ nguyên design tokens (`#090d16`, `#0f172a`, `#1e293b`, `#38bdf8`, `#10b981`, `#f59e0b`, `#f43f5e`).
- Không thêm comment paraphrase hiển nhiên trong code.

---

### Task 1: Động Hóa Tỷ Lệ Mất Mát Trong `DilationPipelineVisual` & Tên Nhánh `Step2Math`

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx:330-345` (`DilationPipelineVisual`)
- Modify: `src/components/LabAnalysisPanel.jsx:420-445` (`Step2Math`)
- Modify: `src/components/LabAnalysisPanel.jsx:665-675` (`StepMathContent`)

**Interfaces:**
- Consumes: `visCount`, `rawCount`, `data.approachName`.
- Produces: 
  - `DilationPipelineVisual`: khi `visCount === rawCount` hiển thị `(Đủ 100%)`, khi hụt hiển thị `(Hụt ~${lossPct}%)`.
  - `Step2Math`: hiển thị `Áp lực hướng vào (${approachName}):` (Nút 1: Nhánh Tây, Nút 2: Hành lang Nối).

- [ ] **Step 1: Động hóa `DilationPipelineVisual` và truyền `approachName`**
- [ ] **Step 2: Kiểm tra build Vite**
- [ ] **Step 3: Commit**

### Task 2: Động Hóa Nhận Định Áp Lực Cạnh Tranh Trong `Step3Math`

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx:520-550` (`Step3Math`)

**Interfaces:**
- Consumes: `wC1Num`, `wC2Num`, `wA1Num`, `wA2Num`, `ratioC1`, `ratio1`, `gC1`, `totalC`.
- Produces: Nhận định toán học chuẩn xác theo đúng giá trị so sánh của từng Nút.

- [ ] **Step 1: Cập nhật câu chữ đối chiếu động trong `Step3Math`**
- [ ] **Step 2: Kiểm tra build Vite**
- [ ] **Step 3: Commit**

### Task 3: Động Hóa Cảnh Báo Cấp Xanh Trong `Step4Math` & Kiểm Thử Toàn Diện

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx:550-580` (`Step4Math`)

**Interfaces:**
- Consumes: `bG1` (Baseline g1) và `cG1` (CAO g1).
- Produces: Chỉ hiển thị `⚠️ Cắt xanh sớm` khi `bG1 < cG1`; khi `bG1 === cG1` hiển thị `✓ Cấp thời lượng tương đương CAO`.

- [ ] **Step 1: Cập nhật banner trạng thái động trong `Step4Math`**
- [ ] **Step 2: Chạy toàn bộ 23 Test Suites**
- [ ] **Step 3: Chạy build production**
- [ ] **Step 4: Commit**
