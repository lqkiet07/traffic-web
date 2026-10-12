# Handoff: TrafficDT-Web — Session 5 (2026-10-09)

> **Ngày:** 2026-10-09 (tiếp nối `HANDOFF-2026-10-08-SESSION4.md`)  
> **Dự án:** `D:\CTU\trafficDigital\trafficdt-web` (React 19 + Vite 6 + Tailwind 4 + Three.js 0.186 + Python 3.12 Ultralytics)  
> **Git HEAD:** `1d38395` (nhánh `main`)  
> **Kiểm thử tự động:** **29/29 Node.js test suites PASS**, **9/9 Python unit tests PASS**, `npm run build` exit code 0.  
> **Phạm vi hoàn tất:** Khắc phục triệt để lỗi phát video & trùng lặp AI camera; tinh chỉnh toàn diện giao diện Frontend (loại bỏ cắt xén, chuẩn hóa typography); bảo vệ an toàn repository; hoàn tất phân tích chẩn đoán chuyên sâu (Systematic Debugging) và phân tích tác động nâng cấp tương lai (Impact Analysis).

---

## 1. Việc Đã Thực Hiện & Hoàn Thành trong Session 5

### A. Triệt Tiêu Lỗi Màn Hình Đen & Trùng Lặp Bbox AI (Tab Camera YOLO)
1. **Transcode chuẩn Web H.264:**
   - **Gốc rễ:** Video gốc `public/videos/intersection_1_roi.mp4` nén chuẩn **H.265 / HEVC** (`yuvj420p`), bị trình duyệt Chrome/Edge trên Windows chặn decode khi thiếu codec hệ thống.
   - **Xử lý:** Dùng FFmpeg chuyển đổi sang **H.264 / AVC1** (`libx264`, `yuv420p`, `-movflags +faststart`), dung lượng tối ưu xuống **21.9 MB**.
   - **Hợp đồng kiểm thử:** Bổ sung `tests/video_codec_contract.test.mjs` dùng `ffprobe` tự động kiểm tra codec `h264` và `yuv420p`.
2. **Khử trùng lặp Bbox xe máy & Bộ theo dõi 1-đối-1:**
   - **Gốc rễ:** YOLO sinh nhiều box lặp cho cùng 1 xe máy; `CentroidTracker` gán tham lam thiếu `used_ids`, làm 69% số frames bị trùng lặp ID (920 Bbox rác).
   - **Xử lý:** Bổ sung thuật toán NMS khử trùng moto (`iou >= 0.30` hoặc tâm cách $< 18\text{px}$) và ràng buộc `used_ids = set()` trong `scripts/extract_yolo_ipm.py`.
   - **Kết quả:** Tái xuất `public/data/camera_roi_meta.json` sạch 100% (388 frames, 2,040 detections, 37 IDs độc nhất, 0 lỗi trùng lặp).
3. **Căn chỉnh đồ họa IPM & Header:**
   - Đảo chiều mũi tên dòng chảy `drawFlowArrow` trỏ lên phía vạch dừng $y = 6$.
   - Mở rộng ô nét đứt `"VẠCH DỪNG CHỜ XE MÁY"` bao phủ toàn bộ vùng chờ trước giao lộ.
   - Thay nhãn badge `[Chờ clip]` màu cam ở Header thành `[Live AI]` màu xanh ngọc (`bg-emerald-500/20 text-emerald-300`).

### B. Tinh Chỉnh Giao Diện Frontend (Loại Bỏ Viewport Clipping & AI Slop)
1. **Khắc phục lỗi cắt xén khung nhìn (Viewport Clipping):**
   - Loại bỏ bọc thẻ dư thừa `rounded-xl border p-6` trong `App.jsx:37` (`CameraPlaceholder`), chuyển thành `lg:col-span-12 h-full min-h-0 overflow-y-auto pr-1`.
   - Bổ sung `min-h-0 lg:overflow-y-auto pr-1` cho `LabSidePanel` trong `AlgorithmLab.jsx:535`.
   - Toàn bộ dải 5 chặng `PipelineStrip` và panel giải thích toán học hiện có thể xem và cuộn mượt mà trên mọi độ phân giải màn hình.
2. **Chuẩn hóa Typography (Loại bỏ nhãn in hoa vô cớ):**
   - Chuyển toàn bộ các nhãn `uppercase tracking-wider` trong `StatCards.jsx`, `ComparisonCharts.jsx`, `LabAnalysisPanel.jsx`, và `IpmZone.jsx` sang dạng Sentence case thanh lịch (`font-medium text-slate-400`).
   - Chuẩn hóa các huy hiệu trạng thái: `"ĐÔNG ĐÚC" -> "Đông đúc"`, `"KẸT DỘI NGƯỢC" -> "Kẹt dội ngược"`, `"LƯU THÔNG" -> "Lưu thông"`.
3. **Làm dịu màu sắc ngữ nghĩa (Semantic Color Tuning):**
   - Giảm độ chói của khối cảnh báo sai số che khuất trong `IpmZone.jsx`: Bbox đếm xe dùng `border-rose-500/20 bg-rose-950/20`, CAO diện tích dùng `border-emerald-500/30 bg-emerald-950/20`.

