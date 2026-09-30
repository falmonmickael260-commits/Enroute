"use client";

import { useEffect, type ReactNode } from "react";
import type { CardInstance, GameState } from "@/game/types/game";
import type { GameControls } from "@/game/hooks/useGameEngine";
import { useAnimationQueue } from "@/game/hooks/useAnimationQueue";
import { useSound } from "@/game/hooks/useSound";
import { Board } from "@/game/components/board/Board";
import { BoardFit } from "@/game/components/board/BoardFit";
import { PlayerHand } from "@/game/components/cards/PlayerHand";
import { DrawPile } from "@/game/components/cards/DrawPile";
import { DiscardPile } from "@/game/components/cards/DiscardPile";
import { PlayerPanel } from "@/game/components/players/PlayerPanel";
import { TurnBanner } from "@/game/components/animations/TurnBanner";
import { EventToast } from "@/game/components/animations/EventToast";
import { VictoryOverlay } from "@/game/components/animations/VictoryOverlay";
import { TargetPicker } from "@/game/components/ui/TargetPicker";
import { SoundToggle } from "@/game/components/ui/SoundToggle";
import { TableBackdrop } from "@/game/components/ui/TableBackdrop";
import { TurnPlate } from "./TurnPlate";

export interface GameTableProps {
  state: GameState;
  controls: GameControls;
  consumeAnimation: () => void;
  /**
   * Online: the player sitting at this device — only their hand is shown and
   * they can only act on their own turn. Omitted for the hotseat game, where
   * the hand always belongs to whoever's turn it is.
   */
  viewerId?: string;
  offlineIds?: readonly string[];
  /** Extra chip(s) in the header, e.g. the connection status. */
  headerExtra?: ReactNode;
  /** Message floating above the hand, e.g. "waiting for Bob". */
  notice?: ReactNode;
  onExit: () => void;
  onReplay?: () => void;
  replayHint?: string;
  onNewGame: () => void;
}

export function GameTable({
  state,
  controls,
  consumeAnimation,
  viewerId,
  offlineIds,
  headerExtra,
  notice,
  onExit,
  onReplay,
  replayHint,
  onNewGame,
}: GameTableProps) {
  const { draw, requestPlay, resolveTarget, cancelTarget, pendingTarget, discard } = controls;
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
  const handOwner = (viewerId && state.players.find((p) => p.id === viewerId)) || currentPlayer;
  const isMyTurn = state.phase !== "gameover" && handOwner.id === currentPlayer.id;
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
    <main className="relative isolate h-dvh overflow-hidden text-[var(--color-paper)]">
      <TableBackdrop />
      <div className="relative z-10 flex h-full flex-col">
        {/* The top band is left clear: it's where the KILOMAX logo sits on the table. */}
        <header className="game-header flex shrink-0 items-start justify-between gap-3 px-3 pt-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="panel-leather hidden rounded-full px-3 py-1.5 font-hud text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/70 sm:block">
              {state.id} · Tour {state.turn}
            </div>
            {headerExtra}
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

        <div className="game-middle">
          <aside className="game-players no-scrollbar">
            <PlayerPanel state={state} viewerId={viewerId} offlineIds={offlineIds} />
          </aside>

          <BoardFit className="game-board">
            <EventToast event={currentEvent} state={state} />
            <Board state={state} caption={<TurnPlate state={state} viewerId={viewerId} />} />
          </BoardFit>

          <aside className="game-piles">
            <DrawPile count={state.deck.length} canDraw={isMyTurn && state.phase === "draw"} onDraw={draw} />
            <DiscardPile pile={state.discard} />
          </aside>
        </div>

        <footer className="relative shrink-0">
          <PlayerHand player={handOwner} state={state} isMyTurn={isMyTurn} onPlay={handlePlay} onDiscard={handleDiscard} />
          {/* Laid over the lower half of the fan: the board's turn plate sits just above. */}
          {notice ? <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[55] flex justify-center px-3">{notice}</div> : null}
        </footer>
      </div>

      <TurnBanner player={turnBannerPlayer} subtitle={viewerId && turnBannerPlayer?.id === viewerId ? "À vous de jouer" : undefined} />
      {isMyTurn ? <TargetPicker pending={pendingTarget} state={state} onPick={resolveTarget} onCancel={cancelTarget} /> : null}

      {state.phase === "gameover" ? (
        <VictoryOverlay state={state} onReplay={onReplay} replayHint={replayHint} onNewGame={onNewGame} onMenu={onExit} />
      ) : null}
    </main>
  );
}
