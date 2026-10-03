"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hero lane camera.
 * A perspective road, cars driving toward a gantry camera, a capture zone,
 * a lock-on bracket around the plate and a readout that decodes the plate
 * character by character, then stores the read in a small log.
 * Everything here is simulated.
 */

type Phase = "idle" | "decode" | "done";
type Read = { id: number; plate: string; time: string; conf: number };
type Rect = { x: number; y: number; w: number; h: number };
type Car = {
  lane: 0 | 1;
  u: number;
  dur: number;
  color: string;
  plate: string;
  read: boolean;
  rect: Rect | null;
};

const BODY = ["#E9E7E1", "#2F4A63", "#B9442B", "#8A8F94", "#1D1F23", "#D9A441", "#F4F1E8"];
const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";
const STATES = ["MH", "DL", "KA", "TN", "GJ", "UP", "RJ", "KL", "TS", "WB", "HR", "PB"];
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const KMIN = 0.12;
const UG = 0.74; // gantry position along the road
const LOCK_FROM = 0.6;
const LOCK_TO = 0.72;
const RELEASE_AT = 0.9;
const SPEED = 0.19; // road scroll speed, matches a 5.2s car lifetime

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const digit = () => String(Math.floor(Math.random() * 10));
const letter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];
const makePlate = () =>
  pick(STATES) + digit() + digit() + letter() + letter() + digit() + digit() + digit() + digit();
const scramble = (i: number) => (i === 0 || i === 1 || i === 4 || i === 5 ? letter() : digit());
const fmtTime = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

const kOf = (u: number) => KMIN + (1 - KMIN) * Math.pow(u, 1.8);

