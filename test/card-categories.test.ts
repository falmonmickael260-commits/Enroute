import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CARD_IDENTITY,
  CardCategoryMark,
} from "../game/components/cards/CardCategoryMark";
import type { CardCategory } from "../game/types/game";

test("bonus, malus, parades and distance use different words, colours, symbols and patterns", () => {
  const identities = Object.values(CARD_IDENTITY);
  for (const key of ["label", "color", "symbol", "pattern"] as const)
    assert.equal(new Set(identities.map((i) => i[key])).size, 4, key);
  assert.equal(CARD_IDENTITY.attaque.label, "MALUS");
  assert.equal(CARD_IDENTITY.defense.label, "PARADE");
  assert.equal(CARD_IDENTITY.special.label, "BONUS");
});
test("phone card hands do not repeat the category legend above cards", () => {
  const categories = Object.keys(CARD_IDENTITY) as CardCategory[];
  assert.equal(
    new Set(
      categories.map((category) =>
        renderToStaticMarkup(createElement(CardCategoryMark, { category })),
      ),
    ).size,
    4,
  );
  for (const file of [
    "game/components/cards/PlayerHand.tsx",
    "game/components/scene/SceneHand.tsx",
  ]) {
    assert.ok(!readFileSync(resolve(process.cwd(), file), "utf8").includes("CardCategoryLegend"));
  }
});
