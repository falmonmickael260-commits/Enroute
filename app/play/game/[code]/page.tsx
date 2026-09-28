"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CardInstance, GameState } from "@/game/types/game";
import { useSetupStore } from "@/game/lib/store/setupStore";
import { useGameEngine } from "@/game/hooks/useGameEngine";
import { useAnimationQueue } from "@/game/hooks/useAnimationQueue";
import { useSound } from "@/game/hooks/useSound";
import type { NewGameOptions } from "@/game/lib/engine/gameReducer";
import { Board } from "@/game/components/board/Board";
import { PlayerHand } from "@/game/components/cards/PlayerHand";
import { DrawPile } from "@/game/components/cards/DrawPile";
import { DiscardPile } from "@/game/components/cards/DiscardPile";
import { PlayerPanel } from "@/game/components/players/PlayerPanel";
import { PLAYER_COLOR } from "@/game/components/players/PlayerPiece";
import { TurnBanner } from "@/game/components/animations/TurnBanner";
import { EventToast } from "@/game/components/animations/EventToast";
import { VictoryOverlay } from "@/game/components/animations/VictoryOverlay";
import { TargetPicker } from "@/game/components/ui/TargetPicker";
import { SoundToggle } from "@/game/components/ui/SoundToggle";
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

  return <GameRunner options={initialOptions} onExit={() => router.push("/")} onNewGame={() => router.push("/play/create")} />;
}

function nextPlayer(state: GameState) {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const candidate = state.players[(state.currentPlayerIndex + i) % n];
    if (!candidate.finished) return candidate;
  }
  return null;
}

/** Brass plate hanging from the board's bottom edge: whose turn, what to do. */
function TurnPlate({ state }: { state: GameState }) {
  const current = state.players[state.currentPlayerIndex];
  const next = nextPlayer(state);
  const remaining = Math.max(0, state.target - current.distance);
  return (
    <div className="brass-plate flex items-center gap-2.5 rounded-xl px-3 py-1.5 sm:gap-3 sm:px-4">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-sm text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] sm:h-7 sm:w-7"
        style={{ background: PLAYER_COLOR[current.color], textShadow: "none" }}
      >
        {state.currentPlayerIndex + 1}
      </span>
      <div className="leading-tight">
        <p className="font-display text-[0.95rem] tracking-[0.08em] sm:text-lg">
          {current.name.toUpperCase()} — {state.phase === "draw" ? "PIOCHEZ UNE CARTE" : "JOUEZ OU DÉFAUSSEZ"}
        </p>
        <p className="font-hud text-[0.62rem] font-bold uppercase tracking-[0.18em] opacity-75">
          Reste {remaining} km{next && next.id !== current.id ? ` · prochain : ${next.name}` : ""}
        </p>
      </div>
    </div>
  );
}

function GameRunner({
  options,
  onExit,
  onNewGame,
}: {
  options: NewGameOptions;
  onExit: () => void;
  onNewGame: () => void;
}) {
  const { state, draw, requestPlay, resolveTarget, cancelTarget, pendingTarget, discard, consumeAnimation, newGame } =
    useGameEngine(options);
  const currentEvent = useAnimationQueue(state.animationQueue, consumeAnimation);
  const { enabled: soundOn, toggle: toggleSound, play } = useSound();

  useEffect(() => {
    if (!currentEvent) return;
    if (currentEvent.kind === "draw") play("cardDraw");
    else if (currentEvent.kind === "discard") play("cardDiscard");
    else if (currentEvent.kind === "move") play("move");
    else if (currentEvent.kind === "hazard") play("hazard");
    else if (currentEvent.kind === "shield") play("shield");
    else if (currentEvent.kind === "turnChange") play("turnChange");
    else if (currentEvent.kind === "victory") play("victory");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent]);

  const currentPlayer = state.players[state.currentPlayerIndex];
  const turnBannerPlayer = currentEvent?.kind === "turnChange" ? currentPlayer : null;

  const handlePlay = (card: CardInstance) => {
    play("cardPlay");
    requestPlay(card);
  };

  const handleDiscard = (card: CardInstance) => {
    play("cardDiscard");
    discard(card);
  };

  return (
    <main className="relative isolate min-h-dvh overflow-x-hidden text-[var(--color-paper)] lg:h-dvh lg:overflow-hidden">
      <TableBackdrop />
      <div className="relative z-10 flex min-h-dvh flex-col lg:h-full lg:min-h-0">
        {/* The top band is left clear: it's where the EN ROUTE inlay sits on the table. */}
        <header className="flex shrink-0 items-start justify-between gap-3 px-3 pt-3 sm:px-5" style={{ height: "var(--logo-band)" }}>
          <div className="panel-leather hidden rounded-full px-3 py-1.5 font-hud text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/70 sm:block">
            {state.id} · Tour {state.turn}
          </div>
          {/* On phones the logo spans most of the width: keep controls small and in the corner. */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <SoundToggle enabled={soundOn} onToggle={toggleSound} />
            <button onClick={onExit} aria-label="Quitter la partie" className="btn-enroute-ghost panel-leather !h-9 !w-9 !p-0 !text-sm sm:!h-10 sm:!w-auto sm:!px-4">
              <span className="sm:hidden">✕</span>
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-3 px-2 sm:px-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[14.5rem_minmax(0,1fr)_10rem] lg:gap-6 lg:px-6">
          <aside className="no-scrollbar lg:max-h-full lg:overflow-y-auto">
            <PlayerPanel state={state} />
          </aside>

          <section className="relative mx-auto w-full pb-6" style={{ maxWidth: "max(30rem, calc((100dvh - var(--logo-band) - 18rem) * 1.6))" }}>
            <EventToast event={currentEvent} state={state} />
            <Board state={state} caption={<TurnPlate state={state} />} />
          </section>

          <aside className="flex items-center justify-center gap-6 pb-1 lg:flex-col lg:gap-8 lg:pt-2">
            <DrawPile count={state.deck.length} canDraw={state.phase === "draw"} onDraw={draw} />
            <DiscardPile pile={state.discard} />
          </aside>
        </div>

        <footer className="relative shrink-0">
          <PlayerHand player={currentPlayer} state={state} isMyTurn onPlay={handlePlay} onDiscard={handleDiscard} />
        </footer>
      </div>

      <TurnBanner player={turnBannerPlayer} />
      <TargetPicker pending={pendingTarget} state={state} onPick={resolveTarget} onCancel={cancelTarget} />

      {state.phase === "gameover" ? (
        <VictoryOverlay state={state} onReplay={() => newGame(options)} onNewGame={onNewGame} onMenu={onExit} />
      ) : null}
    </main>
  );
}
