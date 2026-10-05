"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { GameState, PlayerColor, PlayerState } from "@/game/types/game";
import { carFor, carThumb } from "@/game/lib/cars";

const COLOR_VAR: Record<PlayerColor, string> = {
  crimson: "var(--color-player-crimson)",
  azure: "var(--color-player-azure)",
  amber: "var(--color-player-amber)",
  emerald: "var(--color-player-emerald)",
  violet: "var(--color-player-violet)",
  rose: "var(--color-player-rose)",
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

/** Final order: the winner, then everyone else by distance covered. */
function standings(state: GameState) {
  const seats = state.players.map((p, seat) => ({ p, seat }));
  return seats.sort((a, b) => {
    if (a.p.id === state.winnerId) return -1;
    if (b.p.id === state.winnerId) return 1;
    return b.p.distance - a.p.distance || a.seat - b.seat;
  });
}

const STEPS = [
  { place: 1, height: "h-[5.5rem]", tone: "from-[#ffe58a] via-[#f5c542] to-[#b98a1c]", text: "text-[#4a3300]", delay: 0.75 },
  { place: 2, height: "h-16", tone: "from-[#f4f6fa] via-[#c9ced8] to-[#8d95a3]", text: "text-[#2c3340]", delay: 0.5 },
  { place: 3, height: "h-12", tone: "from-[#f3c39a] via-[#cd8a52] to-[#8a5329]", text: "text-[#3a1f0b]", delay: 0.25 },
];

function Podium({ ranked }: { ranked: { p: PlayerState; seat: number }[] }) {
  // second on the left, winner in the middle, third on the right
  const order = [1, 0, 2].filter((i) => ranked[i]);
  return (
    <div className="mb-3 flex items-end justify-center gap-1.5">
      {order.map((i) => {
        const { p, seat } = ranked[i];
        const step = STEPS[i];
        return (
          <div key={p.id} className="flex w-[31%] max-w-[8.5rem] flex-col items-center">
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: step.delay + 0.35 }}
              className="relative flex w-full flex-col items-center"
            >
              {i === 0 ? <span className="absolute -top-5 text-xl drop-shadow">👑</span> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={carThumb(carFor(p.car, seat), p.color)} alt="" width={240} height={160} draggable={false} className="-mb-1 h-auto w-full max-w-[5.75rem]" />
              <p className="w-full truncate px-0.5 font-hud text-sm font-bold" style={{ color: COLOR_VAR[p.color] }}>
                {p.name}
              </p>
              <p className="mb-1 font-hud text-[0.65rem] font-semibold text-white/60">{p.distance} km</p>
            </motion.div>
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: step.delay }}
              style={{ transformOrigin: "bottom" }}
              className={`flex w-full items-start justify-center rounded-t-lg bg-gradient-to-b pt-1 shadow-[inset_0_2px_0_rgba(255,255,255,0.6),0_8px_18px_rgba(0,0,0,0.4)] ${step.height} ${step.tone}`}
            >
              <span className={`font-display text-3xl leading-none ${step.text}`}>{step.place}</span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

export function VictoryOverlay({
  state,
  onReplay,
  replayHint,
  onNewGame,
  onMenu,
}: {
  state: GameState;
  /** Omitted when this device can't restart the game (online, not the host). */
  onReplay?: () => void;
  replayHint?: string;
  onNewGame: () => void;
  onMenu: () => void;
}) {
  const winner = state.players.find((p) => p.id === state.winnerId);
  const ranked = standings(state);
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
        className="panel-leather relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border-2 px-4 py-5 text-center sm:p-7"
        style={{ borderColor: COLOR_VAR[winner.color] }}
      >
        <p className="font-hud tracking-[0.4em] uppercase text-xs text-white/60">🏁 Victoire</p>
        <h2 className="font-display text-4xl sm:text-5xl mt-1 text-brand-shadow" style={{ color: COLOR_VAR[winner.color] }}>
          {winner.name.toUpperCase()}
        </h2>
        <p className="font-sans text-sm text-white/70 mb-6">remporte la partie KILOMAX</p>

        <Podium ranked={ranked} />

        {ranked.length > 3 ? (
          <ol className="mb-3 flex flex-col gap-1 text-left">
            {ranked.slice(3).map(({ p }, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4 + i * 0.1 }}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-0.5"
              >
                <span className="w-6 font-display text-lg text-white/50">{i + 4}</span>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR_VAR[p.color] }} />
                <span className="min-w-0 flex-1 truncate font-hud text-sm font-bold">{p.name}</span>
                <span className="font-hud text-xs text-white/60">{p.distance} km</span>
              </motion.li>
            ))}
          </ol>
        ) : null}

        {/* with a big table the ranking takes the room of the winner's stats */}
        {ranked.length <= 4 ? (
          <div className="grid grid-cols-3 gap-2 mb-4 text-left">
            <Stat label="Durée" value={`${minutes}m ${seconds}s`} />
            <Stat label="Cartes jouées" value={`${winner.cardsPlayed}`} />
            <Stat label="Attaques" value={`${winner.attacksSent}`} />
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {onReplay ? (
            <button className="btn-enroute-primary w-full" onClick={onReplay}>
              REJOUER
            </button>
          ) : replayHint ? (
            <p className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-hud text-sm text-white/70">{replayHint}</p>
          ) : null}
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
    <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
      <p className="font-hud text-[0.6rem] uppercase tracking-wider text-white/50">{label}</p>
      <p className="font-display text-lg text-[var(--color-paper)]">{value}</p>
    </div>
  );
}
