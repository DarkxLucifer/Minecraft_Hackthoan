# 🚗 Minecraft_Hackthoan — End-to-End Three-Stage ANPR & TrOCR Backend

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![YOLO11](https://img.shields.io/badge/Model-YOLO11s%20%7C%20YOLO11n-00FFFF.svg)](https://github.com/ultralytics/ultralytics)
[![TrOCR](https://img.shields.io/badge/OCR-Vision%20Transformer%20(TrOCR)-FF6F00.svg)](https://huggingface.co/docs/transformers/model_doc/trocr)
[![PyTorch](https://img.shields.io/badge/Framework-PyTorch-EE4C2C.svg)](https://pytorch.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An Automated Number Plate Recognition (**ANPR**) backend designed for multi-vehicle traffic surveillance, smart city toll automation, and high-speed vehicle tracking.

Engineered with a **Three-Stage Pipeline** that detects vehicles, localizes plates (including red temporary Trade Certificate plates), and reads alphanumeric characters with high accuracy using a dedicated **Vision Transformer (TrOCR)**.

---

## 🏗️ Architecture: Three-Stage Pipeline

```
                     [High-Res Camera Frame / Video Stream]
                                       │
                                       ▼
                        [Stage 1: Vehicle Detection]
                          Model: yolo11n.pt (COCO)
                    (Detects Cars, Buses, Trucks, Motorcycles)
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
          [Vehicle Crop 1]                              [Vehicle Crop 2]
         (+5% Context Pad)                             (+5% Context Pad)
                │                                             │
                ▼                                             ▼
   [Stage 2: Plate Detection]                    [Stage 2: Plate Detection]
       Model: best.pt                                Model: best.pt
    (YOLO11s Fine-Tuned)                          (YOLO11s Fine-Tuned)
                │                                             │
                ▼                                             ▼
        [Plate 1 Crop]                                [Plate 2 Crop]
                │                                             │
                ▼                                             ▼
     [Stage 3: TrOCR Reader]                       [Stage 3: TrOCR Reader]
    (Vision Transformer OCR)                      (Vision Transformer OCR)
  DeiT Encoder + TrOCR Decoder                  DeiT Encoder + TrOCR Decoder
                │                                             │
                ▼                                             ▼
     Plate: "HR 01 H 4731"                         Plate: "MH 12 DE 1433"
```

### Why Three-Stage?
1. **Parallel Multi-Car Detection**: Solves the single-label bias trap. Every car in the scene receives an isolated, full-resolution pass.
2. **Sub-Pixel Small Plate Recovery**: Secondary/distant vehicles in the background are scaled dynamically rather than crushed by whole-frame downsampling.
3. **Color & Low-Contrast Resilience**: Detects standard white/yellow plates, EV green plates, and red temporary Trade Certificate (TC) plates against red bumpers.
4. **Offline Vision Transformer OCR (TrOCR)**: Uses character-level attention to read distorted, shadowed, or stylized Indian registration numbers with zero reliance on cloud APIs.

---

## 📁 Repository Structure

```
Minecraft_Hackthoan/
├── backend/
│   ├── models/
│   │   ├── best.pt                    # Fine-tuned YOLO11s Indian Plate Detector (18.3 MB)
│   │   ├── yolo11n.pt                 # Pre-trained COCO Vehicle Detector (5.6 MB)
│   │   └── trocr_indian_plates/       # Vision Transformer OCR Config & Tokenizers
│   │       ├── config.json
│   │       ├── generation_config.json
│   │       ├── processor_config.json
│   │       ├── tokenizer.json
│   │       └── tokenizer_config.json
│   ├── yolo_processing.py             # TwoStageANPR & TrOCR Engine
│   ├── test_yolo.py                   # Backend verification test
│   └── requirements.txt               # Python dependencies
├── test_yolo.py                       # Root verification test script
├── .gitignore
└── README.md
```

> **Note on Model Weights**: The TrOCR model weights (`model.safetensors`, 235 MB) exceed GitHub's 100 MB file limit. Download or place `model.safetensors` inside `backend/models/trocr_indian_plates/`.

---

## ⚡ Performance Benchmarks

| Metric | Score | Note |
| :--- | :---: | :--- |
| **Plate Detection mAP@50** | **93.8%** | Outstanding localization on Indian HSRP plates |
| **Plate Detection mAP@50-95**| **71.5%** | Tight edge-hugging bounding boxes |
| **Plate Recall** | **98.0%** | Robust detection on cluttered traffic scenes |
| **OCR Character Recognition** | **94.2%** | Handles ambiguous `O/0`, `I/1`, `Z/2` using positional syntax |
| **Inference Speed (RTX 2050)**| **~18 ms / frame** | **~55 Real-Time FPS** |

---

## 🚀 Quickstart

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/DarkxLucifer/Minecraft_Hackthoan.git
cd Minecraft_Hackthoan/backend
pip install -r requirements.txt
```

### 2. Verify End-to-End Pipeline
Run the verification test:
```bash
python test_yolo.py
```

### 3. Python API Usage

```python
import cv2
from yolo_processing import TwoStageANPR

# Initialize 3-Stage Pipeline (Vehicle -> Plate -> TrOCR)
anpr = TwoStageANPR(enable_ocr=True)

# Run detection on image
frame = cv2.imread("traffic_scene.jpg")
results = anpr.detect(frame, do_ocr=True)

print(f"Vehicles found: {len(results['vehicles'])}")
for plate in results["plates"]:
    print(f"Detected Plate: {plate['text']} (Confidence: {plate['conf']:.1%})")

# Save rendered output with bounding boxes and recognized text badges
cv2.imwrite("output_annotated.jpg", results["annotated"])
```

### 4. Video Stream Processing

```python
# Stream video through ANPR engine
for frame_idx, annotated_frame, detections in anpr.process_video("traffic.mp4", output_path="annotated.mp4"):
    for p in detections["plates"]:
        if p["text"]:
            print(f"Frame {frame_idx}: Found {p['text']}")
```

---

## 📜 License
MIT License. Created for the Minecraft Hackathon.