export default function LaneStrip() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [chars, setChars] = useState<string[]>(Array(10).fill("-"));
  const [locked, setLocked] = useState(0);
  const [conf, setConf] = useState<number | null>(null);
  const [reads, setReads] = useState<Read[]>([]);

  const timers = useRef<{ scr?: number; lock?: number }>({});
  const idRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timers.current.scr) window.clearInterval(timers.current.scr);
    if (timers.current.lock) window.clearTimeout(timers.current.lock);
    timers.current = {};
  }, []);

  const startDecode = useCallback(
    (plate: string) => {
      clearTimers();
      let n = 0;
      setPhase("decode");
      setLocked(0);
      setConf(null);
      setChars(Array.from({ length: 10 }, (_, i) => scramble(i)));

      timers.current.scr = window.setInterval(() => {
        setChars(Array.from({ length: 10 }, (_, i) => (i < n ? plate[i] : scramble(i))));
      }, 55);

      const step = () => {
        n++;
        setLocked(n);
        if (n >= 10) {
          clearTimers();
          const c = 0.925 + Math.random() * 0.06;
          setChars(plate.split(""));
          setConf(c);
          setPhase("done");
          setReads((prev) =>
            [{ id: ++idRef.current, plate, time: fmtTime(), conf: c }, ...prev].slice(0, 3)
          );
          return;
        }
        timers.current.lock = window.setTimeout(step, 90);
      };
      timers.current.lock = window.setTimeout(step, 260);
    },
    [clearTimers]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let skyline: { x: number; w: number; h: number; far: boolean }[] = [];

    const buildSkyline = () => {
      let s = 77;
      const rng = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      const out: typeof skyline = [];
      for (const far of [true, false]) {
        let x = -10;
        while (x < W + 10) {
          const w = (far ? 16 : 24) + rng() * (far ? 26 : 34);
          const h = (far ? 0.28 : 0.14) + rng() * (far ? 0.5 : 0.42);
          out.push({ x, w, h, far });
          x += w + (far ? 2 : 4) + rng() * 8;
        }
      }
      skyline = out;
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      W = r.width;
      H = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildSkyline();
    };
    resize();

    const cars: Car[] = [];
    const newCar = (lane: 0 | 1, u: number): Car => ({
      lane,
      u,
      dur: 5.2 * (0.92 + Math.random() * 0.2),
      color: pick(BODY),
      plate: makePlate(),
      read: false,
      rect: null,
    });

    let lockedCar: Car | null = null;
    let lockT = 0;
    let glow = 0;
    let scroll = 0;
    let spawnIn = 1.8;
    let nextLane: 0 | 1 = 0;

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
    };

    const drawCar = (c: Car, k: number, x: number, gy: number, R: number, alpha: number) => {
      const w = 0.6 * R * k;
      const h = w * 0.62;
      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(x, gy, w * 0.56, w * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#17181b";
      rr(x - w * 0.46, gy - h * 0.22, w * 0.13, h * 0.22, 1);
      ctx.fill();
      rr(x + w * 0.33, gy - h * 0.22, w * 0.13, h * 0.22, 1);
      ctx.fill();

      // cabin
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.43, gy - h * 0.5);
      ctx.lineTo(x - w * 0.31, gy - h * 0.98);
      ctx.lineTo(x + w * 0.31, gy - h * 0.98);
      ctx.lineTo(x + w * 0.43, gy - h * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2C3640";
      ctx.beginPath();
      ctx.moveTo(x - w * 0.37, gy - h * 0.53);
      ctx.lineTo(x - w * 0.27, gy - h * 0.9);
      ctx.lineTo(x + w * 0.27, gy - h * 0.9);
      ctx.lineTo(x + w * 0.37, gy - h * 0.53);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.moveTo(x - w * 0.3, gy - h * 0.55);
      ctx.lineTo(x - w * 0.22, gy - h * 0.88);
      ctx.lineTo(x - w * 0.05, gy - h * 0.88);
      ctx.lineTo(x - w * 0.14, gy - h * 0.55);
      ctx.closePath();
      ctx.fill();

      // lower body
      ctx.fillStyle = c.color;
      rr(x - w / 2, gy - h * 0.52, w, h * 0.4, w * 0.04);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x - w / 2 + 1, gy - h * 0.52, w - 2, Math.max(1, h * 0.04));

      // headlights
      ctx.fillStyle = "#FFF3C9";
      rr(x - w * 0.45, gy - h * 0.47, w * 0.17, h * 0.1, 1);
      ctx.fill();
      rr(x + w * 0.28, gy - h * 0.47, w * 0.17, h * 0.1, 1);
      ctx.fill();
      ctx.fillStyle = "rgba(255,231,160,0.22)";
      ctx.beginPath();
      ctx.arc(x - w * 0.365, gy - h * 0.42, w * 0.13, 0, Math.PI * 2);
      ctx.arc(x + w * 0.365, gy - h * 0.42, w * 0.13, 0, Math.PI * 2);
      ctx.fill();

      // grille + bumper
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      rr(x - w * 0.16, gy - h * 0.45, w * 0.32, h * 0.07, 1);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x - w * 0.47, gy - h * 0.14, w * 0.94, h * 0.07);

      // plate
      const pw = w * 0.34;
      const ph = pw * 0.26;
      const px = x - pw / 2;
      const py = gy - h * 0.36;
      ctx.fillStyle = "#F6F2E2";
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = Math.max(0.5, k * 1.1);
      ctx.strokeRect(px, py, pw, ph);
      ctx.fillStyle = "#1F3F9C";
      ctx.fillRect(px, py, pw * 0.1, ph);
      if (pw > 28) {
        const size = Math.min(ph * 0.62, (pw * 0.84) / (11 * 0.62));
        ctx.fillStyle = "#111";
        ctx.font = `700 ${size}px ${MONO}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${c.plate.slice(0, 4)} ${c.plate.slice(4)}`, x + pw * 0.05, py + ph / 2 + 0.5);
      }
      c.rect = { x: px, y: py, w: pw, h: ph };
      ctx.restore();
    };

    const draw = (t: number, forceZone?: boolean) => {
      const hy = H * 0.3;
      const cx = W / 2;
      const R = Math.min(W * 0.46, H * 1.45);
      const yOf = (k: number) => hy + (H - hy) * k;

      ctx.clearRect(0, 0, W, H);

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, "#FBFAF7");
      sky.addColorStop(1, "#EEEBE1");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, hy);

      // skyline
      for (const far of [true, false]) {
        ctx.fillStyle = far ? "#E9E6DB" : "#E0DCCE";
        for (const b of skyline) {
          if (b.far !== far) continue;
          const bh = b.h * hy * 0.95;
          ctx.fillRect(b.x, hy - bh, b.w, bh);
        }
      }

      // ground
      const gr = ctx.createLinearGradient(0, hy, 0, H);
      gr.addColorStop(0, "#E3E0D3");
      gr.addColorStop(1, "#EFEDE5");
      ctx.fillStyle = gr;
      ctx.fillRect(0, hy, W, H - hy);

      // ground perspective grid
      ctx.strokeStyle = "rgba(0,0,0,0.045)";
      ctx.lineWidth = 1;
      for (let m = -10; m <= 10; m++) {
        const xb = cx + m * R * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, hy);
        ctx.lineTo(xb, H);
        ctx.stroke();
      }
      for (let i = 0; i < 10; i++) {
        const u = (i / 10 + scroll) % 1;
        const y = yOf(kOf(u));
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // sidewalk + road
      ctx.fillStyle = "#E1DED1";
      ctx.beginPath();
      ctx.moveTo(cx, hy);
      ctx.lineTo(cx + R * 1.32, H);
      ctx.lineTo(cx - R * 1.32, H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#BDBAAD";
      ctx.beginPath();
      ctx.moveTo(cx, hy);
      ctx.lineTo(cx + R, H);
      ctx.lineTo(cx - R, H);
      ctx.closePath();
      ctx.fill();

      // road edge lines
      ctx.strokeStyle = "#F4F3EF";
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx, hy);
        ctx.lineTo(cx + s * R * 0.95, H);
        ctx.stroke();
      }

      // centre dashes
      ctx.fillStyle = "#F4F3EF";
      for (let i = 0; i < 9; i++) {
        const u0 = (i / 9 + scroll) % 1;
        const u1 = u0 + 0.04;
        if (u1 > 1) continue;
        const k0 = kOf(u0);
        const k1 = kOf(u1);
        const w0 = R * 0.012 * k0 + 0.3;
        const w1 = R * 0.012 * k1 + 0.3;
        ctx.beginPath();
        ctx.moveTo(cx - w0, yOf(k0));
        ctx.lineTo(cx + w0, yOf(k0));
        ctx.lineTo(cx + w1, yOf(k1));
        ctx.lineTo(cx - w1, yOf(k1));
        ctx.closePath();
        ctx.fill();
      }

      // lamp posts
      for (const s of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const u = (i / 7 + scroll) % 1;
          if (u < 0.06 || u > 0.96) continue;
          const k = kOf(u);
          const x = cx + s * R * 1.14 * k;
          const yb = yOf(k);
          const h = H * 0.52 * k;
          ctx.strokeStyle = "#9A978A";
          ctx.lineWidth = Math.max(1, 2.4 * k);
          ctx.beginPath();
          ctx.moveTo(x, yb);
          ctx.lineTo(x, yb - h);
          ctx.lineTo(x - s * R * 0.1 * k, yb - h);
          ctx.stroke();
          ctx.fillStyle = "#F2A93B";
          ctx.fillRect(x - s * R * 0.1 * k - 2 * k - 1, yb - h - 1, 4 * k + 2, 2 * k + 1);
        }
      }

      // capture zone
      const zk1 = kOf(0.56);
      const zk2 = kOf(0.92);
      ctx.fillStyle = `rgba(242,169,59,${0.07 + 0.13 * glow})`;
      ctx.beginPath();
      ctx.moveTo(cx - R * zk1, yOf(zk1));
      ctx.lineTo(cx + R * zk1, yOf(zk1));
      ctx.lineTo(cx + R * zk2, yOf(zk2));
      ctx.lineTo(cx - R * zk2, yOf(zk2));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(228,87,46,${0.25 + 0.45 * glow})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - R * zk1, yOf(zk1));
      ctx.lineTo(cx + R * zk1, yOf(zk1));
      ctx.stroke();
      ctx.setLineDash([]);

      const ordered = [...cars].sort((a, b) => a.u - b.u);
      const place = (c: Car) => {
        const k = kOf(c.u);
        const x = cx + (c.lane === 0 ? -1 : 1) * R * 0.5 * k;
        drawCar(c, k, x, yOf(k), R, Math.min(1, c.u / 0.08));
      };
      ordered.filter((c) => c.u < UG).forEach(place);

      // gantry
      const kg = kOf(UG);
      const yg = yOf(kg);
      const xl = cx - R * kg * 1.1;
      const xr = cx + R * kg * 1.1;
      const top = yg - kg * H * 0.78;
      ctx.strokeStyle = "#2B2C30";
      ctx.lineWidth = Math.max(2, 4 * kg);
      ctx.beginPath();
      ctx.moveTo(xl, yg);
      ctx.lineTo(xl, top);
      ctx.moveTo(xr, yg);
      ctx.lineTo(xr, top);
      ctx.stroke();
      ctx.lineWidth = Math.max(3, 7 * kg);
      ctx.beginPath();
      ctx.moveTo(xl - 2, top);
      ctx.lineTo(xr + 2, top);
      ctx.stroke();
      const bw = 36 * kg + 8;
      const bh = 14 * kg + 4;
      ctx.fillStyle = "#2B2C30";
      ctx.fillRect(cx - bw / 2, top + 3, bw, bh);
      ctx.fillStyle = "#F2A93B";
      ctx.beginPath();
      ctx.arc(cx, top + 3 + bh / 2, 3 * kg + 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = Math.floor(t * 2) % 2 === 0 ? "#E4572E" : "#7A2F1B";
      ctx.beginPath();
      ctx.arc(cx + bw / 2 - 4, top + 7, 1.8, 0, Math.PI * 2);
      ctx.fill();
      const sw = 78 * kg + 18;
      const sx = cx - R * kg * 0.62 - sw / 2;
      ctx.fillStyle = "#FBFAF7";
      ctx.fillRect(sx, top + 5, sw, 13 * kg + 5);
      ctx.strokeStyle = "#2B2C30";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, top + 5, sw, 13 * kg + 5);
      ctx.fillStyle = "#121212";
      ctx.font = `500 ${Math.max(7, 8.5 * kg + 2)}px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("CAM-S04-A07", sx + sw / 2, top + 5 + (13 * kg + 5) / 2 + 0.5);

      ordered.filter((c) => c.u >= UG).forEach(place);

      // detection bracket
      const lc = lockedCar;
      if (lc && lc.rect) {
        const age = Math.min(1, (t - lockT) / 0.32);
        const ease = 1 - Math.pow(1 - age, 3);
        const grow = 1 + (1 - ease) * 1.3;
        const pad = 5 * grow;
        const bx = lc.rect.x - pad;
        const by = lc.rect.y - pad;
        const bw2 = lc.rect.w + pad * 2;
        const bh2 = lc.rect.h + pad * 2;
        ctx.globalAlpha = 0.35 + 0.65 * ease;
        ctx.fillStyle = "rgba(228,87,46,0.1)";
        ctx.fillRect(bx, by, bw2, bh2);
        ctx.strokeStyle = "#E4572E";
        ctx.lineWidth = 2;
        const L = Math.min(9, bw2 * 0.25);
        ctx.beginPath();
        ctx.moveTo(bx, by + L); ctx.lineTo(bx, by); ctx.lineTo(bx + L, by);
        ctx.moveTo(bx + bw2 - L, by); ctx.lineTo(bx + bw2, by); ctx.lineTo(bx + bw2, by + L);
        ctx.moveTo(bx, by + bh2 - L); ctx.lineTo(bx, by + bh2); ctx.lineTo(bx + L, by + bh2);
        ctx.moveTo(bx + bw2 - L, by + bh2); ctx.lineTo(bx + bw2, by + bh2); ctx.lineTo(bx + bw2, by + bh2 - L);
        ctx.stroke();
        ctx.fillStyle = "#E4572E";
        ctx.font = `600 9px ${MONO}`;
        const label = "PLATE";
        const lw = ctx.measureText(label).width + 8;
        ctx.fillRect(bx, by - 13, lw, 12);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, bx + 4, by - 6.5);
        ctx.globalAlpha = 1;
      }
      void forceZone;
    };

    const step = (dt: number, t: number) => {
      scroll = (scroll + dt * SPEED) % 1;
      spawnIn -= dt;
      if (spawnIn <= 0 && cars.length < 4) {
        cars.push(newCar(nextLane, 0));
        nextLane = nextLane === 0 ? 1 : 0;
        spawnIn = 2.1 + Math.random() * 0.8;
      }
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i];
        c.u += dt / c.dur;
        if (c.u > 1.02) {
          if (lockedCar === c) lockedCar = null;
          cars.splice(i, 1);
        }
      }
      if (!lockedCar) {
        const c = cars.find((x) => !x.read && x.u >= LOCK_FROM && x.u < LOCK_TO);
        if (c) {
          lockedCar = c;
          c.read = true;
          lockT = t;
          startDecode(c.plate);
        }
      } else if (lockedCar.u > RELEASE_AT) {
        lockedCar = null;
      }
      glow += ((lockedCar ? 1 : 0) - glow) * Math.min(1, dt * 6);
    };

    /* Reduced motion: one static frame */
    if (reduce) {
      const demo = newCar(1, 0.76);
      demo.plate = "DL01AB1001";
      demo.read = true;
      cars.push(demo, newCar(0, 0.4));
      lockedCar = demo;
      glow = 1;
      draw(1);
      lockedCar = demo;
      draw(1);
      setPhase("done");
      setChars("DL01AB1001".split(""));
      setLocked(10);
      setConf(0.968);
      setReads([{ id: 1, plate: "DL01AB1001", time: fmtTime(), conf: 0.968 }]);
      const ro = new ResizeObserver(() => { resize(); draw(1); });
      ro.observe(host);
      return () => ro.disconnect();
    }

    cars.push(newCar(1, 0.46), newCar(0, 0.12));

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let running = false;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      step(dt, t);
      draw(t);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
      { threshold: 0.05 }
    );
    io.observe(host);

    const ro = new ResizeObserver(() => resize());
    ro.observe(host);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      clearTimers();
    };
  }, [startDecode, clearTimers]);

  const status =
    phase === "decode" ? "Reading plate" : phase === "done" ? "Read stored" : "Waiting for vehicle";

  return (
    <div className="strip" aria-label="Simulated lane camera reading number plates">
      <div className="strip-lane" ref={hostRef}>
        <canvas ref={canvasRef} />
        <div className="strip-tag">
          <span className="rec" />
          Camera 07 / Station Approach
        </div>
        <div className="strip-tag right">Simulated feed</div>
      </div>

      <div className="strip-read">
        <div className="sr-head">
          <span>OCR output</span>
          <span className={`sr-status ${phase}`}>
            <i />
            {status}
          </span>
        </div>

        <div className={`sr-plate ${phase}`} aria-live="polite">
          <span className="sr-flag" />
          {chars.map((ch, i) => (
            <span
              key={i}
              className={`ch ${i < locked ? "on" : ""} ${i === 1 || i === 3 || i === 5 ? "gap" : ""}`}
            >
              {ch}
            </span>
          ))}
          {phase === "decode" && <i className="beam" />}
        </div>

        <div className="sr-conf">
          <span>Confidence</span>
          <div className="bar">
            <i style={{ width: conf ? `${conf * 100}%` : "0%" }} />
          </div>
          <b>{conf ? `${(conf * 100).toFixed(1)}%` : "--"}</b>
        </div>

        <ul className="sr-log">
          {reads.length === 0 && <li className="empty">First read arrives in a moment</li>}
          {reads.map((r, i) => (
            <li key={r.id} className={i === 0 ? "new" : ""}>
              <span>{r.time}</span>
              <span>{`${r.plate.slice(0, 2)} ${r.plate.slice(2, 4)} ${r.plate.slice(4, 6)} ${r.plate.slice(6)}`}</span>
              <span className="c">{(r.conf * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
