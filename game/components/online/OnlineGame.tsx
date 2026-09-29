"use client";

import { useCallback, useEffect } from "react";
import type { GameState } from "@/game/types/game";
import type { GameAction } from "@/game/lib/engine/gameReducer";
import type { ConnectionState, RoomMeta } from "@/game/hooks/useOnlineRoom";
import { useGameControls } from "@/game/hooks/useGameEngine";
import { GameScreen } from "@/game/components/table/GameScreen";

/** An absent player's turn is passed automatically after this long. */
const AUTO_SKIP_MS = 45_000;

export function OnlineGame({
  game,
  meta,
  playerId,
  connection,
  error,
  dispatch,
  onClearError,
  onReplay,
  onExit,
  onNewGame,
}: {
  game: GameState;
  meta: RoomMeta;
  playerId: string;
  connection: ConnectionState;
  error: string | null;
  dispatch: (action: GameAction) => void;
  onClearError: () => void;
  onReplay: () => void;
  onExit: () => void;
  onNewGame: () => void;
}) {
  const controls = useGameControls(game, dispatch);
  const consumeAnimation = useCallback(() => dispatch({ type: "CLEAR_ANIMATION" }), [dispatch]);

  const isHost = meta.hostId === playerId;
  const offlineIds = game.players.filter((p) => p.id !== playerId && !meta.online.includes(p.id)).map((p) => p.id);
  const current = game.players[game.currentPlayerIndex];
  const currentAway = game.phase !== "gameover" && offlineIds.includes(current.id);
  const canSkip = currentAway && isHost;

  // The host's device keeps the game moving when the current driver left.
  useEffect(() => {
    if (!canSkip) return;
    const timer = setTimeout(() => dispatch({ type: "SKIP_TURN" }), AUTO_SKIP_MS);
    return () => clearTimeout(timer);
  }, [canSkip, current.id, game.turn, dispatch]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(onClearError, 4000);
    return () => clearTimeout(timer);
  }, [error, onClearError]);

  const notice = currentAway ? (
    <div className="panel-leather pointer-events-auto flex items-center gap-3 rounded-2xl px-3 py-2 font-hud text-sm">
      <span className="text-white/80">
        <b className="text-[var(--color-paper)]">{current.name}</b> est hors ligne
        {canSkip ? <span className="hidden text-white/45 sm:inline"> · tour passé automatiquement sous 45 s</span> : null}
      </span>
      {canSkip ? (
        <button onClick={() => dispatch({ type: "SKIP_TURN" })} className="btn-enroute-secondary !px-3 !py-1.5 !text-xs">
          Passer son tour
        </button>
      ) : null}
    </div>
  ) : error ? (
    <div className="panel-leather rounded-2xl px-3 py-2 font-hud text-sm text-[#ff8a7e]">{error}</div>
  ) : null;

  const headerExtra =
    connection === "online" ? null : (
      <div className="panel-leather flex items-center gap-2 rounded-full px-3 py-1.5 font-hud text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#ffb37e]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#ffb37e]" />
        {connection === "connecting" ? "Connexion…" : "Reconnexion…"}
      </div>
    );

  return (
    <GameScreen
      state={game}
      controls={controls}
      consumeAnimation={consumeAnimation}
      viewerId={playerId}
      offlineIds={offlineIds}
      headerExtra={headerExtra}
      notice={notice}
      onExit={onExit}
      onReplay={isHost ? onReplay : undefined}
      replayHint="L'hôte peut relancer une revanche avec les mêmes pilotes."
      onNewGame={onNewGame}
    />
  );
}
