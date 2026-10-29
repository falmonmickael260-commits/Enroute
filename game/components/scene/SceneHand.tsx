"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { CardDef, CardInstance, GameState, PlayerState } from "@/game/types/game";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import { STUCK_TURNS_LIMIT } from "@/game/lib/engine/deck";
import {
  canPlayDistance,
  canPlaySpecial,
  hazardActive,
  hazardLabel,
  isRoadClear,
  MAX_SHIELDS,
} from "@/game/lib/engine/rules";
import { canOfferCard as isCardPlayable } from "@/game/lib/cardAffordance";
import { useElementSize } from "@/game/hooks/useElementSize";
import { useShortLandscape } from "@/game/hooks/useShortLandscape";
import { Card, CATEGORY_STYLE } from "@/game/components/cards/Card";
import { CardArt } from "@/game/components/cards/CardArt";
import { CardIllustration } from "@/game/components/cards/CardIllustration";

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
      return MAX_SHIELDS === 1
        ? "Une seule protection à la fois : gardez-la pour réparer."
        : `Maximum ${MAX_SHIELDS} protections à la fois : gardez-la pour réparer.`;
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
      data-card-id={def.id}
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
      <div className="absolute inset-0">
        <CardIllustration def={def} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75" />
      </div>
      {/* index corner: what matters, readable when cards overlap */}
      <div className="absolute left-[4px] top-[4px] flex w-[32px] flex-col items-center rounded-md bg-black/65 py-1 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]">
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
      <div className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-[#0b1422]/95 px-1 py-[5px] text-center">
        <p className="truncate font-display text-[0.8rem] leading-none tracking-wide text-white">{def.title}</p>
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
  // the card just played flies from the hand up onto the road
  const previewRef = useRef<HTMLDivElement>(null);
  const [flying, setFlying] = useState<{ key: string; defId: string; x: number; y: number; w: number; h: number } | null>(null);
  const canAct = isMyTurn && state.phase === "action";
  const mustDraw = isMyTurn && state.phase === "draw";
  // phone held sideways: piles beside the cards, all on one low row
  const short = useShortLandscape();

  const cards = player.hand;
  const n = cards.length;
  const width = row.width || 360;
  // as big as the row allows, overlapping only as much as needed (and low enough
  // to leave the road in view when the screen has little height)
  const cardW = short
    ? Math.max(50, Math.min(68, (width - 8) / Math.max(1, Math.min(n, 5.5))))
    : Math.max(66, Math.min(96, (width - 8) / Math.max(1, Math.min(n, 4.6))));
  const step = n > 1 ? Math.min(cardW + 6, (width - cardW) / (n - 1)) : 0;
  const offset = (width - (step * (n - 1) + cardW)) / 2;

  // stopped: how many draws until the guaranteed repair (anti-blocage)
  const rescueIn = player.hazard ? Math.max(1, STUCK_TURNS_LIMIT + 1 - (player.blockedTurns ?? 0)) : 0;

  const selected = cards.find((c) => c.uid === selectedUid) ?? null;
  const selectedDef = selected ? getCardDef(selected.defId) : null;
  const selectedPlayable = selected && canAct ? isCardPlayable(player, selected.defId, state) : false;
  const top = state.discard[state.discard.length - 1];

  const close = () => setSelectedUid(null);

  const drawPile = (
    <button
      type="button"
      aria-label="Piocher une carte"
      disabled={!mustDraw}
      onClick={onDraw}
      className={clsx(
        "flex shrink-0 items-center rounded-2xl border-2 transition-all",
        short ? "flex-col gap-0.5 px-1.5 py-1" : "gap-2 px-2 py-1.5 min-[400px]:gap-2.5 min-[400px]:px-2.5",
        mustDraw ? "animate-pulse border-[#ffd23f] bg-[#ffd23f]/20 shadow-[0_0_22px_rgba(255,210,63,0.55)]" : "border-white/15 bg-black/45",
      )}
    >
      <span className={clsx("relative shrink-0", short ? "h-[3.4rem] w-[2.4rem]" : "h-[4.3rem] w-[3rem]")}>
        <span className="absolute inset-0 translate-x-[3px] -translate-y-[3px] opacity-70">
          <Card size="xs" faceDown className="!h-full !w-full" />
        </span>
        <span className="absolute inset-0">
          <Card size="xs" faceDown className="!h-full !w-full" />
        </span>
      </span>
      <span className={clsx("leading-tight", short ? "text-center" : "text-left")}>
        <span className={clsx("block font-display text-white", short ? "text-base" : "text-xl min-[400px]:text-2xl")}>{mustDraw ? "PIOCHER" : "Pioche"}</span>
        <span className={clsx("block font-hud text-white/65", short ? "text-[0.6rem]" : "text-xs")}>{state.deck.length} cartes</span>
      </span>
    </button>
  );

  const discardPile = (
    <div
      className={clsx(
        "flex shrink-0 items-center gap-2 rounded-2xl border-2 border-white/15 bg-black/45",
        short ? "flex-col-reverse gap-0.5 px-1.5 py-1" : "px-2 py-1.5 min-[400px]:px-2.5",
      )}
    >
      <span className={clsx("leading-tight", short ? "text-center" : "text-right")}>
        <span className={clsx("block font-display text-white", short ? "text-base" : "text-lg")}>Défausse</span>
        <span className={clsx("block font-hud text-white/65", short ? "text-[0.6rem]" : "text-xs")}>{state.discard.length} cartes</span>
      </span>
      <span className={clsx("shrink-0", short ? "h-[3rem] w-[2.1rem]" : "h-[3.2rem] w-[2.2rem]")}>
        {top ? <Card size="xs" defId={top.defId} className="!h-full !w-full" /> : <span className="block h-full w-full rounded-md border-2 border-dashed border-white/25" />}
      </span>
    </div>
  );

  const prompt = (
    <>
      <p className="text-center font-hud text-[0.7rem] font-semibold leading-tight text-white/70">
        {mustDraw ? (short ? "← Touchez la pioche" : "↖ Touchez la pioche") : canAct ? "Touchez une carte" : ""}
      </p>
      {isMyTurn && rescueIn ? (
        <p className="text-center font-hud text-[0.66rem] font-bold leading-tight text-[#ffb3a8]">
          {rescueIn === 1 ? "Dépannage garanti à cette pioche" : `Dépannage garanti dans ${rescueIn} pioches`}
        </p>
      ) : null}
    </>
  );

  const hand = (
    <div ref={rowRef} className={clsx("relative", short ? "mb-0.5 mt-1" : "mx-2 mb-2")} style={{ height: cardW * 1.42 + (short ? 8 : 14) }}>
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
  );

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
              <div ref={previewRef} className="shrink-0">
                <Card size="lg" defId={selectedDef.id} className="!h-[168px] !w-[112px]" />
              </div>
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
                      const r = previewRef.current?.getBoundingClientRect();
                      if (r) setFlying({ key: selected.uid, defId: selected.defId, x: r.left, y: r.top, w: r.width, h: r.height });
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

      {short ? (
        // sideways: hint and overview button float above, piles flank the cards
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-full mb-1 flex justify-center">
            <div className="pointer-events-auto flex flex-col items-center gap-1">{middle}</div>
          </div>
          <div className="flex items-end gap-2 px-2 pb-1">
            {drawPile}
            <div className="flex min-w-0 flex-1 flex-col">
              {prompt}
              {hand}
            </div>
            {discardPile}
          </div>
        </>
      ) : (
        <>
          {/* piles and prompt */}
          <div className="flex items-end justify-between gap-1.5 px-2 pb-1.5 min-[400px]:px-3">
            {drawPile}
            <div className="mb-0.5 flex min-w-0 flex-col items-center gap-1">
              {middle}
              {prompt}
            </div>
            {discardPile}
          </div>
          {hand}
        </>
      )}
      {flying && typeof document !== "undefined"
        ? createPortal(
            <motion.div
              key={flying.key}
              className="pointer-events-none fixed left-0 top-0 z-[70]"
              style={{ width: flying.w, height: flying.h }}
              initial={{ x: flying.x, y: flying.y, scale: 1, rotate: 0, opacity: 1 }}
              animate={{
                x: window.innerWidth / 2 - flying.w / 2,
                y: window.innerHeight * 0.32 - flying.h / 2,
                scale: [1, 1.12, 0.35],
                rotate: [0, -6, 10],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.75, ease: [0.3, 0.7, 0.4, 1] }}
              onAnimationComplete={() => setFlying((f) => (f?.key === flying.key ? null : f))}
            >
              <Card size="lg" defId={flying.defId} className="!h-full !w-full shadow-[0_0_30px_rgba(255,220,120,0.7)]" />
            </motion.div>,
            document.body,
          )
        : null}
    </div>
  );
}
