"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import VisionXLogo from "@/components/VisionXLogo";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import "./dashboard.css";

// ─── Heatmap & Corridor Constants ───
const GRID = 16;
const HOTSPOTS: [number, number][] = [
  [4, 5],
  [10, 9],
  [13, 3],
];

const CORRIDORS = [
  { name: "NH-48 Sector", pct: 72, speed: 48, status: "Moderate", color: "#F59E0B" },
  { name: "Ring Road East", pct: 41, speed: 28, status: "Congested", color: "#EF4444" },
  { name: "MG Corridor", pct: 85, speed: 56, status: "Optimal", color: "#10B981" },
  { name: "IT Expressway", pct: 58, speed: 39, status: "Moderate", color: "#3B82F6" },
];

const CAMERAS = [
  { id: "cam-01", name: "CAM-01 [NH-48 Toll Plaza]", status: "STREAMING", fps: 29.8, bitrate: "4.2 Mbps" },
  { id: "cam-02", name: "CAM-02 [Ring Road East Flyover]", status: "STREAMING", fps: 30.0, bitrate: "3.8 Mbps" },
  { id: "cam-03", name: "CAM-03 [MG Corridor Junction]", status: "STREAMING", fps: 29.4, bitrate: "4.0 Mbps" },
  { id: "cam-04", name: "CAM-04 [IT Expressway KM 14]", status: "STREAMING", fps: 30.1, bitrate: "4.5 Mbps" },
];

const INITIAL_SIGHTINGS = [
  { plate: "DL 01 AB 1234", cam: "CAM-01", type: "Car (Sedan)", conf: "97.4%", time: "18:42:10", hotlist: false },
  { plate: "MH 12 DE 4567", cam: "CAM-02", type: "SUV", conf: "94.8%", time: "18:41:55", hotlist: true },
  { plate: "KA 03 MG 9988", cam: "CAM-03", type: "Commercial Truck", conf: "96.1%", time: "18:41:30", hotlist: false },
  { plate: "HR 26 DQ 1102", cam: "CAM-01", type: "Car (Hatchback)", conf: "98.2%", time: "18:41:04", hotlist: false },
  { plate: "UP 16 BF 8821", cam: "CAM-04", type: "Two-Wheeler", conf: "92.5%", time: "18:40:48", hotlist: false },
  { plate: "DL 03 CY 7709", cam: "CAM-02", type: "Bus (Transit)", conf: "95.9%", time: "18:40:15", hotlist: false },
];

