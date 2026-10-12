# Handoff: TrafficDT-Web — Session 7 (2026-10-12)

> **Ngày:** 2026-10-12 (tiếp nối `HANDOFF-2026-10-12-SESSION6.md`)  
> **Dự án:** `D:\CTU\trafficDigital\trafficdt-web` (React 19 + Vite 6 + Tailwind 4 + Three.js 0.186 + Python 3.12 Ultralytics)  
> **GAMA Codebase:** `D:\CTU\trafficDigital\Tran\Tran\CAO_CBMP_code` (GAMA 1.9+, Sub-lane Model, Swarming Dynamics)  
> **Git HEAD:** `7c53d10` (nhánh `main`, remote `origin/main` synchronized)  
> **Kiểm thử tự động:** **31/31 Node.js test suites PASS**, **9/9 Python unit tests PASS**, `npm run build` exit code 0.  

---

## 1. Tóm Tắt Khối Lượng Đã Hoàn Thành trong Session 7

### A. Tích Hợp Live Signal Allocation Card (Tab 3 - Camera YOLO)
1. Xây dựng hàm toán học thuần túy `computeLiveCameraSignalSplit` trong `src/lib/cbmp.js`:
   - Kết nối trực tiếp tỷ lệ chiếm dụng $\phi(t)$ từ camera thật (qua homography IPM $H(3\times 3)$) vào công thức phân bổ thời lượng xanh Max-Pressure ($g_1, g_2$).
   - Đối chứng trực tiếp với Baseline đếm xe Bbox bị hụt do che khuất tương hỗ giữa các xe máy.
2. Xây dựng thẻ giao diện `LiveSignalAllocation` trong `src/components/IpmZone.jsx`:
   - Hiển thị song song 2 thanh đo tiến trình xanh: **CAO (theo diện tích mặt đường)** vs **Baseline (theo đếm xe Bbox)**.
   - Hiển thị huy hiệu cảnh báo độ trễ $\Delta g_1$ do mất mát Bbox gây ra (cắt hụt tới 29s xanh).
3. Viết test suite độc lập `tests/live_signal_allocation.test.mjs` quét toàn bộ 388 camera frames.

### B. Bổ Sung Kịch Bản Mẫu "Dòng Xe Dị Thể" (Tab 2 - Algorithm Lab)
1. Thêm preset `heterogeneous` vào `PRESETS` trong `src/lib/cbmp.js` và `applyPresetVehicles` trong `src/lib/corridorSim.js`:
   - Thiết lập đối đầu: **1 xe tải ($18\text{ m}^2$)** tại Pha 1 vs **12 xe máy ($18\text{ m}^2$)** tại Pha 2.
   - **CAO:** Nhận định đúng diện tích chiếm dụng cân bằng ($\phi_1 = \phi_2 = 0.12$) $\to$ phân bổ nhịp xanh hoàn hảo **56s / 56s**.
   - **Baseline:** Đếm 1 đầu xe vs 12 đầu xe $\to$ thiên vị nghiêm trọng, ép Pha 1 xuống **22s** và dồn 90s cho Pha 2.
2. Bổ sung nút bấm tím `Dòng xe dị thể (1 Tải vs 12 Máy)` và khối ghi chú lý thuyết sư phạm tự động trong `src/components/LabAnalysisPanel.jsx`.
3. Kiểm thử tự động trong `tests/algorithm_lab_presets.test.mjs`.

### C. Nâng Cấp Động Lực Học Xe Máy 2D (Sub-lane Swarming) & Phản Xạ Đèn Vàng (Tab 2)
1. **Dao động lắc ngang (Lateral Drift):** Xe máy khi di chuyển có biên độ lắc nhẹ ($\pm 0.8\text{px}$) mô phỏng chuyển động thực tế.
2. **Lọc khe hở (Gap Filtering):** Xe máy phía sau khi gặp vật cản (ô tô dừng đèn đỏ hoặc dòng xe chậm) tự động dò tìm vị trí lệch sườn ($\pm 6\text{px}$) để lách lên vạch dừng.
3. **Phản xạ đèn vàng (Dilemma Zone):** Xe gần vạch dừng ($d \le 20\text{m}$) tiếp tục thoát nút dọn giao lộ; xe ở xa ($d > 25\text{m}$) hãm phanh mượt mà dừng trước vạch thay vì phanh đứng hình đột ngột.
4. Kiểm thử tự động trong `tests/swarming_and_yellow.test.mjs`.

