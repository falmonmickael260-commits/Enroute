"use client";

import { useSyncExternalStore } from "react";

export type RaceMap = "coast" | "city" | "christmas";
export const RACE_MAPS = [
  { id: "coast", label: "Corniche d’Azur", hint: "Mer, falaises et villages", image: "/images/menu/map-coast.webp" },
  { id: "city", label: "Grand Boulevard", hint: "Immeubles, commerces et terrasses", image: "/images/menu/map-city.webp" },
  { id: "christmas", label: "Village de Noël", hint: "Chalets, sapins et neige qui tombe", image: "/images/menu/map-christmas.webp" },
] as const;
// Like the board view, the scenery is a visual preference of this device.
const KEY = "kilomax:race-map";
const listeners = new Set<() => void>();
let current: RaceMap = "coast", hydrated = false;
export function getRaceMap(): RaceMap {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    try { const stored = localStorage.getItem(KEY); if (stored === "city" || stored === "christmas") current = stored; } catch { /* Private browsing. */ }
  }
  return current;
}
export function setRaceMap(map: RaceMap) {
  current = map;
  hydrated = true;
  try { localStorage.setItem(KEY, map); } catch { /* Keep the in-memory choice. */ }
  listeners.forEach(listener => listener());
}
export function useRaceMap(): RaceMap {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getRaceMap, () => "coast");
}
