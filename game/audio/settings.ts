"use client";

/** Volume of each part of the mix, 0..1, kept per device. */
export interface AudioLevels {
  engine: number;
  effects: number;
  ambience: number;
  ui: number;
}

export type Bus = keyof AudioLevels;

const STORAGE_KEY = "kilomax:audio-levels:v1";
export const DEFAULT_LEVELS: AudioLevels = { engine: 0.9, effects: 0.8, ambience: 0.7, ui: 0.6 };

let levels: AudioLevels = DEFAULT_LEVELS;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<AudioLevels> | null;
    if (stored) {
      levels = { ...DEFAULT_LEVELS };
      for (const key of Object.keys(DEFAULT_LEVELS) as Bus[]) {
        const v = stored[key];
        if (typeof v === "number" && v >= 0 && v <= 1) levels[key] = v;
      }
    }
  } catch {
    // unavailable storage: defaults
  }
}

export function getAudioLevels(): AudioLevels {
  hydrate();
  return levels;
}

export function getAudioLevelsServer(): AudioLevels {
  return DEFAULT_LEVELS;
}

export function setAudioLevel(bus: Bus, value: number) {
  hydrate();
  levels = { ...levels, [bus]: Math.max(0, Math.min(1, value)) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function subscribeAudioLevels(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
