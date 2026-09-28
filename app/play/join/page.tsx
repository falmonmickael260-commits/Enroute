"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSetupStore } from "@/game/lib/store/setupStore";
import { InnerPage } from "@/game/components/ui/InnerPage";

export default function JoinGamePage() {
  const router = useRouter();
  const storeCode = useSetupStore((s) => s.code);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleJoin = () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("Entrez un code de partie.");
      return;
    }
    if (normalized === storeCode) {
      router.push(`/play/lobby/${normalized}`);
      return;
    }
    setError(
      "Partie introuvable sur cet appareil. Le multijoueur en ligne arrive bientôt — pour l'instant, EN ROUTE se joue à plusieurs sur le même appareil.",
    );
  };

  return (
    <InnerPage backHref="/" backLabel="Accueil" title="Rejoindre">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        placeholder="ENR-XXXX"
        maxLength={9}
        aria-label="Code de partie"
        className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center font-display text-3xl uppercase tracking-[0.3em] text-white outline-none placeholder-white/25 focus:border-[var(--color-brass-300)]"
      />
      {error ? <p className="text-center text-sm text-[#ff8a7e]">{error}</p> : null}
      <button onClick={handleJoin} className="btn-enroute-primary w-full">
        Rejoindre
      </button>
      <Link href="/play/create" className="btn-enroute-ghost w-full">
        Créer une partie à la place
      </Link>
    </InnerPage>
  );
}
