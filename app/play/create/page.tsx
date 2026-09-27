"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/game/components/ui/Logo";
import { useSetupStore } from "@/game/lib/store/setupStore";
import { ENVIRONMENT_LIST } from "@/game/lib/environments";
import type { EnvironmentId } from "@/game/types/game";

const DURATIONS: { label: string; value: number; hint: string }[] = [
  { label: "Courte", value: 400, hint: "~15 min" },
  { label: "Standard", value: 700, hint: "~25 min" },
  { label: "Longue", value: 1000, hint: "~40 min" },
];

export default function CreateGamePage() {
  const router = useRouter();
  const createLocalGame = useSetupStore((s) => s.createLocalGame);

  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>(["Joueur 1", "Joueur 2", "Joueur 3", "Joueur 4"]);
  const [environment, setEnvironment] = useState<EnvironmentId>("campagne");
  const [target, setTarget] = useState(1000);

  const handleNameChange = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const handleStart = () => {
    const code = createLocalGame(names.slice(0, playerCount), environment, target);
    router.push(`/play/lobby/${code}`);
  };

  return (
    <main className="min-h-screen bg-[var(--color-asphalt-900)] px-4 sm:px-8 py-10 flex flex-col items-center">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link href="/" className="btn-enroute-ghost !text-sm !py-2 !px-4">
            Annuler
          </Link>
        </header>

        <h1 className="font-display text-3xl text-center text-[var(--color-paper)]">Créer une partie</h1>

        <section>
          <p className="font-hud text-xs uppercase tracking-widest text-white/50 mb-3">Nombre de joueurs</p>
          <div className="grid grid-cols-3 gap-3">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={clsx(
                  "rounded-xl py-3 font-display text-2xl border transition-colors",
                  playerCount === n
                    ? "bg-[var(--color-brand-crimson)] border-[var(--color-brand-crimson)] text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:border-white/30",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="font-hud text-xs uppercase tracking-widest text-white/50 mb-3">Noms des joueurs</p>
          <div className="flex flex-col gap-2">
            {names.slice(0, playerCount).map((name, i) => (
              <input
                key={i}
                value={name}
                onChange={(e) => handleNameChange(i, e.target.value)}
                maxLength={16}
                className="rounded-xl bg-white/5 border border-white/10 focus:border-[var(--color-brand-gold)] outline-none px-4 py-2.5 text-white placeholder-white/30"
                placeholder={`Joueur ${i + 1}`}
              />
            ))}
          </div>
        </section>

        <section>
          <p className="font-hud text-xs uppercase tracking-widest text-white/50 mb-3">Environnement</p>
          <div className="grid grid-cols-5 gap-2">
            {ENVIRONMENT_LIST.map((env) => (
              <button
                key={env.id}
                onClick={() => setEnvironment(env.id)}
                className={clsx(
                  "rounded-xl py-3 flex flex-col items-center gap-1 border transition-colors",
                  environment === env.id ? "border-[var(--color-brand-gold)] bg-white/10" : "border-white/10 bg-white/5 hover:border-white/30",
                )}
              >
                <span
                  className="w-6 h-6 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${env.sky[0]}, ${env.ground[1]})` }}
                />
                <span className="text-[0.6rem] font-hud text-white/70">{env.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="font-hud text-xs uppercase tracking-widest text-white/50 mb-3">Durée de la partie</p>
          <div className="grid grid-cols-3 gap-3">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setTarget(d.value)}
                className={clsx(
                  "rounded-xl py-3 border transition-colors flex flex-col items-center",
                  target === d.value ? "border-[var(--color-brand-gold)] bg-white/10" : "border-white/10 bg-white/5 hover:border-white/30",
                )}
              >
                <span className="font-hud font-semibold text-white">{d.label}</span>
                <span className="text-[0.65rem] text-white/50">{d.value} km · {d.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <button onClick={handleStart} className="btn-enroute-primary w-full mt-2">
          Générer le code de partie
        </button>
      </div>
    </main>
  );
}
