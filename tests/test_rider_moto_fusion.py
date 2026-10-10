import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import unittest
import numpy as np
import cv2
from scripts.extract_yolo_ipm import (
    box_overlap_metrics,
    process_frame_vehicles,
    compute_homography,
    CentroidTracker,
    SRC_ANCHORS,
    DST_IPM,
)


class MockBox:
    def __init__(self, cls_id, conf, xyxy):
        self.cls = [type("Tensor", (), {"item": lambda self: cls_id})()]
        self.conf = [type("Tensor", (), {"item": lambda self: conf})()]
        self.xyxy = [np.array(xyxy, dtype=np.float32)]


class TestRiderMotorcycleFusion(unittest.TestCase):
    def setUp(self):
        self.src_roi, self.H = compute_homography(SRC_ANCHORS, DST_IPM)

    def test_box_overlap_metrics_disjoint(self):
        bA = [0, 0, 10, 10]
        bB = [20, 20, 30, 30]
        metrics = box_overlap_metrics(bA, bB)
        self.assertAlmostEqual(metrics.iou, 0.0, places=4)
        self.assertAlmostEqual(metrics.iomin, 0.0, places=4)
        # Verify tuple unpacking
        iou, iomin = metrics
        self.assertAlmostEqual(iou, 0.0, places=4)
        self.assertAlmostEqual(iomin, 0.0, places=4)

    def test_box_overlap_metrics_contained(self):
        bA = [0, 0, 10, 10]
        bB = [2, 2, 8, 8]
        metrics = box_overlap_metrics(bA, bB)
        # inter = 36, union = 100, min = 36
        self.assertAlmostEqual(metrics.iou, 0.36, places=4)
        self.assertAlmostEqual(metrics.iomin, 1.0, places=4)

    def test_box_overlap_metrics_partial(self):
        bA = [0, 0, 10, 10]
        bB = [5, 0, 15, 10]
        metrics = box_overlap_metrics(bA, bB)
        # inter = 50, union = 150, min = 100
        self.assertAlmostEqual(metrics.iou, 1.0 / 3.0, places=4)
        self.assertAlmostEqual(metrics.iomin, 0.5, places=4)

    def test_fusion_rider_and_motorcycle(self):
        # Motorcycle at (275, 220, 315, 263) inside src_roi
        # Person at (275, 189, 313, 260) inside src_roi
        boxes = [
            MockBox(cls_id=3, conf=0.24, xyxy=[275.0, 220.0, 315.0, 263.0]),
            MockBox(cls_id=0, conf=0.65, xyxy=[275.0, 189.0, 313.0, 260.0]),
        ]
        vehicles, _ = process_frame_vehicles(boxes, self.src_roi, self.H)
        self.assertEqual(len(vehicles), 1)
        v = vehicles[0]
        self.assertEqual(v["type"], "moto")
        self.assertEqual(v["std_area"], 1.5)
        # Bbox should be merged union
        self.assertEqual(v["bbox"], [275.0, 189.0, 40.0, 74.0])

    def test_isolated_rider_promoted_to_moto(self):
        # Isolated person inside src_roi without moto
        boxes = [
            MockBox(cls_id=0, conf=0.74, xyxy=[330.0, 195.0, 370.0, 272.0]),
        ]
        vehicles, _ = process_frame_vehicles(boxes, self.src_roi, self.H)
        self.assertEqual(len(vehicles), 1)
        v = vehicles[0]
        self.assertEqual(v["type"], "moto")
        self.assertEqual(v["std_area"], 1.5)
        self.assertEqual(v["bbox"], [330.0, 195.0, 40.0, 77.0])

    def test_confidence_thresholds(self):
        # Motorcycle with conf 0.14 should be rejected (threshold 0.15)
        # Person with conf 0.34 should be rejected (threshold 0.35)
        # Car with conf 0.24 should be rejected (threshold 0.25)
        boxes = [
            MockBox(cls_id=3, conf=0.14, xyxy=[275.0, 220.0, 315.0, 263.0]),
            MockBox(cls_id=0, conf=0.34, xyxy=[330.0, 195.0, 370.0, 272.0]),
            MockBox(cls_id=2, conf=0.24, xyxy=[250.0, 250.0, 300.0, 300.0]),
        ]
        vehicles, _ = process_frame_vehicles(boxes, self.src_roi, self.H)
        self.assertEqual(len(vehicles), 0)

    def test_tracker_no_duplicate_ids_in_same_frame(self):
        tracker = CentroidTracker(max_dist=55.0)
        tracker.update([{"bottom_center": [100.0, 100.0]}], 0)
        items = [{"bottom_center": [100.0, 101.0]}, {"bottom_center": [101.0, 100.0]}]
        assigned = tracker.update(items, 1)
        self.assertEqual(len(assigned), 2)
        self.assertNotEqual(assigned[0], assigned[1])
        self.assertEqual(len(set(assigned)), 2)

    def test_duplicate_moto_boxes_deduplicated(self):
        boxes = [
            MockBox(cls_id=3, conf=0.8, xyxy=[275.0, 220.0, 315.0, 263.0]),
            MockBox(cls_id=3, conf=0.7, xyxy=[277.0, 221.0, 316.0, 264.0]),
        ]
        vehicles, _ = process_frame_vehicles(boxes, self.src_roi, self.H)
        self.assertEqual(len(vehicles), 1)

    def test_frame_3329_video_detection(self):
        video_path = Path("vid/intersection_1_roi.mp4")
        if not video_path.exists():
            self.skipTest("Video file vid/intersection_1_roi.mp4 not found")

        from ultralytics import YOLO

        model = YOLO("yolov8n.pt")
        cap = cv2.VideoCapture(str(video_path))
        cap.set(cv2.CAP_PROP_POS_FRAMES, 3329)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret, "Failed to read frame 3329")

        results = model(frame, conf=0.15, classes=[0, 2, 3, 5, 7], verbose=False)
        vehicles, _ = process_frame_vehicles(results[0].boxes, self.src_roi, self.H)

        motos = [v for v in vehicles if v["type"] == "moto"]
        self.assertEqual(len(motos), 2, f"Expected 2 motorcycles, got {len(motos)}")


if __name__ == "__main__":
    unittest.main()
