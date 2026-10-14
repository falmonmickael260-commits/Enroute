"use client";

import { useSyncExternalStore } from "react";

/** A phone held sideways: little height, so the game screen packs itself tighter. */
const QUERY = "(orientation: landscape) and (max-height: 520px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const snapshot = () => window.matchMedia(QUERY).matches;
const serverSnapshot = () => false;

export function useShortLandscape() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
