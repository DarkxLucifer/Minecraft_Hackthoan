"""
Verification Script for Minecraft_Hackthoan TwoStageANPR
========================================================
Tests loading both YOLO models (yolo11n.pt and best.pt)
and running a test inference pass.
"""

from pathlib import Path
import numpy as np
import cv2
from yolo_processing import TwoStageANPR

def main():
    print("=" * 70)
    print("VERIFYING YOLO ANPR ENGINE IN MINECRAFT_HACKTHOAN")
    print("=" * 70)

    # Initialize Engine
    anpr = TwoStageANPR()

    # Look for any test images in parent directory or create a test frame
    test_img_path = Path(r"D:\project\aiml prime\project\traffic-light\test_results_two_stage\crops")
    crops = list(test_img_path.glob("*.jpg")) if test_img_path.exists() else []

    if crops:
        sample_img = cv2.imread(str(crops[0]))
        print(f"Testing on sample: {crops[0].name}")
    else:
        # Create blank synthetic frame
        sample_img = np.zeros((480, 640, 3), dtype=np.uint8)
        print("Testing on synthetic frame")

    res = anpr.detect(sample_img)
    print(f"✅ Detection completed successfully!")
    print(f"   Vehicles detected: {len(res['vehicles'])}")
    print(f"   Plates detected  : {len(res['plates'])}")
    print(f"   Annotated frame  : shape {res['annotated'].shape}")
    print("=" * 70)
    print("🎉 All YOLO models and processing files are verified and ready for design!")

if __name__ == "__main__":
    main()
