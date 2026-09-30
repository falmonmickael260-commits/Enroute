"use client";

import { useCallback, useSyncExternalStore } from "react";
import { mixer } from "@/game/audio/mixer";
import { getSoundEnabled, getSoundEnabledServer, subscribeSoundEnabled, toggleSoundEnabled } from "@/game/lib/store/soundStore";

/** Interface sounds played straight from a tap (the race itself is in useRaceAudio). */
export type UiSound = "cardPlay" | "cardDraw" | "cardDiscard" | "click";

export function useSound() {
  const enabled = useSyncExternalStore(subscribeSoundEnabled, getSoundEnabled, getSoundEnabledServer);

  const toggle = useCallback(() => toggleSoundEnabled(), []);

  const play = useCallback((name: UiSound) => {
    mixer.play(name, { bus: "ui", gain: name === "click" ? 0.3 : 0.6, rate: 0.96 + Math.random() * 0.08 });
  }, []);

  return { enabled, toggle, play };
}
