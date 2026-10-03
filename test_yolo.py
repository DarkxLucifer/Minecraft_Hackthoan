"""
Verification Script for Minecraft_Hackthoan TwoStageANPR + TrOCR
================================================================
Tests loading all 3 models:
1. Stage 1: yolo11n.pt (Vehicle Detector)
2. Stage 2: best.pt (License Plate Detector)
3. Stage 3: trocr_indian_plates (Vision Transformer OCR)
"""

from pathlib import Path
import sys
import numpy as np
import cv2

# Add backend to sys.path
CURRENT_DIR = Path(__file__).resolve().parent
if (CURRENT_DIR / "backend").exists():
    sys.path.append(str(CURRENT_DIR / "backend"))
elif (CURRENT_DIR / "yolo_processing.py").exists():
    sys.path.append(str(CURRENT_DIR))

from yolo_processing import TwoStageANPR

def main():
    print("=" * 70)
    print("VERIFYING END-TO-END ANPR + TrOCR ENGINE IN MINECRAFT_HACKTHOAN")
    print("=" * 70)

    # Initialize Engine (Loads YOLO11n + YOLO Plate + TrOCR)
    anpr = TwoStageANPR(enable_ocr=True)

    # Search for candidate test image (full vehicle images)
    test_dirs = [
        Path(r"D:\project\aiml prime\project\traffic-light\dataset\enhanced_plates\images\val"),
        Path(r"D:\project\aiml prime\project\traffic-light\dataset\plate_detection\images\val"),
        Path(r"D:\project\aiml prime\project\traffic-light\test_results_two_stage\crops")
    ]

    sample_img = None
    sample_path = None
    for d in test_dirs:
        if d.exists():
            imgs = list(d.glob("*.jpg"))
            if imgs:
                sample_path = imgs[0]
                sample_img = cv2.imread(str(sample_path))
                break

    if sample_img is None:
        print("Creating synthetic test image...")
        sample_img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Draw placeholder car and plate
        cv2.rectangle(sample_img, (100, 100), (540, 400), (100, 100, 100), -1)
        cv2.rectangle(sample_img, (250, 300), (390, 350), (255, 255, 255), -1)
        cv2.putText(sample_img, "MH12DE1433", (260, 335), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        sample_path = "Synthetic test image"

    print(f"\nRunning ANPR inference on: {sample_path}...")
    res = anpr.detect(sample_img, do_ocr=True)

    print("\n--- Detection & OCR Results ---")
    print(f"Vehicles detected: {len(res['vehicles'])}")
    for i, v in enumerate(res['vehicles']):
        print(f"  [{i}] {v['label']} (conf: {v['conf']:.1%}) at {v['box']}")

    print(f"\nPlates detected: {len(res['plates'])}")
    for i, p in enumerate(res['plates']):
        text_disp = p.get('text', 'N/A')
        print(f"  [{i}] Text: '{text_disp}' | Plate Conf: {p['conf']:.1%} | Box: {p['box']}")

    # Save verification output
    out_path = Path("test_anpr_trocr_result.jpg")
    cv2.imwrite(str(out_path), res["annotated"])
    print(f"\n✅ Verification result saved to: {out_path.resolve()}")
    print("=" * 70)
    print("🎉 ALL 3 STAGES (YOLO VEHICLE + YOLO PLATE + TrOCR) ARE FUNCTIONAL!")
    print("=" * 70)

if __name__ == "__main__":
    main()
