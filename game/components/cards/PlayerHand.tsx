"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CardInstance, GameState, PlayerState } from "@/game/types/game";
import { isCardPlayable } from "@/game/lib/engine/rules";
import { Card } from "./Card";

export function PlayerHand({
  player,
  state,
  isMyTurn,
  onPlay,
  onDiscard,
}: {
  player: PlayerState;
  state: GameState;
  isMyTurn: boolean;
  onPlay: (card: CardInstance) => void;
  onDiscard: (card: CardInstance) => void;
}) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const canAct = isMyTurn && state.phase === "action";

  const playability = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const c of player.hand) {
      map.set(c.uid, canAct ? isCardPlayable(player, c.defId, state) : false);
    }
    return map;
  }, [player, state, canAct]);

  const selectedCard = player.hand.find((c) => c.uid === selectedUid) ?? null;
  const selectedPlayable = selectedCard ? (playability.get(selectedCard.uid) ?? false) : false;
  const count = player.hand.length;

  return (
    <div className="relative w-full flex flex-col items-center pb-2 md:pb-4">
      <AnimatePresence>
        {selectedCard ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="relative mb-3 flex items-center gap-3 z-[60]"
          >
            <button
              className="btn-enroute-primary !text-base !py-2 !px-6"
              onClick={() => {
                onPlay(selectedCard);
                setSelectedUid(null);
              }}
              disabled={!selectedPlayable}
              title={selectedPlayable ? undefined : "Cette carte n'est pas jouable dans cette situation"}
            >
              JOUER
            </button>
            <button
              className="btn-enroute-ghost !text-sm !py-2 !px-4"
              onClick={() => {
                onDiscard(selectedCard);
                setSelectedUid(null);
              }}
              disabled={!canAct}
            >
              Défausser
            </button>
            <button
              className="btn-enroute-ghost !text-sm !py-2 !px-4"
              onClick={() => setSelectedUid(null)}
            >
              Annuler
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative flex items-end justify-center h-32 sm:h-40 md:h-48 w-full max-w-3xl mx-auto">
        {player.hand.map((c, i) => {
          const mid = (count - 1) / 2;
          const offset = i - mid;
          const rotate = offset * 6;
          const translateY = Math.abs(offset) * 6;
          const translateX = offset * (count > 6 ? 26 : 34);
          const isSelected = selectedUid === c.uid;
          const playable = playability.get(c.uid) ?? false;

          return (
            <motion.div
              key={c.uid}
              layoutId={`hand-${c.uid}`}
              className="absolute origin-bottom"
              style={{ zIndex: isSelected ? 50 : i }}
              animate={{
                rotate: isSelected ? 0 : rotate,
                x: translateX,
                y: isSelected ? translateY - 26 : translateY,
                scale: isSelected ? 1.08 : 1,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <Card
                size="lg"
                defId={c.defId}
                disabled={!canAct}
                selected={isSelected}
                highlight={playable && canAct && !isSelected}
                onClick={() => setSelectedUid(isSelected ? null : c.uid)}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
