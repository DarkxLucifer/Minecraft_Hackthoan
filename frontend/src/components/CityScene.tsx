"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { followBus } from "@/lib/cameraCtl";

export type VehicleHandle = {
  index: number;
  plate: string;
  getPosition: () => { x: number; y: number; z: number };
};

export type ProjectedVehicle = {
  index: number;
  plate: string;
  x: number;
  y: number;
  visible: boolean;
};

type Props = {
  onReady?: (vehicles: VehicleHandle[]) => void;
  onPositions?: (positions: ProjectedVehicle[]) => void;
  theme?: "light" | "dark";
  mode?: "panel" | "hero";
};

/* ───────── City layout constants ───────── */
const P = 3.2; // road pitch
const ROAD_W = 0.9;
const HALF = 2 * P + 1.2; // half size of the model slab
const LINES = [-2, -1, 0, 1, 2];
const BASE = 0.08; // top of the sidewalk platforms

const READABLE_PLATES = [
  "MH12AB1234", "DL04CV7821", "KA03MN4590",
  "TN09BX2207", "GJ05KL9811", "UP32RT4566",
];

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

/* ───────── Procedural textures ───────── */
function windowTexture(isDark = false) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = isDark ? "#0c1322" : "#ffffff";
  g.fillRect(0, 0, 256, 256);
  const cols = 8, rows = 8, cw = 256 / cols, ch = 256 / rows;
  const r = seeded(7);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lit = r() < (isDark ? 0.32 : 0.1);
      g.fillStyle = lit
        ? (isDark ? (r() < 0.28 ? "#38bdf8" : "#fef08a") : "#f6d58a")
        : (isDark ? "#131c2e" : r() < 0.5 ? "#8c9fa8" : "#7d929c");
      g.fillRect(x * cw + 6, y * ch + 7, cw - 12, ch - 16);
      g.fillStyle = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.14)";
      g.fillRect(x * cw + 6, y * ch + ch - 9, cw - 12, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function plateTexture(plate: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f6f2e2";
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#111";
  g.lineWidth = 8;
  g.strokeRect(4, 4, 248, 120);
  g.fillStyle = "#1f3f9c";
  g.fillRect(8, 8, 34, 112);
  g.fillStyle = "#fff";
  g.font = "bold 15px monospace";
  g.textAlign = "center";
  g.fillText("IND", 25, 70);
  g.fillStyle = "#111";
  g.font = "bold 36px monospace";
  const txt = `${plate.slice(0, 4)} ${plate.slice(4, 6)} ${plate.slice(6)}`;
  g.fillText(txt, 149, 80, 200);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,0.95)");
  grd.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ───────── Lanes and cars ───────── */
type Lane = { axis: "x" | "z"; line: number; dir: 1 | -1; speed: number };
type Car = { group: THREE.Group; lane: Lane; s: number };

export default function CityScene({ onReady, onPositions, theme = "light", mode = "panel" }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const lockRef = useRef<{ index: number; until: number } | null>(null);
  const onReadyRef = useRef(onReady);
  const onPositionsRef = useRef(onPositions);

  useEffect(() => {
    onReadyRef.current = onReady;
    onPositionsRef.current = onPositions;
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isDark = theme === "dark";

    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      pointer.current.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.current.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => { pointer.current.x = 0; pointer.current.y = 0; };
    mount.addEventListener("pointermove", onMove);
    mount.addEventListener("pointerleave", onLeave);

    let width = mount.clientWidth || 600;
    let height = mount.clientHeight || 520;

    const BG = isDark ? "#000000" : "#ffffff";
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(
      BG,
      isDark ? 28 : (mode === "hero" ? 50 : 38),
      isDark ? 70 : (mode === "hero" ? 115 : 80)
    );

    const FOV = 28;
    const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = isDark ? 1.4 : 1.0;
    mount.appendChild(renderer.domElement);

    /* Lights */
    if (isDark) {
      scene.add(new THREE.HemisphereLight(0x93c5fd, 0x0a1120, 1.6));
      const sun = new THREE.DirectionalLight(0xc7d2fe, 3.0);
      sun.position.set(9, 15, 6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -11;
      sun.shadow.camera.right = 11;
      sun.shadow.camera.top = 11;
      sun.shadow.camera.bottom = -11;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 50;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.02;
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x38bdf8, 1.5);
      fill.position.set(-8, 6, -6);
      scene.add(fill);
    } else {
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe5e7eb, 2.0));
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const sun = new THREE.DirectionalLight(0xfff5e6, 2.5);
      sun.position.set(9, 15, 6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.radius = 2.5;
      sun.shadow.camera.left = -11;
      sun.shadow.camera.right = 11;
      sun.shadow.camera.top = 11;
      sun.shadow.camera.bottom = -11;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 50;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.02;
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xdce6f2, 1.1);
      fill.position.set(-8, 6, -6);
      scene.add(fill);
    }

    const winTex = windowTexture(isDark);
    const glow = glowTexture();

    /* Plinth and ground */
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(HALF * 2, 0.5, HALF * 2),
      new THREE.MeshStandardMaterial({ color: isDark ? "#0f172a" : "#E6E2D6", roughness: 0.95 })
    );
    slab.position.y = -0.25;
    slab.receiveShadow = true;
    scene.add(slab);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(HALF * 2 + 0.3, 0.14, HALF * 2 + 0.3),
      new THREE.MeshStandardMaterial({ color: isDark ? "#070c16" : "#CFCABB", roughness: 0.9 })
    );
    plinth.position.y = -0.57;
    scene.add(plinth);

    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2 + 7, HALF * 2 + 7),
      new THREE.MeshBasicMaterial({
        map: glow, color: 0x000000, transparent: true, opacity: isDark ? 0.3 : 0.12, depthWrite: false,
      })
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = -0.66;
    scene.add(contact);

    /* Roads */
    const asphalt = new THREE.MeshStandardMaterial({
      color: isDark ? "#141c2c" : "#45474c",
      roughness: 0.92
    });
    LINES.forEach((i) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 0.02, ROAD_W), asphalt);
      h.position.set(0, 0.01, i * P);
      h.receiveShadow = true;
      const v = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.021, HALF * 2), asphalt);
      v.position.set(i * P, 0.0105, 0);
      v.receiveShadow = true;
      scene.add(h, v);
    });

    /* Road markings: dashes + zebra crossings (instanced) */
    const flat = new THREE.PlaneGeometry(1, 1);
    flat.rotateX(-Math.PI / 2);
    const markMat = new THREE.MeshBasicMaterial({ color: isDark ? "#cbd5e1" : "#ECE7D2" });
    const marks: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    const addMark = (x: number, z: number, sx: number, sz: number) => {
      marks.push(new THREE.Matrix4().compose(
        new THREE.Vector3(x, 0.026, z), q, new THREE.Vector3(sx, 1, sz)
      ));
    };
    LINES.forEach((j) => {
      for (let s = -HALF + 0.35; s < HALF - 0.2; s += 0.55) {
        const nearInt = LINES.some((i) => Math.abs(s - i * P) < ROAD_W / 2 + 0.55);
        if (nearInt) continue;
        addMark(s, j * P, 0.28, 0.035);
        addMark(j * P, s, 0.035, 0.28);
      }
    });
    LINES.forEach((i) => {
      LINES.forEach((j) => {
        const cx = i * P, cz = j * P;
        for (let k = -2; k <= 2; k++) {
          const o = k * 0.16;
          addMark(cx + 0.6, cz + o, 0.18, 0.07);
          addMark(cx - 0.6, cz + o, 0.18, 0.07);
          addMark(cx + o, cz + 0.6, 0.07, 0.18);
          addMark(cx + o, cz - 0.6, 0.07, 0.18);
        }
      });
    });
    const markMesh = new THREE.InstancedMesh(flat, markMat, marks.length);
    marks.forEach((m, i) => markMesh.setMatrixAt(i, m));
    scene.add(markMesh);

    /* Buildings */
    const rng = seeded(2024);
    const buildings: THREE.Mesh[] = [];
    const palette = isDark
      ? ["#182338", "#1e293b", "#0f172a", "#1a2536", "#142032", "#1f2d42", "#162234", "#1b2940"]
      : ["#F4F1E8", "#EAE5D7", "#DDD7C7", "#EFE4D4", "#D5D8D6", "#E8D6C5", "#F4F1E8", "#E3DFD2"];

    function addBuilding(
      cx: number, cz: number, w: number, d: number, h: number,
      color: string, base: number, allowTier: boolean
    ) {
      const tex = winTex.clone();
      tex.needsUpdate = true;
      const avg = (w + d) / 2;
      tex.repeat.set(
        Math.max(1, Math.round(avg * 3.2)) / 8,
        Math.max(2, Math.round(h * 3.6)) / 8
      );
      tex.offset.set(Math.floor(rng() * 8) / 8, Math.floor(rng() * 8) / 8);
      const side = new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.85 });
      const roof = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).multiplyScalar(0.92), roughness: 0.95,
      });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        [side, side, roof, roof, side, side]
      );
      mesh.position.set(cx, base + h / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      buildings.push(mesh);

      if (allowTier && h > 2.0 && rng() < 0.7) {
        addBuilding(cx, cz, w * 0.62, d * 0.62, 0.5 + rng() * 0.7, color, base + h, false);
      } else if (rng() < 0.65) {
        const unit = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.3, 0.1, d * 0.3),
          new THREE.MeshStandardMaterial({ color: "#CFCABB", roughness: 0.9 })
        );
        unit.position.set(cx + (rng() - 0.5) * w * 0.3, base + h + 0.05, cz + (rng() - 0.5) * d * 0.3);
        unit.castShadow = true;
        scene.add(unit);
      }
    }

    const trees: { x: number; z: number; base: number; r: number }[] = [];
    const platMat = new THREE.MeshStandardMaterial({ color: isDark ? "#111827" : "#DCD8CB", roughness: 0.95 });
    const parkMat = new THREE.MeshStandardMaterial({ color: isDark ? "#064e3b" : "#D3DDC4", roughness: 0.95 });
    const pathMat = new THREE.MeshStandardMaterial({ color: isDark ? "#1e293b" : "#EDE8D8", roughness: 0.95 });
    const pondMat = new THREE.MeshStandardMaterial({ color: isDark ? "#0284c7" : "#C5D6DA", roughness: 0.25, metalness: 0.2 });

    for (let i = -2; i <= 1; i++) {
      for (let j = -2; j <= 1; j++) {
        const bx = (i + 0.5) * P, bz = (j + 0.5) * P;
        const size = P - ROAD_W;
        const isPark = (i === 0 && j === -1) || (i === -1 && j === 1);

        const plat = new THREE.Mesh(
          new THREE.BoxGeometry(size, BASE, size),
          isPark ? parkMat : platMat
        );
        plat.position.set(bx, BASE / 2, bz);
        plat.receiveShadow = true;
        scene.add(plat);

        if (isPark) {
          const p1 = new THREE.Mesh(new THREE.BoxGeometry(size, 0.006, 0.14), pathMat);
          p1.position.set(bx, BASE + 0.003, bz);
          const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.006, size), pathMat);
          p2.position.set(bx, BASE + 0.003, bz);
          const pond = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.01, 32), pondMat);
          pond.position.set(bx + 0.5, BASE + 0.006, bz + 0.5);
          scene.add(p1, p2, pond);
          for (let k = 0; k < 9; k++) {
            const tx = bx + (rng() - 0.5) * (size - 0.3);
            const tz = bz + (rng() - 0.5) * (size - 0.3);
            if (Math.hypot(tx - (bx + 0.5), tz - (bz + 0.5)) < 0.55) continue;
            if (Math.abs(tx - bx) < 0.14 || Math.abs(tz - bz) < 0.14) continue;
            trees.push({ x: tx, z: tz, base: BASE, r: 0.14 + rng() * 0.1 });
          }
          continue;
        }

        const inner = size - 0.24;
        const pattern = Math.floor(rng() * 4);
        const cells: { cx: number; cz: number; w: number; d: number }[] = [];
        if (pattern === 0) cells.push({ cx: bx, cz: bz, w: inner, d: inner });
        else if (pattern === 1) {
          cells.push({ cx: bx - inner / 4, cz: bz, w: inner / 2, d: inner });
          cells.push({ cx: bx + inner / 4, cz: bz, w: inner / 2, d: inner });
        } else if (pattern === 2) {
          cells.push({ cx: bx, cz: bz - inner / 4, w: inner, d: inner / 2 });
          cells.push({ cx: bx, cz: bz + inner / 4, w: inner, d: inner / 2 });
        } else {
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            cells.push({ cx: bx + (sx * inner) / 4, cz: bz + (sz * inner) / 4, w: inner / 2, d: inner / 2 });
          }
        }
        const centrality = 1 - Math.min(1, Math.hypot(bx, bz) / 6.8);
        cells.forEach((c) => {
          const h = 0.55 + centrality * 2.2 * rng() + rng() * 0.7 + (centrality > 0.55 ? 0.5 : 0);
          let color = palette[Math.floor(rng() * palette.length)];
          if (h > 2.4 && rng() < 0.35) color = "#C3D0D4";
          else if (rng() < 0.08) color = "#D8A587";
          addBuilding(c.cx, c.cz, c.w - 0.08, c.d - 0.08, h, color, BASE, true);
        });
      }
    }

    /* Trees along the outer margin */
    for (let s = -HALF + 0.6; s <= HALF - 0.5; s += 0.95) {
      const m = HALF - 0.38;
      trees.push({ x: s, z: m, base: 0, r: 0.13 + rng() * 0.07 });
      trees.push({ x: s, z: -m, base: 0, r: 0.13 + rng() * 0.07 });
      trees.push({ x: m, z: s, base: 0, r: 0.13 + rng() * 0.07 });
      trees.push({ x: -m, z: s, base: 0, r: 0.13 + rng() * 0.07 });
    }
    const foliage = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, flatShading: true }),
      trees.length
    );
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.014, 0.02, 0.12, 6),
      new THREE.MeshStandardMaterial({ color: "#8a7a66", roughness: 1 }),
      trees.length
    );
    const greens = ["#8FA77E", "#7E9A6E", "#9DB28A", "#86A075"].map((c) => new THREE.Color(c));
    const m4 = new THREE.Matrix4();
    trees.forEach((t, i) => {
      m4.compose(
        new THREE.Vector3(t.x, t.base + 0.1 + t.r * 0.9, t.z), q,
        new THREE.Vector3(t.r, t.r * 1.1, t.r)
      );
      foliage.setMatrixAt(i, m4);
      foliage.setColorAt(i, greens[i % greens.length]);
      m4.compose(new THREE.Vector3(t.x, t.base + 0.06, t.z), q, new THREE.Vector3(1, 1, 1));
      trunk.setMatrixAt(i, m4);
    });
    foliage.castShadow = true;
    trunk.castShadow = true;
    scene.add(foliage, trunk);

    /* Heat decals on road intersections */
    const heatSpots: { i: number; j: number; k: number }[] = [
      { i: 0, j: 0, k: 1 }, { i: 1, j: 0, k: 0.8 }, { i: -1, j: 0, k: 0.6 },
      { i: 0, j: 1, k: 0.55 }, { i: 1, j: -1, k: 0.5 }, { i: -1, j: 1, k: 0.35 },
      { i: 0, j: -1, k: 0.4 },
    ];
    const heats = heatSpots.map((h, idx) => {
      const mat = new THREE.MeshBasicMaterial({
        map: glow,
        color: isDark ? (h.k > 0.7 ? "#f97316" : "#0284c7") : (h.k > 0.7 ? "#E4572E" : "#F2A93B"),
        transparent: true,
        opacity: isDark ? 0.75 : 0.7,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(h.i * P, 0.032, h.j * P);
      const size = 1.8 + h.k * 1.6;
      mesh.scale.set(size, size, 1);
      scene.add(mesh);
      return { mesh, mat, k: h.k, phase: idx * 1.3, size };
    });

    /* CCTV poles with field-of-view cones */
    const camSpots: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const poleMat = new THREE.MeshStandardMaterial({
      color: isDark ? "#1e293b" : "#2a2b2e",
      roughness: 0.5,
      metalness: 0.4
    });
    const leds: THREE.Mesh[] = [];
    const cones: THREE.MeshBasicMaterial[] = [];
    camSpots.forEach(([i, j], idx) => {
      const cx = i * P, cz = j * P;
      const sx = idx % 2 === 0 ? 1 : -1;
      const sz = idx < 2 ? -1 : 1;
      const px = cx + sx * 0.52, pz = cz + sz * 0.52;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 1.0, 8), poleMat);
      pole.position.set(px, BASE + 0.5, pz);
      pole.castShadow = true;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, 0.07), poleMat);
      const hp = new THREE.Vector3(px, BASE + 1.02, pz);
      head.position.copy(hp);
      const target = new THREE.Vector3(cx, 0.03, cz);
      head.lookAt(target);
      head.castShadow = true;
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshBasicMaterial({ color: isDark ? "#38bdf8" : "#E4572E" })
      );
      led.position.copy(hp).add(new THREE.Vector3(0, 0.05, 0));
      leds.push(led);

      const dist = hp.distanceTo(target);
      const coneGeo = new THREE.ConeGeometry(1, 1, 28, 1, true);
      coneGeo.translate(0, -0.5, 0);
      coneGeo.rotateX(-Math.PI / 2);
      const coneMat = new THREE.MeshBasicMaterial({
        color: isDark ? "#38bdf8" : "#F2A93B",
        transparent: true,
        opacity: isDark ? 0.22 : 0.13,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      cones.push(coneMat);
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(hp);
      cone.lookAt(target);
      cone.scale.set(0.55, 0.55, dist);
      scene.add(pole, head, led, cone);
    });

    /* Rekor Solar Surveillance Camera Mast (Inspired by the reference image) */
    if (isDark) {
      const solarGroup = new THREE.Group();
      const mastMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.35, metalness: 0.7 });
      const mastPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.7, 16), mastMat);
      mastPost.position.y = 1.35;
      mastPost.castShadow = true;
      solarGroup.add(mastPost);

      // Solar panel frame & tilted panel on top
      const solarPivot = new THREE.Group();
      solarPivot.position.y = 2.72;
      solarPivot.rotation.x = -0.55;
      const panelFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.03, 0.58),
        new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.6 })
      );
      const panelCells = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.52),
        new THREE.MeshStandardMaterial({ color: "#1e3a8a", roughness: 0.25, metalness: 0.8 })
      );
      panelCells.rotation.x = -Math.PI / 2;
      panelCells.position.y = 0.017;
      solarPivot.add(panelFrame, panelCells);
      solarGroup.add(solarPivot);

      // Dual AI camera enclosure
      const camHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.11, 0.16),
        new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.4 })
      );
      camHousing.position.set(0, 2.22, 0.11);
      const lensL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16),
        new THREE.MeshBasicMaterial({ color: "#00e5ff" })
      );
      lensL.rotation.x = Math.PI / 2;
      lensL.position.set(-0.08, 2.22, 0.2);
      const lensR = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16),
        new THREE.MeshBasicMaterial({ color: "#00e5ff" })
      );
      lensR.rotation.x = Math.PI / 2;
      lensR.position.set(0.08, 2.22, 0.2);
      solarGroup.add(camHousing, lensL, lensR);

      // Status indicator LED
      const statusLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshBasicMaterial({ color: "#10b981" })
      );
      statusLed.position.set(0, 2.82, 0);
      solarGroup.add(statusLed);

      // Optical surveillance beam
      const beamGeo = new THREE.ConeGeometry(1.4, 3.4, 28, 1, true);
      beamGeo.translate(0, -1.7, 0);
      beamGeo.rotateX(-0.52);
      const beamCone = new THREE.Mesh(
        beamGeo,
        new THREE.MeshBasicMaterial({
          color: "#00d2ff",
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      beamCone.position.set(0, 2.22, 0.11);
      solarGroup.add(beamCone);

      solarGroup.position.set(0.58, BASE, 0.58);
      scene.add(solarGroup);
    }

    /* Cars */
    const matCache = new Map<string, THREE.MeshStandardMaterial>();
    const carMat = (c: string) => {
      if (!matCache.has(c)) {
        matCache.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0.35 }));
      }
      return matCache.get(c)!;
    };
    const glassMat = new THREE.MeshStandardMaterial({ color: isDark ? "#0f172a" : "#2c3640", roughness: 0.15, metalness: 0.6 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: "#16171a", roughness: 0.8 });
    const headMat = new THREE.MeshBasicMaterial({ color: isDark ? "#ffffff" : "#FFF2C4" });
    const tailMat = new THREE.MeshBasicMaterial({ color: isDark ? "#ff2222" : "#FF3B2F" });
    const blankPlate = new THREE.MeshBasicMaterial({ color: "#F1EDDC" });
    const bodyGeo = new THREE.BoxGeometry(0.46, 0.09, 0.2);
    const cabinGeo = new THREE.BoxGeometry(0.23, 0.07, 0.168);
    const roofGeo = new THREE.BoxGeometry(0.235, 0.012, 0.172);
    const wheelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14);
    wheelGeo.rotateX(Math.PI / 2);
    const lampGeo = new THREE.BoxGeometry(0.012, 0.025, 0.045);
    const plateGeo = new THREE.PlaneGeometry(0.1, 0.05);
    plateGeo.rotateY(-Math.PI / 2);

    function buildCar(color: string, plateMat: THREE.Material) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, carMat(color));
      body.position.y = 0.075;
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(-0.03, 0.155, 0);
      const roof = new THREE.Mesh(roofGeo, carMat(color));
      roof.position.set(-0.03, 0.195, 0);
      body.castShadow = true;
      cabin.castShadow = true;
      g.add(body, cabin, roof);
      for (const x of [-0.15, 0.15]) {
        for (const z of [-0.1, 0.1]) {
          const w = new THREE.Mesh(wheelGeo, wheelMat);
          w.position.set(x, 0.04, z);
          g.add(w);
        }
      }
      for (const z of [-0.07, 0.07]) {
        const hl = new THREE.Mesh(lampGeo, headMat);
        hl.position.set(0.232, 0.08, z);
        const tl = new THREE.Mesh(lampGeo, tailMat);
        tl.position.set(-0.232, 0.08, z);
        g.add(hl, tl);
      }
      if (isDark) {
        for (const z of [-0.07, 0.07]) {
          const beamGeo = new THREE.ConeGeometry(0.14, 0.75, 12, 1, true);
          beamGeo.translate(0, -0.375, 0);
          beamGeo.rotateZ(Math.PI / 2);
          const beam = new THREE.Mesh(
            beamGeo,
            new THREE.MeshBasicMaterial({
              color: "#fffbeb",
              transparent: true,
              opacity: 0.1,
              depthWrite: false
            })
          );
          beam.position.set(0.24, 0.08, z);
          g.add(beam);
        }
      }
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.set(-0.2335, 0.062, 0);
      g.add(plate);
      return g;
    }

    function pose(car: Car) {
      const { lane, s, group } = car;
      if (lane.axis === "x") {
        group.position.set(s, 0.02, lane.line + 0.2 * lane.dir);
        group.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      } else {
        group.position.set(lane.line - 0.2 * lane.dir, 0.02, s);
        group.rotation.y = lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
    }

    const readable: Car[] = [];
    const ambient: Car[] = [];
    const readableColors = ["#E9E7E1", "#E4572E", "#F2A93B", "#E9E7E1", "#5B7C99", "#E4572E"];
    const mainLanes: Lane[] = [
      { axis: "x", line: 0, dir: 1, speed: 1.05 },
      { axis: "x", line: 0, dir: -1, speed: 1.25 },
    ];
    READABLE_PLATES.forEach((plate, idx) => {
      const lane = mainLanes[idx % 2];
      const slot = Math.floor(idx / 2);
      const pm = new THREE.MeshBasicMaterial({ map: plateTexture(plate) });
      const group = buildCar(readableColors[idx], pm);
      scene.add(group);
      const car: Car = { group, lane, s: -HALF + 1.2 + slot * 5.0 + (idx % 2) * 2.1 };
      pose(car);
      readable.push(car);
    });

    const ambientLanes: Lane[] = [
      { axis: "x", line: -P, dir: 1, speed: 0.95 },
      { axis: "x", line: P, dir: -1, speed: 1.1 },
      { axis: "x", line: -2 * P, dir: 1, speed: 0.85 },
      { axis: "z", line: -P, dir: 1, speed: 1.0 },
      { axis: "z", line: 0, dir: -1, speed: 1.15 },
      { axis: "z", line: P, dir: 1, speed: 0.9 },
      { axis: "z", line: 2 * P, dir: -1, speed: 1.0 },
      { axis: "z", line: -2 * P, dir: 1, speed: 0.8 },
    ];
    const ambientColors = ["#E9E7E1", "#8A8F94", "#2F4A63", "#D8D2C4", "#B9442B", "#F2A93B", "#1D1F23"];
    ambientLanes.forEach((lane, li) => {
      for (let k = 0; k < 2; k++) {
        const group = buildCar(ambientColors[(li * 2 + k) % ambientColors.length], blankPlate);
        scene.add(group);
        const car: Car = { group, lane, s: -HALF + 1 + k * 7.4 + li * 0.7 };
        pose(car);
        ambient.push(car);
      }
    });

    /* Lock ring */
    const lockRing = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.33, 40),
      new THREE.MeshBasicMaterial({
        color: "#E4572E", transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    lockRing.rotation.x = -Math.PI / 2;
    lockRing.visible = false;
    scene.add(lockRing);

    const unsub = followBus.subscribe((t) => {
      if (!t) {
        lockRef.current = null;
        lockRing.visible = false;
        return;
      }
      lockRef.current = { index: t.vehicleIndex, until: performance.now() + 2200 };
      lockRing.visible = true;
    });

    onReadyRef.current?.(
      readable.map((c, i) => ({
        index: i,
        plate: READABLE_PLATES[i],
        getPosition: () => ({
          x: c.group.position.x, y: c.group.position.y, z: c.group.position.z,
        }),
      }))
    );

    /* Camera rig */
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3(0, 0.6, 0);
    let inited = false;
    const raycaster = new THREE.Raycaster();
    const occluded = readable.map(() => false);
    let frame = 0;
    const tmp = new THREE.Vector3();

    function fitDistance() {
      const aspect = width / height;
      const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      const fitH = (isDark ? 6.4 : 7.6) / (t * aspect);
      const fitV = (isDark ? 4.9 : 5.6) / t;
      return THREE.MathUtils.clamp(Math.max(fitH, fitV), isDark ? 18 : 22, 52);
    }

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      /* traffic */
      const advance = (c: Car) => {
        c.s += c.lane.dir * c.lane.speed * dt;
        if (c.s > HALF - 0.3) c.s = -HALF + 0.3;
        if (c.s < -HALF + 0.3) c.s = HALF - 0.3;
        pose(c);
      };
      readable.forEach(advance);
      ambient.forEach(advance);

      /* camera target */
      const D = fitDistance();
      const a = 0.78 + Math.sin(t * 0.12) * 0.45;
      const elev = 0.62;
      const px = pointer.current.x, py = pointer.current.y;
      const desiredPos = new THREE.Vector3(
        Math.sin(a) * D * Math.cos(elev) + px * 0.8 + (mode === "hero" ? -1.2 : 0),
        D * Math.sin(elev) + py * 0.5,
        Math.cos(a) * D * Math.cos(elev)
      );
      const desiredLook = mode === "hero"
        ? new THREE.Vector3(1.4, 0.45, 0)
        : (isDark ? new THREE.Vector3(0.5, 0.45, 0) : new THREE.Vector3(0, 0.5, 0));
      let k = 1 - Math.exp(-dt * 1.6);

      const lock = lockRef.current;
      if (lock && readable[lock.index]) {
        const car = readable[lock.index];
        const dx = car.lane.axis === "x" ? car.lane.dir : 0;
        const dz = car.lane.axis === "z" ? car.lane.dir : 0;
        const cp = car.group.position;
        if (mode === "hero") {
          desiredPos.set(cp.x - dx * 3.4 - dz * 0.8 - 1.2, 2.2, cp.z - dz * 3.4 + dx * 0.8);
          desiredLook.set(cp.x + 0.8, 0.35, cp.z);
        } else {
          desiredPos.set(cp.x - dx * 1.15 - dz * 0.35, 0.62, cp.z - dz * 1.15 + dx * 0.35);
          desiredLook.set(cp.x + dx * 0.25, 0.1, cp.z + dz * 0.25);
        }
        k = 1 - Math.exp(-dt * 5);
        lockRing.position.set(cp.x, 0.034, cp.z);
        const pulse = 1 + 0.12 * Math.sin(t * 8);
        lockRing.scale.set(pulse, pulse, 1);
        if (performance.now() > lock.until) {
          lockRef.current = null;
          lockRing.visible = false;
        }
      }
      if (!inited) {
        camPos.copy(desiredPos);
        camLook.copy(desiredLook);
        inited = true;
      } else {
        camPos.lerp(desiredPos, k);
        camLook.lerp(desiredLook, k);
      }
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      /* ambient animation */
      heats.forEach((h) => {
        const p = 0.5 + 0.5 * Math.sin(t * 1.2 + h.phase);
        h.mat.opacity = 0.45 + 0.3 * p;
        const s = h.size * (0.94 + 0.08 * p);
        h.mesh.scale.set(s, s, 1);
      });
      cones.forEach((m, i) => { m.opacity = 0.1 + 0.05 * Math.sin(t * 2 + i); });
      leds.forEach((l, i) => {
        const on = Math.sin(t * 3 + i * 1.7) > 0;
        l.scale.setScalar(on ? 1 : 0.4);
      });

      /* occlusion test */
      frame++;
      if (frame % 4 === 0) {
        readable.forEach((c, i) => {
          tmp.set(c.group.position.x, c.group.position.y + 0.15, c.group.position.z);
          const dir = tmp.clone().sub(camera.position);
          const dist = dir.length();
          raycaster.set(camera.position, dir.normalize());
          raycaster.far = Math.max(0, dist - 0.2);
          occluded[i] = raycaster.intersectObjects(buildings, false).length > 0;
        });
      }

      /* projection for the HUD */
      const cb = onPositionsRef.current;
      if (cb) {
        cb(
          readable.map((c, i) => {
            tmp.set(c.group.position.x, c.group.position.y + 0.2, c.group.position.z).project(camera);
            const inside = tmp.z < 1 && Math.abs(tmp.x) < 0.96 && Math.abs(tmp.y) < 0.96;
            return {
              index: i,
              plate: READABLE_PLATES[i],
              x: (tmp.x * 0.5 + 0.5) * width,
              y: (-tmp.y * 0.5 + 0.5) * height,
              visible: inside && !occluded[i],
            };
          })
        );
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const ro = new ResizeObserver(() => {
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
      mount.removeEventListener("pointermove", onMove);
      mount.removeEventListener("pointerleave", onLeave);
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh;
        if (o.geometry) o.geometry.dispose();
        const m = o.material as THREE.Material | THREE.Material[] | undefined;
        if (m) {
          (Array.isArray(m) ? m : [m]).forEach((x) => {
            const mm = x as THREE.MeshBasicMaterial;
            if (mm.map) mm.map.dispose();
            x.dispose();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [theme, mode]);

  return (
    <div
      ref={mountRef}
      className={mode === "hero" ? "w-full h-full absolute inset-0" : "relative w-full h-[440px] sm:h-[500px] lg:h-[540px]"}
      style={mode === "hero" ? { position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" } : undefined}
      aria-label="Interactive 3D city model with moving traffic"
    />
  );
}