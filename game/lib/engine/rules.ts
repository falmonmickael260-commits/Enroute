import type { CardDef, GameState, HazardType, PlayerState } from "@/game/types/game";
import { getCardDef, HAZARD_TO_DEFENSE } from "./cardCatalog";

export type PlayIntent =
  | { kind: "distance" }
  | { kind: "attack"; needsTarget: true }
  | { kind: "defenseReactive" }
  | { kind: "defenseShield" }
  | { kind: "specialDistance" }
  | { kind: "specialOvertake"; needsTarget: true }
  | { kind: "specialUtility" };

export function isRoadClear(player: PlayerState): boolean {
  return player.hazard === null;
}

/** Whether a given hazard type is currently in effect on this player — RADAR
 * is tracked via the `limited` flag (a speed cap), not the `hazard` field
 * (a full stop), so the two need separate checks. */
export function hazardActive(player: PlayerState, hazard: HazardType): boolean {
  if (hazard === "radar") return player.limited;
  return player.hazard === hazard;
}

export function canPlayDistance(player: PlayerState, def: CardDef, target: number): boolean {
  if (player.finished) return false;
  if (!isRoadClear(player)) return false;
  if (player.distance >= target) return false;
  if (player.limited && (def.value ?? 0) > 50) return false;
  return true;
}

export function canPlayAttack(actor: PlayerState, victim: PlayerState, def: CardDef, target: number): boolean {
  if (!isRoadClear(actor)) return false; // a stopped car can't attack — only repair or discard
  if (actor.id === victim.id) return false;
  if (victim.finished || victim.distance >= target) return false;
  if (!def.hazard) return false;
  if (victim.hazard !== null || victim.limited) return false; // already hazarded or speed-limited
  const defenseNeeded = HAZARD_TO_DEFENSE[def.hazard];
  if (victim.shields.includes(defenseNeeded)) return false; // immune
  return true;
}

export function canPlayDefenseReactive(player: PlayerState, def: CardDef): boolean {
  if (!def.defense || !def.counters) return false;
  return hazardActive(player, def.counters);
}

export function canPlayDefenseShield(player: PlayerState, def: CardDef): boolean {
  if (!def.defense || !def.counters) return false;
  if (!isRoadClear(player)) return false; // stopped: only the matching repair can be played
  if (hazardActive(player, def.counters)) return false; // reactive is the right move here
  if (player.shields.includes(def.defense)) return false; // already immune
  return true;
}

export function canPlaySpecial(
  player: PlayerState,
  def: CardDef,
  state: GameState,
  targetId?: string,
): boolean {
  if (player.finished) return false;
  switch (def.special) {
    case "turbo":
      return isRoadClear(player) && player.distance < state.target;
    case "raccourci":
      return canPlayDistance(player, def, state.target);
    case "derniereLigneDroite":
      return (
        canPlayDistance(player, def, state.target) && player.distance >= state.target - 200
      );
    case "depassement": {
      if (!isRoadClear(player)) return false;
      if (!targetId) return true; // playable in principle if any valid target exists
      const victim = state.players.find((p) => p.id === targetId);
      if (!victim || victim.id === player.id) return false;
      return victim.distance > player.distance;
    }
    case "gpsStrategique":
      return true; // always usable: clears a hazard, or grants tempo if road is clear
    default:
      return false;
  }
}

export function hasAnyValidTarget(player: PlayerState, def: CardDef, state: GameState): boolean {
  if (def.category === "attaque") {
    return state.players.some((p) => canPlayAttack(player, p, def, state.target));
  }
  if (def.special === "depassement") {
    return state.players.some((p) => p.id !== player.id && p.distance > player.distance);
  }
  return true;
}

/** Can this card be played *right now*, in some form (attack/defense/distance/special)? Used for hand highlighting. */
export function isCardPlayable(player: PlayerState, cardDefId: string, state: GameState): boolean {
  const def = getCardDef(cardDefId);
  if (def.category === "distance") return canPlayDistance(player, def, state.target);
  if (def.category === "attaque") return hasAnyValidTarget(player, def, state);
  if (def.category === "defense") {
    return canPlayDefenseReactive(player, def) || canPlayDefenseShield(player, def);
  }
  if (def.category === "special") {
    if (def.special === "depassement") return hasAnyValidTarget(player, def, state);
    return canPlaySpecial(player, def, state);
  }
  return false;
}

/** What hazard badge to show for this player — folds the `limited` (radar) flag
 * back into a HazardType so the UI has one thing to render. */
export function displayHazard(player: PlayerState): HazardType | null {
  if (player.hazard) return player.hazard;
  if (player.limited) return "radar";
  return null;
}

export function activePlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

export function hazardLabel(hazard: HazardType): string {
  switch (hazard) {
    case "collision":
      return "Collision";
    case "crevaison":
      return "Crevaison";
    case "panne":
      return "Panne d'essence";
    case "radar":
      return "Radar";
    case "barrage":
      return "Barrage";
  }
}
