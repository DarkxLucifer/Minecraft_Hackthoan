"""
================================================================================
VisionX & Minecraft_Hackthoan: FastAPI Inference & Telemetry Server
================================================================================
Exposes REST endpoints for the Next.js Frontend:
- GET  /api/health       -> Service health, GPU/CPU info, loaded models
- POST /api/anpr/detect  -> Multi-vehicle detection, plate localization & TrOCR
"""

import base64
import io
from pathlib import Path
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from yolo_processing import TwoStageANPR

app = FastAPI(
    title="VisionX ANPR Intelligence Server",
    description="Three-Stage Vehicle Detection, Plate Localization & Vision Transformer OCR API",
    version="1.0.0",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global engine instance (lazy initialized)
engine: TwoStageANPR = None


def get_engine():
    global engine
    if engine is None:
        try:
            engine = TwoStageANPR(enable_ocr=True)
        except Exception as e:
            print(f"Warning: Initializing without TrOCR OCR: {e}")
            engine = TwoStageANPR(enable_ocr=False)
    return engine


@app.on_event("startup")
async def startup_event():
    print("🚀 Initializing VisionX ANPR AI Engine on startup...")
    try:
        get_engine()
        print("✅ VisionX ANPR AI Engine ready for requests.")
    except Exception as e:
        print(f"⚠️ Engine startup warning: {e}")


@app.get("/api/health")
async def health_check():
    eng = get_engine()
    return {
        "status": "healthy",
        "service": "VisionX ANPR Engine",
        "device": eng.device if eng else "unknown",
        "models": {
            "vehicle_detector": "yolo11n.pt",
            "plate_detector": "best.pt",
            "ocr": "trocr_indian_plates" if (eng and eng.ocr_reader) else "disabled",
        },
    }


@app.post("/api/anpr/detect")
async def detect_anpr(
    file: UploadFile = File(...),
    vehicle_conf: float = Query(0.25, ge=0.01, le=1.0),
    plate_conf: float = Query(0.06, ge=0.01, le=1.0),
    do_ocr: bool = Query(True),
):
    """
    Accepts an uploaded image, executes 3-Stage ANPR detection,
    and returns detected vehicle boxes, plates, recognized text, and base64 annotated image.
    """
    eng = get_engine()
    if eng is None:
        raise HTTPException(status_code=503, detail="ANPR engine not initialized")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None or frame.size == 0:
        raise HTTPException(status_code=400, detail="Invalid image file or encoding")

    # Run TwoStageANPR detection
    results = eng.detect(
        frame=frame,
        v_conf=vehicle_conf,
        p_conf=plate_conf,
        do_ocr=do_ocr,
    )

    # Encode annotated frame as base64 JPEG
    annotated = results.get("annotated")
    b64_image = ""
    if annotated is not None and annotated.size > 0:
        success, buffer = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        if success:
            b64_image = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

    # Format plate outputs for JSON serialization
    serialized_plates = []
    for p in results.get("plates", []):
        serialized_plates.append({
            "text": p.get("text", ""),
            "confidence": round(float(p.get("conf", 0.0)), 4),
            "box": p.get("box", []),
            "vehicle_index": p.get("vehicle_idx", -1),
        })

    return {
        "success": True,
        "filename": file.filename,
        "vehicles": results.get("vehicles", []),
        "plates": serialized_plates,
        "total_vehicles": len(results.get("vehicles", [])),
        "total_plates": len(serialized_plates),
        "annotated_image": b64_image,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
