"use client";

import { useEffect, useState } from "react";
import { CAMS, ROADS, type CamId } from "@/lib/demoData";
import { MapFabric } from "@/components/TrajectoryDemo";

/**
 * Hero story. The same camera network is shown in five stages:
 *  0 plate reader view : isolated reads, one misread, no links
 *  1 match             : the misread is recovered and merged
 *  2 journey           : reads become one ordered route with time gaps
 *  3 flag              : cloned plate (impossible hop) + blacklist hit
 *  4 city              : the same reads become density and speed
 * All plates, times and cameras are simulated.
 */

const DUR = 5800;
const W = 700;
const H = 480;
const MONO = { fontFamily: "var(--mono-font)" } as const;
const INK = "#121212";
const ACC = "#E4572E";
const AMB = "#F2A93B";
const PANEL = "#FBFAF7";

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

type Chip = { cam: CamId; text: string; time: string; dx: number; dy: number; raw?: string };

const HERO_PLATE = "DL01AB1001";
const HERO: Chip[] = [
  { cam: "C1", text: HERO_PLATE, time: "08:02", dx: 10, dy: -24 },
  { cam: "C2", text: HERO_PLATE, time: "08:09", dx: 10, dy: -24 },
  { cam: "C3", text: HERO_PLATE, raw: "DL01A81001", time: "08:17", dx: 10, dy: -24 },
  { cam: "C4", text: HERO_PLATE, time: "08:31", dx: 10, dy: -24 },
  { cam: "C5", text: HERO_PLATE, time: "08:44", dx: 10, dy: -24 },
];

const NOISE: { cam: CamId; text: string; dx: number; dy: number }[] = [
  { cam: "C1", text: "RJ14CD0099", dx: 10, dy: 10 },
  { cam: "C2", text: "TN09BX2207", dx: 10, dy: 10 },
  { cam: "C3", text: "UP16BT3092", dx: 10, dy: 10 },
  { cam: "C3", text: "MH12DE7788", dx: 10, dy: 25 },
  { cam: "C4", text: "KA05MJ1234", dx: 10, dy: 10 },
  { cam: "C5", text: "GJ05KL9811", dx: 10, dy: 10 },
  { cam: "C6", text: "PB10RT4410", dx: 10, dy: -24 },
  { cam: "C7", text: "HR26CK5521", dx: 10, dy: 10 },
];

const JOURNEY_MIN = toMin(HERO[4].time) - toMin(HERO[0].time);

const STAGES = [
  {
    k: "Reads",
    t: "What a plate reader gives you",
    d: "Each camera logs reads on its own. The same car appears as separate rows, one of them misread, and nothing connects them.",
  },
  {
    k: "Match",
    t: "Recover the misread, merge the vehicle",
    d: "DL01A81001 is one character away from DL01AB1001. Matching against known plates keeps the sighting on the right vehicle.",
  },
  {
    k: "Journey",
    t: "Rebuild the route in time order",
    d: `One vehicle, five cameras, ${JOURNEY_MIN} minutes. The gaps between cameras show how it moved and where it paused.`,
  },
  {
    k: "Flag",
    t: "Catch what one camera cannot",
    d: "A plate seen at two distant cameras two minutes apart is likely cloned. A blacklist hit arrives with the route it took.",
  },
  {
    k: "City",
    t: "Turn the same reads into a city picture",
    d: "Those sightings also feed density and speed per corridor, so operators see where traffic is building before it jams.",
  },
];

const SPEED_ROADS: [CamId, CamId, string][] = [
  ["C2", "C3", AMB],
  ["C3", "C4", ACC],
  ["C4", "C5", AMB],
];

const o = (v: number, delay = 0) => ({
  opacity: v,
  transition: `opacity 520ms ease ${delay}ms`,
});

const cw = (s: string) => s.length * 4.7 + 10;

function ChipEl({
  text, fill = PANEL, stroke = INK, color = INK,
}: { text: string; fill?: string; stroke?: string; color?: string }) {
  return (
    <g>
      <rect width={cw(text)} height={13} fill={fill} stroke={stroke} strokeWidth={1} />
      <text x={5} y={9.4} style={{ ...MONO, fontSize: 7.8, fill: color }}>{text}</text>
    </g>
  );
}

function MidChip({ x, y, ...rest }: { x: number; y: number; text: string; fill?: string; stroke?: string; color?: string }) {
  return (
    <g transform={`translate(${x - cw(rest.text) / 2} ${y - 6.5})`}>
      <ChipEl {...rest} />
    </g>
  );
}

