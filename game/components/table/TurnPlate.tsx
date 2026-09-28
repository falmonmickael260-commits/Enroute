import type { GameState } from "@/game/types/game";
import { PLAYER_COLOR } from "@/game/components/players/PlayerPiece";

function nextPlayer(state: GameState) {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const candidate = state.players[(state.currentPlayerIndex + i) % n];
    if (!candidate.finished) return candidate;
  }
  return null;
}

function headline(state: GameState, viewerId?: string) {
  const current = state.players[state.currentPlayerIndex];
  const todo = state.phase === "draw" ? "PIOCHEZ UNE CARTE" : "JOUEZ OU DÉFAUSSEZ";
  if (!viewerId) return `${current.name.toUpperCase()} — ${todo}`;
  if (current.id === viewerId) return `À VOUS — ${todo}`;
  return `${current.name.toUpperCase()} ${state.phase === "draw" ? "PREND LA ROUTE" : "RÉFLÉCHIT…"}`;
}

/** Brass plate hanging from the board's bottom edge: whose turn, what to do. */
export function TurnPlate({ state, viewerId }: { state: GameState; viewerId?: string }) {
  const current = state.players[state.currentPlayerIndex];
  const next = nextPlayer(state);
  const remaining = Math.max(0, state.target - current.distance);
  return (
    <div data-testid="turn-plate" className="brass-plate flex items-center gap-2.5 rounded-xl px-3 py-1.5 sm:gap-3 sm:px-4">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-sm text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] sm:h-7 sm:w-7"
        style={{ background: PLAYER_COLOR[current.color], textShadow: "none" }}
      >
        {state.currentPlayerIndex + 1}
      </span>
      <div className="leading-tight">
        <p className="font-display text-[0.95rem] tracking-[0.08em] sm:text-lg">{headline(state, viewerId)}</p>
        <p className="font-hud text-[0.62rem] font-bold uppercase tracking-[0.18em] opacity-75">
          Reste {remaining} km{next && next.id !== current.id ? ` · prochain : ${next.id === viewerId ? "vous" : next.name}` : ""}
        </p>
      </div>
    </div>
  );
}
