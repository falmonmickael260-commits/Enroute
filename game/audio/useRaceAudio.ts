"use client";

import { useEffect, useRef } from "react";
import type { AnimationEvent, GameState } from "@/game/types/game";
import { raceAudio } from "./race";

/**
 * Gives a game screen its sound: the engine idles while it's shown, each
 * event of the game is heard as it appears, and on boards without 3D motion
 * (`simulate`) the engine follows a drive of the same length as the move.
 */
export function useRaceAudio(state: GameState, event: AnimationEvent | null, { simulate }: { simulate: boolean }) {
  const stateRef = useRef(state);
  const ambiance = state.ambiance;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    raceAudio.mount(ambiance);
    return () => raceAudio.unmount();
  }, [ambiance]);

  const eventId = event?.id ?? null;
  useEffect(() => {
    if (!event) return;
    raceAudio.event(event, stateRef.current);
    if (simulate && event.kind === "move") raceAudio.simulate(event.from, event.to, stateRef.current.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);
}
