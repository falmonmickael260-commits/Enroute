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
import { setBoardView, useBoardView } from "@/game/lib/store/boardViewStore";
import { AmbianceScene } from "@/game/components/menu/AmbianceScene";
import {
  ChevronRightIcon,
  FlagIcon,
  GaugeIcon,
  GlobeIcon,
  HelmetIcon,
  MapIcon,
  MoonIcon,
  PencilIcon,
  PhoneIcon,
  SunIcon,
  SunsetIcon,
  TrophyIcon,
  UsersIcon,
} from "@/game/components/menu/icons";

type Mode = "online" | "local";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "online", label: "En ligne", hint: "Chacun sur son téléphone" },
  { id: "local", label: "Sur cet appareil", hint: "On se passe l'écran" },
];

const BOARDS = [
  { id: "3d", label: "3D", hint: "Voitures et effets animés", image: "/images/menu/plateau-3d.webp" },
  { id: "classic", label: "Classique", hint: "Plateau vu de dessus", image: "/images/menu/plateau-classique.webp" },
] as const;

const DURATIONS: { label: string; value: number; hint: string }[] = [
  { label: "Courte", value: 400, hint: "~ 15 min" },
  { label: "Standard", value: 700, hint: "~ 25 min" },
  { label: "Longue", value: 1000, hint: "~ 40 min" },
];

const AMBIANCE_ICON = { jour: SunIcon, crepuscule: SunsetIcon, nuit: MoonIcon } as const;
const AMBIANCE_ICON_COLOR = { jour: "text-[#ffd23f]", crepuscule: "text-[#ffb13d]", nuit: "text-[#e8ecff]" } as const;

