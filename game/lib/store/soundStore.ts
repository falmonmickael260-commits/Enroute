"use client";

const STORAGE_KEY = "enroute:sound-enabled";

let enabled = true;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) enabled = stored === "1";
  } catch {
    // ignore (private browsing, etc.)
  }
}

export function getSoundEnabled(): boolean {
  hydrate();
  return enabled;
}

export function getSoundEnabledServer(): boolean {
  return true;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function toggleSoundEnabled(): void {
  setSoundEnabled(!getSoundEnabled());
}

export function subscribeSoundEnabled(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
