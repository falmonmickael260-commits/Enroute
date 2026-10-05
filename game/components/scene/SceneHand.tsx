"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { CardDef, CardInstance, GameState, PlayerState } from "@/game/types/game";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import {
  canPlayDistance,
  canPlaySpecial,
  hazardActive,
  hazardLabel,
  isCardPlayable,
  isRoadClear,
  MAX_SHIELDS,
} from "@/game/lib/engine/rules";
import { useElementSize } from "@/game/hooks/useElementSize";
import { Card, CATEGORY_STYLE } from "@/game/components/cards/Card";
import { CardArt } from "@/game/components/cards/CardArt";

/** Why a card can't be played right now, in the player's words. */
function whyNot(player: PlayerState, def: CardDef, state: GameState): string {
  const blocked = player.hazard ? `Vous êtes bloqué (${hazardLabel(player.hazard).toLowerCase()}) : réparez d'abord.` : null;
  if (def.category === "distance") {
    if (blocked) return blocked;
    if (player.limited && (def.value ?? 0) > 50) return "Radar : 50 km maximum par carte.";
    return "Impossible d'avancer maintenant.";
  }
  if (def.category === "attaque") {
    if (!isRoadClear(player)) return "Voiture arrêtée : impossible d'attaquer.";
    return "Aucun adversaire ne peut la recevoir : déjà bloqué ou protégé.";
  }
  if (def.category === "defense") {
    if (def.defense && player.shields.includes(def.defense)) return "Cette protection est déjà posée.";
    if (player.shields.length >= MAX_SHIELDS && !player.hazard && !player.limited)
      return `Maximum ${MAX_SHIELDS} protections à la fois : gardez-la pour réparer.`;
    if (player.hazard && def.counters && !hazardActive(player, def.counters))
      return `Ce n'est pas la bonne parade contre : ${hazardLabel(player.hazard).toLowerCase()}.`;
    return "Parade inutile pour l'instant.";
  }
  if (def.special === "derniereLigneDroite" && canPlayDistance(player, def, state.target))
    return `Seulement dans les 200 derniers km (dès ${state.target - 200} km).`;
  if (def.special === "depassement" && isRoadClear(player)) return "Aucun adversaire devant vous.";
  if (!canPlaySpecial(player, def, state)) return blocked ?? (player.limited ? "Radar : 50 km maximum par carte." : "Pas jouable maintenant.");
  return "Pas jouable maintenant.";
}

/**
 * Cards in a straight row. Each card carries a big index in its top-left
 * corner (value or icon on the category colour), so every card stays
 * recognisable even when they overlap on a small phone. Tapping one shows it
 * full size with its description and what you can do with it.
 */
