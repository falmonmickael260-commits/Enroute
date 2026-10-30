"use client";

import { useCallback, useReducer, useState } from "react";
import type { CardInstance, GameState } from "@/game/types/game";
import { createGame, gameReducer, type GameAction, type NewGameOptions } from "@/game/lib/engine/gameReducer";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import { activePlayer, hasAnyValidTarget } from "@/game/lib/engine/rules";

export interface PendingTarget {
  card: CardInstance;
  kind: "attack" | "overtake";
}

/**
 * Turns UI intents (play this card, pick that target…) into engine actions.
 * Shared by the local hotseat game and the online game, which differ only in
 * where `dispatch` sends the action.
 */
export function useGameControls(state: GameState, dispatch: (action: GameAction) => void) {
  const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null);

  const draw = useCallback(() => dispatch({ type: "DRAW_CARD" }), [dispatch]);

  const requestPlay = useCallback(
    (card: CardInstance) => {
      const def = getCardDef(card.defId);
      const player = activePlayer(state);

      if (def.category === "attaque") {
        if (!hasAnyValidTarget(player, def, state)) return;
        setPendingTarget({ card, kind: "attack" });
        return;
      }
      if (def.category === "special" && def.special === "depassement") {
        if (!hasAnyValidTarget(player, def, state)) return;
        setPendingTarget({ card, kind: "overtake" });
        return;
      }
      if (def.category === "distance") {
        dispatch({ type: "PLAY_DISTANCE", cardUid: card.uid });
        return;
      }
      if (def.category === "defense") {
        dispatch({ type: "PLAY_DEFENSE", cardUid: card.uid });
        return;
      }
      if (def.category === "special") {
        dispatch({ type: "PLAY_SPECIAL", cardUid: card.uid });
      }
    },
    [state, dispatch],
  );

  const resolveTarget = useCallback(
    (targetId: string) => {
      if (!pendingTarget) return;
      const def = getCardDef(pendingTarget.card.defId);
      if (pendingTarget.kind === "attack") {
        dispatch({ type: "PLAY_ATTACK", cardUid: pendingTarget.card.uid, targetId });
      } else if (def.special === "depassement") {
        dispatch({ type: "PLAY_SPECIAL", cardUid: pendingTarget.card.uid, targetId });
      }
      setPendingTarget(null);
    },
    [pendingTarget, dispatch],
  );

  const cancelTarget = useCallback(() => setPendingTarget(null), []);

  const discard = useCallback((card: CardInstance) => dispatch({ type: "DISCARD_CARD", cardUid: card.uid }), [dispatch]);

  return { draw, requestPlay, resolveTarget, cancelTarget, pendingTarget, discard };
}

export type GameControls = ReturnType<typeof useGameControls>;

export function useGameEngine(initialOptions: NewGameOptions) {
  const [state, dispatch] = useReducer(gameReducer, initialOptions, createGame);
  const controls = useGameControls(state, dispatch);

  const consumeAnimation = useCallback(() => dispatch({ type: "CLEAR_ANIMATION" }), []);
  const newGame = useCallback((options: NewGameOptions) => dispatch({ type: "NEW_GAME", options }), []);

  return { state, controls, consumeAnimation, newGame };
}
