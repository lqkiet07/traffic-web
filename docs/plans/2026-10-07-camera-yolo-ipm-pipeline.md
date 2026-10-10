# Camera YOLO & Mặt Phẳng Chim IPM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi Tab Camera YOLO từ khung tĩnh sang hệ thống Replay video trực quan hoàn chỉnh: đồng bộ video ngã tư Cần Thơ `intersection_1_roi.mp4` với lớp phủ Bbox/ByteTrack 2D và mặt phẳng chim IPM trực giao nắn bởi ma trận Homography $H(3 \times 3)$, hiển thị trực tiếp độ chiếm dụng diện tích $\phi(t)$.

**Architecture:** Áp dụng mô hình **Offline Replay + Metadata JSON**: phục vụ video tĩnh qua Vite kết hợp `camera_roi_meta.json`. Dùng Canvas 2D HTML5 nhẹ mượt (60 FPS, không dùng WebGL/Three.js) để chiếu tọa độ phối cảnh sang mặt phẳng chim, bảo toàn tài nguyên máy chấm.

**Tech Stack:** React 19, HTML5 `<video>`, Canvas 2D API, Lucide React, Node.js `node:assert` test runner.

## Global Constraints
- React 19 + Vite 6 + Tailwind CSS v4.
- Zero-dependency logic toán: viết thuần JavaScript trong `src/lib/`.
- Kiểm thử dùng `node:assert` trong `tests/*.test.mjs`, không dùng Jest/Vitest.
- Không sửa đổi Tab Replay 8 nút giao hoặc Tab Lab Thuật Toán.
- Giữ vững 23/23 tests hiện tại luôn PASS 100%.

---

### Task 1: Module Toán Học Biến Đổi Homography (`src/lib/homography.js`)
- [x] Step 1: Viết failing test `tests/homography.test.mjs`
- [x] Step 2: Cài đặt logic toán `src/lib/homography.js`
- [x] Step 3: Xác minh test PASS

### Task 2: Chuẩn Bị Video & Cấu Trúc Metadata JSON
- [x] Step 1: Đưa video mẫu vào `public/videos/intersection_1_roi.mp4`
- [x] Step 2: Tạo dữ liệu `public/data/camera_roi_meta.json`
- [x] Step 3: Viết test hợp đồng `tests/camera_meta_contract.test.mjs` và xác minh PASS

### Task 3: Nâng Cấp `CameraStreamZone` — Video Player & Canvas Bbox Overlay
- [x] Step 1: Tích hợp HTML5 `<video>` và Canvas overlay vẽ Bbox, ID, 4 điểm neo
- [x] Step 2: Thêm bộ điều khiển Scrubber, Play/Pause, tốc độ, lớp phủ toggles

### Task 4: Nâng Cấp `IpmZone` — Mặt Phẳng Chim 2D & Gauge Chiếm Dụng Động
- [x] Step 1: Cài đặt Canvas 2D mặt phẳng chim trực giao chiếu qua ma trận H
- [x] Step 2: Đồng bộ gauge đo phi(t) và bảng đối sánh Bbox hụt vs CAO
- [x] Step 3: Động hóa trạng thái PipelineStrip

### Task 5: Kiểm Thử Toàn Diện & Verification Final
- [ ] Step 1: Chạy toàn bộ 25 test suites đạt 100% PASS
- [ ] Step 2: Kiểm tra `npm run build` exit code 0
