"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/game/components/ui/Logo";
import { useSetupStore } from "@/game/lib/store/setupStore";
import { ENVIRONMENTS } from "@/game/lib/environments";

const COLOR_VAR: Record<string, string> = {
  crimson: "var(--color-player-crimson)",
  azure: "var(--color-player-azure)",
  amber: "var(--color-player-amber)",
  emerald: "var(--color-player-emerald)",
};

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { code: storeCode, players, environment, target, toggleReady } = useSetupStore();

  if (storeCode !== code || players.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <Logo size="sm" />
        <p className="text-white/70 max-w-sm">
          Ce salon n&apos;existe plus sur cet appareil. Créez une nouvelle partie pour continuer.
        </p>
        <Link href="/play/create" className="btn-enroute-primary">
          Créer une partie
        </Link>
      </main>
    );
  }

  const allReady = players.every((p) => p.ready);
  const theme = ENVIRONMENTS[environment];

  return (
    <main className="min-h-screen bg-[var(--color-asphalt-900)] px-4 sm:px-8 py-10 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link href="/play/create" className="btn-enroute-ghost !text-sm !py-2 !px-4">
            Quitter
          </Link>
        </header>

        <div className="text-center">
          <p className="font-hud text-xs uppercase tracking-widest text-white/50">Code de partie</p>
          <p className="font-display text-4xl text-[var(--color-brand-gold)] tracking-[0.15em]">{code}</p>
          <p className="text-white/50 text-sm mt-1">
            {theme.label} · {target} km · {players.length} joueurs
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ background: COLOR_VAR[p.color] }}
                >
                  🚗
                </span>
                <span className="font-hud font-semibold text-[var(--color-paper)]">{p.name}</span>
              </div>
              <button
                onClick={() => toggleReady(p.id)}
                className={
                  "text-xs font-hud font-semibold tracking-wide px-3 py-1.5 rounded-full border transition-colors " +
                  (p.ready
                    ? "bg-[var(--color-player-emerald)]/90 border-transparent text-white"
                    : "bg-transparent border-white/30 text-white/60 hover:border-white/60")
                }
              >
                {p.ready ? "PRÊT ✓" : "PRÊT"}
              </button>
            </motion.div>
          ))}
        </div>

        <button
          disabled={!allReady}
          onClick={() => router.push(`/play/game/${code}`)}
          className="btn-enroute-primary w-full disabled:opacity-40 disabled:pointer-events-none"
        >
          LANCER LA PARTIE
        </button>
        {!allReady ? (
          <p className="text-center text-white/40 text-xs -mt-4">
            Chaque joueur doit se déclarer prêt avant le départ.
          </p>
        ) : null}
      </div>
    </main>
  );
}
