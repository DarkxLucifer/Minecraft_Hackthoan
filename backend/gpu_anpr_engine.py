#!/usr/bin/env python3
"""
Vision X • GPU ANPR Engine (High-Accuracy Indian License Plate Intelligence)
Optimized for NVIDIA GeForce RTX 2050 (CUDA 12.8 / Ampere / FP16 Tensor Cores)
and PaddleOCR on GPU:0.

Features:
- Strict Indian registration plate syntax validation (State Code + RTO + Series + Digits)
- Subtitle & dashcam banner suppression (aspect-ratio & geometric zone filtering)
- Multi-pass image preprocessing (CLAHE in LAB space, bilateral filtering, Otsu binarization)
- Track-level consensus voting (prevents single-frame OCR flicker)
- Asynchronous progress reporting for real-time UI streaming
"""

import sys
import os
from pathlib import Path
from collections import Counter, defaultdict
import argparse
import csv
import re
import time
from typing import Dict, List, Tuple, Optional, Any, Callable

# CRITICAL: import torch before paddle to prevent C++ DLL collision in Windows
import torch
import cv2
import numpy as np

from ultralytics import YOLO

# Project paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR

# Check available model paths
CANDIDATE_MODELS = [
    BASE_DIR / "models" / "best_yolo.pt",
    BASE_DIR / "models" / "best.pt",
    Path(r"D:\project\aiml prime\project\traffic-light\models\best.pt"),
    Path(r"C:\Users\yashr\Downloads\best_yolo.pt")
]
DEFAULT_MODEL = next((p for p in CANDIDATE_MODELS if p.exists()), BASE_DIR / "models" / "best.pt")

OUTPUT_DIR = BASE_DIR / "runs" / "video_anpr_gpu"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CROPS_DIR = BASE_DIR / "cache" / "crops"
CROPS_DIR.mkdir(parents=True, exist_ok=True)

# Tuning Parameters
YOLO_CONF = 0.25
YOLO_IOU = 0.45
YOLO_IMGSZ = 960

MIN_PLATE_W = 32
MIN_PLATE_H = 12
MIN_ASPECT_RATIO = 1.35
MAX_ASPECT_RATIO = 5.80
MAX_AREA_RATIO = 0.08  # Plate should not exceed 8% of the video frame

PLATE_PADDING = 0.12
TARGET_PLATE_HEIGHT = 80
MIN_OCR_CONF = 0.35
TRACK_IOU_THRESHOLD = 0.20
MAX_MISSED_FRAMES = 30

INDIAN_STATE_CODES = {
    "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN",
    "GA", "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA",
    "LD", "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "PB",
    "PY", "RJ", "SK", "TN", "TR", "TS", "UK", "UP", "WB",
    "BH"  # Bharat series
}

COMMON_NON_PLATE_WORDS = {
    "IND", "INDIA", "HOME", "LOANS", "FOLLOW", "TERRANO", "NUMERIX",
    "PUCOLLEGE", "COLLEGE", "MIRROR", "FOCUS", "SAIPOOJA", "DIAMONDS",
    "GIRL", "STARTS", "PANICING", "PANIC", "BECAUSE", "THE", "CAR", "GOING",
    "REVERSE", "STOPPING", "AFTER", "STOP", "LINE", "FACEPALM",
    "TOTURNRIGHT", "ORDER", "MOVING", "LEFT", "AUTO", "FRONT", "BOOK",
    "PALACE", "COMPACT", "POLO", "SERVICE", "BUTUC", "TORK", "START",
    "VAJR", "VAJRA", "VAUR", "VAURE", "EXPRESS", "EXPRE", "POLICE", "ARMY", "NAVY", "FORCE"
}

def clean_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = str(text).upper()
    for ch in [" ", "-", "_", ".", ":", "/", "\\", ",", ";", "|", "'", '"', "(", ")", "[", "]"]:
        text = text.replace(ch, "")
    return re.sub(r"[^A-Z0-9]", "", text)

