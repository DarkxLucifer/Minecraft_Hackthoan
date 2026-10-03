import TrajectoryDemo from "@/components/TrajectoryDemo";
import LaneStrip from "@/components/LaneStrip";
import RekorNav from "@/components/RekorNav";
import RekorHero from "@/components/RekorHero";
import LiveAnprTester from "@/components/LiveAnprTester";
import VisionXLogo from "@/components/VisionXLogo";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="spacex-landing theme-light">
      <RekorNav theme="light" />
      <RekorHero theme="light" />

      {/* ─────── About Section (Right below Hero) ─────── */}
      <section className="section" id="about">
        <div className="wrap">
          <div className="sec-head">
            <span
              className="mono-xs"
              style={{
                color: "#E4572E",
                fontWeight: 700,
                letterSpacing: "1.8px",
                display: "inline-block",
                marginBottom: "8px",
              }}
            >
              ABOUT VISIONX · SIH26127
            </span>
            <h2>Automated ANPR &amp; Multi-Camera Vehicle Trajectory Engine</h2>
            <p>
              Engineered for municipal smart cities, highway toll gantries, and law enforcement.
              VisionX converts raw CCTV streams into real-time operational roadway intelligence —
              recognizing license plates with offline Vision Transformers and reconstructing complete
              chronological journeys across camera networks.
            </p>
          </div>

          {/* Technical Telemetry Bar */}
          <div className="about-metrics-bar">
            <div className="about-metric">
              <span className="about-metric-val">94.2%</span>
              <span className="about-metric-lbl">TrOCR Character Accuracy</span>
            </div>
            <div className="about-metric">
              <span className="about-metric-val">&lt; 18ms</span>
              <span className="about-metric-lbl">Inference Latency (GPU)</span>
            </div>
            <div className="about-metric">
              <span className="about-metric-val">3-Stage</span>
              <span className="about-metric-lbl">YOLO11 + Plate + TrOCR</span>
            </div>
            <div className="about-metric">
              <span className="about-metric-val">100%</span>
              <span className="about-metric-lbl">Edge Local &amp; Private</span>
            </div>
          </div>

          {/* Four Core Architectural Pillars */}
          <div className="grid4" style={{ marginTop: "40px" }}>
            <div className="cell">
              <span className="n">01</span>
              <h3>High-Precision OCR</h3>
              <p>Detects the vehicle, isolates the license plate crop, and reads alphanumeric text with character-level attention.</p>
              <span className="target">Accuracy: Above 90% target</span>
              <ul style={{ marginTop: "16px" }}>
                <li>Vehicle-first context isolation</li>
                <li>Indian plate syntax validation</li>
                <li>Contrast &amp; blur enhancement</li>
              </ul>
            </div>

            <div className="cell">
              <span className="n">02</span>
              <h3>Trajectory Engine</h3>
              <p>Search any plate and reconstruct its sightings in chronological order across the municipal camera network.</p>
              <ul>
                <li>Chronological camera hits</li>
                <li>Impossible-hop detection</li>
                <li>Fuzzy match misread recovery</li>
              </ul>
            </div>

            <div className="cell">
              <span className="n">03</span>
              <h3>Traffic Density</h3>
              <p>Aggregates raw reads into continuous spatial corridor density and speed telemetry for city operators.</p>
              <ul>
                <li>Real-time corridor speed</li>
                <li>Congestion hotspot identification</li>
                <li>Arterial flow bottleneck metrics</li>
              </ul>
            </div>

            <div className="cell">
              <span className="n">04</span>
              <h3>Real-Time Alerts</h3>
              <p>Instant notification pipeline for stolen vehicles, hotlists, cloned plates, and suspicious circling patterns.</p>
              <ul>
                <li>Sub-50ms rule evaluation</li>
                <li>Multi-camera correlation</li>
                <li>Law enforcement dispatch push</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─────── What only a journey can show ─────── */}
      <section className="section" id="insights">
        <div className="wrap">
          <div className="sec-head">
            <h2>Three things only a journey can show</h2>
            <p>
              A read log cannot answer these. They need every sighting of a vehicle in time
              order, so they come from the trajectory engine rather than from the camera.
            </p>
          </div>

          <div className="grid3">
            <article className="ins">
              <div className="art"><CloneArt /></div>
              <div className="body">
                <span className="mono-xs">Journey only / 01</span>
                <h3>Cloned plate detection</h3>
                <p>
                  Two cars wearing one plate appear at distant cameras minutes apart. A reader
                  sees two valid reads. A journey sees a hop no single vehicle can make.
                </p>
              </div>
            </article>
            <article className="ins">
              <div className="art"><LoopArt /></div>
              <div className="body">
                <span className="mono-xs">Journey only / 02</span>
                <h3>Loop and circling detection</h3>
                <p>
                  A vehicle that passes the same junction three times in forty minutes hides
                  in a read log and stands out on a route.
                </p>
              </div>
            </article>
            <article className="ins">
              <div className="art"><MisreadArt /></div>
              <div className="body">
                <span className="mono-xs">Journey only / 03</span>
                <h3>Misread recovery</h3>
                <p>
                  Rain, glare and angle turn a B into an 8. Matching against nearby plates and
                  timing keeps the sighting on the right journey instead of creating a ghost vehicle.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─────── Pipeline (with live lane example) ─────── */}
      <section className="section" id="pipeline">
        <div className="wrap">
          <div className="sec-head">
            <h2>From camera frame to alert</h2>
            <p>
              A streaming design. Every step writes to the sighting store, and the alert check
              runs before the result reaches the operator. The feed below shows step two, the
              read, on a simulated lane.
            </p>
          </div>

          <LaneStrip />

          <div className="pipe">
            <div className="step">
              <h4>Ingest</h4>
              <p>RTSP streams and recorded footage from junction cameras, with camera ID and location attached.</p>
            </div>
            <div className="step">
              <h4>Read</h4>
              <p>Detector finds the plate, OCR returns text and a confidence score.</p>
            </div>
            <div className="step">
              <h4>Store</h4>
              <p>Plate, camera, timestamp, confidence and crop saved as one sighting record.</p>
            </div>
            <div className="step">
              <h4>Analyse</h4>
              <p>Sightings are joined into trajectories and aggregated into density and speed.</p>
            </div>
            <div className="step alert">
              <h4>Alert</h4>
              <p>Watchlist and anomaly rules fire and notify the control room.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────── Demo (Trajectory Search + Live ANPR Tester) ─────── */}
      <section className="section" id="demo">
        <div className="wrap">
          <div className="sec-head">
            <h2>Trajectory search &amp; live test bench</h2>
            <p>
              Pick a plate or upload an image. The route is rebuilt from its camera sightings in time
              order. Try the cloned plate to see an impossible hop, or mistype a character to see
              the closest match recovered.
            </p>
          </div>

          <TrajectoryDemo />
          <LiveAnprTester />
        </div>
      </section>

      {/* ─────── Footer ─────── */}
      <footer>
        <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <VisionXLogo size="sm" />
            <span>ADVANCED MOBILITY &amp; ROADWAY INTELLIGENCE</span>
          </div>
          <span>SIH26127 • THREE-STAGE YOLO11 + TROCR LOCAL INFERENCE</span>
        </div>
      </footer>
    </div>
  );
}

