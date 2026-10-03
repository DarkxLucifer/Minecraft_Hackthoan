import subprocess
import sys
import time
from pathlib import Path

# Force UTF-8 stdout
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent

# Check candidate python interpreters according to workspace rules
candidates = [
    Path(r"D:\project\aiml prime\.venv\Scripts\python.exe"),
    BASE_DIR.parent.parent / ".venv" / "Scripts" / "python.exe",
    Path(sys.executable)
]

PYTHON_EXE = "python"
for c in candidates:
    if c.exists():
        PYTHON_EXE = str(c)
        break

FRONTEND_DIR = (
    BASE_DIR / "frontend" / "landing_page"
    if (BASE_DIR / "frontend" / "landing_page" / "package.json").exists()
    else BASE_DIR / "frontend"
)
BACKEND_DIR = BASE_DIR / "backend"

def main():
    print("=" * 72)
    print(" [VisionX & Minecraft_Hackthoan] ANPR Intelligence Platform")
    print("=" * 72)
    print(f" Python Interpreter: {PYTHON_EXE}")
    print(" Models: best_yolo.pt (Stage 2) + trocr_indian_plates (Stage 3)")
    print(" 1. Starting FastAPI Backend on http://127.0.0.1:8000 ...")

    backend_proc = subprocess.Popen(
        [PYTHON_EXE, "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(BACKEND_DIR)
    )

    time.sleep(2.5)

    print(" 2. Starting Next.js 16 Frontend on http://localhost:3000 ...")
    frontend_proc = subprocess.Popen(
        "npm run dev",
        cwd=str(FRONTEND_DIR),
        shell=True
    )

    print("\n" + "-" * 72)
    print(" [OK] VisionX Platform is LIVE!")
    print("   -> Frontend Dashboard:  http://localhost:3000/")
    print("   -> FastAPI Backend API:  http://127.0.0.1:8000/docs")
    print("   -> Live Telemetry:       http://127.0.0.1:8000/api/health")
    print("-" * 72)
    print(" Press Ctrl+C to stop both servers.\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down VisionX platform...")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass
        print("Done.")

if __name__ == "__main__":
    main()
