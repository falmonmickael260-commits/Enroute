"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/game/components/ui/Logo";
import { useSetupStore } from "@/game/lib/store/setupStore";

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
      "Partie introuable sur cet appareil. Le multijoueur en ligne arrive bientôt — pour l'instant, EN ROUTE se joue à plusieurs sur le même appareil.",
    );
  };

  return (
    <main className="min-h-screen bg-[var(--color-asphalt-900)] px-4 sm:px-8 py-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm flex flex-col gap-6 text-center">
        <Link href="/" className="self-center">
          <Logo size="sm" />
        </Link>
        <h1 className="font-display text-3xl text-[var(--color-paper)]">Rejoindre une partie</h1>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ENR-XXXX"
          maxLength={9}
          className="text-center tracking-[0.3em] font-display text-2xl rounded-xl bg-white/5 border border-white/10 focus:border-[var(--color-brand-gold)] outline-none px-4 py-3 text-white placeholder-white/30 uppercase"
        />
        {error ? <p className="text-sm text-[var(--color-brand-crimson)]">{error}</p> : null}
        <button onClick={handleJoin} className="btn-enroute-primary w-full">
          Rejoindre
        </button>
        <Link href="/play/create" className="btn-enroute-ghost w-full">
          Créer une partie à la place
        </Link>
      </div>
    </main>
  );
}
