"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { GameState, PlayerState } from "@/game/types/game";
import { canPlayAttack, canPlaySpecial } from "@/game/lib/engine/rules";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import type { PendingTarget } from "@/game/hooks/useGameEngine";

const COLOR_VAR: Record<PlayerState["color"], string> = {
  crimson: "var(--color-player-crimson)",
  azure: "var(--color-player-azure)",
  amber: "var(--color-player-amber)",
  emerald: "var(--color-player-emerald)",
  violet: "var(--color-player-violet)",
  rose: "var(--color-player-rose)",
};

export function TargetPicker({
  pending,
  state,
  onPick,
  onCancel,
}: {
  pending: PendingTarget | null;
  state: GameState;
  onPick: (targetId: string) => void;
  onCancel: () => void;
}) {
  if (!pending) return null;
  const actor = state.players[state.currentPlayerIndex];
  const def = getCardDef(pending.card.defId);

  const candidates = state.players.filter((p) => {
    if (p.id === actor.id) return false;
    if (pending.kind === "attack") return canPlayAttack(actor, p, def, state.target);
    return canPlaySpecial(actor, def, state, p.id);
  });

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          // never taller than the screen; a phone held sideways gets two columns
          className="panel-leather max-h-full w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl p-5 [@media(orientation:landscape)_and_(max-height:520px)]:max-w-xl [@media(orientation:landscape)_and_(max-height:520px)]:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-hud text-xs uppercase tracking-widest text-white/60 mb-1">
            {def.title}
          </p>
          <p className="font-display text-xl mb-4 text-[var(--color-paper)] [@media(orientation:landscape)_and_(max-height:520px)]:mb-2">Choisissez une cible</p>
          <div className="mb-4 grid grid-cols-1 gap-2 [@media(orientation:landscape)_and_(max-height:520px)]:mb-3 [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-2">
            {candidates.length === 0 ? (
              <p className="text-sm text-white/60">Aucune cible valable pour le moment.</p>
            ) : (
              candidates.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick(p.id)}
                  className="flex items-center justify-between rounded-xl border border-white/10 hover:border-white/40 bg-white/5 hover:bg-white/10 px-4 py-3 transition-colors [@media(orientation:landscape)_and_(max-height:520px)]:py-2"
                >
                  <span className="flex items-center gap-2 font-hud font-semibold text-[var(--color-paper)]">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ background: COLOR_VAR[p.color] }}
                    />
                    {p.name}
                  </span>
                  <span className="text-sm text-white/60">{p.distance} km</span>
                </button>
              ))
            )}
          </div>
          <button className="btn-enroute-ghost w-full !text-sm" onClick={onCancel}>
            Annuler
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
