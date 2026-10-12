# TrafficDT-Web — Project Status & Canonical Handoff

> **Dự án:** `trafficdt-web` (React 19 + Vite 6 + Tailwind 4 + Three.js + Python YOLOv8)  
> **Trạng thái:** **HOÀN THÀNH TOÀN BỘ 100% CÁC PHÂN HỆ VÀ KIỂM THỬ**  
> **Tài liệu bàn giao chính thức:** 👉 [`docs/HANDOFF-2026-10-12-SESSION7.md`](docs/HANDOFF-2026-10-12-SESSION7.md)

---

## Tổng Quan Nhanh Các Phân Hệ Đã Triển Khai:

1. **Tab 1: Replay Map (Mô phỏng GAMA 8 Nút giao Cần Thơ):**
   - 360 chu kỳ quỹ đạo xe Sub-lane thật (6 kịch bản: Low 400, Medium 900, High 1400 cho cả CAO và Baseline Fair).
   - Chu kỳ đèn 120s chuẩn hóa với 2 pha vàng 4s dọn nút độc lập ($Y=8\text{s}$).
   - 32 cột đèn tín hiệu 3 mắt chân thực trên bản đồ Leaflet.
   - Bảng đối chứng KPI chuẩn hóa `rep1` ($p = 0.002 < 0.05$).

2. **Tab 2: Algorithm Lab (Phòng Thí Nghiệm Thuật Toán Max-Pressure Liên Nút):**
   - Mô phỏng hành lang 2 nút 2D Canvas & 3D Three.js.
   - 4 kịch bản mẫu: *Nghịch lý xe máy che khuất*, *Kẹt dội ngược liên nút*, *Cân bằng*, và ***Dòng xe dị thể (1 Tải vs 12 Máy)***.
   - Động lực học xe máy 2D chân thực: dao động lắc ngang (`lateral drift`) và lọc khe hở (`gap filtering`).
   - Phản xạ đèn vàng (Dilemma Zone) hãm phanh dừng mượt mà.
   - Bộ giải đại số 5 bước Max-Pressure chi tiết cho cả 2 nút giao.

3. **Tab 3: Camera YOLO (Digital Twin từ Camera CCTV Thực Tế):**
   - Video thực tế giao lộ kết hợp nhận diện phương tiện YOLOv8 Segmentation & ByteTrack 1-1.
   - Ma trận phẳng chim Homography IPM $H(3\times 3)$.
   - Thẻ *Live Signal Allocation Card*: chuyển đổi diện tích chiếm dụng $\phi(t)$ từ camera thật thành nhịp xanh thời gian thực đối chứng với Baseline Bbox.

---

## Xác Minh Chất Lượng (Verification):
- **Node.js Automated Test Suites:** **31/31 PASS (100%)** (`node --test tests/*.test.mjs`).
- **Python Unit Tests:** **9/9 PASS (100%)** (`python -m unittest tests/test_rider_moto_fusion.py`).
- **Production Build:** `npm run build` exit code 0.

---

## Kho Lưu Trữ Tài Liệu Lịch Sử:
Toàn bộ các bản kế hoạch chi tiết và bàn giao các phiên trước được lưu trữ tại:
- Handoffs lịch sử: [`docs/archive/handoffs/`](docs/archive/handoffs/)
- Plans lịch sử: [`docs/archive/plans/`](docs/archive/plans/)
