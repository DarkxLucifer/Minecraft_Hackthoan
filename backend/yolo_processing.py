"""
YOLO Two-Stage Vehicle-First ANPR Processing Engine
===================================================
Project: Minecraft_Hackthoan
Models:
  - Stage 1: yolo11n.pt (Vehicle detection: car, bus, truck, motorcycle)
  - Stage 2: best.pt (Fine-tuned Indian license plate detector)

Features:
  - Multi-car parallel detection
  - Low-contrast / Trade Certificate (Red) plate recovery
  - Full coordinate mapping back to original frame
  - Real-time video & image processing APIs
"""

import os
from pathlib import Path
import cv2
import numpy as np
from ultralytics import YOLO

CURRENT_DIR = Path(__file__).resolve().parent

class TwoStageANPR:
    def __init__(self, vehicle_weights=None, plate_weights=None, device=None):
        # Resolve vehicle model
        if vehicle_weights is None:
            candidates = [
                CURRENT_DIR / "models" / "yolo11n.pt",
                CURRENT_DIR / "yolo11n.pt",
                "yolo11n.pt"
            ]
            vehicle_weights = next((str(p) for p in candidates if Path(p).exists()), "yolo11n.pt")

        # Resolve plate model
        if plate_weights is None:
            candidates = [
                CURRENT_DIR / "models" / "best.pt",
                CURRENT_DIR / "best.pt",
                "best.pt"
            ]
            plate_weights = next((str(p) for p in candidates if Path(p).exists()), "best.pt")

        print(f"Loading Stage 1 Vehicle Detector from: {vehicle_weights}...")
        self.vehicle_model = YOLO(str(vehicle_weights))

        print(f"Loading Stage 2 Plate Detector from  : {plate_weights}...")
        self.plate_model = YOLO(str(plate_weights))

        self.device = device
        print("✅ TwoStageANPR Engine successfully initialized!")

    def detect(self, frame, v_conf=0.25, p_conf=0.06, imgsz=960, padding_pct=0.05):
        """
        Runs Two-Stage Vehicle-First detection on an image/frame.
        
        Returns:
            dict containing:
                - 'vehicles': list of detected vehicles
                - 'plates': list of detected license plates (with crop & global box)
                - 'annotated': rendered frame with bounding boxes
        """
        if frame is None or frame.size == 0:
            return {"vehicles": [], "plates": [], "annotated": frame}

        orig_h, orig_w = frame.shape[:2]
        annotated = frame.copy()

        # Step 1: Detect vehicles (COCO IDs: 2=car, 3=motorcycle, 5=bus, 7=truck)
        v_res = self.vehicle_model.predict(
            frame,
            classes=[2, 3, 5, 7],
            conf=v_conf,
            imgsz=imgsz,
            device=self.device,
            verbose=False
        )[0]

        vehicles = []
        if v_res.boxes is not None and len(v_res.boxes) > 0:
            for vb in v_res.boxes:
                vx1, vy1, vx2, vy2 = map(int, vb.xyxy[0])
                vconf = float(vb.conf[0])
                vcls = int(vb.cls[0])
                vlabel = self.vehicle_model.names[vcls]
                vehicles.append({
                    "box": [vx1, vy1, vx2, vy2],
                    "conf": vconf,
                    "label": vlabel
                })

        plates = []

        # Step 2: Plate detection inside each vehicle crop
        if vehicles:
            for v_idx, v in enumerate(vehicles):
                vx1, vy1, vx2, vy2 = v["box"]
                vlabel = v["label"]
                vconf = v["conf"]

                # Draw vehicle box (Cyan / Blue)
                cv2.rectangle(annotated, (vx1, vy1), (vx2, vy2), (255, 180, 0), 2)
                v_tag = f"{vlabel} {vconf:.0%}"
                cv2.putText(annotated, v_tag, (vx1 + 4, vy1 + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 180, 0), 2)

                # Add padding around vehicle crop
                pad_x = int((vx2 - vx1) * padding_pct)
                pad_y = int((vy2 - vy1) * padding_pct)
                x1_p, y1_p = max(0, vx1 - pad_x), max(0, vy1 - pad_y)
                x2_p, y2_p = min(orig_w, vx2 + pad_x), min(orig_h, vy2 + pad_y)

                car_crop = frame[y1_p:y2_p, x1_p:x2_p]
                if car_crop.size == 0:
                    continue

                # Run plate detector on vehicle crop
                p_res = self.plate_model.predict(
                    car_crop,
                    conf=p_conf,
                    imgsz=640,
                    device=self.device,
                    verbose=False
                )[0]

                if p_res.boxes is not None and len(p_res.boxes) > 0:
                    for pb in p_res.boxes:
                        px1, py1, px2, py2 = map(int, pb.xyxy[0])
                        pconf = float(pb.conf[0])

                        # Global coordinates in original frame
                        gx1 = x1_p + px1
                        gy1 = y1_p + py1
                        gx2 = x1_p + px2
                        gy2 = y1_p + py2

                        plate_crop = car_crop[py1:py2, px1:px2]

                        plates.append({
                            "vehicle_idx": v_idx,
                            "vehicle_label": vlabel,
                            "box": [gx1, gy1, gx2, gy2],
                            "conf": pconf,
                            "crop": plate_crop
                        })

                        # Draw plate box (Vibrant Green)
                        cv2.rectangle(annotated, (gx1, gy1), (gx2, gy2), (0, 255, 64), 3)
                        p_tag = f"Plate {pconf:.1%}"
                        (lw, lh), _ = cv2.getTextSize(p_tag, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                        cv2.rectangle(annotated, (gx1, max(0, gy1 - lh - 6)), (gx1 + lw + 6, gy1), (0, 255, 64), -1)
                        cv2.putText(annotated, p_tag, (gx1 + 3, gy1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        else:
            # Fallback direct detection across full frame
            p_res = self.plate_model.predict(
                frame,
                conf=0.15,
                imgsz=imgsz,
                device=self.device,
                verbose=False
            )[0]
            if p_res.boxes is not None and len(p_res.boxes) > 0:
                for pb in p_res.boxes:
                    gx1, gy1, gx2, gy2 = map(int, pb.xyxy[0])
                    pconf = float(pb.conf[0])
                    gx1, gy1 = max(0, gx1), max(0, gy1)
                    gx2, gy2 = min(orig_w, gx2), min(orig_h, gy2)
                    plate_crop = frame[gy1:gy2, gx1:gx2]

                    plates.append({
                        "vehicle_idx": None,
                        "vehicle_label": "unknown",
                        "box": [gx1, gy1, gx2, gy2],
                        "conf": pconf,
                        "crop": plate_crop
                    })

                    cv2.rectangle(annotated, (gx1, gy1), (gx2, gy2), (0, 255, 64), 3)
                    p_tag = f"Plate {pconf:.1%}"
                    (lw, lh), _ = cv2.getTextSize(p_tag, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                    cv2.rectangle(annotated, (gx1, max(0, gy1 - lh - 6)), (gx1 + lw + 6, gy1), (0, 255, 64), -1)
                    cv2.putText(annotated, p_tag, (gx1 + 3, gy1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

        return {
            "vehicles": vehicles,
            "plates": plates,
            "annotated": annotated
        }

    def process_video(self, video_path, output_path=None, conf=0.06, show_fps=True):
        """
        Process a video file with the Two-Stage ANPR pipeline.
        Yields (frame_idx, annotated_frame, detections_dict) for each frame.
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        writer = None
        if output_path is not None:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

        frame_idx = 0
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                t0 = cv2.getTickCount()
                res = self.detect(frame, p_conf=conf)
                dt = (cv2.getTickCount() - t0) / cv2.getTickFrequency()
                current_fps = 1.0 / dt if dt > 0 else 0

                annotated = res["annotated"]
                if show_fps:
                    cv2.putText(annotated, f"FPS: {current_fps:.1f}", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)

                if writer is not None:
                    writer.write(annotated)

                yield frame_idx, annotated, res
                frame_idx += 1
        finally:
            cap.release()
            if writer is not None:
                writer.release()
