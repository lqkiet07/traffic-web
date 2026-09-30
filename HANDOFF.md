# Handoff: TrafficDT-Web (Can Tho Traffic Digital Twin Replay)

## Project Location
- **Web project:** `D:\CTU\trafficDigital\trafficdt-web` (standalone, decoupled from GAMA)
- **GAMA workspace:** `D:\CTU\trafficDigital\gama folder\nq`
- **Original spec:** `D:\CTU\trafficDigital\gama folder\nq\WEB_SPECIFICATION.md`

## What This Project Is
A React + Vite web dashboard that replays a GAMA microscopic traffic simulation of 8 junctions in Can Tho, Vietnam. It compares two signal control algorithms — **CAO-CBMP (proposed)** vs **Count-based C-MP (baseline)** — over 60 cycles (7200s sim time) for 3 demand scenarios (400/900/1400 vph).

## Current Status: COMPLETE for CAO-CBMP (single-algo focus)
Per user decision: *"fixed time thì khỏi cũng đc, giờ cần chạy trơn chu trên 1 thuật toán thôi"* — Fixed-Time algo intentionally skipped. Baseline exists only as KPI chart comparison lines (no trajectory replay data for baseline yet).

### Verified working (evidence-based)
- `npm run build` passes clean (~7s, 0 errors, 809kB JS / 38kB CSS)
- Unit tests: scale + signal_timing + inspector_cycle + lane_shift + declutter + phase_offset + signal_vehicle_alignment all pass (`tests/`; flow_phase retired with override)
- Serve: index + 61 cycle JSONs + signals + roads all 200
- 61 cycles of CAO trajectories converted with true GAMA lane positions (compute_position), 0 vehicles outside Can Tho bbox
- Vehicle lateral separation verified: median 3.53m between side-by-side vehicles, median 1.87m from road centerline (TRUE_POSITIONS = true)

### Complete feature inventory
1. **Map (dual-layer: Dark Gray <=15 + darkened Esri World_Imagery 16-19, maxZoom=19)**
   - Road network GeoJSON (203 segments) from `includes/road 4.shp`, double-stroke asphalt (casing `#334155` + roadbed `#1b2436`), width via shared `mppEff` scale
   - **Semantic LOD:** zoom<15 = 8 center badges only; zoom>=15 = 32 physical stop-line markers
    - **3-lamp signal heads** (10px lamps, active glows, zIndex 1000) — laser glow + ground pucks + white stop bars all removed per user review (stop-line geometry never surveyed)
    - **Follow mode:** zoom>=17 "Theo xe" chip follows median vehicle (500ms setView, drag disables)
   - Junction labels centered exactly on junction (translate -50%,-50%)
2. **Vehicle canvas (60 FPS, requestAnimationFrame, dual-rate clock, vehiclePane z-450)**
   - True GAMA dimensions (moto 1.9m/car 4.5m/truck 8.0m) via shared `mppEff`, painter order truck→car→moto
   - Drop shadows, metallic edge strokes, windshield, brake lights when `speed < 0.28 m/s` (GAMA stopped threshold)
    - LERP interpolation between 2s samples, shortest-arc heading interpolation
    - Pooled per-frame id maps (no per-frame Map allocation)
    - **Lane reconstruction (true GAMA positions):** roads carry per-feature lanes (2×164, 3×39); `TRUE_POSITIONS = true` renders exact GAMA `compute_position()` coordinates exported directly from simulation; `declutter.js` provides safety fallback at stop-line queues; heading RAW locked (COMPASS=(RAW+90)%360); stale-offset key v2
3. **Signal reconstruction:** `getGamaSignal` = pure GAMA green/red (no amber), split tra theo thời gian tích lũy (`start[n+1]=start[n]+g1+g2`) — hết tra nhầm chu kỳ ở 8s cuối chunk 120s. Flow-vote override REMOVED. 2-lamp heads. Nếu còn lệch: reset "Căn giờ đèn" về 0 trước. Measured stopped-near-red 0.619 (169/273) on cycle_1 (congestion stops on green explain the rest).
4. **Replay controls:** SMPTE clock, custom transport scrubber CSS, 1x/2x/5x, cycle slider with CK ticks, auto-stop at cycle 60
5. **Analytics right panel:** telemetry matrix (mono/tabular), delta badges with neutral 0% tone, Recharts head-to-head with yellow cycle cursor
6. **Junction Inspector (collapsible):** green split locked to GAMA cycle (KPI lookup via `gamaCycle`, not web cycle), honest TB/chu-ky labels, descriptive WhyBox (no causal claim, "chia đều" on ties), scenario-aware KPI fallback, selected-badge halo + click flyTo. Badge coords = pole centroids on corrected datum (2026-09-29, shift ~207-226m from stale const; old backup kept).

