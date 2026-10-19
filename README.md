# TrafficDT-Web · Can Tho Traffic Digital Twin

[![React 19](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite 6](https://img.shields.io/badge/Vite-6.0.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.0.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.186.1-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Automated Tests](https://img.shields.io/badge/Automated_Tests-35%2F35_Passing-success?logo=checkmarx&logoColor=white)](#verification--automated-testing)
[![License: Academic Non-Commercial](https://img.shields.io/badge/License-Academic_Non--Commercial-blue.svg)](LICENSE)

A web-based Digital Twin evaluation platform for adaptive traffic signal control using **CAO-CBMP (Continuous Area Occupancy & Corridor Back-pressure Max-Pressure)** designed specifically for heterogeneous motorcycle-dominated traffic in Can Tho City, Vietnam.

---

## 1. Core Scientific Contributions

Conventional urban traffic signal control systems (e.g., fixed-time Webster, actuated count-based, SCATS/SCOOT) fail in developing Southeast Asian cities where **85%+ of traffic volume consists of motorcycles**. TrafficDT-Web implements and benchmarks CAO-CBMP against discrete count baselines, addressing three fundamental scientific barriers:

1. **Mutual Occlusion Resilience in Dense Swarms:**
   - Under low-angle perspective urban CCTV cameras, dense motorcycle clusters suffer severe mutual occlusion, causing standard bounding-box detectors to miss **35% to 50%** of queued vehicles.
   - CAO-CBMP replaces discrete bounding-box counting with **continuous surface area occupancy $\phi(t)$ ($m^2$ or pixel footprint ratio)** projected via Inverse Perspective Mapping (IPM), maintaining high measurement fidelity even when individual boundaries merge.
2. **Heterogeneous Physical Footprint Weighting:**
   - Discrete vehicle count models treat 1 heavy truck ($18\,m^2$) identically to 1 motorcycle ($1.5\,m^2$), distorting queue pressure.
   - Continuous Area Occupancy directly reflects road space consumption, ensuring signal allocation mirrors physical congestion rather than arbitrary vehicle unit tallies.
3. **Corridor Back-Pressure & Anti-Spillback Coordination:**
   - Isolated intersection optimization risks transferring congestion to adjacent downstream links, triggering cascading gridlock.
   - CBMP incorporates downstream corridor back-pressure deduction:
     $$w = \max\left(0,\, \phi_{in} - 0.70 \times \phi_{out}\right)$$
     When the downstream egress link approaches saturation ($\phi_{out} \to 1.0$), weight $w \to 0$, suppressing green signal extension and preventing spillback into the intersection box.

---

## 2. System Pipeline

```
+---------------------------------------------------------------------------------------------------+
|                                      PERCEPTION & PROJECTION                                      |
|                                                                                                   |
|  [ Urban CCTV Stream ] ---> [ YOLOv8 Object Detection ] ---> [ ByteTrack Multi-Object Tracking ]  |
|      (Quang Trung)                 (Bbox / Conf)                    (Persistent Trajectories)     |
|                                                                                 |                 |
|                                                                                 v                 |
|  [ Metric Area Occupancy ] <--- [ Homography Matrix H(3x3) ] <--- [ Inverse Perspective Mapping ] |
|      phi(t) in m^2                     (Ground Plane)                           (IPM)             |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                     ALGEBRAIC OPTIMIZATION                                        |
|                                                                                                   |
|  [ 1. Ingress ROI Scan ]  --->  [ 2. Downstream Back-Pressure ]  --->  [ 3. Saturation Pressure ] |
|        (phi_in)                    w = max(0, phi_in - 0.70*phi_out)             gamma            |
|                                                                                  |                |
|                                                                                  v                |
|  [ 5. Signal Head Execution ]  <---  [ Phase Min/Max Bounds ]  <---  [ 4. Green Split Allocation ]|
|       (Dual Corridors)                  (G_min <= G <= G_max)               (Proportional Split)  |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                  DIGITAL TWIN MACRO SIMULATION                                    |
|                                                                                                   |
|  [ GAMA Simulation Engine ] ===> [ Multi-Cycle Replay Engine ] ===> [ Head-to-Head Comparative KPI ]|
|      (360 Trajectory Chunks)             (Can Tho Network)                (p = 0.002 < 0.05)      |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. The Three Functional Modules

The application is structured into three integrated modules accessible through the primary top navigation bar:

### Module 1: Macro Network Digital Twin (`Tab 1 - Replay Mô Phỏng`)
- **Urban Network Topology:** Evaluates 8 interconnected signalized junctions within Can Tho City's core arterial grid, visualized with 32 realistic 3-lamp signal poles dynamically synchronized with simulation time.
- **Multi-Flow Trajectory Dataset:** Replays 360 sub-lane vehicle trajectory chunks across three distinct traffic demand profiles:
  - *Low Volume:* 400 vehicles/hour
  - *Medium Volume:* 900 vehicles/hour
  - *High Saturation:* 1400 vehicles/hour
- **Statistical Head-to-Head Validation:** Real-time synchronized comparison between baseline fixed-time/count-based control and CAO-CBMP across 59 evaluation cycles. Empirically demonstrates significant reductions in average queue delay and stop rate ($p = 0.002 < 0.05$).

### Module 2: Micro 3D Algorithm Lab (`Tab 2 - Lab Thuật Toán`)
- **Interactive 3D Corridor Simulation:** WebGL-accelerated 3D environment built with Three.js rendering two adjacent intersections along a shared corridor with dynamic vehicle kinematics and realistic signal heads.
- **Transparent 5-Step White-Box Solver:** Inspects the algebraic decision pipeline at each simulation step:
  1. *ROI Scan:* Calculates instantaneous continuous ingress occupancy $\phi_{in}$.
  2. *Downstream Deduction:* Computes corridor net demand $w = \max(0, \phi_{in} - 0.70 \times \phi_{out})$.
  3. *Saturation Pressure:* Evaluates differential pressure $\gamma$ across conflicting phases.
  4. *Green Split Allocation:* Optimizes phase green duration subject to minimum and maximum cycle bounds ($G_{min} \le G \le G_{max}$).
  5. *Release Execution:* Applies signal phase actuation across dual corridor nodes.
- **Real-World Stress Scenarios:**
  - `1. Giờ cao điểm xe máy`: Demonstrates the breakdown of discrete Bbox counting under dense motorcycle swarms and validates continuous area occupancy stability.
  - `2. Kẹt xe dây chuyền`: Simulates downstream blockages to demonstrate CBMP back-pressure dampening, preventing cascading corridor spillback.

### Module 3: Edge Perception & IPM Projection (`Tab 3 - Camera CCTV`)
- **Field Surveillance Feed:** Real-world 720p CCTV camera footage recorded at the high-density **Quang Trung** intersection in Can Tho City.
- **Vision Tracking Pipeline:** YOLOv8 bounding-box detection fused with ByteTrack multi-object tracking for persistent ID association across frames.
- **Inverse Perspective Mapping (IPM):** Calibrated $3 \times 3$ planar homography matrix $H$ mapping camera perspective coordinates to a standardized 4:3 Bird's Eye View (BEV) ground plane.
- **Continuous Area Metric:** Quantifies real-time lane occupancy ratio $\phi(t)$ by accumulating projected road contact footprints over defined Regions of Interest (ROI).

---

## 4. Directory Structure

```
trafficdt-web/
├── public/
│   ├── data/                     # Simulation trajectory chunks & network topology
│   │   ├── camera_roi_meta.json  # CCTV ROI coordinates & homography matrices
│   │   ├── junctions.json        # 8-junction network coordinates & signal configurations
│   │   └── trajectories/         # 360 trajectory chunks (Low_400, Medium_900, High_1400)
│   └── videos/                   # Calibrated CCTV camera feeds (Quang Trung intersection)
├── src/
│   ├── components/               # React UI & Visualization components
│   │   ├── AlgorithmLab.jsx      # Module 2 algorithm lab controller
│   │   ├── CameraView.jsx        # Module 3 CCTV & IPM visualizer
│   │   ├── ComparisonCharts.jsx  # Head-to-head performance metric charts
│   │   ├── Corridor3DCanvas.jsx  # Three.js 3D WebGL corridor canvas
│   │   ├── Header.jsx            # Top navigation bar & tab switcher
│   │   ├── IpmZone.jsx           # Bird's Eye View projection viewport
│   │   ├── JunctionInspector.jsx # Detailed per-junction state inspector
│   │   ├── MapView.jsx           # Module 1 Leaflet network map
│   │   └── RealisticSignalPole.jsx# 3D/2D synchronized signal pole renderer
│   ├── hooks/                    # Custom React hooks (clock, trajectory loader, playback)
│   ├── lib/                      # Core mathematical & simulation libraries
│   │   ├── cbmp.js               # CAO-CBMP optimization equations & split solver
│   │   ├── corridorSim.js        # Microscopic corridor physics simulation engine
│   │   ├── corridor3dScene.js    # Three.js scene graph, lights, meshes & camera controls
│   │   ├── declutter.js          # Map label & signal icon layout decluttering
│   │   ├── homography.js         # Matrix operations & 3x3 planar projection math
│   │   └── scale.js              # Geographic & metric coordinate transformers
│   ├── App.jsx                   # Main application state container & router
│   └── index.css                 # Tailwind CSS 4 styling definitions
├── tests/                        # Automated unit & integration test suites (Node.js & Python)
│   ├── cbmp_math.test.mjs        # Max-Pressure split & deduction mathematical tests
│   ├── corridor_sim.test.mjs     # Corridor physics & kinematic update tests
│   ├── homography.test.mjs       # IPM projection mathematical accuracy tests
│   ├── readme_contract.test.mjs  # Documentation integrity verification
│   └── test_rider_moto_fusion.py # Python computer vision & tracking fusion unit tests
├── scripts/                      # Preprocessing & analysis utilities
│   ├── extract_yolo_ipm.py       # Python pipeline for YOLOv8 detection & homography projection
│   └── export_appendix_docx.py   # Automated documentation & appendix generator
├── docs/                         # Scientific reports, figures & engineering logs
│   ├── figures/                  # High-resolution architectural figures & diagrams
│   └── TSV2025-144_BaoCao.pdf    # Research project technical report
├── package.json
├── vite.config.js
└── README.md
```

---

## 5. Getting Started & Installation

### Prerequisites
- **Node.js:** `>= 20.x`
- **npm:** `>= 10.x`
- **Python:** `>= 3.10` (required for computer vision & tracking preprocessing scripts)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anomalyco/trafficdt-web.git
   cd trafficdt-web
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Launch the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

## 6. Verification & Automated Testing

The codebase enforces strict test-driven contracts across mathematical solvers, UI components, trajectory parsers, and projection math.

```bash
# Run all 35 Node.js automated test suites
node --test tests/*.test.mjs

# Run Python computer vision & tracking unit tests
python -m unittest tests/test_rider_moto_fusion.py

# Production build verification
npm run build
```

---

## 7. Academic Attribution & Research Team

Đề tài nghiên cứu được thực hiện tại **Trường Đại học Cần Thơ (CTU)**:

- **Cơ quan chủ trì:** Khoa Công nghệ Thông tin & Truyền thông, Trường Đại học Cần Thơ.
- **Nhóm nghiên cứu & Phát triển:** Nhóm sinh viên thực hiện đề tài.
- **Kênh liên hệ & Hợp tác nghiên cứu:**
  - Mọi câu hỏi, đề xuất kế thừa thuật toán hoặc trao đổi học thuật, vui lòng mở [GitHub Issues](https://github.com/lqkiet07/traffic-web/issues).
  - Hoặc liên hệ trực tiếp qua hồ sơ GitHub: [@lqkiet07](https://github.com/lqkiet07).

### 📖 Trích Dẫn Khoa Học (Citation)
Nếu bạn sử dụng mã nguồn, bộ dữ liệu mô phỏng hoặc nền tảng này cho các nghiên cứu tiếp nối, vui lòng trích dẫn theo định dạng sau:

```bibtex
@misc{trafficdt_web_2026,
  author       = {Kiet, L. Q. and Research Team and Can Tho University},
  title        = {TrafficDT-Web: A Web-based Digital Twin Evaluation Platform for Heterogeneous Traffic Signal Control},
  year         = {2026},
  publisher    = {GitHub},
  howpublished = {\url{https://github.com/lqkiet07/traffic-web}},
  note         = {College of Information and Communication Technology, Can Tho University, Vietnam}
}
```

---

## 8. License & Academic Integrity

Dự án được bảo hộ theo giấy phép **Academic Non-Commercial & Research License**. Mọi quyền được bảo lưu bởi Nhóm tác giả và Trường Đại học Cần Thơ. 
Nghiêm cấm sao chép phục vụ mục đích thương mại hoặc gian lận nộp đồ án học thuật. Xem chi tiết điều khoản tại tệp [`LICENSE`](LICENSE).
