import argparse
import json
from pathlib import Path
import sys
from typing import NamedTuple
import cv2
import numpy as np
from ultralytics import YOLO

SRC_ANCHORS = [[170, 237], [501, 259], [323, 484], [3, 342]]
DST_IPM = [[0, 0], [400, 0], [400, 300], [0, 300]]
ROAD_AREA_M2 = 150.0

CLASS_MAP = {
    0: {"type": "person", "std_area": 0.0},
    2: {"type": "car", "std_area": 7.5},
    3: {"type": "moto", "std_area": 1.5},
    5: {"type": "bus", "std_area": 18.0},
    7: {"type": "truck", "std_area": 18.0},
}

CONF_THRESHOLDS = {
    0: 0.35,  # person
    2: 0.25,  # car
    3: 0.15,  # motorcycle
    5: 0.25,  # bus
    7: 0.25,  # truck
}


class OverlapMetrics(NamedTuple):
    iou: float
    iomin: float


class CandidateBox:
    def __init__(self, cls_id, conf, x1, y1, x2, y2):
        self.cls_id = int(cls_id)
        self.conf = float(conf)
        self.x1 = float(x1)
        self.y1 = float(y1)
        self.x2 = float(x2)
        self.y2 = float(y2)


def _normalize_box(box):
    if hasattr(box, "x1") and hasattr(box, "y1") and hasattr(box, "x2") and hasattr(box, "y2"):
        return [float(box.x1), float(box.y1), float(box.x2), float(box.y2)]
    if isinstance(box, dict):
        if "x1" in box:
            return [float(box["x1"]), float(box["y1"]), float(box["x2"]), float(box["y2"])]
        if "bbox" in box:
            x, y, w, h = box["bbox"]
            return [float(x), float(y), float(x + w), float(y + h)]
    return [float(box[0]), float(box[1]), float(box[2]), float(box[3])]