export default function StoryMap() {
  const [stage, setStage] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAuto(false);
      setStage(2);
    }
  }, []);

  useEffect(() => {
    if (!auto) return;
    const id = window.setTimeout(() => setStage((s) => (s + 1) % STAGES.length), DUR);
    return () => window.clearTimeout(id);
  }, [auto, stage]);

  const heroPts = HERO.map((h) => CAMS[h.cam]);
  const heroStr = heroPts.map((p) => `${p.x},${p.y}`).join(" ");
  const heroPath = heroPts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

  const heroCams = new Set<string>(HERO.map((h) => h.cam));
  const cloneCams = new Set<string>(["C1", "C2", "C6", "C5"]);
  const nodeOn = (id: string) =>
    stage === 2 ? heroCams.has(id) : stage === 3 ? cloneCams.has(id) : false;

  const c1 = CAMS.C1, c2 = CAMS.C2, c6 = CAMS.C6, c5 = CAMS.C5;
  const cloneMid = { x: c2.x + (c6.x - c2.x) * 0.36, y: c2.y + (c6.y - c2.y) * 0.36 };

  const active = STAGES[stage];

  return (
    <div className="story">
      <div className="story-head">
        <div className="seg" role="group" aria-label="Current view">
          <span className={stage === 0 ? "on" : ""}>Plate reader view</span>
          <span className={stage > 0 ? "on pt" : ""}>PlateTrace view</span>
        </div>
        <button className="story-ctl" onClick={() => setAuto((a) => !a)} aria-pressed={!auto}>
          {auto ? "Pause" : "Play"}
        </button>
      </div>

      <div className="story-map">
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label="Simulated city map showing plate reads becoming a journey, alerts and a traffic picture">
          <defs>
            <radialGradient id="sm-hot">
              <stop offset="0" stopColor={ACC} stopOpacity="0.55" />
              <stop offset="1" stopColor={ACC} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sm-amb">
              <stop offset="0" stopColor={AMB} stopOpacity="0.55" />
              <stop offset="1" stopColor={AMB} stopOpacity="0" />
            </radialGradient>
          </defs>

          <MapFabric />

          {/* roads */}
          {ROADS.map(([a, b]) => (
            <line key={`c${a}${b}`} x1={CAMS[a].x} y1={CAMS[a].y} x2={CAMS[b].x} y2={CAMS[b].y}
              stroke="#C9C6B9" strokeWidth={14} strokeLinecap="round" />
          ))}
          {ROADS.map(([a, b]) => (
            <line key={`f${a}${b}`} x1={CAMS[a].x} y1={CAMS[a].y} x2={CAMS[b].x} y2={CAMS[b].y}
              stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" />
          ))}

          {/* stage 4: heat and corridor speed */}
          <g style={o(stage === 4 ? 1 : 0)}>
            <circle cx={CAMS.C3.x} cy={CAMS.C3.y} r={86} fill="url(#sm-hot)" />
            <circle cx={CAMS.C4.x} cy={CAMS.C4.y} r={74} fill="url(#sm-hot)" />
            <circle cx={CAMS.C5.x} cy={CAMS.C5.y} r={58} fill="url(#sm-amb)" />
            <circle cx={CAMS.C2.x} cy={CAMS.C2.y} r={50} fill="url(#sm-amb)" />
            {SPEED_ROADS.map(([a, b, col]) => (
              <line key={`s${a}${b}`} x1={CAMS[a].x} y1={CAMS[a].y} x2={CAMS[b].x} y2={CAMS[b].y}
                stroke={col} strokeWidth={6} strokeLinecap="round" opacity={0.9} />
            ))}
          </g>

          {/* stage 2+: hero journey */}
          <g style={o(stage === 2 ? 1 : stage === 3 ? 0.25 : 0)}>
            <polyline points={heroStr} fill="none" stroke={ACC} strokeOpacity={0.16} strokeWidth={13}
              strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={heroStr} fill="none" stroke={ACC} strokeWidth={3.2}
              strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1}
              style={{
                strokeDashoffset: stage >= 2 ? 0 : 1,
                transition: "stroke-dashoffset 1500ms cubic-bezier(.4,.1,.2,1)",
              }} />
          </g>

          {/* stage 3: cloned plate and blacklist */}
          <g style={o(stage === 3 ? 1 : 0, stage === 3 ? 200 : 0)}>
            <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke={ACC} strokeWidth={2.5} strokeLinecap="round" />
            <line x1={c2.x} y1={c2.y} x2={c6.x} y2={c6.y} stroke="#B8321A" strokeWidth={2.5}
              strokeDasharray="6 5" strokeLinecap="round" className="march" />
            <MidChip x={cloneMid.x} y={cloneMid.y} text="2 MIN, TOO FAR APART" fill="#B8321A" stroke="#B8321A" color="#fff" />
            <g transform={`translate(${c1.x + 10} ${c1.y - 24})`}><ChipEl text="09:00" fill={INK} color="#fff" /></g>
            <g transform={`translate(${c2.x + 10} ${c2.y - 24})`}><ChipEl text="09:07" fill={INK} color="#fff" /></g>
            <g transform={`translate(${c6.x + 10} ${c6.y - 24})`}><ChipEl text="09:09" fill="#B8321A" stroke="#B8321A" color="#fff" /></g>
            <g transform={`translate(${c1.x + 10} ${c1.y - 42})`}><ChipEl text="DL04GH4004" stroke={ACC} color={ACC} /></g>
            <rect x={c5.x - 16} y={c5.y - 16} width={32} height={32} fill="none" stroke="#B8321A" strokeWidth={1.8}>
              <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
            </rect>
            <g transform={`translate(${c5.x - 52} ${c5.y + 20})`}>
              <ChipEl text="BLACKLIST DL02CD2002" fill="#B8321A" stroke="#B8321A" color="#fff" />
            </g>
          </g>

          {/* stage 4 corridor labels */}
          <g style={o(stage === 4 ? 1 : 0, stage === 4 ? 300 : 0)}>
            <MidChip x={365} y={230} text="SLOW" fill={ACC} stroke={ACC} color="#fff" />
            <MidChip x={260} y={160} text="SLOWING" fill={AMB} stroke={AMB} />
            <MidChip x={545} y={370} text="FREE FLOW" />
          </g>

          {/* gap chips on the journey (stage 2) */}
          <g style={o(stage === 2 ? 1 : 0, stage === 2 ? 1100 : 0)}>
            {HERO.slice(1).map((h, i) => {
              const a = CAMS[HERO[i].cam], b = CAMS[h.cam];
              const gap = toMin(h.time) - toMin(HERO[i].time);
              return <MidChip key={h.cam} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} text={`+${gap} MIN`} />;
            })}
          </g>

          {/* cameras */}
          {Object.values(CAMS).map((c) => (
            <g key={c.id}>
              <rect x={c.x - 7} y={c.y - 7} width={14} height={14} stroke={INK} strokeWidth={1.5}
                style={{ fill: nodeOn(c.id) ? INK : PANEL, transition: "fill 400ms ease" }} />
              <rect x={c.x - 2.5} y={c.y - 2.5} width={5} height={5}
                style={{ fill: nodeOn(c.id) ? AMB : "#BDBAAE", transition: "fill 400ms ease" }} />
              <text x={c.x - 12} y={c.y + 3} textAnchor="end"
                style={{ ...MONO, fontSize: 8.5, fill: "#8A887F" }}>{c.id}</text>
            </g>
          ))}

          {/* other vehicles' reads (stage 0 and 1) */}
          <g>
            {NOISE.map((n, i) => (
              <g key={i} transform={`translate(${CAMS[n.cam].x + n.dx} ${CAMS[n.cam].y + n.dy})`}
                style={o(stage === 0 ? 1 : stage === 1 ? 0.2 : 0, stage === 0 ? 120 + i * 90 : 0)}>
                <ChipEl text={n.text} stroke="#BDBAAE" color="#8A887F" />
              </g>
            ))}
          </g>

          {/* the tracked vehicle's reads */}
          <g>
            {HERO.map((h, i) => {
              const c = CAMS[h.cam];
              const fixed = stage >= 1;
              const text =
                stage >= 2 ? `${i + 1}  ${h.time}` : fixed ? h.text : h.raw ?? h.text;
              const fixHighlight = stage === 1 && h.raw;
              return (
                <g key={h.cam} transform={`translate(${c.x + h.dx} ${c.y + h.dy})`}
                  style={o(stage === 3 ? 0.2 : stage === 4 ? 0 : 1, stage === 0 ? 40 + i * 90 : 0)}>
                  <ChipEl
                    text={text}
                    fill={fixHighlight ? ACC : stage >= 2 ? INK : PANEL}
                    stroke={fixHighlight ? ACC : INK}
                    color={fixHighlight || stage >= 2 ? "#fff" : INK}
                  />
                </g>
              );
            })}
            <g style={o(stage === 1 ? 1 : 0, stage === 1 ? 350 : 0)}
              transform={`translate(${CAMS.C3.x + 10} ${CAMS.C3.y - 42})`}>
              <ChipEl text="8 READ AS B, MERGED" stroke={ACC} color={ACC} />
            </g>
          </g>

          {/* travelling vehicle */}
          {stage === 2 && (
            <rect x={-6} y={-6} width={12} height={12} fill={ACC} stroke="#fff" strokeWidth={2}>
              <animateMotion path={heroPath} dur="3.4s" begin="1.5s" repeatCount="1" fill="freeze" calcMode="linear" />
            </rect>
          )}
        </svg>
      </div>

      <div className="story-cap" key={stage}>
        <span className="mono-xs">Step 0{stage + 1} of 05</span>
        <h3>{active.t}</h3>
        <p>{active.d}</p>
      </div>

      <div className="story-steps">
        {STAGES.map((s, i) => {
          const cls = i < stage ? "done" : i === stage ? `on ${auto ? "" : "manual"}` : "";
          return (
            <button key={s.k} className={cls} onClick={() => { setStage(i); setAuto(false); }}
              aria-current={i === stage}>
              <span className="trk">
                <i style={i === stage && auto ? { animationDuration: `${DUR}ms` } : undefined} />
              </span>
              <span className="n">0{i + 1}</span>
              <span className="k">{s.k}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
