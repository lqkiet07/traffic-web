# Handoff: TrafficDT-Web — Session 6 (2026-10-12)

> **Ngày:** 2026-10-12 (tiếp nối `HANDOFF-2026-10-09-SESSION5.md`)  
> **Dự án:** `D:\CTU\trafficDigital\trafficdt-web` (React 19 + Vite 6 + Tailwind 4 + Three.js 0.186 + Python 3.12 Ultralytics)  
> **GAMA Codebase:** `D:\CTU\trafficDigital\Tran\Tran\CAO_CBMP_code` (GAMA 1.9+, Sub-lane Model, Swarming Dynamics)  
> **Git HEAD:** `af93282` (nhánh `main`, remote `origin/main` synchronized)  
> **Kiểm thử tự động:** **29/29 Node.js test suites PASS**, **9/9 Python unit tests PASS**, `npm run build` exit code 0.  

---

## 1. Tóm Tắt Khối Lượng Đã Hoàn Thành trong Session 6

### A. Đồng bộ KPI & Khắc Phục Nghịch Lý Kịch Bản Cao (High 1400 vph)
1. Cập nhật `public/data/kpi_summary.json` từ dữ liệu chuẩn hóa `rep1`, đưa hàng chờ kịch bản High về đúng thực tế:
   - CAO: **19.50 xe** vs Baseline Fair: **22.01 xe** (CAO tối ưu hơn, không còn lỗi nghịch lý 26 vs 14 xe cũ).
   - Medium_900: CAO **12.70 xe** vs Baseline **13.34 xe**.
   - Low_400: CAO **5.58 xe** vs Baseline **5.94 xe**.
2. Quy chuẩn Throughput về trung bình mỗi nút giao (< 60 xe/CK).
3. Commit: `517f760 fix(kpi): synchronize rep1 normalized simulation data across all scenarios`.

### B. Phủ Đầy Đủ Dòng Xe Lên Toàn Bộ Hành Lang 2 Nút (Tab 2 - Algorithm Lab)
1. Chuẩn hóa hàm `applyPresetVehicles` vào `src/lib/corridorSim.js`, loại bỏ mã nguồn trùng lặp ở UI và test.
2. Bổ sung đầy đủ xe tiếp cận cho **Nút 2** (`corridor`, `north2`, `south2`) trong mọi kịch bản mẫu (`paradox`, `corridor_jam`, `balanced`).
3. Khi quan sát góc nhìn 3D hoặc chuyển tab `Nút 1` $\leftrightarrow$ `Nút 2`, cả 2 nút đều có luồng xe dừng đèn đỏ và bảng tính đại số 5 bước riêng biệt.
4. Commit: `76abd31 feat(lab): populate mixed traffic across both corridor nodes in all presets`.

### C. Tích Hợp Pha Đèn Vàng 8s & Cột Đèn 3 Mắt (Tab 1 - Replay Map)
1. **Timebase 120s:** Chuẩn hóa `GAMA_CYCLE_LEN = 120` và `YELLOW_TIME = 4` trong `src/lib/data.js`:
   - Chu kỳ gồm 4 phân đoạn: Xanh P1 $\to$ Vàng P1 (4s) $\to$ Xanh P2 $\to$ Vàng P2 (4s).
   - Triệt tiêu độ lệch nhịp giữa thanh trượt Web Replay (120s) và log GAMA cũ (112s).
2. **Cột đèn 3 mắt Leaflet:** Nâng cấp `SignalHead` trong `src/components/RealisticSignalPole.jsx` thành 3 mắt đèn (Đỏ - Vàng - Xanh) có ánh sáng glow theo màu.
3. Cập nhật huy hiệu `JunctionLabel` hiển thị chấm vàng `#f59e0b` khi giao lộ đang ở pha vàng dọn nút.
4. Cập nhật `JunctionInspector.jsx` hiển thị nhãn pha động: `Vàng Pha 1` / `Xanh Pha 1`.
5. Tỷ lệ xe dừng chính xác trước vạch đỏ (`signal_vehicle_alignment`) tăng vọt lên **99.7%** (356/357 xe).
6. Commit: `0321703 feat(signal): integrate 8s yellow phase and 3-lamp realistic signal poles`.