### C. Gia Cố Kiến Trúc & An Toàn Mã Nguồn (Architecture Hardening)
1. **Khóa nguy cơ Git Bloat (`.gitignore`):**
   - Thêm `vid/` vào `.gitignore` để loại trừ file video thô 391.5 MB khỏi Git, bảo vệ dự án không bị vượt ngưỡng 100 MB của GitHub.
   - Đảm bảo `public/videos/intersection_1_roi.mp4` (21.9 MB) vẫn được theo dõi và commit bình thường.
2. **Khắc phục xung đột Z-Index của `JunctionInspector`:**
   - Nâng `z-index` từ `z-[600]` lên `z-[1001]` trong `JunctionInspector.jsx` (dòng 99, 109, 130), giúp card luôn nổi lên trên thanh bản quyền Leaflet Attribution (`z-index: 1000`).
   - Bổ sung `max-h-[calc(100%-24px)] overflow-y-auto` chống tràn màn hình khi mở trên viewport thấp.
3. **Đồng bộ Dark Theme cho Leaflet Tooltip:**
   - Thêm bộ định kiểu CSS `.leaflet-tooltip` tối bán trong suốt (`rgba(15, 23, 42, 0.95)`, viền `#334155`, chữ `#e2e8f0`) vào `src/index.css`.
4. **Chống co ngắn nhãn Telemetry trong Lab:**
   - Tinh chỉnh nhãn trong `LabAnalysisPanel.jsx`: `Áp suất vào (φ_in) -> Áp suất vào φ_in` và `Hạ lưu nối (φ_corridor) -> Hạ lưu nối φ_out`, triệt tiêu hiện tượng bị co thành `Áp suất vào (φ_...`.

---

## 2. Kết Quả Chẩn Đoán Chuyên Sâu (Systematic Debugging Synthesis)

### Hiện tượng: Biểu đồ đối đầu `ComparisonCharts` bị lệch
Khi người dùng chuyển sang kịch bản **Cao · 1400 vph**, đường xanh (CAO) hiển thị ~26–27 xe hàng chờ trong khi đường tím (Baseline) chỉ hiển thị ~14 xe hàng chờ.

### Ba nguyên nhân gốc rễ (Root Causes):
1. **Lệch nguồn dữ liệu mô phỏng (Data Provenance Mismatch):**
   - Kịch bản `Medium_900` đã được cập nhật từ đợt chạy mới `rep1` (08/07/2026), có bán kính nhận diện công bằng 45m và khử trùng lặp xe dừng $\to$ CAO tốt hơn Baseline (12.87 xe vs 13.50 xe).
   - Kịch bản `High_1400` và `Low_400` trong `public/data/kpi_summary.json` vẫn lấy từ log cũ 26/06 (`excel_data_High_1400.csv`):
     - Baseline cũ dùng bán kính 150m gây nghẽn xe từ xa, xe không tiến được tới vạch dừng nên số hàng chờ tại nút trông "ít ảo" (~14 xe).
     - CAO cũ tính cả xe chậm qua các đa giác ROI giao nhau nên bị đếm chồng lấn lên ~26 xe.
   - *Thực tế ở batch chuẩn hóa mới `rep1`:* Hàng chờ thực của High_1400 là **CAO: 13.21 xe vs Baseline: 14.38 xe** (CAO giảm kẹt 8.1%).
2. **Độ lệch nhịp vạch vàng (Dual-Clock Drift):**
   - File quỹ đạo Replay chia chunk **120s** (`CYCLE_LEN = 120`).
   - Log GAMA chạy theo chu kỳ **112s** (`GAMA_CYCLE_LEN = 112`, chưa tính 8s đèn vàng).
   - Hàm `chartCycleForTime(t) = Math.floor(t / 112) + 1` làm vạch vàng chạy nhanh hơn thanh trượt Replay (lệch ~3–4 chu kỳ ở cuối).
3. **Lệch tỷ lệ trục Y của Thông lượng (Throughput):**
   - `Medium_900` tính trung bình trên mỗi nút giao (~35 xe/CK).
   - `High_1400` tính tổng gộp cả 8 nút giao (~274 xe/CK).

---

## 3. Phân Tích Tác Động Nâng Cấp Tương Lai (Impact Analysis Synthesis)

### A. Thêm 8 giây đèn vàng vào chu kỳ (Yellow Time / Lost Time)
* **Tác động tích cực (Triệt tiêu độ lệch chu kỳ):**
  - Trong toán học `src/lib/cbmp.js`, các tham số vốn đã được thiết kế sẵn:
    $$\text{CYCLE\_DURATION (120s)} = g_1 + g_2\text{ (112s)} + \text{LOST\_TIME (8s)}$$
  - Khi GAMA và Web bổ sung 8s đèn vàng (4s cuối Pha 1 và 4s cuối Pha 2): Chu kỳ GAMA trở thành đúng 120s, **khớp 1:1 tuyệt đối với chu kỳ Web Replay**, triệt tiêu hoàn toàn hiện tượng lệch vạch vàng trên biểu đồ.
