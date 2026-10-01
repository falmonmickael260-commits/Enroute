"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AMBIANCES } from "@/game/lib/ambiances";
import { OnlineError, roomInfo, type RoomPreview } from "@/game/lib/online/api";
import { joinOnlineRoom } from "@/game/lib/online/actions";
import { PLAYER_COLOR } from "@/game/components/players/PlayerPiece";
import { MAX_PLAYERS } from "@/game/lib/engine/deck";
import { InnerPage, SectionLabel } from "@/game/components/ui/InnerPage";

/** Shown to someone opening an invite link without a seat in the room yet. */
export function JoinGate({ code, defaultName }: { code: string; defaultName: string }) {
  const [preview, setPreview] = useState<RoomPreview | null | undefined>(undefined);
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    roomInfo(code)
      .then((info) => !cancelled && setPreview(info))
      .catch(() => !cancelled && setPreview(null));
    return () => {
      cancelled = true;
    };
  }, [code]);

  const join = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Choisissez un nom de pilote.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Success stores the seat, which swaps this gate for the room itself.
      await joinOnlineRoom(code, trimmed);
    } catch (e) {
      setError(e instanceof OnlineError ? e.message : "Impossible de rejoindre la partie.");
      setBusy(false);
    }
  };

  if (preview === undefined) {
    return (
      <InnerPage backHref="/" backLabel="Accueil" title="Rejoindre">
        <p className="text-center font-hud text-white/60">Recherche de la partie {code}…</p>
      </InnerPage>
    );
  }

  if (preview === null) {
    return (
      <InnerPage backHref="/play/join" backLabel="Retour" title="Introuvable">
        <p className="text-center text-white/70">
          Aucune partie en ligne ne porte le code <span className="font-hud font-bold text-[var(--color-brass-300)]">{code}</span>. Vérifiez le code
          auprès de l&apos;hôte.
        </p>
        <Link href="/play/join" className="btn-enroute-primary">
          Saisir un autre code
        </Link>
      </InnerPage>
    );
  }

  const open = preview.status === "lobby" && preview.players.length < MAX_PLAYERS;

  return (
    <InnerPage backHref="/" backLabel="Accueil" title="Rejoindre">
      <div className="text-center">
        <SectionLabel>Partie</SectionLabel>
        <p className="brass-plate -mt-1 inline-block rounded-lg px-5 py-1 font-display text-4xl tracking-[0.18em]">{preview.code}</p>
        <p className="mt-3 font-hud text-sm text-white/55">
          {AMBIANCES[preview.settings.ambiance].label} · {preview.settings.target} km
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {preview.players.map((p, i) => (
          <span key={i} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 py-1 pl-1 pr-3 font-hud text-sm font-bold">
            <span className="h-6 w-6 rounded-full" style={{ background: PLAYER_COLOR[p.color] }} />
            {p.name}
          </span>
        ))}
      </div>

      {open ? (
        <>
          <label className="flex flex-col gap-2">
            <SectionLabel>Votre nom de pilote</SectionLabel>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              maxLength={14}
              autoFocus
              placeholder="Pilote"
              aria-label="Votre nom de pilote"
              className="-mt-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 font-hud text-lg font-semibold text-white outline-none placeholder-white/30 focus:border-[var(--color-brass-300)]"
            />
          </label>
          {error ? <p className="text-center text-sm text-[#ff8a7e]">{error}</p> : null}
          <button onClick={join} disabled={busy} className="btn-enroute-primary w-full disabled:opacity-60">
            {busy ? "Connexion…" : "Prendre place"}
          </button>
        </>
      ) : (
        <p className="text-center text-white/70">
          {preview.status === "lobby" ? "Cette partie est complète ({MAX_PLAYERS} pilotes)." : "Cette partie a déjà commencé sans vous."}
        </p>
      )}
    </InnerPage>
  );
}
