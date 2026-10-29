import type { GameState, PlayerState } from "@/game/types/game";
import { getCardDef } from "./engine/cardCatalog";
import { canPlaySpecial, isCardPlayable } from "./engine/rules";

/** Reflect the reducer's existing validation in the UI, including a stopped overtaker. */
export function canOfferCard(
  player: PlayerState,
  defId: string,
  state: GameState,
) {
  const def = getCardDef(defId);
  return (
    isCardPlayable(player, defId, state) &&
    (def.category !== "special" || canPlaySpecial(player, def, state))
  );
}
