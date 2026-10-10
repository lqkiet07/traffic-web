# Nắn Kịch bản Lab sang "Bầy xe máy Ken dày & Che khuất Camera CCTV" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loại bỏ "Bẫy PCE" (4 xe tải = 72m² vs 24 xe máy = 36m²), thay bằng kịch bản bầy xe máy 26 chiếc ken dày không theo làn ở Nhánh Tây, đối chiếu camera Bbox đếm hụt ~50% (cắt xanh sớm) so với CAO đo diện tích liên tục (cấp đủ xanh xả sạch).

**Architecture:** (1) Cập nhật PRESETS.paradox sang Pha 1 = 26 moto / Pha 2 = 18 moto. (2) Ma trận tọa độ 26 xe máy 3 làn so le trong AlgorithmLab.jsx. (3) Liên kết estimateOccludedCount vào getAlgorithmStepData để Baseline dùng visible count (camera Bbox), CAO dùng diện tích. (4) Tinh chỉnh UI Step1Math/Step4Math xóa badge "Nhánh xe tải".

**Tech Stack:** React 19, Three.js 0.186, Vite 6, Tailwind 4, Node assert test runner.

**Spec:** HANDOFF-2026-10-05-SESSION2.md (section 2 Bẫy PCE + section 3 task 1) + gama clean_paper_text.txt (CAO vs count-based Cb-MP, Table 1: 6.01%/11.90%/±2%).

## Global Constraints
- Không revert ~26 file M + vid/ untracked của user; chỉ stage đúng file task.
- Duy trì 21/21 test suites PASS sau mỗi commit.
- Không dùng shadow glow, giữ design token Emerald/Slate/Cyan.
- Tiếng Việt trước ký hiệu sau trong UI sư phạm.

---

### Task 1: Model Toán & Hợp đồng Kịch bản Occlusion

**Files:**
- Modify: `src/lib/cbmp.js` (PRESETS.paradox ~68-74)
- Modify: `src/lib/corridorSim.js` (getAlgorithmStepData ~198-217)
- Test: `tests/algorithm_stepper.test.mjs` (Test 2)

**Interfaces:**
- Consumes: `estimateOccludedCount(counts, occlusionRate)` from `src/lib/cbmp.js`.
- Produces: `getAlgorithmStepData` trả về `step1.occlusionP1 = {rawCount:26, visibleCount:13, lossPercentage:50}`, `step4.baseline.g1 < step4.cbmp.g1`.

- [ ] **Step 1: Write the failing test** — Thay Test 2 "Truck paradox" bằng "Motorcycle swarm & CCTV occlusion paradox" (26 west moto vs 18 north1 moto, assert occlusionP1.visibleCount=13, lossPercentage=50, p1Area=39.0, p2Area=27.0, cbmp.g1 > cbmp.g2, baseline.g1 < cbmp.g1).
- [ ] **Step 2: Run test to verify it fails** — Run: `node tests/algorithm_stepper.test.mjs` Expected: FAIL.
- [ ] **Step 3: Write minimal implementation** — (a) cbmp.js: paradox desc + p1:{moto:26} p2:{moto:18}. (b) corridorSim.js: occlusion rate 0.50 khi moto>=20; baseline dùng cameraCounts (visibleMotos), CAO dùng gamma từ phi.
- [ ] **Step 4: Run test to verify it passes** — Run: `node tests/algorithm_stepper.test.mjs` Expected: Test 2 PASS (các test khác có thể FAIL tạm, Task 2/4 sẽ fix).
- [ ] **Step 5: Commit** — `git add src/lib/cbmp.js src/lib/corridorSim.js tests/algorithm_stepper.test.mjs` + `git commit -m "feat(sim): align paradox scenario and baseline logic with motorcycle swarm occlusion"`.

### Task 2: Dàn dựng 26 Xe Máy 3 Làn So Le trong Sandbox

**Files:**
- Modify: `src/components/AlgorithmLab.jsx` (applyPresetVehicles ~34-51)
- Test: `tests/algorithm_stepper.test.mjs` (Test 7, 8, 10)

