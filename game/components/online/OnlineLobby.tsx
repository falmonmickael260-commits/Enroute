"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { AMBIANCES } from "@/game/lib/ambiances";
import type { RoomMeta } from "@/game/hooks/useOnlineRoom";
import { PLAYER_COLOR } from "@/game/components/players/PlayerPiece";
import { MAX_PLAYERS } from "@/game/lib/engine/deck";
import { InnerPage, SectionLabel } from "@/game/components/ui/InnerPage";
import { CarPicker } from "@/game/components/ui/CarPicker";
import { carFor, carInfo, carThumb } from "@/game/lib/cars";

function ShareButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/play/online/${code}`;
    const text = `Rejoins ma partie KILOMAX avec le code ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "KILOMAX", text, url });
        return;
      }
    } catch {
      // cancelled or unsupported: fall back to the clipboard
    }
    try {
      await navigator.clipboard.writeText(`${text} : ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copiez ce lien :", url);
    }
  };

  return (
    <button onClick={share} className="btn-enroute-secondary !px-5 !py-2 !text-sm">
      {copied ? "Lien copié ✓" : "Inviter des amis"}
    </button>
  );
}

export function OnlineLobby({
  meta,
  playerId,
  error,
  onReady,
  onStart,
  onCar,
  onLeave,
}: {
  meta: RoomMeta;
  playerId: string;
  error: string | null;
  onReady: (ready: boolean) => Promise<void>;
  onStart: () => Promise<void>;
  onCar: (car: string) => Promise<void>;
  onLeave: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const me = meta.players.find((p) => p.id === playerId);
  const isHost = meta.hostId === playerId;
  const readyCount = meta.players.filter((p) => p.ready).length;
  const canStart = meta.players.length >= 2 && readyCount === meta.players.length;

  const act = async (task: () => Promise<void>) => {
    setBusy(true);
    await task();
    setBusy(false);
  };

  return (
    <InnerPage backHref="/" backLabel="Accueil" title="Salon en ligne">
      <div className="flex flex-col items-center gap-3 text-center">
        <SectionLabel>Code de partie</SectionLabel>
        <p className="brass-plate -mt-2 inline-block rounded-lg px-5 py-1 font-display text-4xl tracking-[0.18em]" data-testid="room-code">
          {meta.code}
        </p>
        <p className="font-hud text-sm text-white/55">
          {AMBIANCES[meta.settings.ambiance].label} · {meta.settings.target} km · {readyCount}/{meta.players.length} prêts
        </p>
        <ShareButton code={meta.code} />
      </div>

      <div className="flex flex-col gap-2.5">
        {meta.players.map((p, i) => {
          const online = p.id === playerId || meta.online.includes(p.id);
          const car = carFor(p.car, i);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-lg text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]"
                  style={{ background: PLAYER_COLOR[p.color] }}
                >
                  {i + 1}
                  <span
                    title={online ? "En ligne" : "Hors ligne"}
                    className={clsx(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#1d1310]",
                      online ? "bg-emerald-400" : "bg-white/30",
                    )}
                  />
                </span>
                <span className="min-w-0 truncate font-hud text-lg font-bold">
                  {p.name}
                  {p.id === playerId ? <span className="ml-1.5 text-sm font-semibold text-white/45">(vous)</span> : null}
                  {p.id === meta.hostId ? (
                    <span className="ml-2 rounded bg-[var(--color-brass-300)]/20 px-1.5 py-px align-middle text-[0.6rem] uppercase tracking-widest text-[var(--color-brass-300)]">
                      Hôte
                    </span>
                  ) : null}
                </span>
              </div>
              <span
                className={clsx(
                  "shrink-0 rounded-full px-3 py-1 font-hud text-xs font-bold tracking-widest",
                  p.ready ? "bg-[var(--color-player-emerald)] text-white shadow-[0_0_14px_rgba(62,171,111,0.5)]" : "border border-white/20 text-white/50",
                )}
              >
                {p.ready ? "PRÊT ✓" : "EN ATTENTE"}
              </span>
              {p.id === playerId ? (
                <div className="w-full">
                  <CarPicker value={car} color={p.color} onChange={(c) => act(() => onCar(c))} disabled={p.ready || busy} />
                </div>
              ) : (
                <div className="flex w-full items-center justify-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={carThumb(car, p.color)} alt="" width={240} height={160} draggable={false} className="h-auto w-[5.5rem]" />
                  <span className="font-menu text-sm font-bold uppercase tracking-wide text-white/70">{carInfo(car).label}</span>
                </div>
              )}
            </motion.div>
          );
        })}
        {meta.players.length < MAX_PLAYERS ? (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-3 text-center font-hud text-sm text-white/45">
            Place libre — partagez le code pour inviter jusqu&apos;à {MAX_PLAYERS - meta.players.length} pilote{MAX_PLAYERS - meta.players.length > 1 ? "s" : ""} de plus
          </p>
        ) : null}
      </div>

      {error ? <p className="text-center text-sm text-[#ff8a7e]">{error}</p> : null}

      <div className="flex flex-col items-center gap-2.5">
        {me ? (
          <button
            disabled={busy}
            onClick={() => act(() => onReady(!me.ready))}
            className={clsx("w-full", me.ready ? "btn-enroute-ghost" : "btn-enroute-secondary")}
          >
            {me.ready ? "Je ne suis plus prêt" : "Je suis prêt"}
          </button>
        ) : null}
        {isHost ? (
          <>
            <button
              disabled={!canStart || busy}
              onClick={() => act(onStart)}
              className="btn-enroute-primary w-full disabled:pointer-events-none disabled:opacity-40"
            >
              LANCER LA PARTIE
            </button>
            {!canStart ? (
              <p className="text-center text-xs text-white/45">
                {meta.players.length < 2 ? "Il faut au moins 2 pilotes." : "Chaque pilote doit se déclarer prêt avant le départ."}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-center font-hud text-sm text-white/55">L&apos;hôte lancera la partie quand tout le monde sera prêt.</p>
        )}
        <button onClick={onLeave} className="font-hud text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white/70">
          Quitter le salon
        </button>
      </div>
    </InnerPage>
  );
}
