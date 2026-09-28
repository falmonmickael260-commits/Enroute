"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useSetupStore, PLAYER_COLORS } from "@/game/lib/store/setupStore";
import { AMBIANCE_LIST } from "@/game/lib/ambiances";
import type { AmbianceId } from "@/game/types/game";
import { PLAYER_COLOR } from "@/game/components/players/PlayerPiece";
import { InnerPage, SectionLabel } from "@/game/components/ui/InnerPage";

const DURATIONS: { label: string; value: number; hint: string }[] = [
  { label: "Courte", value: 400, hint: "~15 min" },
  { label: "Standard", value: 700, hint: "~25 min" },
  { label: "Longue", value: 1000, hint: "~40 min" },
];

const choice = (active: boolean) =>
  clsx(
    "rounded-xl border transition-all",
    active
      ? "border-[var(--color-brass-300)] bg-[var(--color-brass-300)]/15 shadow-[0_0_18px_rgba(230,191,92,0.25)]"
      : "border-white/10 bg-black/25 hover:border-white/30",
  );

export default function CreateGamePage() {
  const router = useRouter();
  const createLocalGame = useSetupStore((s) => s.createLocalGame);

  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>(["Joueur 1", "Joueur 2", "Joueur 3", "Joueur 4"]);
  const [ambiance, setAmbiance] = useState<AmbianceId>("jour");
  const [target, setTarget] = useState(1000);

  const handleStart = () => {
    const code = createLocalGame(names.slice(0, playerCount), ambiance, target);
    router.push(`/play/lobby/${code}`);
  };

  return (
    <InnerPage backHref="/" backLabel="Accueil" title="Créer une partie">
      <section>
        <SectionLabel>Nombre de joueurs</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {[2, 3, 4].map((n) => (
            <button key={n} onClick={() => setPlayerCount(n)} className={clsx(choice(playerCount === n), "py-3 font-display text-3xl")}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Pilotes</SectionLabel>
        <div className="flex flex-col gap-2">
          {names.slice(0, playerCount).map((name, i) => (
            <label key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-[var(--color-brass-300)]">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-white"
                style={{ background: PLAYER_COLOR[PLAYER_COLORS[i]] }}
              >
                {i + 1}
              </span>
              <input
                value={name}
                onChange={(e) => setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
                maxLength={14}
                className="w-full bg-transparent py-2.5 font-hud text-lg font-semibold text-white outline-none placeholder-white/30"
                placeholder={`Joueur ${i + 1}`}
                aria-label={`Nom du joueur ${i + 1}`}
              />
            </label>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Ambiance du plateau</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {AMBIANCE_LIST.map((a) => (
            <button key={a.id} onClick={() => setAmbiance(a.id)} className={clsx(choice(ambiance === a.id), "flex flex-col items-center gap-1.5 px-1 py-3")}>
              <span
                className="h-9 w-14 rounded-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
                style={{ background: `linear-gradient(160deg, ${a.swatch[0]}, ${a.swatch[1]})` }}
              />
              <span className="font-hud text-xs font-bold text-white/90">{a.label}</span>
              <span className="text-[0.6rem] text-white/45">{a.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Durée de la partie</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => (
            <button key={d.value} onClick={() => setTarget(d.value)} className={clsx(choice(target === d.value), "flex flex-col items-center py-3")}>
              <span className="font-hud font-bold text-white">{d.label}</span>
              <span className="text-[0.65rem] text-white/50">
                {d.value} km · {d.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <button onClick={handleStart} className="btn-enroute-primary mt-1 w-full">
        Générer le code de partie
      </button>
    </InnerPage>
  );
}
