"use client";

import { useEffect, useRef, useState } from "react";
import CityScene, { type ProjectedVehicle, type VehicleHandle } from "@/components/CityScene";
import {
  capturesBus,
  cameraIdFor,
  pushCapture,
  randomSector,
  randomVehicle,
  useCaptures,
} from "@/lib/plate";
import { useFollowTarget } from "@/lib/cameraCtl";

type Read = {
  plate: string;
  sector: string;
  cameraId: string;
  vehicleClass: string;
  color: string;
  confidence: number;
  index: number;
};

type InteractiveCityProps = {
  theme?: "light" | "dark";
  mode?: "panel" | "hero";
};

export default function InteractiveCity({ theme = "light", mode = "panel" }: InteractiveCityProps) {
  const [vehicles, setVehicles] = useState<VehicleHandle[]>([]);
  const [positions, setPositions] = useState<ProjectedVehicle[]>([]);
  const [activeRead, setActiveRead] = useState<Read | null>(null);
  const [autoOn, setAutoOn] = useState(true);
  const captures = useCaptures();
  const { requestFollow, release, target } = useFollowTarget();

  const positionsRef = useRef<ProjectedVehicle[]>([]);
  const activeRef = useRef<Read | null>(null);
  const lastIndex = useRef(-1);
  const frameCounter = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  activeRef.current = activeRead;

  const handlePositions = useRef((p: ProjectedVehicle[]) => {
    positionsRef.current = p;
    frameCounter.current++;
    if (frameCounter.current % 3 === 0) setPositions(p);
  }).current;

  const readVehicle = useRef((index: number, list: VehicleHandle[]) => {
    const v = list.find((x) => x.index === index);
    if (!v) return;
    const sector = randomSector();
    const vehicle = randomVehicle();
    const confidence = 0.9 + Math.random() * 0.08;
    const entry = pushCapture({
      plate: v.plate,
      sector,
      cameraId: cameraIdFor(sector),
      vehicleClass: vehicle.vehicleClass,
      color: vehicle.color,
      confidence,
    });
    lastIndex.current = index;
    setActiveRead({
      plate: entry.plate,
      sector: entry.sector,
      cameraId: entry.cameraId,
      vehicleClass: entry.vehicleClass,
      color: entry.color,
      confidence: entry.confidence,
      index,
    });
    requestFollow(index, entry.plate);
  });
  // keep latest requestFollow (stable in practice, but be safe)
  const doRead = (index: number) => readVehicle.current(index, vehicles);

  /* Auto-read: pick the visible car nearest the centre that was not just read */
  useEffect(() => {
    if (!autoOn || vehicles.length === 0) return;
    const id = setInterval(() => {
      if (activeRef.current) return;
      const stage = stageRef.current;
      if (!stage) return;
      const cx = stage.clientWidth / 2;
      const list = positionsRef.current
        .filter((p) => p.visible && p.index !== lastIndex.current)
        .sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
      if (list[0]) readVehicle.current(list[0].index, vehicles);
    }, 3600);
    return () => clearInterval(id);
  }, [autoOn, vehicles]);

  /* Clear the read-out when the camera releases the car */
  useEffect(() => {
    if (!target) return;
    const id = setTimeout(() => {
      setActiveRead(null);
      release();
    }, 2300);
    return () => clearTimeout(id);
  }, [target, release]);

  const avg = captures.length
    ? captures.reduce((a, c) => a + c.confidence, 0) / captures.length
    : null;
  const unique = new Set(captures.map((c) => c.plate)).size;

  if (mode === "hero") {
    return (
      <div
        className="city-stage hero-mode-stage"
        ref={stageRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <CityScene onReady={setVehicles} onPositions={handlePositions} theme={theme} mode={mode} />

        {positions
          .filter((p) => p.visible && p.x > 540)
          .map((p) => {
            const locked = activeRead?.index === p.index;
            return (
              <button
                key={p.index}
                onClick={() => doRead(p.index)}
                className={`stage-pin ${locked ? "active" : ""}`}
                style={{ left: p.x, top: p.y }}
                aria-label={`Read plate of vehicle ${p.plate}`}
              >
                <span className="label">{p.plate}</span>
                <span className="dot" />
                {locked && <span className="bracket" />}
              </button>
            );
          })}
      </div>
    );
  }

  return (
    <div className={`city-panel ${theme === "dark" ? "theme-dark" : ""}`}>
      <div className="city-panel-head">
        <span>City model / Sector 04</span>
        <span>
          <span className="live-dot" />
          {autoOn ? "Auto-read on" : "Manual"}
        </span>
      </div>

      <div className="city-stage" ref={stageRef}>
        <CityScene onReady={setVehicles} onPositions={handlePositions} theme={theme} mode={mode} />

        {positions
          .filter((p) => p.visible)
          .map((p) => {
            const locked = activeRead?.index === p.index;
            return (
              <button
                key={p.index}
                onClick={() => doRead(p.index)}
                className={`stage-pin ${locked ? "active" : ""}`}
                style={{ left: p.x, top: p.y }}
                aria-label={`Read plate of vehicle ${p.plate}`}
              >
                <span className="label">{p.plate}</span>
                <span className="dot" />
                {locked && <span className="bracket" />}
              </button>
            );
          })}

        <div className="stage-legend">
          <span><b style={{ background: "var(--accent)" }} />High density</span>
          <span><b style={{ background: "var(--amber)" }} />Camera view</span>
        </div>

        {activeRead && (
          <div className="read-panel" key={activeRead.plate + activeRead.cameraId}>
            <div className="head">
              <span>OCR / {activeRead.cameraId}</span>
              <span><span className="pulse-dot" />Plate locked</span>
            </div>
            <div className="plate">{activeRead.plate}</div>
            <div className="meta">
              <strong>{activeRead.color} {activeRead.vehicleClass}</strong>
              <span>{activeRead.sector}</span>
            </div>
            <div className="conf">
              <span>Conf</span>
              <b>{(activeRead.confidence * 100).toFixed(1)}%</b>
            </div>
          </div>
        )}
      </div>

      <div className="city-footer">
        <div className="stat"><div className="k">Vehicles</div><div className="v">{vehicles.length || "-"}</div></div>
        <div className="stat"><div className="k">Reads</div><div className="v">{captures.length}</div></div>
        <div className="stat"><div className="k">Unique</div><div className="v">{unique}</div></div>
        <div className="stat">
          <div className="k">Avg conf</div>
          <div className="v">{avg === null ? "-" : `${(avg * 100).toFixed(1)}%`}</div>
        </div>
      </div>

      {captures.length > 0 && (
        <ul className="city-log">
          {captures.slice(0, 6).map((c) => (
            <li className="row" key={c.id}>
              <span>{c.capturedAt}</span>
              <span>{c.plate}</span>
              <span className="sector">{c.sector}</span>
              <span className="conf">{(c.confidence * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}

      <div className="city-controls">
        <label>
          <input
            type="checkbox"
            checked={autoOn}
            onChange={(e) => setAutoOn(e.target.checked)}
          />
          Auto-read plates
        </label>
        <button onClick={() => capturesBus.set([])}>Clear log</button>
      </div>
    </div>
  );
}