# Handoff: Module Replay Mô phỏng Giao thông (DONE — 30/09/2026)

> Trạng thái: module replay (xe + đèn + bản đồ + inspector) đã hoàn thành và verified.
> Người đọc tiếp theo: kỹ sư nhận module khác, hoặc người quay lại bảo trì module này.
> Tài liệu tổng quan dự án (không trùng lặp ở đây): xem `HANDOFF.md`.

## 1. Bối cảnh & vị trí

- **Web repo (git riêng, tách repo cha):** `D:\CTU\trafficDigital\trafficdt-web`
- **GAMA workspace:** `D:\CTU\trafficDigital\gama folder\nq` (models + scripts + outputs)
- **Chạy web:** `cd trafficdt-web && npm run dev` → http://localhost:5173
- **Lịch sử local (git log):**
  - `7f06d97` — backup: full working tree before lane-reconstruction plan
  - `e6e0e89` — feat: integrate true GAMA lane positions and enable TRUE_POSITIONS
  - `69a9aae` — fix(signals): align GAMA log cycle index shift and optimize 60fps render loop (HEAD)
- **Working tree:** sạch (không file đổi chưa commit).

## 2. Đã làm tới đâu (từng hạng mục + evidence)

### 2.1. Xe tách làn đúng như GAMA vẽ — DONE
- **Vấn đề gốc:** file xuất ghi `v.location` (tim đường 1D) → 2 xe khác làn trùng tọa độ tới `0.00m`; GAMA vẽ đẹp vì dùng `compute_position()` (`Vehicles.gaml:110-126`).
- **Đã sửa (GAMA, diff 3 dòng pure-read, không đổi logic mô phỏng):** `nq/models/Main.gaml:102-112` ghi `pos <- v.compute_position()` thay vì `v.location`; header CSV giữ nguyên 8 cột.
- **Đã re-export:** 61 file `public/data/trajectories/cao/cycle_*.json` (2.284.465 records), `python export_replay_json.py --verify` PASSED, 0 out-of-bounds.
- **Web:** `TRUE_POSITIONS = true` (`VehicleCanvas.jsx:18`) vẽ trực tiếp tọa độ thật; giữ `declutter.js` làm lưới an toàn hàng chờ.
- **Evidence:** median tách làn side-by-side **3.53m** (trước: 0.02m); median cách tim đường **1.87m**; build exit 0.

### 2.2. Đèn xanh/đỏ khớp hành vi xe — DONE
- **Vấn đề gốc:** log GAMA ghi nhịp đèn của chu kỳ KẾ TIẾP dưới nhãn chu kỳ hiện tại (`Intersection.gaml:1124-1128` tính `compute_green_time` rồi `log_kpi` ngay) → web tra nhầm, "xanh mà dừng, đỏ mà chạy".
- **Đã sửa (web only):** `getGamaSignal` (`lib/data.js:122-157`) — Cycle 1 chạy mặc định 56/56; Cycle K≥2 đọc log dòng `K-1`; green/red thuần (GAMA không có vàng); tra cộng dồn thời gian.
- **Đã gỡ:** flow-vote override (vote la bàn sai trên mạng chéo ~45°); `flow.js` + `flow_phase.test` nằm chết trên đĩa (chưa xóa được do policy).
- **Evidence:** `signal_vehicle_alignment.test` — stopped-near-red **0.919 (328/357)** trên cycle_1 (trước: 0.619); `signal_timing.test` PASS.

### 2.3. Hiệu năng 60fps — DONE
- Bỏ `assignLanes` (quét 203 đoạn × hàng nghìn đỉnh) khỏi `drawFrame` mỗi frame khi `TRUE_POSITIONS=true` (`VehicleCanvas.jsx:76`).
- Clock đèn flush 20Hz (`usePlaybackClock.js:41`, `100→50ms`).
- `lane.js` dùng `V_INDEX` thay chỉ số cứng; tách `useCanvasLifecycle` để component ≤50 dòng.
- Evidence: build 5–7s exit 0; cảm nhận mượt (không có harness đo FPS trong repo).

