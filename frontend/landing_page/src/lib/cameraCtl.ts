"use client";

/**
 * A tiny pub/sub used to tell the running Three.js scene what the user wants:
 *
 *  - "follow"  : re-aim the camera at one of the moving vehicles and lock
 *                on it for a few seconds while it is "read".
 *  - "release" : return the camera to its ambient orbit.
 *
 * The scene + the read-out panel share this bus so clicks in the overlay
 * can trigger animation in the WebGL context.
 */
import { useCallback, useEffect, useState } from "react";

export type FollowTarget = {
  /** 0..N index of the vehicle to follow */
  vehicleIndex: number;
  /** optional plate string we expect to read off this car */
  expectedPlate: string;
  /** unique request id so multiple clicks can replace each other */
  requestId: string;
};

type BusValue = FollowTarget | null;
type Listener = (t: BusValue) => void;

class Bus {
  private value: BusValue;
  private ls = new Set<Listener>();
  constructor(initial: BusValue) { this.value = initial; }
  get(): BusValue { return this.value; }
  set(next: BusValue): void {
    this.value = next;
    this.ls.forEach((l) => l(next));
  }
  subscribe(l: Listener): () => void {
    this.ls.add(l);
    l(this.value);
    return () => { this.ls.delete(l); };
  }
}

export const followBus = new Bus(null);

/**
 * Returns the current active follow (most-recent wins) and lets the caller
 * trigger a new lock-on. The scene itself is responsible for clearing the
 * lock after it finishes the read.
 */
export function useFollowTarget() {
  const [target, setTarget] = useState<FollowTarget | null>(() => followBus.get());
  useEffect(() => followBus.subscribe(setTarget), []);
  const requestFollow = useCallback((vehicleIndex: number, expectedPlate: string) => {
    followBus.set({
      vehicleIndex,
      expectedPlate,
      requestId: Math.random().toString(36).slice(2, 9),
    });
  }, []);
  const release = useCallback(() => followBus.set(null), []);
  return { target, requestFollow, release };
}