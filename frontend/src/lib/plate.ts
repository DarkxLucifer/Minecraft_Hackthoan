"use client";

/**
 * License plate utilities and the read-write capture bus shared between the
 * interactive 3D city scene and the live capture panel.
 *
 * Plates are session-only (in-memory). They are never persisted.
 */

export type PlateCapture = {
  /** Sequence index within the current session */
  id: string;
  /** License plate string, e.g. "MH12AB1234" */
  plate: string;
  /** Sector / intersection identifier */
  sector: string;
  /** Vehicle color / class label, e.g. "Sedan", "SUV", "Truck" */
  vehicleClass: string;
  /** Vehicle color */
  color: string;
  /** OCR confidence in 0..1 (mocked, but realistic-looking) */
  confidence: number;
  /** Capture timestamp (real wall-clock) */
  capturedAt: string;
  /** Camera / sensor id used to read */
  cameraId: string;
};

export type PlateCaptureListener = (l: PlateCapture[]) => void;

/* ----------------- Plate generation ----------------- */

const STATE_PREFIXES = [
  "MH", "DL", "KA", "TN", "GJ", "UP", "RJ", "WB", "TS", "KL", "MP", "PB",
];
const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";
const DIGITS = "0123456789";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Produces a realistic-looking but fictitious plate in the style of Indian RTO plates
 * (e.g. "MH12AB1234"). Used for the demo feed.
 */
export function generatePlate(): string {
  const state = pick(STATE_PREFIXES);
  const num2 = String(Math.floor(Math.random() * 99)).padStart(2, "0");
  const L1 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const L2 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const num4 = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  return `${state}${num2}${L1}${L2}${num4}`;
}

const VEHICLE_CLASSES = [
  "Sedan", "Hatchback", "SUV", "Sedan", "Motorcycle", "Pickup",
];
const VEHICLE_COLORS = [
  "White", "Black", "Silver", "Grey", "Red", "Blue", "White", "Black",
];

export function randomVehicle() {
  return {
    vehicleClass: pick(VEHICLE_CLASSES),
    color: pick(VEHICLE_COLORS),
  };
}

/* ----------------- Sector / camera IDs ----------------- */

const SECTORS = ["SECTOR 01", "SECTOR 02", "SECTOR 03", "SECTOR 04", "SECTOR 05"];

/** Stable per-camera id formatted like "CAM-S04-A07" */
export function cameraIdFor(sector: string): string {
  const code = sector.replace(/[^0-9]/g, "").padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 16) + 1).padStart(2, "0");
  return `CAM-S${code}-${suffix}`;
}

export function randomSector(): string {
  return pick(SECTORS);
}

/* ----------------- Session store ----------------- */

/**
 * A tiny in-memory store that the city scene and capture panel can read from.
 * Implemented as a module singleton so it survives across the page tree
 * without any provider boilerplate.
 *
 * Persists nothing. Resets on full page reload.
 */
type Listener<T> = (v: T) => void;

class SessionBus<T> {
  private value: T;
  private listeners = new Set<Listener<T>>();
  constructor(initial: T) { this.value = initial; }
  get(): T { return this.value; }
  set(next: T): void {
    this.value = next;
    this.listeners.forEach((l) => l(next));
  }
  subscribe(l: Listener<T>): () => void {
    this.listeners.add(l);
    l(this.value);
    return () => { this.listeners.delete(l); };
  }
}

export const capturesBus = new SessionBus<PlateCapture[]>([]);

/**
 * Push a new entry to the capture list (most-recent first).
 * Caps the size to keep memory tidy.
 */
export function pushCapture(cap: Omit<PlateCapture, "id" | "capturedAt">): PlateCapture {
  const entry: PlateCapture = {
    ...cap,
    id: Math.random().toString(36).slice(2, 9),
    capturedAt: new Date().toLocaleTimeString("en-GB", { hour12: false }),
  };
  const list = [entry, ...capturesBus.get()].slice(0, 24);
  capturesBus.set(list);
  return entry;
}

/* ----------------- React hooks ----------------- */

import { useEffect, useState } from "react";

/** Subscribe to the capture feed. */
export function useCaptures(): PlateCapture[] {
  const [list, setList] = useState<PlateCapture[]>(() => capturesBus.get());
  useEffect(() => capturesBus.subscribe(setList), []);
  return list;
}