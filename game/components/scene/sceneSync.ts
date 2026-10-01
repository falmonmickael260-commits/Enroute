import type { GameState, PlayerColor } from "@/game/types/game";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import type { MoveStyle, SceneCue, SceneRenderer } from "./SceneRenderer";
import { raceAudio } from "@/game/audio/race";

/** Car paint: livelier than the UI tokens, they have to pop on the landscape. */
export const CAR_PAINT: Record<PlayerColor, string> = {
  crimson: "#e8352b",
  azure: "#1f86ea",
  amber: "#ffc21a",
  emerald: "#2fae55",
  violet: "#8e4cf0",
  rose: "#f04aa6",
};

/** Which card was just played, read from how the state changed. */
function cueFor(prev: GameState, next: GameState): { playerId: string; cue: SceneCue } | null {
  if (prev.startedAt !== next.startedAt || next.discard.length !== prev.discard.length + 1) return null;
  const def = getCardDef(next.discard[next.discard.length - 1].defId);
  const before = prev.players[prev.currentPlayerIndex];
  const after = next.players.find((p) => p.id === before.id);
  if (!after) return null;
  if (after.distance !== before.distance) {
    const style: MoveStyle =
      def.special === "turbo"
        ? "turbo"
        : def.special === "raccourci"
          ? "shortcut"
          : def.special === "depassement"
            ? "overtake"
            : def.special === "derniereLigneDroite"
              ? "sprint"
              : (def.value ?? 0) >= 200
                ? "fast"
                : "drive";
    return { playerId: after.id, cue: { kind: "move", style } };
  }
  if (def.category === "defense") {
    return { playerId: after.id, cue: { kind: after.shields.length > before.shields.length ? "shield" : "repair" } };
  }
  if (def.special === "gpsStrategique") return { playerId: after.id, cue: { kind: "gps" } };
  return null;
}

export function pushState(renderer: SceneRenderer, prev: GameState | null, state: GameState) {
  if (prev && prev.startedAt !== state.startedAt) renderer.reset();
  const cue = prev ? cueFor(prev, state) : null;
  if (cue) renderer.cue(cue.playerId, cue.cue);
  if (cue?.cue.kind === "move") raceAudio.launch(cue.cue.style);
  const current = state.players[state.currentPlayerIndex]?.id;
  renderer.update(
    state.players.map((p) => ({
      id: p.id,
      color: CAR_PAINT[p.color],
      km: p.distance,
      hazard: p.hazard,
      limited: p.limited,
      shields: p.shields,
      active: p.id === current && state.phase !== "gameover",
    })),
    state.target,
  );
  if (state.phase === "gameover" && prev?.phase !== "gameover") renderer.celebrate();
}

