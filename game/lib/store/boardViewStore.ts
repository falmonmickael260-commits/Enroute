"use client";

import { useSyncExternalStore } from "react";

/**
 * Which board this device shows: the illustrated 3D scene (default) or the
 * classic top-down board. Purely visual and per device, so in an online game
 * every player can pick their own without affecting the others.
 */
export type BoardView = "3d" | "classic";

const STORAGE_KEY = "enroute:board-view";
let view: BoardView = "3d";
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "classic" || stored === "3d") view = stored;
  } catch {
    // storage unavailable: keep the default
  }
}

export function getBoardView(): BoardView {
  hydrate();
  return view;
}

export function setBoardView(next: BoardView) {
  view = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBoardView(): BoardView {
  return useSyncExternalStore(subscribe, getBoardView, () => "3d");
}
