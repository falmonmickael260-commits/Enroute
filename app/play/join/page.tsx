"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSetupStore } from "@/game/lib/store/setupStore";
import { CODE_PATTERN, normalizeCode, OnlineError } from "@/game/lib/online/api";
import { joinOnlineRoom } from "@/game/lib/online/actions";
import { getOnlineSession } from "@/game/lib/online/session";
import { InnerPage, SectionLabel } from "@/game/components/ui/InnerPage";

export default function JoinGamePage() {
  const router = useRouter();
  const localCode = useSetupStore((s) => s.code);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleJoin = async () => {
    const normalized = normalizeCode(code);
    if (!CODE_PATTERN.test(normalized)) {
      setError("Le code ressemble à ENR-XXXX.");
      return;
    }
    if (normalized === localCode) {
      router.push(`/play/lobby/${normalized}`);
      return;
    }
    const pilot = name.trim() || getOnlineSession().name;
    if (!pilot) {
      setError("Choisissez un nom de pilote.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const joined = await joinOnlineRoom(normalized, pilot);
      router.push(`/play/online/${joined}`);
    } catch (e) {
      setError(e instanceof OnlineError ? e.message : "Impossible de rejoindre la partie.");
      setBusy(false);
    }
  };

  return (
    <InnerPage backHref="/" backLabel="Accueil" title="Rejoindre">
      <label className="flex flex-col">
        <SectionLabel>Code de partie</SectionLabel>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="ENR-XXXX"
          maxLength={9}
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Code de partie"
          className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center font-display text-3xl uppercase tracking-[0.3em] text-white outline-none placeholder-white/25 focus:border-[var(--color-brass-300)]"
        />
      </label>
      <label className="flex flex-col">
        <SectionLabel>Votre nom de pilote</SectionLabel>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="Pilote"
          maxLength={14}
          aria-label="Votre nom de pilote"
          className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 font-hud text-lg font-semibold text-white outline-none placeholder-white/30 focus:border-[var(--color-brass-300)]"
        />
      </label>
      {error ? <p className="text-center text-sm text-[#ff8a7e]">{error}</p> : null}
      <button onClick={handleJoin} disabled={busy} className="btn-enroute-primary w-full disabled:opacity-60">
        {busy ? "Connexion…" : "Rejoindre"}
      </button>
      <Link href="/play/create" className="btn-enroute-ghost w-full">
        Créer une partie à la place
      </Link>
    </InnerPage>
  );
}