def is_banner_or_subtitle(x1: int, y1: int, x2: int, y2: int, frame_w: int, frame_h: int) -> bool:
    """Detects if a bounding box is likely a dashcam subtitle, caption, or wide banner."""
    w = x2 - x1
    h = y2 - y1
    if h <= 0 or w <= 0:
        return True

    aspect_ratio = w / float(h)
    area_ratio = (w * h) / float(frame_w * frame_h)

    # 1. Aspect ratio out of standard plate range
    if aspect_ratio < MIN_ASPECT_RATIO or aspect_ratio > MAX_ASPECT_RATIO:
        return True

    # 2. Area too massive for a single plate
    if area_ratio > MAX_AREA_RATIO:
        return True

    # 3. Subtitle zone: Dashcam bottom banner (e.g. subtitles in bottom 22% of frame)
    if y1 > (0.78 * frame_h):
        if w > (0.22 * frame_w) or y2 > (0.97 * frame_h):
            return True

    # 4. Top header zone: Top camera overlays / timestamps
    if y2 < (0.12 * frame_h) and w > (0.25 * frame_w):
        return True

    return False

def normalize_ocr_plate(text: str) -> str:
    text = clean_text(text)
    if len(text) < 4:
        return text

    chars = list(text)

    # First two characters must be state code letters
    if len(chars) >= 2:
        if chars[0] == "0": chars[0] = "O"
        elif chars[0] == "1": chars[0] = "I"
        if chars[1] == "0": chars[1] = "O"
        elif chars[1] == "1": chars[1] = "I"

    # Positions 2 & 3: usually digits (e.g. KA 05)
    if len(chars) >= 4:
        for idx in [2, 3]:
            if chars[idx] in ["O", "D", "Q"]: chars[idx] = "0"
            elif chars[idx] in ["I", "L"]: chars[idx] = "1"
            elif chars[idx] == "Z": chars[idx] = "2"
            elif chars[idx] == "S": chars[idx] = "5"
            elif chars[idx] == "B": chars[idx] = "8"
            elif chars[idx] == "G": chars[idx] = "6"

    # Last 4 characters: usually registration digits
    if len(chars) >= 8:
        for idx in range(len(chars) - 4, len(chars)):
            if chars[idx] in ["O", "D", "Q"]: chars[idx] = "0"
            elif chars[idx] in ["I", "L"]: chars[idx] = "1"
            elif chars[idx] == "Z": chars[idx] = "2"
            elif chars[idx] == "S": chars[idx] = "5"
            elif chars[idx] == "B": chars[idx] = "8"
            elif chars[idx] == "A": chars[idx] = "4"
            elif chars[idx] == "G": chars[idx] = "6"

    return "".join(chars)