/* ───────── Insight artwork ───────── */

const MONO_STYLE = { fontFamily: "var(--mono-font)" } as const;

function CloneArt() {
  return (
    <svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <line x1="48" y1="104" x2="252" y2="46" stroke="#C9C6B9" strokeWidth="12" strokeLinecap="round" />
      <line x1="48" y1="104" x2="252" y2="46" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
      <line x1="48" y1="104" x2="252" y2="46" stroke="#B8321A" strokeWidth="2.5" strokeDasharray="6 5"
        strokeLinecap="round" className="march" />
      {[[48, 104], [252, 46]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 14} y={y - 14} width="28" height="28" fill="none" stroke="#B8321A" strokeWidth="1.5">
            <animate attributeName="opacity" values="0.9;0.15;0.9" dur="1.6s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          </rect>
          <rect x={x - 7} y={y - 7} width="14" height="14" fill="#121212" />
          <rect x={x - 2.5} y={y - 2.5} width="5" height="5" fill="#F2A93B" />
        </g>
      ))}
      <text x="48" y="136" textAnchor="middle" style={{ ...MONO_STYLE, fontSize: 9, fill: "#5E5E59" }}>CAM 2  09:07</text>
      <text x="252" y="80" textAnchor="middle" style={{ ...MONO_STYLE, fontSize: 9, fill: "#5E5E59" }}>CAM 6  09:09</text>
      <rect x="102" y="62" width="96" height="17" fill="#B8321A" />
      <text x="150" y="73.5" textAnchor="middle" style={{ ...MONO_STYLE, fontSize: 8.5, fill: "#fff" }}>2 MIN APART</text>
      <text x="150" y="26" textAnchor="middle" style={{ ...MONO_STYLE, fontSize: 10, fill: "#121212", fontWeight: 600 }}>DL04GH4004</text>
    </svg>
  );
}

function LoopArt() {
  const d = "M30 75 L150 75 L150 28 L240 28 L240 75 L150 75 L150 122 L60 122 L60 75 L150 75 L272 75";
  return (
    <svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <path d={d} fill="none" stroke="#C9C6B9" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#fff" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#E4572E" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.5" />
      <rect x="132" y="57" width="36" height="36" fill="none" stroke="#E4572E" strokeWidth="1.6">
        <animate attributeName="opacity" values="1;0.15;1" dur="1.8s" repeatCount="indefinite" />
      </rect>
      <rect x="143" y="68" width="14" height="14" fill="#121212" />
      <rect x="147.5" y="72.5" width="5" height="5" fill="#F2A93B" />
      <rect x="-5" y="-5" width="10" height="10" fill="#E4572E" stroke="#fff" strokeWidth="2">
        <animateMotion path={d} dur="7s" repeatCount="indefinite" calcMode="linear" />
      </rect>
      <rect x="160" y="86" width="98" height="16" fill="#E4572E" />
      <text x="209" y="97.5" textAnchor="middle" style={{ ...MONO_STYLE, fontSize: 8.5, fill: "#fff" }}>3 PASSES, 40 MIN</text>
    </svg>
  );
}

function MisreadArt() {
  return (
    <div className="mis">
      <div className="mis-row">
        <span className="mono-xs">Read at Camera 3</span>
        <div className="mis-plate">DL 01 A<em className="bad">8</em> 1001</div>
      </div>
      <div className="mis-arrow" aria-hidden />
      <div className="mis-row">
        <span className="mono-xs">Matched to known plate</span>
        <div className="mis-plate">DL 01 A<em className="ok">B</em> 1001</div>
      </div>
    </div>
  );
}
