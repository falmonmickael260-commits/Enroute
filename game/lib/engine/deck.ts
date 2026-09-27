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
