import type { GameAction } from "./gameReducer";
import type { GameState } from "@/game/types/game";
import { getCardDef } from "./cardCatalog";
import { canPlayAttack, canPlayDefenseReactive, isCardPlayable } from "./rules";

interface Candidate {
  action: GameAction;
  score: number;
}

/** Pick a legal move for a local computer driver without changing game rules. */
export function chooseBotAction(state: GameState): GameAction | null {
  if (state.phase === "draw") return { type: "DRAW_CARD" };
  if (state.phase !== "action") return null;

  const player = state.players[state.currentPlayerIndex];
  const candidates: Candidate[] = [];
  for (const card of player.hand) {
    const def = getCardDef(card.defId);
    if (!isCardPlayable(player, card.defId, state)) continue;

    if (def.category === "distance") {
      candidates.push({ action: { type: "PLAY_DISTANCE", cardUid: card.uid }, score: 150 + (def.value ?? 0) });
      continue;
    }

    if (def.category === "attaque") {
      const victim = state.players
        .filter((candidate) => canPlayAttack(player, candidate, def, state.target))
        .sort((a, b) => b.distance - a.distance)[0];
      if (victim) {
        candidates.push({
          action: { type: "PLAY_ATTACK", cardUid: card.uid, targetId: victim.id },
          score: 240 + Math.round((victim.distance / state.target) * 60),
        });
      }
      continue;
    }

    if (def.category === "defense") {
      const reactive = canPlayDefenseReactive(player, def);
      candidates.push({
        action: { type: "PLAY_DEFENSE", cardUid: card.uid },
        score: reactive ? 1000 : 270,
      });
      continue;
    }

    if (def.category === "special") {
      switch (def.special) {
        case "turbo":
        case "raccourci":
        case "derniereLigneDroite":
          candidates.push({
            action: { type: "PLAY_SPECIAL", cardUid: card.uid },
            score: def.special === "derniereLigneDroite" ? 600 : 150 + (def.value ?? 0),
          });
          break;
        case "depassement": {
          const victim = state.players
            .filter((candidate) => candidate.id !== player.id && candidate.distance > player.distance)
            .sort((a, b) => b.distance - a.distance)[0];
          if (victim) {
            candidates.push({
              action: { type: "PLAY_SPECIAL", cardUid: card.uid, targetId: victim.id },
              score: 220 + Math.min(60, victim.distance - player.distance),
            });
          }
          break;
        }
        case "gpsStrategique":
          candidates.push({
            action: { type: "PLAY_SPECIAL", cardUid: card.uid },
            score: player.hazard || player.limited ? 1100 : 285,
          });
          break;
      }
    }
  }

  if (candidates.length) return candidates.sort((a, b) => b.score - a.score)[0].action;

  // When every card is unusable, shed a card that is least likely to help
  // later; the reducer still owns the actual discard and turn transition.
  const discard = [...player.hand].sort((a, b) => discardCost(a.defId, state) - discardCost(b.defId, state))[0];
  return discard ? { type: "DISCARD_CARD", cardUid: discard.uid } : { type: "SKIP_TURN" };
}

function discardCost(defId: string, state: GameState): number {
  const def = getCardDef(defId);
  if (def.category === "distance") return 50 + (def.value ?? 0);
  if (def.category === "attaque") return 90;
  if (def.category === "defense") return 25;
  if (def.special === "depassement") return 80;
  if (def.special === "gpsStrategique" && (state.players[state.currentPlayerIndex].hazard || state.players[state.currentPlayerIndex].limited)) return 120;
  return 60 + (def.value ?? 0);
}
