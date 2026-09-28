"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSetupStore } from "@/game/lib/store/setupStore";
import { AMBIANCES } from "@/game/lib/ambiances";
import { PLAYER_COLOR } from "@/game/components/players/PlayerPiece";
import { InnerPage, SectionLabel } from "@/game/components/ui/InnerPage";

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { code: storeCode, players, ambiance, target, toggleReady } = useSetupStore();

  if (storeCode !== code || players.length === 0) {
    return (
      <InnerPage backHref="/" backLabel="Accueil" title="Salon introuvable">
        <p className="text-center text-white/70">Ce salon n&apos;existe plus sur cet appareil. Créez une nouvelle partie pour continuer.</p>
        <Link href="/play/create" className="btn-enroute-primary">
          Créer une partie
        </Link>
      </InnerPage>
    );
  }

  const allReady = players.every((p) => p.ready);
  const readyCount = players.filter((p) => p.ready).length;

  return (
    <InnerPage backHref="/play/create" backLabel="Retour" title="Salon">
      <div className="text-center">
        <SectionLabel>Code de partie</SectionLabel>
        <p className="brass-plate mx-auto inline-block rounded-lg px-5 py-1 font-display text-4xl tracking-[0.18em]">{code}</p>
        <p className="mt-3 font-hud text-sm text-white/55">
          {AMBIANCES[ambiance].label} · {target} km · {readyCount}/{players.length} prêts
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {players.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full font-display text-lg text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]"
                style={{ background: PLAYER_COLOR[p.color] }}
              >
                {i + 1}
              </span>
              <span className="font-hud text-lg font-bold">{p.name}</span>
            </div>
            <button
              onClick={() => toggleReady(p.id)}
              className={
                "rounded-full border px-4 py-1.5 font-hud text-xs font-bold tracking-widest transition-colors " +
                (p.ready
                  ? "border-transparent bg-[var(--color-player-emerald)] text-white shadow-[0_0_14px_rgba(62,171,111,0.5)]"
                  : "border-white/30 text-white/70 hover:border-white/60")
              }
            >
              {p.ready ? "PRÊT ✓" : "PRÊT"}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          disabled={!allReady}
          onClick={() => router.push(`/play/game/${code}`)}
          className="btn-enroute-primary w-full disabled:pointer-events-none disabled:opacity-40"
        >
          LANCER LA PARTIE
        </button>
        {!allReady ? <p className="text-xs text-white/45">Chaque pilote doit se déclarer prêt avant le départ.</p> : null}
      </div>
    </InnerPage>
  );
}