### D. Khảo Sát, Nâng Cấp & Nạp Toàn Bộ Dữ Liệu Mới Từ GAMA `Tran`
1. Đọc và so sánh mã nguồn `D:\CTU\trafficDigital\Tran\Tran\CAO_CBMP_code` với bản cũ `nq`:
   - Bản mới tích hợp mô hình **Sub-lane** (4 tiểu làn hẹp 0.875m / làn 3.5m).
   - Mô phỏng 3 hành vi đặc trưng xe máy: luồn lách 2D (`lateral_drift`), lọc khe hở đảo hàng chờ (`filter_through_gaps`), xả cụm đồng loạt (`platoon_dynamics`).
   - Sửa lỗi nghẽn sinh xe kịch bản High (sinh đủ 27,489 xe, tăng 65%).
   - Toàn bộ kết quả đối chiếu 10 replicate đều đạt ý nghĩa thống kê xuất sắc: **$p = 0.002 < 0.05$**.
2. Bổ sung `export_trajectories` vào `Main.gaml` và log pha đèn vào `Intersection.gaml`.
3. Xây dựng bộ script chuyển đổi `scripts/` (`export_replay_json.py`, `export_roads_geojson.py`, `export_signals_poles.py`).
4. Người dùng đã chạy GAMA cho toàn bộ 6 kịch bản (Low, Medium, High cho cả CAO và Baseline Fair).
5. Đóng gói và xuất toàn bộ 360 file `cycle_*.json` (từ chu kỳ 1 đến 60), 6 file `signals_*.json`, cập nhật `kpi_summary.json` và `junction_kpis.json`.
6. Commit: `af93282 feat(replay): ingest full 59-cycle sub-lane trajectories and 120s signals from Tran`.

---

## 2. Bằng Chứng Xác Minh Toàn Hệ Thống (Verification Evidence)

| Hạng mục | Lệnh thực thi | Kết quả | Chi tiết |
| :--- | :--- | :--- | :--- |
| **Node.js Automated Suites** | `node --test tests/*.test.mjs` | **29/29 PASS (100%)** | 0 fail, thời gian chạy: ~1.2s |
| **Python Unit Tests** | `python -m unittest tests/test_rider_moto_fusion.py` | **9/9 PASS (100%)** | NMS moto, ByteTrack 1-1, fusion rider-moto |
| **Production Build** | `npm run build` | **EXIT CODE 0** | 2272 modules transformed (15.72s) |
| **Signal Alignment Ratio** | `tests/signal_vehicle_alignment.test.mjs` | **PASS (99.7%)** | 356/357 xe dừng đúng vạch đèn đỏ |
| **Git Status** | `git status` | **CLEAN** | Nhánh `main`, up to date với `origin/main` |

---

## 3. Bản Đồ File Dữ Liệu Đã Nạp Mới

- `public/data/trajectories/cao/{Low_400, Medium_900, High_1400}/cycle_{1..60}.json`
- `public/data/trajectories/baseline/{Low_400, Medium_900, High_1400}/cycle_{1..60}.json`
- `public/data/signals_cao_{Low_400, Medium_900, High_1400}.json` & `signals_cao.json`
- `public/data/signals_baseline_{Low_400, Medium_900, High_1400}.json` & `signals_baseline.json`
- `public/data/kpi_summary.json` & `public/data/junction_kpis.json`

---

## 4. Công Việc Ưu Tiên Cho Session Tiếp Theo (Session 7)

1. **Live Signal Allocation Card (Tab 3 - Camera YOLO):**
   - Kết nối độ đo diện tích chiếm dụng $\phi(t)$ từ video camera thật (đã tính qua IPM $H(3\times 3)$) đưa trực tiếp vào công thức phân bổ thời lượng xanh Max-Pressure ($g_1, g_2$).
   - Thể hiện trọn vẹn chu trình Digital Twin: `Camera CCTV -> YOLOv8 Segment -> Homography IPM -> Phi(t) -> Live Max-Pressure Split`.
2. **Preset "Dòng xe hỗn hợp (Dị thể)" trong Lab (Tab 2):**
   - Thêm 1 preset mẫu: 1 xe tải ($18\text{ m}^2$) đối đầu 12 xe máy ($18\text{ m}^2$) để trực quan hóa việc Baseline (đếm xe) bị thiên vị 1 vs 12 trong khi CAO nhận định đúng áp lực cân bằng.

---

## 5. Suggested Skills Cho Agent Tiếp Theo

1. `frontend-design` — Thiết kế widget Live Signal Allocation Card tại Tab Camera.
2. `verification-before-completion` — Bắt buộc chạy kiểm thử 29 Node suites và build trước khi kết thúc bất kỳ thay đổi nào.
3. `systematic-debugging` — Sử dụng nếu phát hiện sai lệch bất thường trong quá trình render video hoặc bản đồ.
