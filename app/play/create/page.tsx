"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useSetupStore, PLAYER_COLORS } from "@/game/lib/store/setupStore";
import { AMBIANCE_LIST } from "@/game/lib/ambiances";
import type { AmbianceId } from "@/game/types/game";
import { PLAYER_COLOR } from "@/game/components/players/PlayerPiece";
import { InnerPage, SectionLabel } from "@/game/components/ui/InnerPage";
import { createOnlineRoom } from "@/game/lib/online/actions";
import { OnlineError } from "@/game/lib/online/api";

type Mode = "online" | "local";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "online", label: "En ligne", hint: "Chacun sur son téléphone" },
  { id: "local", label: "Sur cet appareil", hint: "On se passe l'écran" },
];

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
  const [mode, setMode] = useState<Mode>("online");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (mode === "local") {
      const code = createLocalGame(names.slice(0, playerCount), ambiance, target);
      router.push(`/play/lobby/${code}`);
      return;
    }
    const name = names[0].trim();
    if (!name) {
      setError("Choisissez un nom de pilote.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const code = await createOnlineRoom(name, { ambiance, target });
      router.push(`/play/online/${code}`);
    } catch (e) {
      setError(e instanceof OnlineError ? e.message : "Impossible de créer la partie.");
      setBusy(false);
    }
  };

  const pilots = mode === "online" ? names.slice(0, 1) : names.slice(0, playerCount);

  return (
    <InnerPage backHref="/" backLabel="Accueil" title="Créer une partie">
      <section>
        <SectionLabel>Mode de jeu</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} className={clsx(choice(mode === m.id), "flex flex-col items-center gap-0.5 px-2 py-3")}>
              <span className="font-hud text-base font-bold text-white">{m.label}</span>
              <span className="text-[0.65rem] text-white/50">{m.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {mode === "local" ? (
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
      ) : null}

      <section>
        <SectionLabel>{mode === "online" ? "Votre nom de pilote" : "Pilotes"}</SectionLabel>
        <div className="flex flex-col gap-2">
          {pilots.map((name, i) => (
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

      {error ? <p className="text-center text-sm text-[#ff8a7e]">{error}</p> : null}
      <button onClick={handleStart} disabled={busy} className="btn-enroute-primary mt-1 w-full disabled:opacity-60">
        {busy ? "Création…" : "Générer le code de partie"}
      </button>
      {mode === "online" ? (
        <p className="-mt-3 text-center text-xs text-white/45">Vos amis rejoignent avec le code ou le lien, de 2 à 4 pilotes.</p>
      ) : null}
    </InnerPage>
  );
}
