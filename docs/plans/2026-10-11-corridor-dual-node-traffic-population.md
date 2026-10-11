# Kế Hoạch Triển Khai: Phủ Dòng Xe Lên Toàn Bộ Hành Lang 2 Nút Giao (Dual-Node Traffic Population)

> **Dành cho Agent thực thi:** BẮT BUỘC SỬ DỤNG SUB-SKILL: Dùng `subagent-driven-development` hoặc thực thi tuần tự inline theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu:** Mở rộng và đồng bộ khởi tạo dòng xe lên cả 2 nút giao (`Nút 1` và `Nút 2`) trong Lab thuật toán (Corridor Sim) cho toàn bộ các kịch bản mẫu (`paradox`, `balanced`, `corridor_jam`), đảm bảo khi quan sát toàn cảnh 3D hoặc chuyển tab mổ xẻ Nút 2, người xem thấy cả 2 nút đều có xe lưu thông, dừng đèn đỏ và tính toán áp suất thực tế.

**Kiến trúc:** 
1. Tập trung hóa hàm `applyPresetVehicles` vào `src/lib/corridorSim.js` (loại bỏ code trùng lặp giữa UI `AlgorithmLab.jsx` và test `algorithm_lab_presets.test.mjs`).
2. Bổ sung các phương tiện tiếp cận Nút 2: nhánh Bắc 2 (`north2`), nhánh Nam 2 (`south2`) và phương tiện trên hành lang (`corridor`) hướng vào vạch dừng Nút 2.
3. Giữ nguyên tính chất cốt lõi của các kịch bản: `paradox` tại Nút 1 vẫn giữ nguyên 26 xe máy che khuất, `corridor_jam` vẫn kích hoạt $\phi_{corridor} \ge 0.70$ cắt xanh Nút 1 xuống 10s.

**Tech Stack:** JavaScript ES Modules, React 19, Three.js 0.186, Node.js Test Runner (`node:assert`).

**Spec:** Bổ sung phương tiện cho cả 2 nút trên trục hành lang $x \in [0, 650]$ theo đúng cấu hình `APPROACH_CONFIGS` (`west`, `north1`, `south1`, `corridor`, `north2`, `south2`).

---

## Global Constraints

- Không cài thêm bất kỳ dependency npm mới nào.
- Đảm bảo toàn bộ 29 test suites Node.js và 9 test suites Python tiếp tục PASS 100%.
- Giữ vững bản chất toán học: Nút 1 trong kịch bản `paradox` phải duy trì $g_1(\text{CAO}) > g_1(\text{Baseline})$; kịch bản `corridor_jam` phải duy trì $g_1(\text{Nút 1}) = 10\text{s}$ và $g_1(\text{Nút 2}) = 102\text{s}$.
- Không làm vỡ góc nhìn camera Cinematic 3D hoặc cơ chế Raycast click thả xe.

---

## Cấu Trúc File Thay Đổi

- Modify `src/lib/corridorSim.js`:
  - Thêm và export hàm chuẩn hóa `applyPresetVehicles(sim, key)` hỗ trợ sinh xe đầy đủ cho cả Node 1 (`west`, `north1`, `south1`) và Node 2 (`corridor`, `north2`, `south2`).
- Modify `src/components/AlgorithmLab.jsx`:
  - Xóa bỏ định nghĩa cục bộ `applyPresetVehicles`, import trực tiếp từ `src/lib/corridorSim.js`.
- Modify `tests/algorithm_lab_presets.test.mjs`:
  - Import `applyPresetVehicles` từ `corridorSim.js` thay vì tự viết lại hàm phụ `applyPreset`.
  - Bổ sung assertion kiểm chứng Nút 2 có xe hoạt động ($\ge 1$ xe tại Node 2) trong mọi kịch bản.

---

### Task 1: Mở rộng `applyPresetVehicles` trong `src/lib/corridorSim.js` & Viết Test Kỳ Vọng

**Files:**
- Modify: `src/lib/corridorSim.js`
- Modify: `tests/algorithm_lab_presets.test.mjs`

- [ ] **Step 1: Cập nhật `tests/algorithm_lab_presets.test.mjs` với assertion kiểm tra xe ở cả 2 nút**
- [ ] **Step 2: Chạy test để xác nhận FAIL**
- [ ] **Step 3: Cài đặt `applyPresetVehicles` trong `src/lib/corridorSim.js`**
- [ ] **Step 4: Chạy test để xác nhận PASS**

---

### Task 2: Cập Nhật `src/components/AlgorithmLab.jsx` Để Dùng Hàm Chung

**Files:**
- Modify: `src/components/AlgorithmLab.jsx`

- [ ] **Step 1: Import `applyPresetVehicles` từ `src/lib/corridorSim.js`**
- [ ] **Step 2: Loại bỏ hàm cục bộ trùng lặp `applyPresetVehicles` trong `AlgorithmLab.jsx`**
- [ ] **Step 3: Chạy build kiểm tra cú pháp**

---

### Task 3: Xác Minh Toàn Hệ Thống (Verification Gate) & Commit

- [ ] **Step 1: Chạy toàn bộ 29 test suites Node.js**
- [ ] **Step 2: Chạy Python unit test**
- [ ] **Step 3: Kiểm tra giao diện qua Playwright (Browser check)**
- [ ] **Step 4: Commit & Push**