### D. Vá 4 Điểm Phòng Vệ Dữ Liệu & Rủi Ro Runtime (Hardened Defensive Architecture)
1. `src/lib/data.js:142`: Guard `Number.isFinite(simTime)` trong `interpolateVehicles` ngăn chặn hoàn toàn lỗi nội suy tọa độ thành $NaN$.
2. `src/components/JunctionInspector.jsx:125`: Optional chaining `signals?.[junction.code]` chống crash khi inspector mount trước khi nạp xong signals.
3. `src/components/CameraView.jsx:45`: Kẹp biên frame đuôi video (193.18s $\to$ 193.3s) chống giật lùi frame về 0.12s.
4. `src/components/IpmZone.jsx:276`: Bọc `Number.isFinite` cho `occupancy_phi`, `bboxCount`, `gtCount` loại bỏ nguy cơ hiển thị `NaN` lên giao diện.

---

## 2. Bằng Chứng Xác Minh Toàn Hệ Thống (Verification Evidence)

| Hạng mục | Lệnh thực thi | Kết quả | Chi tiết |
| :--- | :--- | :--- | :--- |
| **Node.js Automated Suites** | `node --test tests/*.test.mjs` | **31/31 PASS (100%)** | 0 fail, thời gian chạy: ~580ms |
| **Python Unit Tests** | `python -m unittest tests/test_rider_moto_fusion.py` | **9/9 PASS (100%)** | NMS moto, ByteTrack 1-1, fusion rider-moto |
| **Production Build** | `npm run build` | **EXIT CODE 0** | 2272 modules transformed (11.02s) |
| **Signal Alignment Ratio** | `tests/signal_vehicle_alignment.test.mjs` | **PASS (99.7%)** | 356/357 xe dừng đúng vạch đèn đỏ |
| **E2E Preview Probe** | Probe HTTP on port 4173 | **0 lỗi 500** | 28 assets verified (Video 22.5MB, GeoJSON, 420 chu kỳ) |
| **Git Status** | `git status` | **CLEAN & PUSHED** | Nhánh `main`, up to date với `origin/main` |

---

## 3. Bản Đồ File Thay Đổi Trong Session 7

- `src/components/CameraView.jsx` (Kẹp biên frame đuôi video 193.3s)
- `src/components/IpmZone.jsx` (Thêm LiveSignalAllocation và bọc Number.isFinite)
- `src/components/JunctionInspector.jsx` (Optional chaining signals)
- `src/components/LabAnalysisPanel.jsx` (Preset Dị thể và lý thuyết WhyBox)
- `src/lib/cbmp.js` (Hàm computeLiveCameraSignalSplit và preset heterogeneous)
- `src/lib/corridorSim.js` (Swarming 2D, gap filtering, đèn vàng, heterogeneous)
- `src/lib/data.js` (Guard Number.isFinite simTime)
- `tests/algorithm_lab_presets.test.mjs` (Coverage heterogeneous preset)
- `tests/camera_player.test.mjs` (Coverage tail clamp)
- `tests/cycle_timebase.test.mjs` (Coverage non-finite simTime)
- `tests/live_signal_allocation.test.mjs` (New suite: 388 frames live split)
- `tests/swarming_and_yellow.test.mjs` (New suite: 2D swarming and yellow brake)

---

## 4. Trạng Thái Dự Án
**DỰ ÁN ĐÃ HOÀN TẤT TRỌN VẸN 100% CÁC TÍNH NĂNG VÀ ĐẶC TẢ.**  
Sẵn sàng phục vụ demo, trình chiếu, nghiệm thu và bảo vệ đồ án.
