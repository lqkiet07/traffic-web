# Handoff: TrafficDT-Web — Session 8 (2026-10-18)

> **Dự án:** `D:\CTU\trafficDigital\trafficdt-web` (React 19 + Vite 6 + Tailwind 4 + Three.js 0.186 + Python 3.12 Ultralytics)  
> **Git HEAD:** `e3c7121` (nhánh `main`, remote `origin/main` synchronized)  
> **Kiểm thử tự động:** **31/31 Node.js test suites PASS**, **9/9 Python unit tests PASS**, `npm run build` exit code 0.  
> **Trạng thái:** Toàn bộ tính năng hoàn thành 100%, frontend đã khử sạch AI slop, tài liệu Word phụ lục 5 hình đã sẵn sàng ở local.

---

## 1. Tóm Tắt Khối Lượng Đã Hoàn Thành Trong Phiên

### A. Tích Hợp Live Signal Allocation & Kịch Bản Dị Thể
1. **Live Signal Allocation Card (Tab 3):**
   - Hàm toán học thuần `computeLiveCameraSignalSplit` trong `src/lib/cbmp.js`.
   - Card hiển thị 2 thanh phân bổ xanh thời gian thực: CAO diện tích ($\phi$) vs Baseline đếm xe Bbox (hụt do che khuất) trong `src/components/IpmZone.jsx`.
   - Test suite: `tests/live_signal_allocation.test.mjs` (388 camera frames verified).
2. **Kịch bản "Dòng xe dị thể" (Tab 2):**
   - Thiết lập 1 xe tải ($18\text{ m}^2$) đối đầu 12 xe máy ($18\text{ m}^2$) trong `src/lib/cbmp.js` và `src/lib/corridorSim.js`.
   - CAO cấp đều 56s/56s xanh (áp lực diện tích cân bằng), Baseline đếm 1 vs 12 nên ép xe tải xuống 22s xanh.
   - Thêm nút chọn preset và phân tích lý thuyết WhyBox trong `src/components/LabAnalysisPanel.jsx`.
   - Test suite: `tests/algorithm_lab_presets.test.mjs`.
3. **Động lực học xe máy 2D & Phản xạ đèn vàng (Tab 2):**
   - Xe máy có dao động lắc ngang (`lateral drift`) và lọc khe hở (`gap filtering`) lách qua ô tô dừng trước vạch.
   - Xe cách vạch $\le 20\text{m}$ tiếp tục dọn nút khi đèn vàng; xe ở xa $> 25\text{m}$ hãm phanh dừng mượt mà.
   - Test suite: `tests/swarming_and_yellow.test.mjs`.

### B. Phòng Vệ Dữ Liệu & Rủi Ro Runtime (Hardened Architecture)
1. `src/lib/data.js:142`: Thêm guard `Number.isFinite(simTime)` trong `interpolateVehicles` chống lỗi nội suy $NaN$.
2. `src/components/JunctionInspector.jsx:125`: Optional chaining `signals?.[junction.code]` chống crash khi khởi động.
3. `src/components/CameraView.jsx:45`: Kẹp biên frame đuôi video (193.18s $\to$ 193.3s) chống giật lùi frame về 0.12s.
4. `src/components/IpmZone.jsx:276`: Bọc `Number.isFinite` cho `occupancy_phi`, `bboxCount`, `gtCount`.

### C. Khử Sạch "AI Slop" & Chuẩn Hóa Frontend (Frontend Design)
1. **Sửa lỗi ngữ nghĩa màu sắc:**
   - Pha 2 đèn xanh trong `JunctionInspector.jsx` đổi từ đỏ `rose-500` sang xanh da trời `sky-500` (đồng bộ `PHASE_DOT`).
   - Xe máy thống nhất màu Vàng Hổ Phách `#f59e0b` trên cả 3 Tab (chấm dứt việc tô xe máy màu xanh lá như đèn xanh ở CameraView và IpmZone).
   - Baseline thống nhất màu Chàm `indigo-500`, trả màu Đỏ Rose về đúng chức năng cảnh báo lỗi.