def box_overlap_metrics(bA, bB):
    boxA = _normalize_box(bA)
    boxB = _normalize_box(bB)

    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    inter_w = max(0.0, xB - xA)
    inter_h = max(0.0, yB - yA)
    inter_area = inter_w * inter_h

    areaA = max(0.0, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    areaB = max(0.0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

    union_area = areaA + areaB - inter_area
    iou = (inter_area / union_area) if union_area > 0 else 0.0
    min_area = min(areaA, areaB)
    iomin = (inter_area / min_area) if min_area > 0 else 0.0

    return OverlapMetrics(iou=float(iou), iomin=float(iomin))


def compute_homography(src_points, dst_points):
    src_roi = np.array(src_points, dtype=np.float32)
    dst_roi = np.array(dst_points, dtype=np.float32)
    return src_roi, cv2.getPerspectiveTransform(src_roi, dst_roi)


def project_point(H, point):
    pt = np.array([point[0], point[1], 1.0], dtype=np.float64)
    res = H @ pt
    if res[2] != 0:
        return [float(res[0] / res[2]), float(res[1] / res[2])]
    return [0.0, 0.0]


def resolve_video_path(video_arg):
    vpath = Path(video_arg)
    if vpath.exists():
        return vpath
    alt = Path(__file__).resolve().parent.parent / video_arg
    if alt.exists():
        return alt
    return vpath


class CentroidTracker:
    def __init__(self, max_dist=55.0):
        self.next_id = 1
        self.tracks = {}
        self.max_dist = max_dist

    def update(self, items, frame_idx):
        assigned = []
        used_ids = set()
        for it in items:
            cx, cy = it["bottom_center"]
            best_id, min_d = None, 1e9
            for tid, (tcx, tcy, _) in self.tracks.items():
                if tid in used_ids:
                    continue
                d = ((cx - tcx) ** 2 + (cy - tcy) ** 2) ** 0.5
                if d < min_d and d < self.max_dist:
                    min_d = d
                    best_id = tid
            if best_id is not None:
                self.tracks[best_id] = (cx, cy, frame_idx)
                used_ids.add(best_id)
                assigned.append(best_id)
            else:
                tid = self.next_id
                self.next_id += 1
                self.tracks[tid] = (cx, cy, frame_idx)
                used_ids.add(tid)
                assigned.append(tid)
        return assigned


def process_frame_vehicles(boxes, src_roi, H, tracker=None, frame_idx=0):
    if boxes is None or len(boxes) == 0:
        return [], []

    candidates = []
    for box in boxes:
        cls_id = int(box.cls[0].item() if hasattr(box.cls, "__len__") or hasattr(box.cls, "item") else box.cls)
        if cls_id not in CONF_THRESHOLDS:
            continue

        conf = float(box.conf[0].item() if hasattr(box.conf, "__len__") or hasattr(box.conf, "item") else box.conf)
        if conf < CONF_THRESHOLDS[cls_id]:
            continue

        if hasattr(box.xyxy[0], "cpu"):
            xyxy = box.xyxy[0].cpu().numpy()
        else:
            xyxy = box.xyxy[0]
        if hasattr(xyxy, "tolist"):
            xyxy = xyxy.tolist()
        x1, y1, x2, y2 = float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])
        cx = (x1 + x2) / 2.0
        cy = y2

        if cv2.pointPolygonTest(src_roi, (cx, cy), False) < 0:
            continue

        candidates.append(CandidateBox(cls_id, conf, x1, y1, x2, y2))

    cars_trucks = [c for c in candidates if c.cls_id in (2, 5, 7)]
    raw_motos = [c for c in candidates if c.cls_id == 3]
    persons = [c for c in candidates if c.cls_id == 0]

    deduped_motos = []
    for moto in sorted(raw_motos, key=lambda m: m.conf, reverse=True):
        matched = False
        mcx = (moto.x1 + moto.x2) / 2.0
        mcy = (moto.y1 + moto.y2) / 2.0
        for kept in deduped_motos:
            metrics = box_overlap_metrics(
                [moto.x1, moto.y1, moto.x2, moto.y2],
                [kept.x1, kept.y1, kept.x2, kept.y2],
            )
            kcx = (kept.x1 + kept.x2) / 2.0
            kcy = (kept.y1 + kept.y2) / 2.0
            dist = ((mcx - kcx) ** 2 + (mcy - kcy) ** 2) ** 0.5
            if metrics.iou >= 0.30 or metrics.iomin >= 0.40 or dist <= 18.0:
                kept.x1 = min(kept.x1, moto.x1)
                kept.y1 = min(kept.y1, moto.y1)
                kept.x2 = max(kept.x2, moto.x2)
                kept.y2 = max(kept.y2, moto.y2)
                matched = True
                break
        if not matched:
            deduped_motos.append(moto)
    motos = deduped_motos

    merged_motos = []
    matched_person_indices = set()

    for moto in motos:
        cur_x1, cur_y1, cur_x2, cur_y2 = moto.x1, moto.y1, moto.x2, moto.y2
        for p_idx, person in enumerate(persons):
            if p_idx in matched_person_indices:
                continue
            metrics = box_overlap_metrics(
                [moto.x1, moto.y1, moto.x2, moto.y2],
                [person.x1, person.y1, person.x2, person.y2],
            )
            if metrics.iou >= 0.20 or metrics.iomin >= 0.35:
                cur_x1 = min(cur_x1, person.x1)
                cur_y1 = min(cur_y1, person.y1)
                cur_x2 = max(cur_x2, person.x2)
                cur_y2 = max(cur_y2, person.y2)
                matched_person_indices.add(p_idx)

        w = cur_x2 - cur_x1
        h = cur_y2 - cur_y1
        cx = cur_x1 + w / 2.0
        cy = cur_y2
        ipm_u, ipm_v = project_point(H, (cx, cy))
        merged_motos.append({
            "type": "moto",
            "bbox": [round(cur_x1, 1), round(cur_y1, 1), round(w, 1), round(h, 1)],
            "bottom_center": [round(cx, 1), round(cy, 1)],
            "ipm": [round(ipm_u, 2), round(ipm_v, 2)],
            "std_area": 1.5,
            "speed": 0.0,
        })

    for p_idx, person in enumerate(persons):
        if p_idx not in matched_person_indices:
            w = person.x2 - person.x1
            h = person.y2 - person.y1
            cx = person.x1 + w / 2.0
            cy = person.y2
            ipm_u, ipm_v = project_point(H, (cx, cy))
            merged_motos.append({
                "type": "moto",
                "bbox": [round(person.x1, 1), round(person.y1, 1), round(w, 1), round(h, 1)],
                "bottom_center": [round(cx, 1), round(cy, 1)],
                "ipm": [round(ipm_u, 2), round(ipm_v, 2)],
                "std_area": 1.5,
                "speed": 0.0,
            })

    car_truck_vehicles = []
    for ct in cars_trucks:
        w = ct.x2 - ct.x1
        h = ct.y2 - ct.y1
        cx = ct.x1 + w / 2.0
        cy = ct.y2
        ipm_u, ipm_v = project_point(H, (cx, cy))
        spec = CLASS_MAP[ct.cls_id]
        car_truck_vehicles.append({
            "type": spec["type"],
            "bbox": [round(ct.x1, 1), round(ct.y1, 1), round(w, 1), round(h, 1)],
            "bottom_center": [round(cx, 1), round(cy, 1)],
            "ipm": [round(ipm_u, 2), round(ipm_v, 2)],
            "std_area": spec["std_area"],
            "speed": 0.0,
        })

    final_vehicles = car_truck_vehicles + merged_motos

    if tracker is not None and final_vehicles:
        assigned_ids = tracker.update(final_vehicles, frame_idx)
        for cand, tid in zip(final_vehicles, assigned_ids):
            cand["id"] = tid
    else:
        for idx, cand in enumerate(final_vehicles, start=1):
            cand["id"] = idx

    ipm_points = [c["ipm"] for c in final_vehicles]
    return final_vehicles, ipm_points