### 2.4. Junction Inspector + badge — DONE
- Badge = centroid 4 trụ/đài trên datum đúng (`junctions.json` tính lại 2026-09-29, shift ~207–226m so với hằng cũ; backup cũ đã mất, chỉ còn centroid mới).
- KPI khóa theo `gamaCycle` (không lệch chu kỳ web 120s vs GAMA 112s); nhãn "TB/chu kỳ" trung thực; WhyBox văn mô tả (bỏ suy diễn ngược); fallback ghi rõ kịch bản thiếu; badge chọn có halo + click flyTo; núm "Căn giờ đèn" key v2 (`trafficdt.phaseOffsetS.v2`).
- Evidence: `inspector_cycle.test` PASS.

### 2.5. Hạ tầng dữ liệu kèm theo — DONE
- `roads.geojson`: 203 features có `lanes`/`width` (2 làn×164, 3 làn×39); `RoadLayer` rộng theo từng đoạn.
- Heading lock: GAMA raw `0=Đông, 90=Nam`, `COMPASS=(RAW+90)%360` (sai số 1.76°/1739 mẫu).
- `.gitignore` có `.env/*.pem/*.key`; repo không chứa secret.
- Tests: **8/8 PASS** (`scale`, `signal_timing`, `inspector_cycle`, `lane_shift`, `declutter`, `phase_offset`, `signals`, `signal_vehicle_alignment`).

## 3. Cái gì còn là VỎ (bấm không đổi lõi replay) — việc tiếp theo

| Tính năng | Hiện trạng | Muốn thành thật thì cần |
|---|---|---|
| Nút gạt CAO-CBMP / Đếm xe (`Header.jsx:43-62`) | Xe+đèn hard-code `cao` (`useTrajectoryLoader.js:45`); gạt baseline chỉ đổi 2 line chart + banner | Chạy GAMA `algorithm_mode="CBMP_Paper_Fair"` + export `--algo baseline` → `trajectories/baseline/`, `signals_baseline.json`, `junction_kpis[baseline]`; bỏ hard-code |
| Chọn kịch bản Low/High (`Header.jsx:21-41`) | `junction_kpis`/`signals`/`trajectories` chỉ có `Medium_900`; đổi scenario → Inspector trắng KPI, xe vẫn chạy Medium | Chạy thêm 2 batch demand + export 2 scenario |
| Cycle 62–64 | Trajectory 61 file, KPI/signal có 64 | Chạy batch dài hơn hoặc chấp nhận clamp `maxCycle` |

## 4. Tồn đọng kỹ thuật (không chặn)

- `src/lib/flow.js` + `tests/flow_phase.test.mjs`: chết (override đã gỡ), xóa tay khi dọn.
- `src/components/SignalBeacon.jsx`: dead từ đầu dự án, xóa tay khi dọn.
- Stagger làn là xấp xỉ (log thiếu `lowest_lane` thật) — không còn ảnh hưởng vì đã có tọa độ thật, chỉ còn ý nghĩa với dữ liệu cũ.
- Chunk JS ~815kB (cảnh báo >500kB, chưa code-split).

## 5. Lệnh verify nhanh (copy-paste)

```bash
cd D:\CTU\trafficDigital\trafficdt-web
node tests/scale.test.mjs && node tests/signal_timing.test.mjs && node tests/inspector_cycle.test.mjs && node tests/lane_shift.test.mjs && node tests/declutter.test.mjs && node tests/phase_offset.test.mjs && node tests/signals.test.mjs && node tests/signal_vehicle_alignment.test.mjs
npm run build
npm run dev
```

Checklist mắt: xe tách làn không đè; bám 1 nút 1 chu kỳ 112s (xe chảy chiều nào đèn chiều đó xanh); tua CK10/20/30 không lệch; pan/zoom mượt; đổi Low/High chỉ chart tổng đổi số (đúng bản chất vỏ).

## 6. Suggested skills (session tiếp theo)

- Làm baseline/Low-High replay (cần chạy batch GAMA tốn giờ): `grill-with-docs` trước, rồi `writing-plans` → `subagent-driven-development`.
- Bug mới: `systematic-debugging`. Sửa UI: `frontend-design`. Review trước commit: `code-review`.
- Tuyệt đối không commit/push khi chưa được yêu cầu; GAMA thuộc repo cha — commit tách bạch với web.
