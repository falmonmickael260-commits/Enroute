import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  createGame,
  gameReducer,
  type GameAction,
} from "../game/lib/engine/gameReducer";
import { CARD_CATALOG, getCardDef } from "../game/lib/engine/cardCatalog";
import {
  canPlayAttack,
  canPlaySpecial,
  isCardPlayable,
} from "../game/lib/engine/rules";
import { buildDeck, HAND_LIMIT } from "../game/lib/engine/deck";
import type { PlayerColor } from "../game/types/game";
import { canOfferCard } from "../game/lib/cardAffordance";

const colors: PlayerColor[] = [
  "crimson",
  "azure",
  "amber",
  "emerald",
  "violet",
  "rose",
];
function game(count = 2, target = 1000) {
  return createGame({
    id: "regression",
    target,
    players: colors
      .slice(0, count)
      .map((color, i) => ({ id: `p${i}`, name: `Pilote ${i}`, color })),
  });
}

test("a stopped car cannot be offered an overtake that the reducer refuses", () => {
  const state = game();
  state.players[1].distance = 100;
  state.players[0].hazard = "collision";
  assert.equal(canOfferCard(state.players[0], "depassement", state), false);
  state.players[0].hazard = null;
  assert.equal(canOfferCard(state.players[0], "depassement", state), true);
});

test("protected gameplay, online contracts, SQL and Revanche integration are byte-identical", () => {
  const hashes = JSON.parse(
    readFileSync(
      new URL("../docs/gameplay-protected.json", import.meta.url),
      "utf8",
    ),
  );
  for (const [path, hash] of Object.entries(hashes))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(new URL(`../${path}`, import.meta.url)))
        .digest("hex"),
      hash,
      path,
    );
});

test("all 20 original cards keep their deck multiplicity and unique identifiers", () => {
  const deck = buildDeck();
  assert.equal(Object.keys(CARD_CATALOG).length, 20);
  assert.equal(new Set(deck.map((c) => c.uid)).size, deck.length);
  for (const def of Object.values(CARD_CATALOG))
    assert.equal(
      deck.filter((c) => c.defId === def.id).length,
      def.count,
      def.id,
    );
});

for (const count of [2, 3, 4, 5, 6])
  for (const target of [700, 1000, 1500])
    test(`${count} players / ${target} km: dealing, full game, effects and victory`, () => {
      let state = game(count, target);
      assert.ok(state.players.every((p) => p.hand.length === HAND_LIMIT));
      for (let step = 0; step < 8000 && state.phase !== "gameover"; step++) {
        if (state.phase === "draw")
          state = gameReducer(state, { type: "DRAW_CARD" });
        const player = state.players[state.currentPlayerIndex];
        const card = player.hand.find(
          (c) =>
            isCardPlayable(player, c.defId, state) &&
            (getCardDef(c.defId).category !== "special" ||
              canPlaySpecial(player, getCardDef(c.defId), state)),
        );
        let action: GameAction;
        if (!card)
          action = player.hand.length
            ? { type: "DISCARD_CARD", cardUid: player.hand[0].uid }
            : { type: "SKIP_TURN" };
        else {
          const def = getCardDef(card.defId);
          if (def.category === "distance")
            action = { type: "PLAY_DISTANCE", cardUid: card.uid };
          else if (def.category === "defense")
            action = { type: "PLAY_DEFENSE", cardUid: card.uid };
          else if (def.category === "attaque") {
            const victim = state.players.find((p) =>
              canPlayAttack(player, p, def, target),
            );
            assert.ok(victim);
            action = {
              type: "PLAY_ATTACK",
              cardUid: card.uid,
              targetId: victim.id,
            };
          } else {
            const victim = state.players.find(
              (p) =>
                p.id !== player.id && canPlaySpecial(player, def, state, p.id),
            );
            action = {
              type: "PLAY_SPECIAL",
              cardUid: card.uid,
              targetId: victim?.id,
            };
          }
        }
        state = gameReducer(state, action);
        while (state.animationQueue.length)
          state = gameReducer(state, { type: "CLEAR_ANIMATION" });
        assert.equal(state.players.length, count);
        assert.ok(
          state.players.every((p) => p.distance >= 0 && p.distance <= target),
        );
      }
      assert.equal(state.phase, "gameover");
      assert.ok(state.winnerId);
      assert.equal(
        state.players.find((p) => p.id === state.winnerId)?.distance,
        target,
      );
      const final = gameReducer(state, { type: "DRAW_CARD" });
      assert.equal(final.winnerId, state.winnerId);
    });

