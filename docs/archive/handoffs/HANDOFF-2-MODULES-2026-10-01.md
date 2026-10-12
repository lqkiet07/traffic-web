# Handoff: TrafficDT-Web — 2 Modules Moi (Lab Thuat Toan + Camera YOLO)

> Trang thai: Replay 8 nut da DONE (14/14 tests, build sach). Chuan bi lam 2 modules moi.
> Nguoi doc tiep theo: ky su / agent tiep quan 2 modules.
> Tai lieu tong quan (khong trung lap): xem `HANDOFF.md`, `HANDOFF-REPLAY-MODULE-2026-09-30.md` trong `D:\CTU\trafficDigital\trafficdt-web\`.

## 1. Vi tri & Working Tree

- **Web:** `D:\CTU\trafficDigital\trafficdt-web` (React 19 + Vite 6 + Tailwind)
- **GAMA:** `D:\CTU\trafficDigital\gama folder\nq` (models + scripts + outputs)
- **HEAD:** `69a9aae` + uncommitted (da verify, KHONG commit khi chua yeu cau)
- **Hien trang data:**
  - Trajectories: 60 files that `trajectories/cao/cycle_1..60.json` (stub 61 da xoa)
  - Signals + junction_kpis: 64 entries rep1 (1..64)
  - kpi_summary: Medium 64 rep1 1:1, Low/High 64 legacy excel
  - maxCycle = 60, panels tra `floor(t/112)` (gama clock)
- **Verify baseline:** 14 tests PASS, alignment 0.919 (328/357), `npm run build` exit 0 (~814kB)

## 2. Quyet dinh Grill da chot (5/5 cau)

1. **YOLO:** A — clip mau quay san + script Python offline trich toa do GPS truoc, web phat song song (khong live server)
2. **Lab UI:** A — Tab rieng tren Header, khong nhet vao Inspector hep
3. **Camera UI:** A — Tab thu 3 doc lap `[Replay] [Lab] [Camera YOLO]`
4. **Lab presets:** A — 3 nut kich ban mau + sliders tu do
5. **Trinh tu:** A — Lab truoc (toan GAMA co san), Camera ngay sau khi user co clip

## 3. Module 1: Lab Thuat Toan CAO-CBMP (lam truoc)

**Files tao moi:**
- `src/lib/cbmp.js` — pure math tu GAMA (khong DOM/React)
- `src/components/AlgorithmLab.jsx` — UI sandbox
- `tests/cbmp_math.test.mjs` — TDD khoa toan

**Files sua nhe:**
- `src/components/Header.jsx` — them tab switcher 3 tab
- `src/App.jsx` — state `viewMode`, `setIsPlaying(false)` khi sang lab

**Cong thuc GAMA (Main.gaml + Intersection.gaml):**
- Dien tich: moto 1.5, car 7.5, truck 18.0 (m2); zone mau 150 m2
- `phi = min(1.0, sum(A)/A_zone)`
- Re: straight 0.70, left 0.15, right 0.15
- `w = max(0, phi_in - sum(r*phi_out))`
- `gamma = 2.5 * w`
- `g = 10 + 92 * (gamma/sum)`; tong <0.05 thi 56/56; cycle 120s, lost 8s, min 10s
- Baseline: dem xe (moto=car=truck=1.0), ban kinh 150m (Fair 45m)

**3 presets:**
1. Nghich ly o-to/tai: P1 it xe to vs P2 dong xe may → CAO thang
2. Can bang: chia deu 56/56
3. Bao hoa: 1 pha 100% → xanh max 102s

## 4. Module 2: Camera YOLO Sync Replay (sau khi co clip)

**Kien truc:** Offline Extraction → Synced Replay (khong AI server)
- Script Python: YOLOv8 + ByteTrack + Homography IPM → `camera_trajectories.json` format `[id,type,lat,lng,speed,heading]`
- Web Dual View: trai map 1 nut spawn xe, phai `<video>`; Play dong bo theo time
- Hien tai: tab Header de placeholder "Sap ra mat / Cho video"

## 5. Vung dong bang (KHONG cham)

- `src/lib/data.js` clock/getGamaSignal, `usePlaybackClock.js`, `VehicleCanvas.jsx` loop
- Tieu chuan: ham ≤50 dong, nesting ≤4, EN comments, khong console.log
- Tokens: `#090d16` `#0f172a` `#1e293b` `#10b981` `#6366f1`
- Verify: full tests + `npm run build` exit 0 truoc moi claim

## 6. Suggested skills (session tiep theo)

- Lam Lab: `writing-plans` → `subagent-driven-development` (hoac `tdd`)
- UI Lab dep: `frontend-design`
- Chot xong: `verification-before-completion`
- Camera sau: `grill-with-docs` lai khi co clip that (Homography, format video)