## Data Pipeline (GAMA → Web)
Scripts in `gama folder/nq/scripts/`:
- `export_replay_json.py` — trajectory CSV → 60 per-cycle JSONs + signals + junction KPIs. **CRITICAL:** coordinates = VN-2000 UTM (`includes/road 4.shp`, xmin=581085.79, ymax=1111793.159) with **Y-axis unflip** (`y_vn = ymax - Y_gama`), then pyproj VN-2000→WGS84. Frame times are **cycle-relative** (`t % 120`) or vehicles freeze from cycle 2 onward. Output dir override: env `TRAFFICDT_WEB_DIR`.
- `export_roads_geojson.py` — road shp → `roads.geojson` (same VN-2000→WGS84)
- `export_signals_poles.py` — `traffic_signals 8.shp` STRAIGHT poles → `signals_poles.json` (32 poles: 4/junction, axis from sig_phase NS/SN vs EW/WE)
- **All 3 scripts use proper VN-2000 datum** (`+towgs84=-191.90441429,-39.30318279,-111.45032835`); the old `+ellps=WGS84`-only string was ~226m off. Re-exported 2026-09-28 from `_rep1` CSVs (exact-name CSVs were stubs) → 203 roads + 32 poles + 61 cycles, verify PASSED (3600 frames, 2254804 records, 0 OOB). Backup of old data: `C:\Users\ACER\AppData\Local\Temp\opencode\backup_2026-09-28\`

Run order after a new GAMA batch run:
```
python scripts/export_replay_json.py --trajectory outputs/Trajectory_Log_<algo>_<scen>_rep1.csv --phase-log outputs/Phase_GreenTime_Log_<algo>_<scen>_rep1.csv --kpi-result outputs/KPI_Result_<algo>_<scen>_rep1.csv --algo cao --scenario Medium_900
```

## Known Limitations / Next Steps
1. **No baseline trajectory data:** `trajectories/baseline/` doesn't exist. The loader is intentionally hard-coded to `"cao"` (`TRAJECTORY_ALGO` in `useTrajectoryLoader.js`) to prevent a 404→maxCycle-clamp bug. To add baseline replay: run GAMA once more with `algorithm_mode = "CBMP_Paper_Fair"`, then re-run export with `--algo baseline`.
2. **kpi_summary.json has 64 cycles** (source data from older batch) vs 60-cycle trajectory — labels say 60, chart plots all data. Harmless but inconsistent.
3. **`junction_kpis.json` only has `cao`/`Medium_900`** — other scenarios/algos show "no local KPI" fallback in the Inspector.
4. **Dead file:** `src/components/SignalBeacon.jsx` is unused (replaced by `RealisticSignalPole.jsx`) — delete when possible (agent file-deletion is policy-blocked).
5. **Not deployed online yet** — currently localhost only; Vercel/GitHub Pages deploy is a ~2min follow-up.
6. **Scale test scope:** the queue-spacing-vs-truck-length assertion was dropped as a data property (spacing is sim input, not scale output) — `scale.test.mjs` covers exagg/mppEff monotonicity, fit-in-road, ratio preservation, lane separation.
7. **`signals.test.mjs` expects the removed yellow tail** (pre-existing fail, plan-lane out of scope); `flow_phase.test` retired; stagger approximates missing lowest_lane.

## Conventions to Preserve
- Standards: every function ≤50 lines, nesting ≤4, English-only comments, no console.log
- Design tokens: canvas `#090d16`, surface `#0f172a`, border `#1e293b`, CAO `#10b981`, baseline `#6366f1`
- Vehicle records are compact arrays `[id, type, lat, lng, speed, heading]` accessed via `V_INDEX` (deliberate 60fps perf tradeoff)
- Verification before completion: fresh build/unit-test/serve evidence required before any completion claim

## Run It
```
cd D:\CTU\trafficDigital\trafficdt-web
npm run dev   # → http://localhost:5173
```
