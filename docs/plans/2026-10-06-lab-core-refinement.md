# Algorithm Lab Core Refinement: Step 1 Freeze, Dilation Visual & Backpressure Formula Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện 3 điểm cốt lõi kỹ thuật duy nhất trong phạm vi Lab Thuật Toán: (1) Đông cứng Bước 1 tức thì ($0.0\text{s}$) để bảo toàn nguyên vẹn $26/26$ xe máy ($A_1 = 39.0\text{ m}^2$) trước vạch dừng; (2) Trực quan hóa mini-pipeline Phép giãn nở hình thái học (*Morphological Dilation $15 \times 15$* theo Hình 1 paper); (3) Chuẩn hóa số liệu khấu trừ áp lực dội ngược trên thanh điều phối theo công thức $R \times \phi_{out}$.

**Architecture:** 
1. Cập nhật `STEPPER_MOTION_DURATIONS[1] = 0.0` trong `corridorSim.js` và `AlgorithmLab.jsx`: Bước 1 đông cứng ngay khi kích hoạt, toàn bộ 26 xe máy giữ nguyên vị trí chờ đèn đỏ trước vạch dừng; cập nhật các test TDD liên quan trong `tests/algorithm_stepper.test.mjs`.
2. Bổ sung component `DilationPipelineVisual` vào `Step1Math` trong `LabAnalysisPanel.jsx`: truyền số liệu động (`visCount`, `rawCount`, `area`, `phi`) thể hiện chuỗi 4 chặng: `YOLOv8 Bbox (Hụt ~50%) → ByteTrack → Dilation 15×15 → Mask diện tích φ (39 m²)`.
3. Sửa phép tính `cut` trên thanh `CorridorCoordinationBar` (`AlgorithmLab.jsx`): hiển thị đúng giá trị khấu trừ áp lực dội ngược theo Eq. 3 ($R \times \phi_{out} = 0.70 \times \phi_{corridor} \approx 50\%$) thay vì hiển thị phần trăm vượt ngưỡng ($2\%$).

**Tech Stack:** React 19, Three.js 0.186, Vite 6, Tailwind CSS 4, Node.js assert test runner.

**Spec:** Toàn văn bài báo `samplepaper (6).pdf` (Mục 3.1 & 3.2, Hình 1, Công thức Eq. 1–3).

## Global Constraints
- **Phạm vi cô lập:** TUYỆT ĐỐI KHÔNG chạm vào bất kỳ file nào ngoài khu vực Lab Thuật Toán (`App.jsx`, `MapViewport.jsx`, `ReplayControls.jsx`, `JunctionInspector.jsx`, `StatCards.jsx`... được giữ nguyên vẹn).
- **Không đưa thông tin định danh thừa:** Loại bỏ hoàn toàn mã đề tài (`THS2026-69`) khỏi giao diện.
- Toàn bộ 23/23 test suites phải PASS sau mỗi commit.
- Giữ nguyên design tokens (`#090d16`, `#0f172a`, `#1e293b`, `#38bdf8`, `#10b981`, `#f59e0b`, `#f43f5e`).
- Không thêm comment paraphrase thừa trong code.

---

### Task 1: Đông Cứng Bước 1 Tức Thì ($0.0\text{s}$) Để Giữ Nguyên 26 Xe Máy Trước Vạch Dừng

**Files:**
- Modify: `src/lib/corridorSim.js:267` (`STEPPER_MOTION_DURATIONS`)
- Modify: `src/components/AlgorithmLab.jsx:160` (`STEP_DURATIONS`)
- Test: `tests/algorithm_stepper.test.mjs:142-155, 211-228, 278-291`

**Interfaces:**
- Consumes: `advanceSimStep(sim, 1)`.
- Produces: `sim.stepper.motionDuration === 0.0`, `sim.stepper.subPhase === "freeze"`. Bầy 26 xe máy không bị lăn bánh qua vạch dừng trong Bước 1, giữ trọn vẹn $A_1 = 39.0\text{ m}^2, \phi_1 = 0.26$.

- [ ] **Step 1: Cập nhật kiểm thử kỳ vọng trong `tests/algorithm_stepper.test.mjs`**
- [ ] **Step 2: Chạy test để xác nhận FAIL**
- [ ] **Step 3: Cập nhật `corridorSim.js` và `AlgorithmLab.jsx`**
- [ ] **Step 4: Chạy test để xác nhận PASS**
- [ ] **Step 5: Commit**

### Task 2: Trực Quan Hóa Pipeline Morphological Dilation $15 \times 15$ (Hình 1 Paper)

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx:330-370` (`Step1Math`)

**Interfaces:**
- Consumes: `visP1`, `rawP1`, `p1Area`, `phiIn1` từ dữ liệu Bước 1.
- Produces: Khối `DilationPipelineVisual` hiển thị trực quan chuỗi 4 chặng chuyển đổi từ Bbox sang Mask diện tích của bài báo.

- [ ] **Step 1: Viết component `DilationPipelineVisual` trong `LabAnalysisPanel.jsx`**
- [ ] **Step 2: Nhúng `DilationPipelineVisual` vào `Step1Math`**
- [ ] **Step 3: Kiểm tra build Vite**
- [ ] **Step 4: Commit**

### Task 3: Chuẩn Hóa Số Liệu Khấu Trừ Dội Ngược Trên Thanh Hành Lang ($R \times \phi_{out}$)

**Files:**
- Modify: `src/components/AlgorithmLab.jsx:409-440` (`CorridorCoordinationBar`)

**Interfaces:**
- Consumes: `telemetry.phiCorridor`.
- Produces: Hiển thị đúng phần trăm khấu trừ áp lực dội ngược $R \times \phi_{out} = 0.70 \times \phi_{corridor}$ (ví dụ: $-50\%$ khi hành lang $72\%$) thay vì phần trăm vượt ngưỡng $2\%$.

- [ ] **Step 1: Cập nhật phép tính khấu trừ trong `CorridorCoordinationBar`**
- [ ] **Step 2: Chạy kiểm thử toàn bộ 23 Test Suites**
- [ ] **Step 3: Chạy build production**
- [ ] **Step 4: Commit**
