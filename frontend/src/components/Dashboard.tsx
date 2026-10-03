"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * City traffic dashboard (enhanced):
 * - Stat-bar row: Vehicles Tracked, Active Cameras, Alerts Fired (animated count-up)
 * - A 16×16 heatmap cell grid with compass labels and gentle breathing
 * - Corridor average-speed bars with km/h labels and 50 km/h target reference
 * - A trend polyline with hour labels on x-axis
 *
 * All data is simulated — labels make this explicit.
 */

const GRID = 16;
const CORRIDORS = [
  { name: "NH-48 Sector", pct: 62, speed: 42 },
  { name: "Ring Road East", pct: 38, speed: 26 },
  { name: "MG Corridor", pct: 74, speed: 52 },
  { name: "IT Expressway", pct: 50, speed: 35 },
];

const HOTSPOTS: [number, number][] = [
  [4, 5],
  [10, 9],
];

const STAT_TARGETS = {
  vehicles: 2847,
  cameras: 12,
  camerasTotal: 12,
  alerts: 7,
};

const HOURS = ["00", "04", "08", "12", "16", "20", "24"];

function useCountUp(target: number, duration = 1600): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

export default function Dashboard() {
  const [intensities, setIntensities] = useState<number[]>(() =>
    Array.from({ length: GRID * GRID }, (_, i) => {
      const x = i % GRID;
      const y = Math.floor(i / GRID);
      let h = 0;
      for (const hs of HOTSPOTS)
        h += Math.max(0, 1 - Math.hypot(x - hs[0], y - hs[1]) / 7);
      return Math.min(1, h * 0.85);
    })
  );
  const raf = useRef(0);

  useEffect(() => {
    const tick = () => {
      setIntensities((prev) => {
        const next = prev.slice();
        for (let i = 0; i < next.length; i++) {
          const x = i % GRID;
          const y = Math.floor(i / GRID);
          let h = 0;
          for (const hx of HOTSPOTS) {
            const d = Math.hypot(x - hx[0], y - hx[1]);
            h += Math.max(0, 1 - d / 7);
          }
          const target = Math.min(1, h * 0.85 + Math.random() * 0.08);
          next[i] = next[i] * 0.85 + target * 0.15;
        }
        return next;
      });
      raf.current = window.setTimeout(
        () => requestAnimationFrame(tick),
        700
      );
    };
    raf.current = window.setTimeout(() => requestAnimationFrame(tick), 700);
    return () => window.clearTimeout(raf.current);
  }, []);

  const vehicleCount = useCountUp(STAT_TARGETS.vehicles);
  const cameraCount = useCountUp(STAT_TARGETS.cameras, 800);
  const alertCount = useCountUp(STAT_TARGETS.alerts, 1000);

  return (
    <div className="dash-enhanced">
      {/* ─── Stat Bar ─── */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <span className="dash-stat-value">
            {vehicleCount.toLocaleString()}
          </span>
          <span className="dash-stat-label">Vehicles tracked today</span>
          <span className="dash-stat-delta up">▲ 12% vs yesterday</span>
        </div>
        <div className="dash-stat-card">
          <span className="dash-stat-value">
            {cameraCount}/{STAT_TARGETS.camerasTotal}
          </span>
          <span className="dash-stat-label">Cameras online</span>
          <span className="dash-stat-delta online">
            <span className="dash-dot green" />
            All active
          </span>
        </div>
        <div className="dash-stat-card">
          <span className="dash-stat-value">{alertCount}</span>
          <span className="dash-stat-label">Alerts fired</span>
          <span className="dash-stat-delta critical">
            <span className="dash-dot red pulse" />2 critical
          </span>
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      <div className="dash">
        <div className="card">
          <span className="mono">Heatmap</span>
          <h4>Vehicle density by grid cell</h4>
          <div className="hm-wrap">
            <span className="hm-compass hm-n">N</span>
            <span className="hm-compass hm-s">S</span>
            <span className="hm-compass hm-w">W</span>
            <span className="hm-compass hm-e">E</span>
            <div className="hm">
              {intensities.map((v, i) => {
                const t = Math.min(1, v);
                const color =
                  t < 0.5
                    ? blend("#EDE9DD", "#F2A93B", t / 0.5)
                    : blend("#F2A93B", "#E4572E", (t - 0.5) / 0.5);
                return <div key={i} style={{ background: color }} />;
              })}
            </div>
          </div>
          <div className="scale">
            <span>Low</span>
            <i></i>
            <span>High</span>
          </div>
          <span className="sim-badge">Simulated data</span>
        </div>

        <div className="stack">
          <div className="card">
            <span className="mono">Average speed</span>
            <h4>By corridor</h4>
            <div className="bars">
              {CORRIDORS.map((c) => (
                <div className="bar" key={c.name}>
                  <span>
                    {c.name}{" "}
                    <em className="bar-speed">{c.speed} km/h</em>
                  </span>
                  <div>
                    <i style={{ width: `${c.pct}%` }} />
                    <span
                      className="bar-target"
                      style={{ left: "66%" }}
                      title="Target: 50 km/h"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="bar-legend">
              <span className="bar-legend-item">
                <i className="bar-legend-line" /> Measured
              </span>
              <span className="bar-legend-item">
                <i className="bar-legend-target" /> Target 50 km/h
              </span>
            </div>
          </div>

          <div className="card">
            <span className="mono">Trend</span>
            <h4>Traffic through the day</h4>
            <svg
              viewBox="0 0 300 80"
              width="100%"
              height="80"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="79" x2="300" y2="79" stroke="#D9D7CF" />
              {/* Grid lines */}
              {[20, 40, 60].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="300"
                  y2={y}
                  stroke="#e8e8e4"
                  strokeDasharray="4 4"
                />
              ))}
              {/* Area fill */}
              <path
                d="M0,60 L30,56 60,38 90,18 120,30 150,42 180,36 210,20 240,14 270,40 300,58 L300,79 L0,79 Z"
                fill="rgba(0,0,0,0.04)"
              />
              <polyline
                fill="none"
                stroke="#121212"
                strokeWidth="1.5"
                points="0,60 30,56 60,38 90,18 120,30 150,42 180,36 210,20 240,14 270,40 300,58"
              />
              {/* Peak dot */}
              <circle cx="240" cy="14" r="3" fill="#121212" />
            </svg>
            <div className="trend-hours">
              {HOURS.map((h) => (
                <span key={h}>{h}:00</span>
              ))}
            </div>
            <span className="sim-badge">Simulated curve</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function blend(a: string, b: string, t: number) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 255,
    ag = (ah >> 8) & 255,
    ab = ah & 255;
  const br = (bh >> 16) & 255,
    bg = (bh >> 8) & 255,
    bb = bh & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}