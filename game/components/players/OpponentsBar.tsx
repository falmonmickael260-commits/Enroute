"use client";

import clsx from "clsx";
import type { GameState, PlayerState } from "@/game/types/game";
import { displayHazard, hazardLabel } from "@/game/lib/engine/rules";

const COLOR_VAR: Record<PlayerState["color"], string> = {
  crimson: "var(--color-player-crimson)",
  azure: "var(--color-player-azure)",
  amber: "var(--color-player-amber)",
  emerald: "var(--color-player-emerald)",
};

export function OpponentsBar({ state }: { state: GameState }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 py-1 w-full">
      {state.players.map((p, i) => {
        const isCurrent = i === state.currentPlayerIndex;
        const hazard = displayHazard(p);
        return (
          <div
            key={p.id}
            className={clsx(
              "flex items-center gap-2 rounded-xl px-3 py-2 border shrink-0 transition-all",
              isCurrent ? "bg-white/10 border-white/40 shadow-lg" : "bg-white/5 border-white/10 opacity-80",
            )}
          >
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ background: COLOR_VAR[p.color], boxShadow: isCurrent ? `0 0 0 3px ${COLOR_VAR[p.color]}33` : undefined }}
            />
            <div className="min-w-0">
              <p className="font-hud text-xs font-semibold text-[var(--color-paper)] truncate max-w-[6.5rem]">
                {p.name}
              </p>
              <p className="text-[0.65rem] text-white/50 font-hud tracking-wide">
                {p.distance}/{state.target} km · {p.hand.length} cartes
              </p>
            </div>
            {hazard ? (
              <span
                title={hazardLabel(hazard)}
                className={clsx(
                  "ml-1 w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] shrink-0",
                  p.hazard ? "bg-[var(--color-brand-crimson)]/90" : "bg-[var(--color-brand-gold)]/90 text-[var(--color-brand-ink)]",
                )}
              >
                !
              </span>
            ) : p.shields.length > 0 ? (
              <span className="ml-1 text-[0.6rem] font-hud text-[var(--color-player-emerald)] shrink-0">
                🛡{p.shields.length}
              </span>
            ) : null}
            {p.finished ? <span className="ml-1 text-sm">🏁</span> : null}
          </div>
        );
      })}
    </div>
  );
}