export default function CreateGamePage() {
  const router = useRouter();
  const createLocalGame = useSetupStore((s) => s.createLocalGame);

  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>(["Joueur 1", "Joueur 2", "Joueur 3", "Joueur 4"]);
  const [ambiance, setAmbiance] = useState<AmbianceId>("jour");
  const [target, setTarget] = useState(1000);
  const [mode, setMode] = useState<Mode>("online");
  const boardView = useBoardView();
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
    <InnerPage backHref="/" backLabel="Accueil" title="Créer une partie" subtitle={"Choisis tes options et prends la route\u00a0!"}>
      <section>
        <SectionLabel icon={<UsersIcon />}>Mode de jeu</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={clsx("menu-option flex min-h-[4.6rem] items-center gap-2 px-2 py-3 sm:gap-3 sm:px-3.5", m.id === "online" && "menu-option-online")}
            >
              {m.id === "online" ? (
                <GlobeIcon className="h-8 w-8 shrink-0 text-[#4cb4ff] drop-shadow-[0_0_8px_rgba(60,160,255,0.8)] sm:h-12 sm:w-12" />
              ) : (
                <PhoneIcon className="h-8 w-8 shrink-0 text-white/85 sm:h-12 sm:w-12" />
              )}
              <span className="min-w-0">
                <span className="block font-menu text-[1.02rem] min-[400px]:whitespace-nowrap font-bold leading-tight min-[400px]:text-[1.15rem] sm:text-[1.3rem]">{m.label}</span>
                <span className="block font-menu text-[0.82rem] font-medium leading-tight text-white/75 sm:text-[0.95rem]">{m.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel icon={<MapIcon />}>Plateau</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {BOARDS.map((b) => (
            <button key={b.id} onClick={() => setBoardView(b.id)} aria-pressed={boardView === b.id} className="menu-option aspect-[2.1/1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt="" draggable={false} className="absolute inset-0 -z-10 h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 -z-10 h-3/4 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              <span className="absolute inset-x-1 bottom-1.5 text-center sm:bottom-2">
                <span className="block font-menu text-[1.3rem] font-extrabold leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] sm:text-[1.5rem]">{b.label}</span>
                <span className="block truncate text-[0.68rem] text-white/90 sm:text-[0.8rem]">{b.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {mode === "local" ? (
        <section>
          <SectionLabel icon={<UsersIcon />}>Nombre de joueurs</SectionLabel>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {[2, 3, 4].map((n) => (
              <button key={n} onClick={() => setPlayerCount(n)} aria-pressed={playerCount === n} className="menu-option py-2.5 text-center font-menu text-3xl font-extrabold italic">
                {n}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionLabel icon={<HelmetIcon />}>{mode === "online" ? "Votre nom de pilote" : "Pilotes"}</SectionLabel>
        <div className="flex flex-col gap-2">
          {pilots.map((name, i) => (
            <label key={i} className="menu-option flex cursor-text items-center gap-3 !rounded-[14px] py-2 pl-2.5 pr-2 focus-within:!border-[#ffc83d]">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-menu text-xl font-extrabold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_-3px_0_rgba(0,0,0,0.25),0_2px_6px_rgba(0,0,0,0.5)]"
                style={{ background: PLAYER_COLOR[PLAYER_COLORS[i]] }}
              >
                {i + 1}
              </span>
              <input
                value={name}
                onChange={(e) => setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
                maxLength={14}
                className="min-w-0 flex-1 bg-transparent py-1.5 font-menu text-[1.45rem] font-semibold text-white outline-none placeholder-white/30"
                placeholder={`Joueur ${i + 1}`}
                aria-label={`Nom du joueur ${i + 1}`}
              />
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/5 text-white/85">
                <PencilIcon className="h-5 w-5" />
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel icon={<SunIcon />}>Ambiance du plateau</SectionLabel>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {AMBIANCE_LIST.map((a) => {
            const Icon = AMBIANCE_ICON[a.id];
            return (
              <button key={a.id} onClick={() => setAmbiance(a.id)} aria-pressed={ambiance === a.id} className="menu-option aspect-[1.3/1]">
                <AmbianceScene id={a.id} className="absolute inset-0 -z-10 h-full w-full" />
                <span className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
                <span className="absolute inset-x-1 bottom-1.5 flex flex-col items-center text-center">
                  <Icon className={clsx("mb-0.5 h-6 w-6 sm:h-7 sm:w-7", AMBIANCE_ICON_COLOR[a.id])} />
                  <span className="w-full whitespace-nowrap font-menu text-[0.8rem] font-bold leading-none tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] min-[400px]:text-[0.9rem] sm:text-[1.1rem]">{a.label}</span>
                  <span className="w-full truncate text-[0.62rem] text-white/85 sm:text-[0.75rem]">{a.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel icon={<GaugeIcon />}>Durée de la partie</SectionLabel>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {DURATIONS.map((d, i) => (
            <button
              key={d.value}
              onClick={() => setTarget(d.value)}
              aria-pressed={target === d.value}
              className="menu-option flex flex-col items-center gap-1 px-1.5 py-2.5 text-center min-[400px]:flex-row min-[400px]:gap-1.5 min-[400px]:px-2 min-[400px]:text-left sm:gap-2.5 sm:px-3"
            >
              {i === 2 ? (
                <TrophyIcon className="h-7 w-7 shrink-0 text-[#ffc83d] drop-shadow-[0_0_6px_rgba(255,190,50,0.6)] sm:h-10 sm:w-10" />
              ) : (
                <FlagIcon double={i === 1} className="h-7 w-7 shrink-0 text-white/85 sm:h-10 sm:w-10" />
              )}
              <span className="min-w-0 leading-tight">
                <span className="block font-menu text-[1.05rem] font-bold sm:text-[1.25rem]">{d.label}</span>
                <span className="block font-menu text-[0.95rem] font-medium text-white/90 sm:text-[1.1rem]">{d.value} km</span>
                <span className="block text-[0.7rem] text-white/65 sm:text-[0.8rem]">{d.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {error ? <p className="text-center text-sm text-[#ff8a7e]">{error}</p> : null}
      <button onClick={handleStart} disabled={busy} className="menu-cta mt-1">
        {busy ? "Création…" : "Générer le code de partie"}
        <ChevronRightIcon className="h-[0.9em] w-[0.9em] shrink-0" />
      </button>
      {mode === "online" ? (
        <p className="-mt-2 text-center text-[0.8rem] text-white/60">Vos amis rejoignent avec le code ou le lien, de 2 à 4 pilotes.</p>
      ) : null}
    </InnerPage>
  );
}
