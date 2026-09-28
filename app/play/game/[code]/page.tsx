"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSetupStore } from "@/game/lib/store/setupStore";
import { useGameEngine } from "@/game/hooks/useGameEngine";
import type { NewGameOptions } from "@/game/lib/engine/gameReducer";
import { GameTable } from "@/game/components/table/GameTable";
import { TableBackdrop } from "@/game/components/ui/TableBackdrop";

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const setup = useSetupStore();

  // Frozen once on mount: the game engine owns its own state from here on,
  // independent of later setup-store changes (e.g. starting a new lobby).
  const [initialOptions] = useState<NewGameOptions | null>(() =>
    setup.players.length >= 2
      ? {
          id: code,
          players: setup.players.map((p) => ({ id: p.id, name: p.name, color: p.color })),
          ambiance: setup.ambiance,
          target: setup.target,
        }
      : null,
  );

  if (!initialOptions) {
    return (
      <main className="relative isolate flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <TableBackdrop />
        <div className="panel-leather relative z-10 flex max-w-sm flex-col items-center gap-5 rounded-3xl p-8">
          <p className="text-white/75">
            Aucune partie active pour le code <span className="font-hud font-bold text-[var(--color-brass-300)]">{code}</span>. Créez
            une nouvelle partie pour prendre la route.
          </p>
          <Link href="/play/create" className="btn-enroute-primary">
            Créer une partie
          </Link>
        </div>
      </main>
    );
  }

  return <LocalGame options={initialOptions} onExit={() => router.push("/")} onNewGame={() => router.push("/play/create")} />;
}

function LocalGame({
  options,
  onExit,
  onNewGame,
}: {
  options: NewGameOptions;
  onExit: () => void;
  onNewGame: () => void;
}) {
  const { state, controls, consumeAnimation, newGame } = useGameEngine(options);
  return (
    <GameTable
      state={state}
      controls={controls}
      consumeAnimation={consumeAnimation}
      onExit={onExit}
      onReplay={() => newGame(options)}
      onNewGame={onNewGame}
    />
  );
}