function blend(a: string, b: string, t: number) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
  const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export default function OperatorDashboardPage() {
  const { user, officer, isLoading, signOut, demoSignIn } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Time ticker
  const [timeStr, setTimeStr] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Selected camera feed
  const [activeCam, setActiveCam] = useState(CAMERAS[0]);

  // Live sightings feed
  const [sightings, setSightings] = useState(INITIAL_SIGHTINGS);

  // Heatmap intensity state
  const [intensities, setIntensities] = useState<number[]>(() =>
    Array.from({ length: GRID * GRID }, (_, i) => {
      const x = i % GRID;
      const y = Math.floor(i / GRID);
      let h = 0;
      for (const hs of HOTSPOTS) {
        h += Math.max(0, 1 - Math.hypot(x - hs[0], y - hs[1]) / 6.5);
      }
      return Math.min(1, h * 0.85);
    })
  );

  // Dynamic breathing heatmap
  useEffect(() => {
    const timer = setInterval(() => {
      setIntensities((prev) => {
        const next = prev.slice();
        for (let i = 0; i < next.length; i++) {
          const x = i % GRID;
          const y = Math.floor(i / GRID);
          let h = 0;
          for (const hs of HOTSPOTS) {
            h += Math.max(0, 1 - Math.hypot(x - hs[0], y - hs[1]) / 6.5);
          }
          const target = Math.min(1, h * 0.85 + Math.random() * 0.1);
          next[i] = next[i] * 0.88 + target * 0.12;
        }
        return next;
      });
    }, 850);
    return () => clearInterval(timer);
  }, []);

  // Periodic random sighting streamer
  useEffect(() => {
    const mockPlates = ["DL 10 CE 4022", "HR 55 AJ 9120", "MH 04 GA 3311", "PB 65 TR 7001", "KA 05 MN 4490"];
    const mockTypes = ["Car (Sedan)", "SUV", "Commercial Truck", "Motorcycle"];

    const interval = setInterval(() => {
      const randomPlate = mockPlates[Math.floor(Math.random() * mockPlates.length)];
      const randomType = mockTypes[Math.floor(Math.random() * mockTypes.length)];
      const randomCam = CAMERAS[Math.floor(Math.random() * CAMERAS.length)].name.split(" ")[0];
      const randomConf = (93 + Math.random() * 6).toFixed(1) + "%";
      const isHot = Math.random() < 0.15;

      const newSighting = {
        plate: randomPlate,
        cam: randomCam,
        type: randomType,
        conf: randomConf,
        time: new Date().toLocaleTimeString("en-IN", { hour12: false }),
        hotlist: isHot,
      };

      setSightings((prev) => [newSighting, ...prev.slice(0, 9)]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // ─── Loading Screen ───
  if (isLoading) {
    return (
      <div className="operator-gate-screen">
        <div className="operator-gate-card">
          <div className="gate-icon">⬡</div>
          <h2>INITIALIZING TELEMETRY STREAM</h2>
          <p>Authenticating credentials and mounting encrypted optical telemetry nodes...</p>
        </div>
      </div>
    );
  }

  // ─── Protected Gate (Unauthenticated Visitors) ───
  if (!user && !officer) {
    return (
      <div className="operator-gate-screen">
        <div className="operator-gate-card">
          <div className="gate-icon">🔒</div>
          <h2>OFFICER ACCESS RESTRICTED</h2>
          <p>
            The VisionX Roadway Control Room requires authenticated agency or law enforcement credentials.
            Please sign in with your department account or enter via Demo Operator Mode.
          </p>
          <button
            type="button"
            className="gate-cta-btn"
            onClick={() => setAuthModalOpen(true)}
          >
            SIGN IN TO OPERATOR DESK →
          </button>
          <button
            type="button"
            className="gate-demo-btn"
            onClick={() => demoSignIn()}
          >
            QUICK ACCESS: DEMO LEAD DISPATCHER →
          </button>
          <Link href="/" className="gate-back-link">
            ← Return to VisionX Public Portal
          </Link>
        </div>
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="operator-root">
      {/* ─── Top Command Header ─── */}
      <header className="operator-header">
        <div className="operator-header-inner">
          <div className="operator-brand">
            <Link href="/" className="operator-portal-back">
              ← PORTAL
            </Link>
            <VisionXLogo size="md" theme="dark" />
            <div className="operator-sector-badge">
              <span>SECTOR 04</span>
              <span>·</span>
              <span>NCR / NH-48 CORRIDOR</span>
            </div>
          </div>

          <div className="operator-center-telemetry">
            <div className="operator-engine-pill">
              <span className="engine-dot" />
              <span>AI ENGINE: YOLO11 + TrOCR (ACTIVE)</span>
            </div>
            <div className="operator-clock-widget">
              <span className="operator-clock-time">{timeStr} IST</span>
              <span className="operator-clock-zone">NCR TIMEZONE UTC+05:30</span>
            </div>
          </div>

          <div className="operator-user-actions">
            <div className="operator-badge-card">
              <div className="officer-avatar">
                {officer?.role === "Lead Dispatcher" ? "LD" : "WO"}
              </div>
              <div className="officer-info">
                <span className="officer-badge-name">
                  {officer?.badgeId} · {officer?.role || "Watch Officer"}
                </span>
                <span className="officer-agency-name" title={officer?.agency}>
                  {officer?.agency}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="operator-signout-btn"
              onClick={() => signOut()}
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </header>

      {/* ─── Bento Operations Canvas ─── */}
      <main className="operator-main">
        <div className="bento-dashboard-grid">
          {/* Row 1: 4 Vital Telemetry Counters */}
          <div className="bento-stats-row">
            <div className="bento-stat-card">
              <div className="bento-stat-head">
                <span className="bento-stat-label">VEHICLES LOGGED (TODAY)</span>
                <span className="bento-stat-icon">🚗</span>
              </div>
              <div className="bento-stat-value">3,492</div>
              <div className="bento-stat-foot">
                <span className="stat-trend-up">▲ 14.8%</span>
                <span>vs diurnal baseline</span>
              </div>
            </div>

            <div className="bento-stat-card">
              <div className="bento-stat-head">
                <span className="bento-stat-label">ACTIVE OPTICAL NODES</span>
                <span className="bento-stat-icon">📹</span>
              </div>
              <div className="bento-stat-value">12 / 12</div>
              <div className="bento-stat-foot">
                <span className="stat-trend-up">● 100% ONLINE</span>
                <span>Edge RTSP Streams</span>
              </div>
            </div>

            <div className="bento-stat-card">
              <div className="bento-stat-head">
                <span className="bento-stat-label">HOTLIST / SPEED ALERTS</span>
                <span className="bento-stat-icon">🚨</span>
              </div>
              <div className="bento-stat-value">5</div>
              <div className="bento-stat-foot">
                <span className="stat-trend-alert">1 WATCHLIST VEHICLE</span>
                <span>Flagged on NH-48</span>
              </div>
            </div>

            <div className="bento-stat-card">
              <div className="bento-stat-head">
                <span className="bento-stat-label">MODEL INFERENCE LATENCY</span>
                <span className="bento-stat-icon">⚡</span>
              </div>
              <div className="bento-stat-value">16.4 ms</div>
              <div className="bento-stat-foot">
                <span className="stat-trend-up">TrOCR + YOLO11 GPU</span>
                <span>Real-time pipeline</span>
              </div>
            </div>
          </div>

          {/* Row 2 Left: 16×16 Density Heatmap (Span 7) */}
          <div className="bento-card bento-heatmap-card">
            <div className="bento-card-title-row">
              <div>
                <span className="bento-card-kicker">SPATIAL TELEMETRY MATRIX</span>
                <h3 className="bento-card-title">16×16 Urban Vehicle Density Heatmap</h3>
              </div>
              <div className="heatmap-controls-row">
                <select className="heatmap-sector-select" defaultValue="nh48">
                  <option value="nh48">NCR Sector 04 (NH-48)</option>
                  <option value="ring">East Ring Corridor</option>
                  <option value="mg">MG Road Interchange</option>
                </select>
              </div>
            </div>

            <div className="heatmap-container-tactical">
              <span className="tactical-grid-compass n">N</span>
              <span className="tactical-grid-compass s">S</span>
              <span className="tactical-grid-compass w">W</span>
              <span className="tactical-grid-compass e">E</span>

              <div className="tactical-heatmap-cells">
                {intensities.map((v, i) => {
                  const t = Math.min(1, v);
                  const color =
                    t < 0.4
                      ? blend("#121722", "#2563EB", t / 0.4)
                      : t < 0.75
                      ? blend("#2563EB", "#F59E0B", (t - 0.4) / 0.35)
                      : blend("#F59E0B", "#E4572E", (t - 0.75) / 0.25);
                  return <div key={i} className="tactical-cell" style={{ background: color }} />;
                })}
              </div>
            </div>

            <div className="heatmap-scale-legend">
              <span>LOW DENSITY</span>
              <div className="scale-gradient-bar" />
              <span>HIGH CONGESTION</span>
            </div>
          </div>

          {/* Row 2 Right: Corridor Speed Gauges & Diurnal Curve (Span 5) */}
          <div className="bento-card bento-metrics-card">
            <div>
              <div className="bento-card-title-row">
                <div>
                  <span className="bento-card-kicker">SPEED & CONGESTION</span>
                  <h3 className="bento-card-title">Corridor Average Flow Rates</h3>
                </div>
                <span className="bento-badge">Target: 50 km/h</span>
              </div>

              <div className="corridor-bar-list">
                {CORRIDORS.map((c) => (
                  <div key={c.name} className="corridor-bar-item">
                    <div className="corridor-bar-labels">
                      <span className="corridor-bar-name">{c.name}</span>
                      <span className="corridor-bar-speed" style={{ color: c.color }}>
                        {c.speed} km/h ({c.status})
                      </span>
                    </div>
                    <div className="corridor-track">
                      <div
                        className="corridor-fill"
                        style={{ width: `${c.pct}%`, background: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="diurnal-trend-wrap">
              <div className="bento-card-title-row" style={{ marginBottom: 8, paddingBottom: 6 }}>
                <div>
                  <span className="bento-card-kicker">DIURNAL PROFILE</span>
                  <h4 style={{ margin: 0, fontSize: 13, color: "#fff" }}>24-Hour Traffic Flow</h4>
                </div>
                <span className="bento-badge">Peak: 18:00</span>
              </div>

              <svg viewBox="0 0 300 70" width="100%" height="70" preserveAspectRatio="none">
                <line x1="0" y1="69" x2="300" y2="69" stroke="#1E2533" />
                <path
                  d="M0,54 L30,50 60,34 90,16 120,26 150,38 180,32 210,18 240,12 270,36 300,52 L300,69 L0,69 Z"
                  fill="rgba(228,87,46,0.12)"
                />
                <polyline
                  fill="none"
                  stroke="#E4572E"
                  strokeWidth="2"
                  points="0,54 30,50 60,34 90,16 120,26 150,38 180,32 210,18 240,12 270,36 300,52"
                />
                <circle cx="240" cy="12" r="4" fill="#E4572E" />
              </svg>
              <div className="diurnal-hours-row">
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>24:00</span>
              </div>
            </div>
          </div>

          {/* Row 3 Left: Tactical Camera Viewport (Span 6) */}
          <div className="bento-card bento-camera-card">
            <div className="bento-card-title-row">
              <div>
                <span className="bento-card-kicker">OPTICAL SURVEILLANCE FEED</span>
                <h3 className="bento-card-title">Live Node Telemetry Viewport</h3>
              </div>
              <span className="bento-badge" style={{ color: "#10B981" }}>
                ● {activeCam.fps} FPS
              </span>
            </div>

            <div className="camera-nav-tabs">
              {CAMERAS.map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  className={`camera-tab-btn ${activeCam.id === cam.id ? "active" : ""}`}
                  onClick={() => setActiveCam(cam)}
                >
                  {cam.name.split(" ")[0]}
                </button>
              ))}
            </div>

            <div className="camera-viewport">
              <div className="camera-crosshair" />

              {/* Simulated Detection Boxes in Viewport */}
              <div
                className="detection-box"
                style={{ top: "35%", left: "28%", width: "110px", height: "85px" }}
              >
                <span className="detection-tag">DL 01 AB 1234 · 97%</span>
              </div>

              <div
                className="detection-box"
                style={{
                  top: "20%",
                  left: "60%",
                  width: "140px",
                  height: "105px",
                  borderColor: "#EF4444",
                  background: "rgba(239, 68, 68, 0.1)",
                }}
              >
                <span className="detection-tag" style={{ background: "#EF4444", color: "#FFF" }}>
                  HOTLIST · MH 12 DE 4567
                </span>
              </div>

              <div className="camera-hud-overlay">
                <div className="camera-hud-top">
                  <span>REC [LIVE] · {activeCam.name}</span>
                  <span>{timeStr} IST</span>
                </div>
                <div className="camera-hud-bottom">
                  <span>RES: 1920×1080 · CODEC: H.265 / RTSP</span>
                  <span>BANDWIDTH: {activeCam.bitrate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3 Right: Real-time ANPR Sightings Stream (Span 6) */}
          <div className="bento-card bento-sightings-card">
            <div className="bento-card-title-row">
              <div>
                <span className="bento-card-kicker">AUTOMATED NUMBER PLATE RECOGNITION</span>
                <h3 className="bento-card-title">Live TrOCR Ingestion Log</h3>
              </div>
              <span className="bento-badge">Real-Time Ingestion</span>
            </div>

            <div className="sightings-table-wrap">
              <table className="sightings-table">
                <thead>
                  <tr>
                    <th>License Plate</th>
                    <th>Camera</th>
                    <th>Classification</th>
                    <th>Confidence</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {sightings.map((s, idx) => (
                    <tr key={`${s.plate}-${idx}`}>
                      <td>
                        <span className={`plate-badge-tactical ${s.hotlist ? "hotlist" : ""}`}>
                          {s.plate}
                        </span>
                      </td>
                      <td>{s.cam}</td>
                      <td>{s.type}</td>
                      <td>
                        <span className="conf-pill">{s.conf}</span>
                      </td>
                      <td>{s.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