2. **Khử rác emoji và ký tự Unicode/ASCII:**
   - Thay thế 100% glyphs `↺`, `▶`, `⏸`, `|<`, `>|`, `▾`, `▴`, `-->` bằng icon Lucide SVG (`RotateCcw`, `Play`, `Pause`, `StepBack`, `StepForward`, `ChevronDown`, `ChevronUp`, `ArrowRight`, `ArrowUpRight`, `ArrowDownRight`).
   - Xóa bỏ các nhãn trạng thái tĩnh và buzzword trên Header (`Chế độ Camera Replay`, `Chế độ Sandbox độc lập`, `Live`).
   - Bỏ `(60 FPS)`, `CAM-CTU-01`, `Đang xử lý (30 FPS)`, và tắt các animation nhấp nháy `animate-pulse` vô cớ.
   - Bỏ các pill đánh giá cảm tính `"Thông thoáng"`, `"Bình thường"`, `"Chờ xe"`.
3. **Tối ưu bố cục & triệt tiêu thanh cuộn:**
   - Nhúng `PipelineStrip` vào đáy `CameraStreamZone`, xóa bỏ hàng 12 cột thừa $\to$ Tab 3 cân bằng 2 cột đối xứng, vừa khít một khung nhìn không bị cuộn chuột.
   - Khôi phục chiều cao tỉ lệ vàng nằm ngang `h-56` (224px) cho `ComparisonCharts.jsx`, khôi phục thẻ hướng dẫn phân tích học thuật trong `App.jsx`.

### D. Tài Liệu Báo Cáo & Phụ Lục Hình Ảnh Cho Leader
1. **Quy hoạch tài liệu:** Đã gom 6 handoff cũ và 17 plan lịch sử vào `docs/archive/handoffs/` và `docs/archive/plans/`.
2. **Bộ ảnh 5 hình chuẩn 3D:** Chụp mới bằng Playwright với góc zoom tối ưu, 100% 3D Three.js, lưu tại `docs/figures/`.
3. **File Word phụ lục:** Sinh tự động bằng Python `scripts/export_appendix_docx.py` $\to$ file `docs/PHU_LUC_HINH_ANH.docx` (3.12 MB, khổ A4 chuẩn ĐH Cần Thơ, font Times New Roman 12pt nghiêng).
4. **Git Isolation:** `.gitignore` đã chặn `*.docx`, giữ file Word an toàn trên máy cục bộ để gửi Leader, không đưa lên Git.

---

## 2. Bằng Chứng Xác Minh (Verification Evidence)

| Lệnh kiểm tra | Kết quả | Trạng thái |
| :--- | :--- | :--- |
| `node --test tests/*.test.mjs` | **31/31 test suites PASS (100%)** (530ms) | Xanh 100% |
| `python -m unittest tests/test_rider_moto_fusion.py` | **9/9 unit tests PASS (100%)** (3.6s) | Xanh 100% |
| `npm run build` | **Exit code 0** (10.59s, 2272 modules transformed) | Xanh 100% |
| `git status` | Nhánh `main`, commit `e3c7121` synchronized với `origin/main` | Đã push code |
| `Test-Path docs\PHU_LUC_HINH_ANH.docx` | **True** (3.12 MB) | Sẵn sàng gửi Leader |

---

## 3. Bản Đồ Tệp Tin Quan Trọng

- `src/components/Header.jsx`: Header tối giản, không còn badge thừa.
- `src/components/CameraView.jsx`: Tích hợp video 340px, controls, và pipeline nhúng không cuộn trang.
- `src/components/IpmZone.jsx`: Phẳng chim IPM 190px, xe máy màu hổ phách, thẻ Live Signal Allocation.
- `src/components/ComparisonCharts.jsx`: Biểu đồ ngang `h-56` hiển thị mượt mà.
- `src/components/LabAnalysisPanel.jsx`: Bảng tính đại số 5 bước và kịch bản dị thể sạch emoji.
- `docs/PHU_LUC_HINH_ANH.docx`: File Microsoft Word phụ lục 5 hình ảnh giao diện chuẩn.
- `scripts/export_appendix_docx.py`: Script tái tạo file Word.

---

## 4. Suggested Skills Cho Agent Tiếp Theo

1. `viva-defense-prep` — Luyện tập trả lời các câu hỏi phản biện của hội đồng về mô hình Sub-lane, ma trận Homography IPM, và ý nghĩa $p = 0.002$.
2. `verification-before-completion` — Bắt buộc chạy 31 Node suites và kiểm tra build trước khi đưa ra bất kỳ khẳng định nào.
3. `frontend-design` — Duy trì tính nhất quán của hệ thống token màu và bố cục phẳng không đổ bóng mờ.
