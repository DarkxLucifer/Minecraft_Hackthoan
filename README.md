# 🚗 Minecraft_Hackthoan — Two-Stage Vehicle-First ANPR Backend

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![YOLO11](https://img.shields.io/badge/Model-YOLO11s%20%7C%20YOLO11n-00FFFF.svg)](https://github.com/ultralytics/ultralytics)
[![PyTorch](https://img.shields.io/badge/Framework-PyTorch-EE4C2C.svg)](https://pytorch.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An Automated License Plate Recognition (**ANPR**) backend designed for multi-vehicle traffic monitoring, toll booth automation, and intelligent transportation systems.

Built with a **Two-Stage Vehicle-First Pipeline** that eliminates multi-car blind spots and catches low-contrast/trade-certificate plates across diverse traffic scenarios.

---

## 🏗️ Architecture: Two-Stage Vehicle-First Pipeline

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
         [Plate 1 Output]                              [Plate 2 Output]
```

### Why Two-Stage?
1. **Parallel Multi-Car Detection**: Solves the single-label bias trap. Every car in the scene receives an isolated, full-resolution pass.
2. **Sub-Pixel Small Plate Recovery**: Secondary/distant vehicles in the background are scaled dynamically rather than crushed by whole-frame downsampling.
3. **Low-Contrast / Edge Case Handling**: Allows selective low-threshold scanning (`p_conf=0.06`) inside vehicle bumpers without triggering false positives on trees, road signs, or pavement.

---

## 📁 Repository Structure

```
Minecraft_Hackthoan/
├── backend/
│   ├── models/
│   │   ├── best.pt            # Fine-tuned YOLO11s Indian Plate Detector (19.18 MB)
│   │   └── yolo11n.pt         # Pre-trained COCO Vehicle Detector (5.61 MB)
│   ├── yolo_processing.py     # TwoStageANPR Engine (detect, process_video, annotate)
│   ├── test_yolo.py           # Verification script
│   └── requirements.txt       # Python dependencies
├── .gitignore
└── README.md
```

---

## ⚡ Performance Benchmarks

| Metric | Score | Note |
| :--- | :---: | :--- |
| **Plate Detection mAP@50** | **93.8%** | Outstanding localization on Indian HSRP plates |
| **Plate Detection mAP@50-95**| **71.5%** | Tight edge-hugging bounding boxes |
| **Plate Recall** | **98.0%** | Only 4 misses out of 202 validation samples |
| **Inference Speed (RTX 2050)**| **~14 ms / frame** | **~70 Real-Time FPS** |

---

## 🚀 Quickstart

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/DarkxLucifer/Minecraft_Hackthoan.git
cd Minecraft_Hackthoan/backend
pip install -r requirements.txt
```

### 2. Verify Setup
Run the included verification script:
```bash
python test_yolo.py
```

### 3. Basic Python Usage
```python
import cv2
from yolo_processing import TwoStageANPR

# Initialize the engine (automatically loads backend/models/)
anpr = TwoStageANPR()

# Process an image or camera frame
frame = cv2.imread("traffic_image.jpg")
results = anpr.detect(frame, v_conf=0.25, p_conf=0.06)

# Access vehicle and license plate detections
print(f"Vehicles found: {len(results['vehicles'])}")
for plate in results["plates"]:
    print(f"Plate Box: {plate['box']}, Confidence: {plate['conf']:.1%}")
    # plate['crop'] contains the cropped license plate image

# Save annotated frame (Cyan vehicle boxes, Green plate boxes)
cv2.imwrite("output.jpg", results["annotated"])
```

### 4. Video Stream Processing
```python
from yolo_processing import TwoStageANPR

anpr = TwoStageANPR()

# Stream generator yielding (frame_index, annotated_frame, detections)
for frame_idx, frame, res in anpr.process_video("traffic_cctv.mp4", output_path="output_annotated.mp4"):
    print(f"Frame {frame_idx}: Found {len(res['plates'])} plates")
```

---

## 🤝 Integration with Frontend / UI
The `TwoStageANPR` engine is self-contained and exposes standard OpenCV/NumPy arrays, making it drop-in compatible with:
- **FastAPI / Flask** REST endpoints
- **Streamlit / Gradio** web dashboards
- **PyQt / Tkinter** desktop GUIs
- **Socket.io / WebRTC** live video streaming