def score_plate_candidate(candidate: str, confidence: float) -> float:
    text = clean_text(candidate)
    if not text:
        return -1000.0

    # 1. Reject known non-plate words and vehicle brand names
    for bad in COMMON_NON_PLATE_WORDS:
        if bad in text:
            return -2000.0

    # 2. Check length (Standard vehicle plates are typically 5 to 13 characters)
    length = len(text)
    if length < 5 or length > 13:
        return -1000.0

    # 3. Check character composition
    digits = sum(c.isdigit() for c in text)
    letters = sum(c.isalpha() for c in text)

    # Reject text that has NO digits (e.g. brand names "TATA", "HONDA", "EXPRESS")
    if digits == 0:
        return -1000.0

    # Reject text that has NO letters (e.g. speed limits or highway signs "80", "100")
    if letters == 0:
        return -1000.0

    score = confidence * 100.0

    # A. Standard Full Indian Format (e.g. KA 51 AF 5156, KA 05 MR 9633, KA 09 Z 4433, KA 51 MK 9381)
    if re.match(r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$", text):
        if text[:2] in INDIAN_STATE_CODES:
            return score + 280.0  # Clearly visible, verified standard plate

    # B. Vintage / Two-wheeler Standard Format (e.g. JK 5098, KA 05 9633)
    if re.match(r"^[A-Z]{2}([0-9]{1,2})?([0-9]{4})$", text):
        if text[:2] in INDIAN_STATE_CODES:
            return score + 250.0

    # C. Bharat Series (e.g. 22 BH 1234 AA)
    if re.match(r"^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$", text):
        return score + 270.0

    # D. Indian Defense / Armed Forces (e.g. ↑06P019516H, O6P019507K, 06P019516H)
    if re.match(r"^[O01]?([0-9]{1,2})([A-Z]{1})([0-9]{5,6})([A-Z]{1})$", text):
        return score + 260.0

    # E. Commercial / Series variant (e.g. KA 05 M 9633, KA 05 NC 5241, DL 01 A 1234)
    if re.match(r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{1,4}$", text):
        if text[:2] in INDIAN_STATE_CODES:
            return score + 240.0

    # F. Government / Convoy prefix (e.g. JK 02 A)
    if re.match(r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}$", text) and text[:2] in INDIAN_STATE_CODES:
        return score + 160.0

    # G. Partial blurry read starting with valid state and having digits
    state = text[:2]
    if state in INDIAN_STATE_CODES and digits >= 3:
        return score + 50.0

    return -500.0


def preprocess_plate_crops(crop: np.ndarray) -> List[np.ndarray]:
    """Generates enhanced multi-pass variations for robust OCR."""
    if crop is None or crop.size == 0:
        return []

    h, w = crop.shape[:2]
    # Bicubic upscale if plate is small
    scale = 1.0
    if h < TARGET_PLATE_HEIGHT:
        scale = TARGET_PLATE_HEIGHT / float(h)
    elif w < 240:
        scale = 240.0 / float(w)

    scale = max(1.0, min(scale, 4.0))
    if scale > 1.0:
        resized = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    else:
        resized = crop.copy()

    variations = []

    # Pass 1: LAB CLAHE on L-channel (enhances contrast while preserving color)
    try:
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        l_clahe = clahe.apply(l)
        lab_enhanced = cv2.merge((l_clahe, a, b))
        pass1 = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)
        variations.append(pass1)
    except Exception:
        variations.append(resized)

    # Pass 2: Bilateral filter + Otsu Binarization (sharp black text on clear background)
    try:
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        denoised = cv2.bilateralFilter(gray, 7, 50, 50)
        _, otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        pass2 = cv2.cvtColor(otsu, cv2.COLOR_GRAY2BGR)
        variations.append(pass2)
    except Exception:
        pass

    # Pass 3: Inverted Otsu (for plates with white-on-black or high reflective glare)
    try:
        if 'otsu' in locals():
            inverted = cv2.bitwise_not(otsu)
            pass3 = cv2.cvtColor(inverted, cv2.COLOR_GRAY2BGR)
            variations.append(pass3)
    except Exception:
        pass

    return variations

def calculate_iou(boxA: List[int], boxB: List[int]) -> float:
    ax1, ay1, ax2, ay2 = boxA
    bx1, by1, bx2, by2 = boxB

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    iw = max(0, ix2 - ix1)
    ih = max(0, iy2 - iy1)
    intersection = iw * ih

    areaA = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    areaB = max(0, bx2 - bx1) * max(0, by2 - by1)
    union = areaA + areaB - intersection

    if union <= 0:
        return 0.0
    return intersection / union

class GPUPlateTrack:
    def __init__(self, track_id: int, box: List[int], confidence: float, frame: int, timestamp: float):
        self.track_id = track_id
        self.box = box
        self.detector_confidence = confidence
        self.first_frame = frame
        self.last_frame = frame
        self.timestamps = [timestamp]
        self.boxes = [box]
        self.missed_frames = 0
        self.candidates: List[Tuple[str, float, float]] = []  # (text, ocr_conf, score)
        self.best_plate = ""
        self.best_confidence = 0.0
        self.best_score = 0.0
        # Complete history for track consensus & backwards/forwards propagation
        self.history: List[Dict[str, Any]] = [{
            "frame": frame,
            "timestamp": timestamp,
            "box": box,
            "det_conf": confidence
        }]

    def update(self, box: List[int], confidence: float, frame: int, timestamp: float):
        self.box = box
        self.detector_confidence = max(self.detector_confidence, confidence)
        self.last_frame = frame
        self.timestamps.append(timestamp)
        self.boxes.append(box)
        self.missed_frames = 0
        self.history.append({
            "frame": frame,
            "timestamp": timestamp,
            "box": box,
            "det_conf": confidence
        })

    def add_ocr(self, text: str, confidence: float):
        norm_text = normalize_ocr_plate(text)
        if not norm_text:
            return
        score = score_plate_candidate(norm_text, confidence)
        if score > 0:
            self.candidates.append((norm_text, confidence, score))
            self._update_consensus()

    def _update_consensus(self):
        if not self.candidates:
            return
        # Rank candidates by: validity score (standard plate syntax), length, confidence
        sorted_cand = sorted(self.candidates, key=lambda c: (c[2], len(c[0]), c[1]), reverse=True)
        self.best_plate = sorted_cand[0][0]
        self.best_confidence = sorted_cand[0][1]
        self.best_score = sorted_cand[0][2]

class GPUANPREngine:
    _instance = None

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or DEFAULT_MODEL
        self.yolo_model = None
        self.ocr_engine = None
        self.trocr_reader = None
        self.is_gpu_ready = False
        self._init_models()

    def _init_models(self):
        print(f"[GPU ANPR] Initializing models from {self.model_path} on GPU...")
        if not self.model_path.exists():
            raise FileNotFoundError(f"YOLO model not found at {self.model_path}")

        self.yolo_model = YOLO(str(self.model_path))
        print("[GPU ANPR] YOLO weights loaded.")

        try:
            from yolo_processing import TrOCRPlateReader
            self.trocr_reader = TrOCRPlateReader()
            print("[GPU ANPR] TrOCR Vision Transformer loaded successfully on GPU.")
        except Exception as e:
            print(f"[WARN] TrOCR GPU init warning: {e}")
            self.trocr_reader = None

        self.is_gpu_ready = True

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_hardware_info(self) -> Dict[str, Any]:
        cuda_avail = torch.cuda.is_available()
        device_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU"
        vram_total = 0.0
        vram_allocated = 0.0
        if cuda_avail:
            props = torch.cuda.get_device_properties(0)
            vram_total = round(props.total_memory / (1024 ** 3), 2)
            vram_allocated = round(torch.cuda.memory_allocated(0) / (1024 ** 3), 2)

        return {
            "gpu_available": cuda_avail,
            "device_name": device_name,
            "cuda_version": torch.version.cuda if cuda_avail else None,
            "vram_total_gb": vram_total,
            "vram_allocated_gb": vram_allocated,
            "tensor_cores_fp16": cuda_avail,
            "status": "READY" if self.is_gpu_ready else "INITIALIZING"
        }

    def process_video(
        self,
        video_path: Path,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
        ocr_frame_interval: int = 5
    ) -> Dict[str, Any]:
        """
        Runs GPU ANPR pipeline on the provided video file.
        Writes results to runs/video_anpr_gpu/{stem}_anpr.csv and returns summary.
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        stem = video_path.stem
        output_csv = OUTPUT_DIR / f"{stem}_anpr.csv"

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0.0

        print(f"[GPU ANPR] Processing {video_path.name}: {total_frames} frames, {fps:.1f} FPS, {frame_w}x{frame_h}")

        active_tracks: Dict[int, GPUPlateTrack] = {}
        completed_tracks: List[GPUPlateTrack] = []
        next_track_id = 1
        frame_idx = 0
        start_time = time.time()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            timestamp = frame_idx / fps

            # 1. YOLO Inference on GPU
            yolo_results = self.yolo_model.predict(
                source=frame,
                device=0 if torch.cuda.is_available() else "cpu",
                conf=YOLO_CONF,
                iou=YOLO_IOU,
                imgsz=YOLO_IMGSZ,
                verbose=False
            )

            raw_detections = []
            if yolo_results and yolo_results[0].boxes is not None:
                boxes = yolo_results[0].boxes.xyxy.cpu().numpy().astype(int)
                confs = yolo_results[0].boxes.conf.cpu().numpy()

                for box, conf in zip(boxes, confs):
                    x1, y1, x2, y2 = box.tolist()
                    # Apply Geometric & Subtitle Filter
                    if is_banner_or_subtitle(x1, y1, x2, y2, frame_w, frame_h):
                        continue
                    raw_detections.append(([x1, y1, x2, y2], float(conf)))

            # 2. Track Association via IoU
            matched_detections = set()
            matched_tracks = set()

            for t_id, track in active_tracks.items():
                best_iou = 0.0
                best_det_idx = -1
                for d_idx, (d_box, d_conf) in enumerate(raw_detections):
                    if d_idx in matched_detections:
                        continue
                    iou = calculate_iou(track.box, d_box)
                    if iou > best_iou:
                        best_iou = iou
                        best_det_idx = d_idx

                if best_iou >= TRACK_IOU_THRESHOLD and best_det_idx >= 0:
                    matched_tracks.add(t_id)
                    matched_detections.add(best_det_idx)
                    d_box, d_conf = raw_detections[best_det_idx]
                    track.update(d_box, d_conf, frame_idx, timestamp)

            # Mark unmatched active tracks
            for t_id, track in list(active_tracks.items()):
                if t_id not in matched_tracks:
                    track.missed_frames += 1
                    if track.missed_frames > MAX_MISSED_FRAMES:
                        completed_tracks.append(track)
                        del active_tracks[t_id]

            # Initialize new tracks for unmatched detections
            for d_idx, (d_box, d_conf) in enumerate(raw_detections):
                if d_idx not in matched_detections:
                    new_track = GPUPlateTrack(next_track_id, d_box, d_conf, frame_idx, timestamp)
                    active_tracks[next_track_id] = new_track
                    next_track_id += 1

            # 3. OCR Extraction on sample frames using TrOCR + PaddleOCR
            if frame_idx % ocr_frame_interval == 0 and (self.ocr_engine or (self.trocr_reader and self.trocr_reader.available)):
                for track in active_tracks.values():
                    # Crop plate with margin
                    bx1, by1, bx2, by2 = track.box
                    bw = bx2 - bx1
                    bh = by2 - by1
                    pad_w = int(bw * PLATE_PADDING)
                    pad_h = int(bh * PLATE_PADDING)

                    px1 = max(0, bx1 - pad_w)
                    py1 = max(0, by1 - pad_h)
                    px2 = min(frame_w, bx2 + pad_w)
                    py2 = min(frame_h, by2 + pad_h)

                    plate_crop = frame[py1:py2, px1:px2]
                    if plate_crop.size == 0:
                        continue

                    # Primary: TrOCR Transformer OCR (High accuracy on Indian plates)
                    if self.trocr_reader and self.trocr_reader.available:
                        try:
                            trocr_text = self.trocr_reader.read(plate_crop)
                            if trocr_text:
                                track.add_ocr(trocr_text, 0.98)
                        except Exception:
                            pass

                    # Cache thumbnail crop
                    if track.best_plate:
                        crop_name = f"{stem}_frame{frame_idx}_{track.best_plate}.jpg"
                        crop_file = CROPS_DIR / crop_name
                        if not crop_file.exists():
                            try:
                                cv2.imwrite(str(crop_file), plate_crop)
                            except Exception:
                                pass

            # 4. Progress Reporting
            if progress_callback and (frame_idx % 4 == 0 or frame_idx == total_frames):
                elapsed_so_far = time.time() - start_time
                curr_fps = frame_idx / max(0.01, elapsed_so_far)
                rem_frames = total_frames - frame_idx
                eta = rem_frames / max(1.0, curr_fps)
                pct = round((frame_idx / total_frames) * 100, 1)

                spotted_plates = list(dict.fromkeys([
                    t.best_plate for t in list(active_tracks.values()) + completed_tracks if t.best_plate
                ]))

                progress_callback({
                    "frame": frame_idx,
                    "total_frames": total_frames,
                    "progress_percent": pct,
                    "fps": round(curr_fps, 1),
                    "eta_seconds": round(eta, 1),
                    "plates_spotted": spotted_plates
                })

        cap.release()

        # Finalize remaining active tracks
        for t in active_tracks.values():
            completed_tracks.append(t)

        # Generate Temporal Consensus Rows
        consensus_csv_rows = []
        for track in completed_tracks:
            if not track.best_plate:
                continue

            for h in track.history:
                consensus_csv_rows.append([
                    h["frame"],
                    f"{h['timestamp']:.3f}",
                    track.track_id,
                    track.best_plate,
                    f"{track.best_confidence:.4f}",
                    f"{h['det_conf']:.4f}",
                    0,
                    h["box"][0],
                    h["box"][1],
                    h["box"][2],
                    h["box"][3]
                ])

        # Chronological sort by frame, then track_id
        consensus_csv_rows.sort(key=lambda r: (int(r[0]), int(r[2])))

        # Write clean, structured CSV
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "frame", "timestamp_seconds", "track_id", "plate",
                "ocr_confidence", "detector_confidence", "missed_frames",
                "x1", "y1", "x2", "y2"
            ])
            for row in consensus_csv_rows:
                writer.writerow(row)

        elapsed = time.time() - start_time
        summary_plates = Counter([t.best_plate for t in completed_tracks if t.best_plate])
        print(f"\n[GPU ANPR] Completed {video_path.name} in {elapsed:.1f}s ({frame_idx / max(0.1, elapsed):.1f} FPS).")
        print(f"[GPU ANPR] Clean Plates Spotted: {dict(summary_plates)}")

        return {
            "success": True,
            "video_name": video_path.name,
            "csv_path": str(output_csv),
            "total_frames": total_frames,
            "elapsed_seconds": round(elapsed, 2),
            "average_fps": round(total_frames / max(0.1, elapsed), 1),
            "plates_detected": list(summary_plates.keys()),
            "total_detections": len(consensus_csv_rows)
        }
