"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CardInstance } from "@/game/types/game";
import { useSetupStore } from "@/game/lib/store/setupStore";
import { useGameEngine } from "@/game/hooks/useGameEngine";
import { useAnimationQueue } from "@/game/hooks/useAnimationQueue";
import { useSound } from "@/game/hooks/useSound";
import type { NewGameOptions } from "@/game/lib/engine/gameReducer";
import { Table } from "@/game/components/board/Table";
import { Board } from "@/game/components/board/Board";
import { PlayerHand } from "@/game/components/cards/PlayerHand";
import { DrawPile } from "@/game/components/cards/DrawPile";
import { DiscardPile } from "@/game/components/cards/DiscardPile";
import { OpponentsBar } from "@/game/components/players/OpponentsBar";
import { TurnBanner } from "@/game/components/animations/TurnBanner";
import { EventToast } from "@/game/components/animations/EventToast";
import { VictoryOverlay } from "@/game/components/animations/VictoryOverlay";
import { TargetPicker } from "@/game/components/ui/TargetPicker";
import { SoundToggle } from "@/game/components/ui/SoundToggle";
import { Logo } from "@/game/components/ui/Logo";

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
          environment: setup.environment,
          target: setup.target,
        }
      : null,
  );

  if (!initialOptions) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <Logo size="sm" />
        <p className="text-white/70 max-w-sm">
          Aucune partie active pour le code <span className="font-hud">{code}</span>. Créez une nouvelle
          partie pour prendre la route.
        </p>
        <Link href="/play/create" className="btn-enroute-primary">
          Créer une partie
        </Link>
      </main>
    );
  }

  return <GameRunner options={initialOptions} onExit={() => router.push("/")} onNewGame={() => router.push("/play/create")} />;
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

  const handleDraw = () => {
    draw();
  };

  const environmentGradient = useMemo(
    () => ({ background: "radial-gradient(120% 90% at 50% -10%, rgba(255,255,255,0.06), transparent 60%)" }),
    [],
  );

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-asphalt-900)]" style={environmentGradient}>
      <header className="flex items-center justify-between px-4 sm:px-6 py-3">
        <button onClick={onExit} className="flex items-center gap-2">
          <Logo size="sm" className="scale-[0.5] origin-left -my-3" />
        </button>
        <div className="flex items-center gap-3">
          <span className="font-hud text-xs tracking-widest text-white/50 hidden sm:inline">
            PARTIE {state.id}
          </span>
          <SoundToggle enabled={soundOn} onToggle={toggleSound} />
          <button onClick={onExit} className="btn-enroute-ghost !text-sm !py-2 !px-4">
            Quitter
          </button>
        </div>
      </header>

      <div className="px-4 sm:px-6">
        <OpponentsBar state={state} />
      </div>

      <div className="flex-1 flex flex-col justify-center px-3 sm:px-6 py-3 gap-3 max-w-5xl mx-auto w-full relative">
        <div className="relative">
          <EventToast event={currentEvent} state={state} />
          <Table>
            <Board state={state} />
          </Table>
        </div>

        <div className="flex items-center justify-center gap-8 sm:gap-16">
          <DrawPile count={state.deck.length} canDraw={state.phase === "draw"} onDraw={handleDraw} />
          <DiscardPile pile={state.discard} />
        </div>

        <p className="text-center font-hud text-xs sm:text-sm tracking-widest uppercase text-white/50">
          {state.phase === "draw"
            ? `${currentPlayer.name}, piochez une carte`
            : `${currentPlayer.name}, jouez ou défaussez une carte`}
        </p>
      </div>

      <div className="px-2 sm:px-6">
        <PlayerHand player={currentPlayer} state={state} isMyTurn={true} onPlay={handlePlay} onDiscard={handleDiscard} />
      </div>

      <TurnBanner player={turnBannerPlayer} />
      <TargetPicker pending={pendingTarget} state={state} onPick={resolveTarget} onCancel={cancelTarget} />

      {state.phase === "gameover" ? (
        <VictoryOverlay
          state={state}
          onReplay={() => newGame(options)}
          onNewGame={onNewGame}
          onMenu={onExit}
        />
      ) : null}
    </main>
  );
}
