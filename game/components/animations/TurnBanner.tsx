"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PlayerState } from "@/game/types/game";

const COLOR_VAR: Record<PlayerState["color"], string> = {
  crimson: "var(--color-player-crimson)",
  azure: "var(--color-player-azure)",
  amber: "var(--color-player-amber)",
  emerald: "var(--color-player-emerald)",
};

export function TurnBanner({ player }: { player: PlayerState | null }) {
  return (
    <AnimatePresence>
      {player ? (
        <motion.div
          key={player.id + "-turn"}
          className="pointer-events-none fixed inset-x-0 top-6 z-40 flex justify-center px-4"
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 340, damping: 26 }}
        >
          <div
            className="rounded-2xl px-6 py-3 sm:px-10 sm:py-4 shadow-2xl border-2 backdrop-blur-sm"
            style={{
              background: "rgba(16,19,26,0.85)",
              borderColor: COLOR_VAR[player.color],
            }}
          >
            <p className="font-hud text-[0.65rem] sm:text-xs tracking-[0.35em] uppercase text-white/60 text-center">
              Au volant
            </p>
            <p
              className="font-display text-2xl sm:text-4xl tracking-wide text-center"
              style={{ color: COLOR_VAR[player.color] }}
            >
              TOUR DE {player.name.toUpperCase()}
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