**Interfaces:**
- Consumes: `spawnVehicle(sim, options)` from `src/lib/corridorSim.js`.
- Produces: `sim.vehicles` chứa 26 west moto + 12 north1 + 6 south1 cho preset paradox.

- [ ] **Step 1: Write the failing test** — Test 7: assert 26 west motos, 3-column layout x=205-row*16, y=162+col*8. Test 8: stepper pinned Node 1, p1Counts.moto=26, p1Area=39. Test 10: baseline swarm occlusion (p1Count=26, p2Count=18, baseline.g1=60, baseline.g2=52, cbmp.g1=64, cbmp.g2=48).
- [ ] **Step 2: Run test to verify it fails** — Run: `node tests/algorithm_stepper.test.mjs` Expected: FAIL (Test 10 cũ assert 4 trucks).
- [ ] **Step 3: Write minimal implementation** — Thay 4 west trucks bằng loop 26 moto 3 cột so le; north1 12 moto + south1 6 moto giữ nguyên layout.
- [ ] **Step 4: Run test to verify it passes** — Run: `node tests/algorithm_stepper.test.mjs` Expected: all assertions passed.
- [ ] **Step 5: Commit** — `git add src/components/AlgorithmLab.jsx tests/algorithm_stepper.test.mjs` + `git commit -m "feat(lab): spawn 26-motorcycle swarming cluster in paradox preset"`.

### Task 3: Tinh chỉnh Sư phạm & UI Stepper

**Files:**
- Modify: `src/components/LabAnalysisPanel.jsx` (Step1Math ~328-376, Step4Math ~535-542)

**Interfaces:**
- Consumes: `data.step1.occlusionP1`, `data.step4.baseline/cbmp`.
- Produces: Badge động "Bầy xe máy ken đặc", khối đối chiếu Bbox vs CAO, ghi chú xanh ngắn vs xanh đủ.

- [ ] **Step 1: Write the failing test** — Không có test UI mới; kiểm tra thủ công: badge không còn chữ "Nhánh xe tải" khi p1 toàn moto.
- [ ] **Step 2: Implement** — Step1Math: p1Badge/p2Badge động; hiển thị occlusionP1 khi lossPercentage>0; giữ SimVsRealComparison + ParameterNote. Step4Math: thêm khối đối chiếu baseline cắt sớm vs CAO xả sạch (dùng data.step1.occlusionP1.visibleCount, p1Area).
- [ ] **Step 3: Verify build** — Run: `npm run build` Expected: exit 0.
- [ ] **Step 4: Commit** — `git add src/components/LabAnalysisPanel.jsx` + `git commit -m "style(lab): clarify motorcycle swarm occlusion pedagogy in step1 and step4"`.

### Task 4: Đồng bộ assertions toàn bộ Test Suites & Kiểm thử Cuối

**Files:**
- Modify: `tests/cbmp_math.test.mjs` (Test 5), `tests/algorithm_lab_presets.test.mjs` (paradox helper + assertions)

**Interfaces:**
- Consumes: `PRESETS.paradox` từ `src/lib/cbmp.js`.
- Produces: 21/21 test suites PASS + `npm run build` exit 0.

- [ ] **Step 1: Update cbmp_math Test 5** — Đổi comment/assert sang swarm occlusion (phi1>phi2, cbmp.g1>cbmp.g2; bỏ assert base.g1<base.g2 vì giờ p1/p2 cùng loại moto).
- [ ] **Step 2: Update algorithm_lab_presets paradox helper** — 26 west moto + 18 north1 moto; assertion CAO g1 > Baseline g1 giữ nguyên ý nghĩa (CAO cấp đủ xanh, baseline Bbox cắt sớm).
- [ ] **Step 3: Run full suite (21 files)** — Run từng file `node tests/*.test.mjs` Expected: all passed.
- [ ] **Step 4: Run build** — Run: `npm run build` Expected: exit 0.
- [ ] **Step 5: Commit** — `git add tests/cbmp_math.test.mjs tests/algorithm_lab_presets.test.mjs` + `git commit -m "test(sim): synchronize all preset assertions with motorcycle swarm scenario"`.