* **Các điểm cần cập nhật mã nguồn (Phạm vi hẹp):**
  - `src/lib/data.js` (`getGamaSignal`): Bổ sung `state: "yellow"` trong khoảng $[g_1 - 4, g_1]$ và $[dur - 4, dur]$.
  - `src/components/RealisticSignalPole.jsx`: Bổ sung bóng đèn vàng thứ 3 vào cột đèn bản đồ Leaflet (giống như `Corridor3DCanvas.jsx` đã có sẵn).

### B. Dòng xe hỗn tạp nhiều làn (Mixed Traffic / Non-lane-based)
* **Tác động lên Web Replay (Tab 1):**
  - **Không ảnh hưởng:** Canvas 2D vẽ xe dựa trên tọa độ WGS84 `(lat, lng)` và góc xoay `heading` thực tế xuất từ GAMA. Xe máy lấn làn, đi so le, hay tràn vỉa hè thì Canvas vẫn render mượt mà.
  - File `src/lib/lane.js` (chia làn cứng) vốn đã deprecated, không còn phụ thuộc runtime.
* **Tác động lên Camera YOLO (Tab 3):**
  - **Hoàn toàn tương thích:** Phép chiếu Homography $H(3 \times 3)$ và độ đo diện tích chiếm dụng $\phi(t)$ sinh ra nhằm phục vụ dòng xe hỗn hợp không theo làn.
* **Lưu ý điều chỉnh nhỏ:**
  - `src/lib/declutter.js`: Giảm khoảng cách an toàn tách xe khi dừng cho xe máy xuống $0.8\text{ m}$ (ô tô giữ $1.8\text{ m}$) để bầy xe máy dừng tự nhiên theo dạng tổ ong (swarm) mà không bị dội ngược.

---

## 4. Bằng Chứng Kiểm Thử & Trạng Thái Hệ Thống (Verification Evidence)

| Hạng mục kiểm thử | Công cụ | Kết quả | Chi tiết |
| :--- | :--- | :--- | :--- |
| **Node.js Automated Suites** | `node --test tests/*.test.mjs` | **29/29 PASS (100%)** | 0 fail, thời gian chạy: 933 ms |
| **Python Computer Vision** | `python -m unittest tests/test_rider_moto_fusion.py` | **9/9 PASS (100%)** | NMS moto, ByteTrack 1-1, fusion rider-moto |
| **Video Web Codec Contract** | `tests/video_codec_contract.test.mjs` | **PASS** | H.264 / AVC1, pixel format yuv420p |
| **Camera Meta Contract** | `tests/camera_meta_contract.test.mjs` | **PASS** | 388 frames, 0 duplicate IDs |
| **Production Build** | `npm run build` | **EXIT CODE 0** | 2272 modules transformed (10.81s) |
| **Browser Runtime (Playwright)** | Smoke test trên port 5173 | **0 errors** | Video decode OK, Inspector z-1001, dark tooltip OK |

---

## 5. Việc Ưu Tiên Cho Session Tiếp Theo (Roadmap for Session 6)

1. **Commit & Push Toàn Diện:**
   - Commit module Camera YOLO: `feat(camera): real yolov8 h264 video with nms deduplication and ipm digital twin`.
   - Commit các cải tiến giao diện & sửa lỗi: `fix(ui): resolve inspector z-index, add dark tooltip, polish typography and viewport`.
   - Chạy `git push origin main`.
2. **Đồng bộ hóa dữ liệu `kpi_summary.json`:**
   - Cập nhật số liệu `High_1400` và `Low_400` từ batch `rep1` chuẩn hóa (đưa hàng chờ CAO High_1400 về đúng giá trị thực tế 13.2 xe vs 14.4 xe).
   - Chuẩn hóa trục Throughput về cùng đơn vị trung bình nút (mean).
3. **Tích hợp Pha Đèn Vàng 8s:**
   - Nâng cấp `getGamaSignal` hỗ trợ trạng thái `yellow`.
   - Bổ sung bóng đèn vàng 3 mắt cho `RealisticSignalPole.jsx`.
4. **Thẻ Quyết Định Đèn Trực Tiếp (Live Signal Allocation Card):**
   - Kết nối mức chiếm dụng $\phi(t)$ từ camera trực tiếp vào công thức tính giây đèn Max-Pressure.

---

## 6. Suggested Skills cho Agent Tiếp Theo

1. **`verification-before-completion`** — Chạy lại toàn bộ 29 test suites và build trước khi thực hiện commit/push git.
2. **`impact-analysis`** — Áp dụng khi bắt đầu nâng cấp trạng thái đèn vàng trong `getGamaSignal` và `RealisticSignalPole.jsx`.
3. **`data-analysis-and-viz`** — Sử dụng để xuất và kiểm chứng lại dữ liệu `rep1` cho `kpi_summary.json`.
4. **`frontend-design`** — Thiết kế thẻ Live Signal Allocation Card kết nối camera với Max-Pressure.