def compute_metrics(vehicles, ipm_points):
    detected_area = sum(v["std_area"] for v in vehicles)

    if ipm_points:
        u_vals = [p[0] for p in ipm_points]
        v_vals = [p[1] for p in ipm_points]
        u_span = min(400.0, max(u_vals) - min(u_vals) + 20.0)
        v_span = min(300.0, max(v_vals) - min(v_vals) + 30.0)
        continuous_area = round((u_span * v_span / (400.0 * 300.0)) * ROAD_AREA_M2, 2)
    else:
        continuous_area = 0.0

    total_area = max(detected_area, continuous_area)
    occupancy_phi = min(1.0, round(total_area / ROAD_AREA_M2, 4))

    std_unit = 2.65 if any(v["type"] == "moto" for v in vehicles) else 7.5
    gt_count = max(len(vehicles), int(round(continuous_area / std_unit))) if continuous_area > 0 else len(vehicles)
    occlusion_gap = gt_count - len(vehicles)
    loss_pct = round((occlusion_gap / gt_count) * 100, 1) if gt_count > 0 else 0.0

    return {
        "detected_area": detected_area,
        "continuous_area": continuous_area,
        "total_area": total_area,
        "occupancy_phi": occupancy_phi,
        "ground_truth_count": gt_count,
        "occlusion_gap": occlusion_gap,
        "loss_pct": loss_pct,
    }


def run_pipeline(video_path, model_path="yolov8n.pt", dry_run=False, output_path=None):
    src_roi, H = compute_homography(SRC_ANCHORS, DST_IPM)
    model = YOLO(model_path)
    tracker = CentroidTracker(max_dist=55.0)

    vpath = resolve_video_path(video_path)
    cap = cv2.VideoCapture(str(vpath))
    if not cap.isOpened():
        print(f"Error: Unable to open video {vpath}", file=sys.stderr)
        sys.exit(1)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = round(total_frames / fps, 1) if fps > 0 else 193.3
    step = max(1, int(round(fps / 2.0))) if fps > 0 else 15
    max_frames = 5 if dry_run else None

    processed_frames = []
    frame_idx = 0
    sampled_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % step == 0:
            results = model(frame, conf=0.15, classes=[0, 2, 3, 5, 7], verbose=False)
            boxes = results[0].boxes
            vehicles, ipm_points = process_frame_vehicles(boxes, src_roi, H, tracker=tracker, frame_idx=sampled_count)
            metrics = compute_metrics(vehicles, ipm_points)

            timestamp = round(frame_idx / fps, 2) if fps > 0 else sampled_count * 0.5
            frame_entry = {
                "time": timestamp,
                "occupancy_phi": metrics["occupancy_phi"],
                "total_area": metrics["total_area"],
                "bbox_count": len(vehicles),
                "ground_truth_count": metrics["ground_truth_count"],
                "occlusion_gap": metrics["occlusion_gap"],
                "occlusion_loss_pct": metrics["loss_pct"],
                "vehicles": vehicles,
            }
            processed_frames.append(frame_entry)

            print(
                f"[Frame {sampled_count:02d} | t={timestamp:.1f}s] "
                f"Bbox: {len(vehicles)} vehicles | "
                f"Det Area: {metrics['detected_area']:.1f}m² | "
                f"Cont Area: {metrics['continuous_area']:.1f}m² | "
                f"φ: {metrics['occupancy_phi']:.4f} | "
                f"GT Est: {metrics['ground_truth_count']} | "
                f"Occlusion Gap: {metrics['occlusion_gap']} ({metrics['loss_pct']}%)"
            )

            sampled_count += 1
            if max_frames is not None and sampled_count >= max_frames:
                break

        frame_idx += 1

    cap.release()

    if output_path and not dry_run:
        out_file = Path(output_path)
        out_file.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "video": {
                "src": "/videos/intersection_1_roi.mp4",
                "fps": 30,
                "duration": duration,
                "width": width,
                "height": height,
            },
            "anchors": {
                "p1": SRC_ANCHORS[0],
                "p2": SRC_ANCHORS[1],
                "p3": SRC_ANCHORS[2],
                "p4": SRC_ANCHORS[3],
            },
            "homography": H.tolist(),
            "roadAreaM2": ROAD_AREA_M2,
            "frames": processed_frames,
        }
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        print(f"Saved {len(processed_frames)} frames to {out_file}")

    return processed_frames


def main():
    parser = argparse.ArgumentParser(description="Extract YOLOv8 + ByteTrack detections and IPM projection.")
    parser.add_argument("--video", default="vid/intersection_1_roi.mp4", help="Path to input video")
    parser.add_argument("--model", default="yolov8n.pt", help="YOLO model path")
    parser.add_argument("--out", "--output", dest="output", default="public/data/camera_roi_meta.json", help="Path to output JSON")
    parser.add_argument("--dry-run", action="store_true", help="Run only first 5 sampled frames for verification")
    args = parser.parse_args()

    run_pipeline(video_path=args.video, model_path=args.model, dry_run=args.dry_run, output_path=args.output)


if __name__ == "__main__":
    main()
