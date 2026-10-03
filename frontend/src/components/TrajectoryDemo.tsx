"use client";

import { useMemo, useState } from "react";
import {
  CAMS, PLATES, ROADS, SAMPLE_PLATES, type CamId, type PlateEntry,
} from "@/lib/demoData";

const W = 700;
const H = 480;
const MONO = { fontFamily: "var(--mono-font)" } as const;

/* ───────── Static map fabric (deterministic) ───────── */
const ROAD_NAMES: Record<string, string> = {
  "C1-C2": "North Avenue",
  "C2-C3": "Market Road",
  "C3-C4": "Ring Road",
  "C4-C5": "Station Road",
  "C5-C6": "Flyover Road",
  "C3-C7": "Bridge Road",
  "C1-C7": "West Link",
};

const RIVER: [number, number][] = [
  [-20, 296], [50, 300], [92, 312], [150, 336], [210, 372], [280, 408],
  [360, 432], [450, 448], [540, 452], [630, 446], [720, 432],
];

const PARKS = [
  { x: 300, y: 268, w: 130, h: 72 },
  { x: 300, y: 112, w: 132, h: 88 },
  { x: 520, y: 252, w: 78, h: 76 },
];

function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  const l = pts[pts.length - 1];
  return `${d} L${l[0]} ${l[1]}`;
}

function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function buildFabric() {
  let s = 42;
  const rng = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const fills = ["#E6E3D8", "#E0DDD0", "#EAE7DD", "#DCD8CA"];
  const bld: { x: number; y: number; w: number; h: number; fill: string }[] = [];
  const trees: { x: number; y: number; r: number }[] = [];

  for (let gy = 14; gy < H; gy += 26) {
    for (let gx = 14; gx < W; gx += 26) {
      const cx = gx + (rng() - 0.5) * 4;
      const cy = gy + (rng() - 0.5) * 4;
      const w = 12 + rng() * 11;
      const h = 12 + rng() * 11;
      const skip = rng() < 0.14;
      const fill = fills[Math.floor(rng() * fills.length)];
      let near = Infinity;
      for (const [a, b] of ROADS) {
        near = Math.min(near, distSeg(cx, cy, CAMS[a].x, CAMS[a].y, CAMS[b].x, CAMS[b].y));
      }
      let river = Infinity;
      for (let i = 0; i < RIVER.length - 1; i++) {
        river = Math.min(river, distSeg(cx, cy, RIVER[i][0], RIVER[i][1], RIVER[i + 1][0], RIVER[i + 1][1]));
      }
      const m = Math.max(w, h);
      const inPark = PARKS.some((p) => cx > p.x - 10 && cx < p.x + p.w + 10 && cy > p.y - 10 && cy < p.y + p.h + 10);
      if (skip || inPark || near < 17 + m * 0.35 || river < 22 + m * 0.3) continue;
      bld.push({ x: +(cx - w / 2).toFixed(1), y: +(cy - h / 2).toFixed(1), w: +w.toFixed(1), h: +h.toFixed(1), fill });
    }
  }
  PARKS.forEach((p) => {
    for (let y = p.y + 10; y < p.y + p.h - 4; y += 16) {
      for (let x = p.x + 10; x < p.x + p.w - 4; x += 16) {
        trees.push({
          x: +(x + (rng() - 0.5) * 7).toFixed(1),
          y: +(y + (rng() - 0.5) * 7).toFixed(1),
          r: +(3.5 + rng() * 2.5).toFixed(1),
        });
      }
    }
  });
  return { bld, trees };
}

const FABRIC = buildFabric();
const RIVER_D = smooth(RIVER);

/* ───────── Plate search ───────── */
const norm = (s: string) => s.replace(/\s+/g, "").toUpperCase();
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

type Result = { entry: PlateEntry | null; exact: boolean; query: string; diff: number };

function resolve(q: string): Result {
  const n = norm(q);
  if (!n) return { entry: null, exact: false, query: q, diff: 0 };
  let best: PlateEntry | null = null;
  let bestDiff = 99;
  for (const p of Object.values(PLATES)) {
    const pn = norm(p.plate);
    if (pn === n) return { entry: p, exact: true, query: q, diff: 0 };
    if (pn.length !== n.length) continue;
    let d = 0;
    for (let i = 0; i < pn.length; i++) if (pn[i] !== n[i]) d++;
    if (d < bestDiff) { bestDiff = d; best = p; }
  }
  if (best && bestDiff <= 2) return { entry: best, exact: false, query: q, diff: bestDiff };
  return { entry: null, exact: false, query: q, diff: 0 };
}

