"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CardInstance, GameState, PlayerState } from "@/game/types/game";
import { isCardPlayable } from "@/game/lib/engine/rules";
import { Card } from "./Card";

// "lg" card box, in CSS px before the fan's scale.
const CARD_W = 128;
const CARD_H = 192;

/**
 * Width of the fan container and the scale CSS applies to it (--fan-scale),
 * which together give the room the cards have, in unscaled pixels.
 */
function useFanRoom() {
  const [room, setRoom] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const measure = () => {
      const scale = parseFloat(getComputedStyle(node).getPropertyValue("--fan-scale")) || 1;
      const next = Math.round(node.clientWidth / scale);
      setRoom((prev) => (prev === next ? prev : next));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    observerRef.current = ro;
  }, []);
  return [ref, room] as const;
}

/**
 * Spacing and tilt of the fan so the outermost cards, rotated, still fit the
 * screen: a full desktop fan, a tighter and flatter one on narrow phones.
 */
function fanGeometry(count: number, room: number) {
  const mid = (count - 1) / 2;
  let rotStep = 5;
  let step = count > 7 ? 44 : 54;
  if (count > 1 && room > 0) {
    rotStep = Math.min(5, 24 / (count - 1));
    const tilt = (mid * rotStep * Math.PI) / 180;
    // Outer cards swing out by their height × sin(tilt) around the bottom pivot.
    const swing = CARD_H * Math.sin(tilt) + (CARD_W / 2) * (1 - Math.cos(tilt));
    const fit = (room - CARD_W - 2 * swing - 12) / (count - 1);
    step = Math.max(16, Math.min(step, fit));
  }
  return { mid, rotStep, step };
}

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
  const [fanRef, room] = useFanRoom();
  const { mid, rotStep, step } = fanGeometry(count, room);

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

      <div ref={fanRef} className="hand-fan relative mx-auto flex w-full max-w-3xl items-end justify-center pb-6">
        {player.hand.map((c, i) => {
          const offset = i - mid;
          const rotate = offset * rotStep;
          const translateY = offset * offset * 0.9 * (rotStep / 5);
          const translateX = offset * step;
          const isSelected = selectedUid === c.uid;
          const playable = playability.get(c.uid) ?? false;

          return (
            <motion.div
              key={c.uid}
              // No layoutId/layout here: the fan sits in a CSS-scaled container, where
              // framer's layout projection mis-measures and makes every card jump
              // whenever anything on the page re-renders.
              className="absolute origin-bottom"
              style={{ zIndex: isSelected ? 50 : i }}
              initial={{ opacity: 0, y: 90, rotate: 0 }}
              animate={{
                opacity: 1,
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
