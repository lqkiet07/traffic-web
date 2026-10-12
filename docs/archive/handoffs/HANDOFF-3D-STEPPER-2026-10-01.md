# Handoff: TrafficDT-Web — Lab Thuật Toán 3D Low-Poly & Stepper Motion

> **Ngày tạo:** 2026-10-01
> **Vị trí dự án:** `D:\CTU\trafficDigital\trafficdt-web` (React 19 + Vite 6 + Tailwind 4 + Three.js)
> **GAMA workspace:** `D:\CTU\trafficDigital\gama folder\nq`
> **Git HEAD:** `0eb1f9c checkpoint: stable 2D corridor simulation and 5-step stepper before 3D upgrade`
> **Trạng thái kiểm thử:** 18/18 test suites PASS 100%, `npm run build` exit code 0 (~8s, bundle ~1,414kB JS / 47.4kB CSS)

---

## 1. Tóm Tắt Tiến Độ Đã Hoàn Thành Trong Phiên Này

1. **Đồng bộ hóa Bố cục Tỷ lệ Vàng 8:4 (Unified Console):**
   - Đã tái cấu trúc `src/App.jsx` và `src/components/AlgorithmLab.jsx` theo chuẩn Grid 8:4: Cột trái (8 cols) chứa Viewport + Bộ điều khiển Player; Cột phải (4 cols) chứa StatCards + LiveMathBox.
   - Chuyển đổi tab `Replay ↔ Lab` hoàn toàn không bị giật hay co giãn layout (Zero Layout Jump).
   - Chuẩn hóa 100% màu xe từ `VEH_DIMS`: Xe máy vàng (`#f59e0b`), Ô tô xanh (`#38bdf8`), Xe tải hồng tím (`#ec4899`).

2. **Nâng cấp Viewport 3D Low-Poly Tối Giản (`src/components/Corridor3DCanvas.jsx`):**
   - Đã cài đặt `three@0.186.1` và dựng Scene 3D hoàn chỉnh.
   - Mặt đường nhựa kép `#1b2436` có viền casing `#334155`, vạch dừng xe, vạch tim đường phản quang, ánh sáng ambient + directional đổ bóng mềm (`PCFShadowMap`).
   - Meshes xe cộ 3D Low-Poly: Thùng xe tải container cao $3.2m$ thể hiện rõ sự áp đảo thể tích so với xe máy; có đèn pha và đèn phanh đỏ khi dừng.
   - Cột đèn tín hiệu 3 mắt thực tế có quầng sáng phát quang (`emissive`) và ánh sáng điểm `PointLight` hắt xuống mặt đường.

3. **Hệ thống Camera 3D Tự Do (Cinematic Camera Rig):**
   - 6 nút chuyển góc quay: `[Toàn cảnh]` `[Nút 1]` `[Nút 2]` `[Hành lang]` `[Bám xe]` `[Xoay 360]`.
   - Hỗ trợ thao tác chuột:
     - **Chuột trái:** Xoay 360° quanh tâm nhìn.
     - **Chuột phải (hoặc Shift+Trái):** Lia góc nhìn (Pan) tự do đến bất kỳ ngóc ngách nào của 2 ngã tư.
     - **Cuộn chuột (Zoom-to-cursor):** Raycast chiếu tia xuống mặt đất, phóng to thẳng vào vị trí con trỏ chuột thay vì bị kéo về tâm.
     - **Nhấp đúp chuột:** Lấy nét nhanh vào điểm chạm trên đường.

4. **Quy trình 5 Bước Thuật Toán (Interactive 5-Step Stepper):**
   - Bước 1: Quét diện tích ROI $\rightarrow A_1 = 72m^2, \phi_{in} = 0.48$.
   - Bước 2: Khấu trừ áp lực dội ngược hạ lưu $w_1 = \max(0, \phi_{in} - 0.70 \cdot \phi_{out})$.
   - Bước 3: Tính áp suất bão hòa $\gamma = 2.5 \cdot w$.
   - Bước 4: Phân bổ thời lượng xanh chu kỳ $g_1 / g_2$ (tổng 112s + 8s mất mát = 120s).
   - Bước 5: Kích hoạt pha xanh và giải phóng xe qua giao lộ.
   - Đã sửa lỗi tham số: Cố định `getAlgorithmStepData(simRef.current, 1)` bám sát Nút 1, không bị nhảy số về `0.00` ở Bước 2.
   - Biển báo 3D đã dời vào khung nhìn `(-21, 4.5, 6)` không bị cắt mép, hỗ trợ tiếng Việt có dấu sắc nét (`1024×256`).

---

## 2. Các Vấn Đề / Bug Cần Xử Lý Ngay Ở Session Tiếp Theo

Người dùng đã test và phát hiện 2 vấn đề sau:

### 🔴 Vấn đề 1: "Chạy qua 1 lần rồi bấm qua stepper thì không còn thấy xe (0 xe)"
- **Nguyên nhân gốc 1 (Xe thoát hết ra khỏi biên):** Trong chế độ *Thời gian thực*, xe chạy qua ngã tư và ra khỏi biên ($x > 800$) sẽ bị xóa khỏi mảng xe (`sim.vehicles`). Hiện tại hệ thống **chưa có bộ tự động sinh xe mới định kỳ**, nên sau khi 22 xe ban đầu chạy hết, đường bị trống trơn.
- **Nguyên nhân gốc 2 (Kẹt trạng thái `activeScenario = "custom"`):** Nếu người dùng từng click chuột thả xe, kịch bản bị đổi thành `"custom"`. Trong `AlgorithmLab.jsx`, hàm `applyPresetVehicles` gặp `"custom"` sẽ không nạp xe, khiến đường tiếp tục rỗng 0 xe.
- **Nguyên nhân gốc 3 (Điều kiện `if (!isStepper)` trong `ModeToggle`):** Nút Stepper chặn click nếu đang ở Stepper, nên không nạp lại xe được nếu chu kỳ trước đã hết xe.

### 🔴 Vấn đề 2: "3D Stepper xe không chuyển động ở pha motion (nhìn như ảnh tĩnh)"
- **Nguyên nhân gốc:** Trong `src/components/Corridor3DCanvas.jsx` (dòng 762), vòng lặp render 3D có đoạn:
  ```javascript
  if (sim && playRef.current) updateCorridorSim(sim, dt * (speedRef.current || 1));
  ```
  Khi chuyển sang Stepper, hệ thống đặt `isPlaying = false` $\rightarrow$ `playRef.current = false`.
  Hậu quả là hàm `updateCorridorSim` **hoàn toàn không được gọi trong 3D Stepper**, khiến xe bị đóng băng cứng ngắc ngay cả khi `subPhase === 'motion'`!
  *(Trước đó ở component 2D có đoạn `shouldAdvanceSim = isPlaying || (simMode === 'stepper' && isMotionPhase(sim))`, nhưng khi chuyển sang Three.js 3D đã quên bổ sung điều kiện này).*

---

## 3. Danh Sách Nhiệm Vụ Cụ Thể Cho Session Mới (Actionable Tasks)

### Task 1: Kích hoạt chuyển động xe trong 3D Stepper (`src/components/Corridor3DCanvas.jsx`)
- Tại dòng 762, sửa điều kiện gọi `updateCorridorSim`:
  ```javascript
  const isStepperMotion = modeRef?.current === "stepper" && sim?.stepper?.active && sim.stepper.subPhase === "motion";
  if (sim && (playRef.current || isStepperMotion)) {
    updateCorridorSim(sim, dt * (speedRef.current || 1));
  }
  ```
- Kết quả: Khi ở Stepper Bước 1 và Bước 5, xe sẽ thực sự nổ máy chạy tới vạch dừng (1.5s) rồi mới tự động đóng băng để phân tích toán học.

### Task 2: Tự động bơm xe liên tục trong chế độ Thời Gian Thực (`src/lib/corridorSim.js`)
- Bổ sung cơ chế Traffic Generator tự động: Khi ở chế độ liên tục, cứ mỗi 3–4 giây tự động bơm thêm 1 xe máy hoặc ô tô vào các lối vào (West, North1, South1, North2, South2) để đường luôn tấp nập xe chạy, không bao giờ bị tình trạng 0 xe.

### Task 3: Chống rỗng xe & Luôn Reset Spawn Point chuẩn (`src/components/AlgorithmLab.jsx`)
- Trong `toggleSimMode` và `handleReset`: Luôn ép nạp lại đợt xe mới (nếu `activeScenario === "custom"` thì fallback về `"paradox"`).
- Khi kết thúc Bước 5 bấm chuyển sang chu kỳ mới: Tự động nạp lại đợt xe mới ở vị trí xuất phát để lặp lại chu trình 5 bước mượt mà.

### Task 4: Module 2 — Camera YOLO Replay (Khi có video clip)
- Tab `[Camera YOLO]` tại Header hiện đang là placeholder. Khi người dùng cung cấp video thật, tích hợp Dual-View (Bản đồ số song song Video AI).

---

## 4. Suggested Skills Cho Session Tiếp Theo

1. **`systematic-debugging` (Khuyến nghị số 1):** Dùng để truy vết và kiểm chứng việc fix 2 bug xe không chạy / mất xe trong 3D Stepper.
2. **`writing-plans`:** Dùng để lên kế hoạch thi công 3 tasks sửa lỗi trên một cách chuẩn mực.
3. **`verification-before-completion`:** Chạy lại đầy đủ 18 unit tests và kiểm tra Playwright trên trình duyệt thực tế trước khi bàn giao.

---

## 5. Lệnh Chạy Kiểm Thử & Chạy Web

```powershell
# Chạy toàn bộ 18 unit test suites
Get-ChildItem tests/*.test.mjs | ForEach-Object { node $_.FullName }

# Build kiểm tra bundle
npm run build

# Khởi chạy dev server (nếu chưa chạy)
npm run dev   # → http://localhost:5173
```