/* ───────── Component ───────── */
export default function TrajectoryDemo() {
  const [query, setQuery] = useState(SAMPLE_PLATES[0]);
  const [result, setResult] = useState<Result>(() => resolve(SAMPLE_PLATES[0]));
  const [runId, setRunId] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const data = result.entry;

  function run(q: string) {
    setResult(resolve(q));
    setRunId((n) => n + 1);
    setHover(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    run(query);
  }

  const hits = data?.hits ?? [];
  const duration = hits.length > 1 ? toMin(hits[hits.length - 1][0]) - toMin(hits[0][0]) : 0;

  return (
    <div className="demo">
      <div className="side">
        <div>
          <label className="mono" htmlFor="plate-input">Plate number</label>
          <form className="search" onSubmit={submit}>
            <input
              id="plate-input"
              autoComplete="off"
              spellCheck={false}
              placeholder="DL 01 AB 1001"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn primary" type="submit">Search</button>
          </form>
        </div>

        <div>
          <span className="mono" style={{ display: "block", marginBottom: 8 }}>Sample plates</span>
          <div className="chips">
            {SAMPLE_PLATES.map((p) => {
              const t = PLATES[p].tag;
              return (
                <button
                  key={p}
                  type="button"
                  className={`chip ${data?.plate === p && result.exact ? "on" : ""}`}
                  onClick={() => { setQuery(p); run(p); }}
                >
                  <span>{p}</span>
                  {t && <em>{t}</em>}
                </button>
              );
            })}
          </div>
        </div>

        {data && !result.exact && (
          <div className="banner show neutral">
            <strong>Closest match</strong>
            <span>
              {result.query.toUpperCase()} was not found. Showing {data.plate}, which differs by{" "}
              {result.diff} {result.diff === 1 ? "character" : "characters"}. This is how a misread plate is recovered.
            </span>
          </div>
        )}
        {data?.alert && (
          <div className="banner show">
            <strong>{data.alert[0]}</strong>
            <span>{data.alert[1]}</span>
          </div>
        )}
        {!data && (
          <div className="banner show neutral">
            <strong>No sightings</strong>
            <span>Nothing within two characters of that plate. Try one of the samples.</span>
          </div>
        )}

        <div>
          <span className="mono" style={{ display: "block", marginBottom: 8 }}>Sightings in order</span>
          <ul className="timeline">
            {!data && (
              <li><span /><span style={{ color: "var(--muted)" }}>Search a plate to see its route.</span></li>
            )}
            {hits.map(([t, c], i) => {
              const gap = i > 0 ? toMin(t) - toMin(hits[i - 1][0]) : null;
              return (
                <li
                  key={`${runId}-${t}-${c}-${i}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className={hover === i ? "hot" : ""}
                >
                  <span>{t}</span>
                  <span>
                    {CAMS[c as CamId].name}
                    {gap !== null && <small>+{gap} min from previous</small>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mapbox">
        <span className="note mono">Simulated data</span>
        {data && (
          <div className="map-hud">
            <span className="mono-xs">Tracking</span>
            <b>{data.plate}</b>
            <span className="mono-xs">
              {hits.length} sightings, {hits[0][0]} to {hits[hits.length - 1][0]}, {duration} min
            </span>
          </div>
        )}
        <MapSVG key={runId} hits={hits} hoverCam={hover !== null ? (hits[hover]?.[1] as CamId) : null} />
      </div>
    </div>
  );
}

/** Shared city backdrop (river, parks, trees, building footprints). */
export function MapFabric() {
  return (
    <>
      <rect width={W} height={H} fill="#EFEDE5" />
      <path d={RIVER_D} fill="none" stroke="#D3DDDD" strokeWidth={34} strokeLinecap="round" />
      <path d={RIVER_D} fill="none" stroke="#C6D6D9" strokeWidth={26} strokeLinecap="round" />
      {PARKS.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={3} fill="#DCE5D0" stroke="#CFDAC2" />
      ))}
      {FABRIC.trees.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={t.r} fill="#C3D3B3" />
      ))}
      {FABRIC.bld.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} stroke="#D3CFC0" strokeWidth={0.8} />
      ))}
    </>
  );
}

/* ───────── Map ───────── */
function MapSVG({ hits, hoverCam }: { hits: [string, string][]; hoverCam: CamId | null }) {
  const pts = hits.map(([, c]) => CAMS[c as CamId]);
  const pointStr = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const pathD = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const active = useMemo(() => {
    const m = new Map<string, number[]>();
    hits.forEach(([, c], i) => m.set(c, [...(m.get(c) ?? []), i + 1]));
    return m;
  }, [hits]);

  const arrows = pts.slice(0, -1).map((a, i) => {
    const b = pts[i + 1];
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    return { x: a.x + (b.x - a.x) * 0.55, y: a.y + (b.y - a.y) * 0.55, ang, i };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img"
      aria-label="Simulated city map with camera nodes and a reconstructed vehicle route">
      <rect width={W} height={H} fill="#EFEDE5" />

      {/* river */}
      <path d={RIVER_D} fill="none" stroke="#D3DDDD" strokeWidth={34} strokeLinecap="round" />
      <path d={RIVER_D} fill="none" stroke="#C6D6D9" strokeWidth={26} strokeLinecap="round" />

      {/* parks */}
      {PARKS.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={3} fill="#DCE5D0" stroke="#CFDAC2" />
      ))}
      {FABRIC.trees.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={t.r} fill="#C3D3B3" />
      ))}

      {/* buildings */}
      {FABRIC.bld.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} stroke="#D3CFC0" strokeWidth={0.8} />
      ))}

      {/* roads */}
      {ROADS.map(([a, b]) => (
        <line key={`c-${a}${b}`} x1={CAMS[a].x} y1={CAMS[a].y} x2={CAMS[b].x} y2={CAMS[b].y}
          stroke="#C9C6B9" strokeWidth={14} strokeLinecap="round" />
      ))}
      {ROADS.map(([a, b]) => (
        <line key={`f-${a}${b}`} x1={CAMS[a].x} y1={CAMS[a].y} x2={CAMS[b].x} y2={CAMS[b].y}
          stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" />
      ))}
      {ROADS.map(([a, b]) => {
        const A = CAMS[a], B = CAMS[b];
        let ang = (Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI;
        if (ang > 90 || ang < -90) ang += 180;
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        return (
          <text key={`t-${a}${b}`} x={mx} y={my} transform={`rotate(${ang} ${mx} ${my})`}
            textAnchor="middle" dominantBaseline="central"
            style={{ ...MONO, fontSize: 6.5, letterSpacing: 1.6, fill: "#A6A396", textTransform: "uppercase" }}>
            {ROAD_NAMES[`${a}-${b}`]}
          </text>
        );
      })}

      {/* route */}
      {pts.length > 1 && (
        <>
          <polyline points={pointStr} fill="none" stroke="#E4572E" strokeOpacity={0.16}
            strokeWidth={13} strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={pointStr} fill="none" stroke="#E4572E" strokeWidth={3.2}
            strokeLinejoin="round" strokeLinecap="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1}
            style={{ animation: "draw-route 1100ms cubic-bezier(.4,.1,.2,1) forwards" }} />
          {arrows.map((a) => (
            <polygon key={a.i} points="-4.5,-4 5,0 -4.5,4" fill="#E4572E"
              transform={`translate(${a.x} ${a.y}) rotate(${a.ang})`}
              style={{ opacity: 0, animation: `fade-in 400ms ease ${700 + a.i * 90}ms forwards` }} />
          ))}
        </>
      )}

      {/* cameras */}
      {Object.values(CAMS).map((c) => {
        const orders = active.get(c.id);
        const on = !!orders;
        const hot = hoverCam === c.id;
        const place = c.name.split(", ")[1] ?? "";
        return (
          <g key={c.id}>
            {hot && (
              <rect x={c.x - 14} y={c.y - 14} width={28} height={28} fill="none" stroke="#E4572E" strokeWidth={1.5} />
            )}
            {on && (
              <rect x={c.x - 11} y={c.y - 11} width={22} height={22} fill="#E4572E" opacity={0.15}>
                <animate attributeName="opacity" values="0.22;0.04;0.22" dur="2.4s" repeatCount="indefinite" />
              </rect>
            )}
            <rect x={c.x - 7} y={c.y - 7} width={14} height={14}
              fill={on ? "#121212" : "#FBFAF7"} stroke="#121212" strokeWidth={1.5} />
            <rect x={c.x - 2.5} y={c.y - 2.5} width={5} height={5} fill={on ? "#F2A93B" : "#BDBAAE"} />
            <g transform={`translate(${c.x + 13} ${c.y - 20})`}>
              <rect width={on ? 12 + (c.id.length + place.length + 1) * 5.6 : 22} height={15}
                fill="#FBFAF7" stroke={on ? "#121212" : "#D9D7CF"} />
              <text x={6} y={10.5} style={{ ...MONO, fontSize: 8.5, fill: on ? "#121212" : "#8A887F" }}>
                {on ? `${c.id} ${place}` : c.id}
              </text>
            </g>
            {orders && (
              <g transform={`translate(${c.x - 5 - orders.join(",").length * 3} ${c.y + 12})`}>
                <rect width={10 + orders.join(",").length * 6} height={13} fill="#E4572E" />
                <text x={5} y={9.5} style={{ ...MONO, fontSize: 8.5, fill: "#fff", fontWeight: 600 }}>
                  {orders.join(",")}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* travelling vehicle */}
      {pts.length > 1 && (
        <g>
          <rect x={-6} y={-6} width={12} height={12} fill="#E4572E" stroke="#fff" strokeWidth={2}>
            <animateMotion path={pathD} dur={`${Math.max(4, pts.length * 1.3)}s`}
              begin="1.1s" repeatCount="indefinite" calcMode="linear" />
          </rect>
        </g>
      )}
    </svg>
  );
}
