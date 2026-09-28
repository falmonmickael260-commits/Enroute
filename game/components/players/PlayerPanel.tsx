"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import type { DefenseType, GameState, HazardType, PlayerState } from "@/game/types/game";
import { hazardLabel } from "@/game/lib/engine/rules";
import { DefenseGlyph } from "@/game/components/cards/CardArt";
import { PLAYER_COLOR } from "./PlayerPiece";

const DEFENSES: { id: DefenseType; label: string }[] = [
  { id: "reparation", label: "Réparation" },
  { id: "roueSecours", label: "Roue de secours" },
  { id: "pleinEssence", label: "Plein d'essence" },
  { id: "gps", label: "GPS" },
  { id: "passageLibre", label: "Passage libre" },
];

const SHORT_HAZARD: Record<HazardType, string> = {
  collision: "Collision",
  crevaison: "Crevé",
  panne: "Panne",
  radar: "Radar",
  barrage: "Barrage",
};

function StatusChip({ player }: { player: PlayerState }) {
  if (player.hazard) {
    return (
      <span
        title={hazardLabel(player.hazard)}
        className="rounded-full bg-[var(--color-brand-crimson)] px-1.5 py-px font-hud text-[0.6rem] font-bold uppercase tracking-wide text-white"
      >
        {SHORT_HAZARD[player.hazard]}
      </span>
    );
  }
  if (player.limited) {
    return (
      <span
        title="Limité à 50 km par carte"
        className="rounded-full border-2 border-[var(--color-brand-crimson)] bg-white px-1 font-hud text-[0.6rem] font-bold text-[#14161c]"
      >
        50
      </span>
    );
  }
  return (
    <span title="Route libre" className="font-hud text-[0.7rem] font-bold text-emerald-300">
      ✓
    </span>
  );
}

function PlayerPlaque({
  player,
  number,
  state,
  active,
  isViewer,
  offline,
}: {
  player: PlayerState;
  number: number;
  state: GameState;
  active: boolean;
  isViewer: boolean;
  offline: boolean;
}) {
  const color = PLAYER_COLOR[player.color];
  const pct = Math.min(100, (player.distance / state.target) * 100);
  return (
    <motion.div
      layout
      className={clsx(
        "player-plaque panel-leather relative rounded-2xl px-3 py-2 transition-opacity",
        offline && "opacity-60",
        active && "ring-2 ring-[var(--color-brass-300)]/80",
      )}
      style={active ? { boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 0 28px ${color}55, 0 18px 40px rgba(0,0,0,0.5)` } : undefined}
    >
      <div className="flex items-center gap-2">
        <span
          className="plaque-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-base text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]"
          style={{ background: color }}
        >
          {number}
        </span>
        <span className="min-w-0 flex-1 truncate font-hud text-[0.95rem] font-bold text-[var(--color-paper)]">
          {player.name}
          {isViewer ? <span className="ml-1 font-semibold text-white/45">(vous)</span> : null}
        </span>
        {offline ? (
          <span
            title="Déconnecté"
            className="plaque-offline shrink-0 rounded bg-black/50 px-1.5 py-px font-hud text-[0.55rem] font-bold uppercase tracking-widest text-[#ff8a7e]"
          >
            Hors ligne
          </span>
        ) : null}
        {active ? (
          <span className="plaque-tag brass-plate shrink-0 rounded px-1.5 py-px font-hud text-[0.55rem] font-bold uppercase tracking-widest">
            Au volant
          </span>
        ) : null}
      </div>

      <div className="plaque-bar mt-2 h-2 overflow-hidden rounded-full bg-black/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, #fff5)` }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.5, 0, 0.2, 1] }}
        />
      </div>
      <div className="plaque-meta mt-1 flex items-center justify-between gap-2 font-hud text-[0.7rem] text-white/60">
        <span className="whitespace-nowrap">
          <span className="font-bold text-[var(--color-paper)]">{player.distance}</span>
          <span className="plaque-target"> / {state.target}</span> km
        </span>
        <span className="flex items-center gap-2">
          <StatusChip player={player} />
          <span title="Cartes en main" className="flex items-center gap-1">
            <span className="inline-block h-3 w-2 rounded-[2px] border border-[var(--color-brass-300)]/70 bg-[#2a1712]" />
            {player.hand.length}
          </span>
        </span>
      </div>

      <div className="plaque-shields mt-1.5">
        <div className="flex gap-1" aria-label="Protections">
          {DEFENSES.map((d) => {
            const owned = player.shields.includes(d.id);
            return (
              <span
                key={d.id}
                title={`${d.label}${owned ? " — immunisé" : ""}`}
                className={clsx(
                  "flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded p-[2px]",
                  owned ? "bg-[var(--color-player-emerald)] text-white shadow-[0_0_8px_rgba(62,171,111,0.6)]" : "bg-white/5 text-white/20",
                )}
              >
                <DefenseGlyph defense={d.id} />
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export function PlayerPanel({
  state,
  viewerId,
  offlineIds,
}: {
  state: GameState;
  viewerId?: string;
  offlineIds?: readonly string[];
}) {
  const activeId = state.phase === "gameover" ? state.winnerId : state.players[state.currentPlayerIndex]?.id;
  return (
    <div className="player-panel no-scrollbar w-full px-1 py-1">
      {state.players.map((p, i) => (
        <PlayerPlaque
          key={p.id}
          player={p}
          number={i + 1}
          state={state}
          active={p.id === activeId}
          isViewer={p.id === viewerId}
          offline={offlineIds?.includes(p.id) ?? false}
        />
      ))}
    </div>
  );
}
