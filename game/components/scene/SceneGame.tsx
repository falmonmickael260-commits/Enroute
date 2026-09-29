"use client";

import { useCallback, useReducer } from "react";
import type { CardInstance, GameState } from "@/game/types/game";
import { createGame, gameReducer, type NewGameOptions } from "@/game/lib/engine/gameReducer";
import { useGameControls } from "@/game/hooks/useGameEngine";
import { uid } from "@/game/utils/array";
import type { SceneDef } from "./scenePath";
import { SceneTable } from "./SceneTable";

/** Hands dealt in demo mode, so every effect can be tried without luck. */
const DEMO_HANDS: string[][] = [
  ["dist200", "crevaison", "collision", "radar", "barrage", "passageLibre", "turbo", "raccourci", "gpsStrategique"],
  ["dist100", "roueSecours", "reparation", "panne", "pleinEssence", "gps", "depassement", "derniereLigneDroite", "passageLibre"],
];

function init({ options, demo }: { options: NewGameOptions; demo: boolean }): GameState {
  const state = createGame(options);
  if (demo) {
    DEMO_HANDS.forEach((ids, i) => {
      const player = state.players[i];
      if (player) player.hand = ids.map((defId) => ({ uid: uid(`${defId}-`), defId }) as CardInstance);
    });
  }
  return state;
}

export function SceneGame({
  options,
  demo,
  scene,
  onExit,
}: {
  options: NewGameOptions;
  demo: boolean;
  scene: SceneDef;
  onExit: () => void;
}) {
  const [state, dispatch] = useReducer(gameReducer, { options, demo }, init);
  const controls = useGameControls(state, dispatch);
  const consumeAnimation = useCallback(() => dispatch({ type: "CLEAR_ANIMATION" }), []);
  return (
    <SceneTable
      state={state}
      controls={controls}
      consumeAnimation={consumeAnimation}
      scene={scene}
      showViewToggle={false}
      onExit={onExit}
      onReplay={() => dispatch({ type: "NEW_GAME", options })}
      onNewGame={onExit}
    />
  );
}
