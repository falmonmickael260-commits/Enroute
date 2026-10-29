import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CARD_IDENTITY,
  CardCategoryMark,
  CardCategoryLegend,
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
test("four distinct category symbols are accompanied by a visible textual legend", () => {
  const categories = Object.keys(CARD_IDENTITY) as CardCategory[];
  assert.equal(
    new Set(
      categories.map((category) =>
        renderToStaticMarkup(createElement(CardCategoryMark, { category })),
      ),
    ).size,
    4,
  );
  const legend = renderToStaticMarkup(createElement(CardCategoryLegend));
  for (const category of categories)
    assert.ok(legend.includes(CARD_IDENTITY[category].label));
});