function HandCard({ def, playable, dim, selected, onClick }: { def: CardDef; playable: boolean; dim: boolean; selected: boolean; onClick: () => void }) {
  const cat = CATEGORY_STYLE[def.category];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${def.title} — ${def.subtitle}`}
      aria-pressed={selected}
      className={clsx(
        "relative h-full w-full overflow-hidden rounded-xl border-2 text-left shadow-[0_8px_18px_rgba(0,0,0,0.5)] transition-[filter,border-color]",
        selected ? "border-[#ffd23f]" : playable ? "border-white" : "border-white/60",
        dim && "brightness-[0.55] saturate-[0.6]",
      )}
      style={{ background: `linear-gradient(165deg, ${cat.from}, ${cat.to})` }}
    >
      {/* big faint art in the body */}
      <div className="absolute inset-x-[18%] bottom-[24%] top-[26%] text-white/35">
        <CardArt def={def} />
      </div>
      {/* index corner: what matters, readable when cards overlap */}
      <div className="absolute left-[4px] top-[4px] flex w-[32px] flex-col items-center text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]">
        {def.value ? (
          <>
            <span className={clsx("font-display leading-[0.9]", def.value >= 100 ? "text-[1.4rem]" : "text-[1.7rem]")}>{def.value}</span>
            <span className="font-hud text-[0.6rem] font-bold leading-none">KM</span>
          </>
        ) : (
          <span className="block h-[30px] w-[30px]">
            <CardArt def={def} />
          </span>
        )}
      </div>
      {/* name band along the bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-white/95 px-1 py-[3px] text-center">
        <p className="truncate font-display text-[0.8rem] leading-none tracking-wide text-[#16130f]">{def.title}</p>
      </div>
      {playable ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#4cff8f] shadow-[0_0_8px_#4cff8f]" /> : null}
    </button>
  );
}

export function SceneHand({
  player,
  state,
  isMyTurn,
  onPlay,
  onDiscard,
  onDraw,
  middle,
}: {
  /** Shown between the piles (e.g. the overview button). */
  middle?: ReactNode;
  player: PlayerState;
  state: GameState;
  isMyTurn: boolean;
  onPlay: (card: CardInstance) => void;
  onDiscard: (card: CardInstance) => void;
  onDraw: () => void;
}) {
  const [rowRef, row] = useElementSize<HTMLDivElement>();
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const canAct = isMyTurn && state.phase === "action";
  const mustDraw = isMyTurn && state.phase === "draw";

  const cards = player.hand;
  const n = cards.length;
  const width = row.width || 360;
  // as big as the row allows, overlapping only as much as needed
  const cardW = Math.max(66, Math.min(96, (width - 8) / Math.max(1, Math.min(n, 4.6))));
  const step = n > 1 ? Math.min(cardW + 6, (width - cardW) / (n - 1)) : 0;
  const offset = (width - (step * (n - 1) + cardW)) / 2;

  const selected = cards.find((c) => c.uid === selectedUid) ?? null;
  const selectedDef = selected ? getCardDef(selected.defId) : null;
  const selectedPlayable = selected && canAct ? isCardPlayable(player, selected.defId, state) : false;
  const top = state.discard[state.discard.length - 1];

  const close = () => setSelectedUid(null);

  return (
    <div className="relative">
      {/* full-size preview of the tapped card */}
      <AnimatePresence>
        {selected && selectedDef ? (
          <motion.div
            key={selected.uid}
            className="absolute inset-x-0 bottom-full z-[60] mb-2 flex justify-center px-3"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            <div className="flex w-full max-w-sm items-stretch gap-3 rounded-3xl border border-white/15 bg-[#0e1522]/92 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md">
              <Card size="lg" defId={selectedDef.id} className="!h-[168px] !w-[112px] shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-2xl leading-none tracking-wide text-white">{selectedDef.title}</p>
                  <button onClick={close} aria-label="Fermer" className="-mr-1 -mt-1 h-8 w-8 shrink-0 rounded-full bg-white/10 text-white/80">
                    ✕
                  </button>
                </div>
                <p className="mt-1 font-hud text-sm leading-snug text-white/75">{selectedDef.subtitle}</p>
                <p
                  className={clsx(
                    "mt-auto rounded-lg px-2 py-1 font-hud text-xs font-semibold leading-snug",
                    selectedPlayable ? "bg-[#1f7a45]/40 text-[#9dffc4]" : "bg-white/8 text-[#ffb3a8]",
                  )}
                >
                  {!isMyTurn
                    ? "Ce n'est pas votre tour."
                    : mustDraw
                      ? "Piochez d'abord une carte."
                      : selectedPlayable
                        ? "Jouable maintenant ✓"
                        : whyNot(player, selectedDef, state)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={!selectedPlayable}
                    onClick={() => {
                      onPlay(selected);
                      close();
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-b from-[#3fd06b] to-[#1f9a47] px-2 py-2.5 font-display text-lg tracking-wide text-white shadow-[0_4px_0_#136a30,0_8px_16px_rgba(0,0,0,0.35)] disabled:from-[#5b6270] disabled:to-[#434955] disabled:text-white/60 disabled:shadow-none"
                  >
                    ▶ JOUER CETTE CARTE
                  </button>
                  <button
                    disabled={!canAct}
                    onClick={() => {
                      onDiscard(selected);
                      close();
                    }}
                    className="rounded-xl border border-white/25 bg-white/10 px-3 font-hud text-sm font-bold text-white disabled:opacity-40"
                  >
                    Défausser
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* piles and prompt */}
      <div className="flex items-end justify-between gap-1.5 px-2 pb-1.5 min-[400px]:px-3">
        <button
          type="button"
          aria-label="Piocher une carte"
          disabled={!mustDraw}
          onClick={onDraw}
          className={clsx(
            "flex shrink-0 items-center gap-2 rounded-2xl border-2 px-2 py-1.5 transition-all min-[400px]:gap-2.5 min-[400px]:px-2.5",
            mustDraw ? "animate-pulse border-[#ffd23f] bg-[#ffd23f]/20 shadow-[0_0_22px_rgba(255,210,63,0.55)]" : "border-white/15 bg-black/45",
          )}
        >
          <span className="relative h-[4.3rem] w-[3rem] shrink-0">
            <span className="absolute inset-0 translate-x-[3px] -translate-y-[3px] opacity-70">
              <Card size="xs" faceDown className="!h-full !w-full" />
            </span>
            <span className="absolute inset-0">
              <Card size="xs" faceDown className="!h-full !w-full" />
            </span>
          </span>
          <span className="text-left leading-tight">
            <span className="block font-display text-xl text-white min-[400px]:text-2xl">{mustDraw ? "PIOCHER" : "Pioche"}</span>
            <span className="block font-hud text-xs text-white/65">{state.deck.length} cartes</span>
          </span>
        </button>
        <div className="mb-0.5 flex min-w-0 flex-col items-center gap-1">
          {middle}
          <p className="font-hud text-[0.7rem] font-semibold text-white/70">
            {mustDraw ? "↖ Touchez la pioche" : canAct ? "Touchez une carte" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-white/15 bg-black/45 px-2 py-1.5 min-[400px]:px-2.5">
          <span className="text-right leading-tight">
            <span className="block font-display text-lg text-white">Défausse</span>
            <span className="block font-hud text-xs text-white/65">{state.discard.length} cartes</span>
          </span>
          <span className="h-[3.2rem] w-[2.2rem] shrink-0">
            {top ? <Card size="xs" defId={top.defId} className="!h-full !w-full" /> : <span className="block h-full w-full rounded-md border-2 border-dashed border-white/25" />}
          </span>
        </div>
      </div>

      {/* the hand */}
      <div ref={rowRef} className="relative mx-2 mb-2" style={{ height: cardW * 1.42 + 14 }}>
        {cards.map((c, i) => {
          const def = getCardDef(c.defId);
          const playable = canAct && isCardPlayable(player, c.defId, state);
          const isSel = c.uid === selectedUid;
          return (
            <motion.div
              key={c.uid}
              className="absolute bottom-0"
              style={{ width: cardW, height: cardW * 1.42, zIndex: isSel ? 40 : i }}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, x: offset + i * step, y: isSel ? -14 : 0, scale: isSel ? 1.06 : 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <HandCard def={def} playable={playable} dim={canAct && !playable} selected={isSel} onClick={() => setSelectedUid(isSel ? null : c.uid)} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
