"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { GameState } from "@/game/types/game";

const COLOR_VAR: Record<string, string> = {
  crimson: "var(--color-player-crimson)",
  azure: "var(--color-player-azure)",
  amber: "var(--color-player-amber)",
  emerald: "var(--color-player-emerald)",
};

function Confetti() {
  // Randomized once via a lazy initializer (not on every render) — this is a
  // one-shot decorative layout, not a value React needs to keep pure across renders.
  const [pieces] = useState(() =>
    Array.from({ length: 42 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2.6 + Math.random() * 1.8,
      color: [
        "var(--color-brand-gold)",
        "var(--color-brand-crimson)",
        "var(--color-player-azure)",
        "var(--color-player-emerald)",
        "#ffffff",
      ][i % 5],
      rotate: Math.random() * 360,
    })),
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-[-5%] block w-2 h-3 rounded-sm"
          style={{ left: `${p.left}%`, background: p.color }}
          initial={{ y: "-10%", opacity: 0, rotate: 0 }}
          animate={{ y: "115%", opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ delay: p.delay, duration: p.duration, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

export function VictoryOverlay({
  state,
  onReplay,
  onNewGame,
  onMenu,
}: {
  state: GameState;
  onReplay: () => void;
  onNewGame: () => void;
  onMenu: () => void;
}) {
  const winner = state.players.find((p) => p.id === state.winnerId);
  // Captured once, when the overlay first mounts for this victory — not recomputed on re-render.
  const [elapsedMs] = useState(() => Date.now() - state.startedAt);
  if (!winner) return null;
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "radial-gradient(circle at 50% 30%, rgba(20,22,28,0.85), rgba(10,11,15,0.97))" }}
    >
      <Confetti />
      <motion.div
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.15 }}
        className="panel-leather relative z-10 w-full max-w-md rounded-3xl border-2 p-6 text-center sm:p-8"
        style={{ borderColor: COLOR_VAR[winner.color] }}
      >
        <div className="flex justify-center gap-1 mb-3 text-2xl">🏁</div>
        <p className="font-hud tracking-[0.4em] uppercase text-xs text-white/60">Victoire</p>
        <h2 className="font-display text-4xl sm:text-5xl mt-1 mb-1 text-brand-shadow" style={{ color: COLOR_VAR[winner.color] }}>
          {winner.name.toUpperCase()}
        </h2>
        <p className="font-sans text-sm text-white/70 mb-6">remporte la partie EN ROUTE</p>

        <div className="grid grid-cols-2 gap-3 mb-7 text-left">
          <Stat label="Distance" value={`${winner.distance} km`} />
          <Stat label="Durée" value={`${minutes}m ${seconds}s`} />
          <Stat label="Cartes jouées" value={`${winner.cardsPlayed}`} />
          <Stat label="Attaques envoyées" value={`${winner.attacksSent}`} />
          <Stat label="Boucliers posés" value={`${winner.shieldsPlayed}`} />
          <Stat label="Attaques subies" value={`${winner.attacksSurvived}`} />
        </div>

        <div className="flex flex-col gap-3">
          <button className="btn-enroute-primary w-full" onClick={onReplay}>
            REJOUER
          </button>
          <div className="flex gap-3">
            <button className="btn-enroute-secondary flex-1 !text-base" onClick={onNewGame}>
              NOUVELLE PARTIE
            </button>
            <button className="btn-enroute-ghost flex-1 !text-base" onClick={onMenu}>
              MENU
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
      <p className="font-hud text-[0.6rem] uppercase tracking-wider text-white/50">{label}</p>
      <p className="font-display text-lg text-[var(--color-paper)]">{value}</p>
    </div>
  );
}