for (const def of Object.values(CARD_CATALOG).filter(
  (c) => c.category === "distance",
))
  test(`${def.id}: exact progression and radar restrictions`, () => {
    const state = game();
    state.phase = "action";
    state.players[0].hand = [{ uid: "test", defId: def.id }];
    assert.equal(
      gameReducer(state, { type: "PLAY_DISTANCE", cardUid: "test" }).players[0]
        .distance,
      def.value,
    );
    state.players[0].limited = true;
    assert.equal(
      gameReducer(state, { type: "PLAY_DISTANCE", cardUid: "test" }).players[0]
        .distance,
      (def.value ?? 0) > 50 ? 0 : def.value,
    );
  });

for (const defense of Object.values(CARD_CATALOG).filter(
  (c) => c.category === "defense",
))
  test(`${defense.id}: matching hazard repair and protection`, () => {
    const state = game();
    state.phase = "action";
    state.players[0].hand = [{ uid: "test", defId: defense.id }];
    const protectedState = gameReducer(state, {
      type: "PLAY_DEFENSE",
      cardUid: "test",
    });
    assert.ok(protectedState.players[0].shields.includes(defense.defense!));
    assert.equal(protectedState.currentPlayerIndex, 0);
    if (defense.counters === "radar") state.players[0].limited = true;
    else state.players[0].hazard = defense.counters!;
    const repaired = gameReducer(state, {
      type: "PLAY_DEFENSE",
      cardUid: "test",
    });
    assert.equal(repaired.players[0].hazard, null);
    assert.equal(repaired.players[0].limited, false);
  });

for (const attack of Object.values(CARD_CATALOG).filter(
  (c) => c.category === "attaque",
))
  test(`${attack.id}: original target effect and matching immunity`, () => {
    const state = game();
    state.phase = "action";
    state.players[0].hand = [{ uid: "test", defId: attack.id }];
    const result = gameReducer(state, {
      type: "PLAY_ATTACK",
      cardUid: "test",
      targetId: state.players[1].id,
    });
    if (attack.hazard === "radar")
      assert.equal(result.players[1].limited, true);
    else assert.equal(result.players[1].hazard, attack.hazard);
    const defense = Object.values(CARD_CATALOG).find(
      (c) => c.counters === attack.hazard,
    )!;
    state.players[1].shields = [defense.defense!];
    const immune = gameReducer(state, {
      type: "PLAY_ATTACK",
      cardUid: "test",
      targetId: state.players[1].id,
    });
    assert.equal(immune.players[0].hand.length, 1);
    assert.equal(immune.players[1].hazard, null);
    assert.equal(immune.players[1].limited, false);
  });

for (const special of Object.values(CARD_CATALOG).filter(
  (c) => c.category === "special",
))
  test(`${special.id}: original distance or utility effect`, () => {
    const state = game();
    state.phase = "action";
    state.players[0].hand = [{ uid: "test", defId: special.id }];
    state.players[0].distance = 800;
    state.players[1].distance = 850;
    const result = gameReducer(state, {
      type: "PLAY_SPECIAL",
      cardUid: "test",
      targetId: state.players[1].id,
    });
    if (special.id === "gpsStrategique")
      assert.equal(result.currentPlayerIndex, 0);
    else
      assert.equal(
        result.players[0].distance,
        special.id === "depassement" ? 860 : 800 + (special.value ?? 0),
      );
  });
