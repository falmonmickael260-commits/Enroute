"use client";

import { useCallback, useSyncExternalStore } from "react";
import { SFX, type SoundName } from "@/game/audio/soundEngine";
import { getSoundEnabled, getSoundEnabledServer, subscribeSoundEnabled, toggleSoundEnabled } from "@/game/lib/store/soundStore";

export function useSound() {
  const enabled = useSyncExternalStore(subscribeSoundEnabled, getSoundEnabled, getSoundEnabledServer);

  const toggle = useCallback(() => toggleSoundEnabled(), []);

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      try {
        SFX[name]();
      } catch {
        // audio not available; fail silently
      }
    },
    [enabled],
  );

  return { enabled, toggle, play };
}
