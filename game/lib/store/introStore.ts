"use client";

const STORAGE_KEY = "enroute:intro-shown";

let shown = false;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    shown = sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // ignore (private browsing, etc.)
  }
}

export function getIntroShown(): boolean {
  hydrate();
  return shown;
}

export function getIntroShownServer(): boolean {
  return false;
}

export function markIntroShown(): void {
  shown = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function subscribeIntroShown(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
