"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { AnimationEvent, GameState } from "@/game/types/game";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import { hazardLabel } from "@/game/lib/engine/rules";

function describe(event: AnimationEvent, state: GameState): { text: string; tone: "attack" | "good" | "info" } | null {
  const player = (id: string) => state.players.find((p) => p.id === id)?.name ?? "";
  switch (event.kind) {
    case "hazard":
      return { text: `${player(event.playerId)} — ${hazardLabel(event.hazard).toUpperCase()} !`, tone: "attack" };
    case "shield":
      return {
        text: `${player(event.playerId)} — ${getCardDef(event.defense).title} !`,
        tone: "good",
      };
    case "move":
      return { text: `+${event.to - event.from} km`, tone: "info" };
    default:
      return null;
  }
}

export function EventToast({ event, state }: { event: AnimationEvent | null; state: GameState }) {
  const info = event ? describe(event, state) : null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center">
      <AnimatePresence>
        {info ? (
          <motion.div
            key={event?.id ?? "none"}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: -6, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className={
              "rounded-full px-4 py-1.5 text-xs sm:text-sm font-hud font-semibold tracking-wide shadow-lg border " +
              (info.tone === "attack"
                ? "bg-[var(--color-brand-crimson)]/90 border-white/30 text-white"
                : info.tone === "good"
                  ? "bg-[var(--color-player-emerald)]/90 border-white/30 text-white"
                  : "bg-[var(--color-brand-gold)]/90 border-white/30 text-[var(--color-brand-ink)]")
            }
          >
            {info.text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
