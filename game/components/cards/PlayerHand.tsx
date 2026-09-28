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
    <div className="relative flex w-full flex-col items-center">
      {/* Floats above the fan so selecting a card never shifts the layout. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-full z-[60] mb-1 flex justify-center">
      <AnimatePresence>
        {selectedCard ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="panel-leather pointer-events-auto flex items-center gap-2 rounded-2xl p-2 sm:gap-3"
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
      </div>

      <div className="relative mx-auto flex h-40 w-full max-w-3xl origin-bottom scale-[0.74] items-end justify-center pb-2 sm:h-[13rem] sm:scale-100 sm:pb-4">
        {player.hand.map((c, i) => {
          const mid = (count - 1) / 2;
          const offset = i - mid;
          const rotate = offset * 5;
          const translateY = offset * offset * 0.9;
          const translateX = offset * (count > 7 ? 44 : 54);
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
