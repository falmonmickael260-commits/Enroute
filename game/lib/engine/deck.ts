import type { CardInstance } from "@/game/types/game";
import { CARD_CATALOG } from "./cardCatalog";
import { shuffle, uid } from "@/game/utils/array";

export function buildDeck(): CardInstance[] {
  const cards: CardInstance[] = [];
  for (const def of Object.values(CARD_CATALOG)) {
    for (let i = 0; i < def.count; i++) {
      cards.push({ uid: uid(`${def.id}-`), defId: def.id });
    }
  }
  return shuffle(cards);
}

export const HAND_LIMIT = 7;
export const DEFAULT_TARGET = 1000;
export const FINAL_STRETCH_FROM = 800;

/** Nombre maximum de pilotes dans une partie (locale ou en ligne). */
export const MAX_PLAYERS = 6;

/**
 * Anti-blocage : au-delà de ce nombre de pioches consécutives en étant arrêté,
 * le joueur pioche directement la carte de réparation qui lui manque.
 */
export const STUCK_TURNS_LIMIT = 4;
