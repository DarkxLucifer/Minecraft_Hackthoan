import os
import sys
import csv
import time
from pathlib import Path
import cv2
import numpy as np

# Ensure backend directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from yolo_processing import TwoStageANPR, positional_correct
from anpr_service import clean_plate_text

VIDEOS_DIR = BASE_DIR / "videos"
RUNS_DIR = BASE_DIR / "runs" / "video_anpr_gpu"
CROPS_DIR = BASE_DIR / "cache" / "crops"

RUNS_DIR.mkdir(parents=True, exist_ok=True)
CROPS_DIR.mkdir(parents=True, exist_ok=True)

def process_single_video(engine: TwoStageANPR, video_file: Path, frame_step: int = 4):
    stem = video_file.stem
    csv_file = RUNS_DIR / f"{stem}_anpr.csv"
    
    print(f"\n=======================================================")
    print(f"🎬 Processing: {video_file.name} (step={frame_step})")
    print(f"=======================================================")

    cap = cv2.VideoCapture(str(video_file))
    if not cap.isOpened():
        print(f"❌ Failed to open video: {video_file}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps

    print(f"📹 Specs: {width}x{height} | {total_frames} frames | {fps:.2f} fps | {duration:.1f}s")

    tracks = {}
    next_track_id = 1
    detections_log = []
    
    frame_idx = 0
    start_time = time.time()
    plates_spotted_set = set()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % frame_step != 0:
            continue

        timestamp = round(frame_idx / fps, 3)

        # Detect vehicles & plates + TrOCR
        res = engine.detect(frame, v_conf=0.20, p_conf=0.10, imgsz=640, do_ocr=True)

        for p in res["plates"]:
            raw_text = p.get("text", "")
            plate_text = clean_plate_text(raw_text)
            p_conf = p.get("conf", 0.85)
            bx1, by1, bx2, by2 = p["box"]

            if not plate_text or len(plate_text) < 4:
                continue

            plates_spotted_set.add(plate_text)

            # Assign track
            assigned_track = None
            for t_id, t_info in tracks.items():
                last_box = t_info["box"]
                # Check spatial overlap or proximity
                lx1, ly1, lx2, ly2 = last_box
                dx = abs((bx1 + bx2) / 2 - (lx1 + lx2) / 2)
                dy = abs((by1 + by2) / 2 - (ly1 + ly2) / 2)
                if dx < 150 and dy < 120:
                    assigned_track = t_id
                    t_info["box"] = [bx1, by1, bx2, by2]
                    t_info["frames"].append(frame_idx)
                    break

            if assigned_track is None:
                assigned_track = str(next_track_id)
                next_track_id += 1
                tracks[assigned_track] = {
                    "box": [bx1, by1, bx2, by2],
                    "plate": plate_text,
                    "frames": [frame_idx]
                }

            # Save high-quality crop
            crop_name = f"{stem}_frame{frame_idx}_{plate_text}.jpg"
            crop_path = CROPS_DIR / crop_name
            if not crop_path.exists() and p.get("crop") is not None and p["crop"].size > 0:
                try:
                    cv2.imwrite(str(crop_path), p["crop"])
                except Exception:
                    pass

            detections_log.append({
                "frame": frame_idx,
                "timestamp_seconds": timestamp,
                "track_id": assigned_track,
                "plate": plate_text,
                "ocr_confidence": round(p_conf, 4),
                "detector_confidence": round(p_conf, 4),
                "missed_frames": 0,
                "x1": bx1,
                "y1": by1,
                "x2": bx2,
                "y2": by2,
            })

        if frame_idx % (frame_step * 15) == 0:
            elapsed = time.time() - start_time
            prog = (frame_idx / total_frames) * 100
            print(f"  ⚡ [{prog:.1f}%] Frame {frame_idx}/{total_frames} | Spotted: {list(plates_spotted_set)[:5]}")

    cap.release()

    # Write output CSV
    if detections_log:
        with open(csv_file, "w", newline="", encoding="utf-8") as f:
            fieldnames = [
                "frame", "timestamp_seconds", "track_id", "plate",
                "ocr_confidence", "detector_confidence", "missed_frames",
                "x1", "y1", "x2", "y2"
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in detections_log:
                writer.writerow(row)
        print(f"✅ Generated {csv_file.name} with {len(detections_log)} detection rows!")
    else:
        print(f"⚠️ No detections found for {video_file.name}")

    print(f"🎉 Completed in {time.time() - start_time:.1f}s. Unique plates: {len(plates_spotted_set)}")

def main():
    print("🚀 Initializing TwoStageANPR with best_yolo.pt and TrOCR...")
    engine = TwoStageANPR(enable_ocr=True)

    videos_to_process = [
        (VIDEOS_DIR / "model.mp4", 5),  # 2296 frames, step=5 -> ~450 samples
        (VIDEOS_DIR / "conv.mp4", 4),   # 799 frames, step=4 -> ~200 samples
        (VIDEOS_DIR / "demo1.mp4", 2),  # 61 frames, step=2 -> ~30 samples
    ]

    for v_file, step in videos_to_process:
        if v_file.exists():
            process_single_video(engine, v_file, frame_step=step)

    print("\n🏁 All videos successfully processed with the latest model and technology!")

if __name__ == "__main__":
    main()
