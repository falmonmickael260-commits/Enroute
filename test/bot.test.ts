import assert from "node:assert/strict";
import test from "node:test";
import { chooseBotAction } from "../game/lib/engine/bot";
import { createGame, gameReducer } from "../game/lib/engine/gameReducer";
import type { GameState, PlayerColor } from "../game/types/game";

const colors: PlayerColor[] = ["crimson", "azure", "amber", "emerald", "violet", "rose"];

function game(count = 2): GameState {
  const state = createGame({
    id: "bots-test",
    target: 1000,
    players: colors.slice(0, count).map((color, i) => ({ id: `p${i}`, name: `Pilote ${i}`, color, isBot: i > 0 })),
  });
  state.players[1].isBot = true;
  state.currentPlayerIndex = 1;
  state.phase = "action";
  state.players[1].hand = [];
  return state;
}

test("bot takes the normal draw step first", () => {
  const state = game();
  state.phase = "draw";
  assert.deepEqual(chooseBotAction(state), { type: "DRAW_CARD" });
});

test("bot plays its highest available distance card", () => {
  const state = game();
  state.players[1].hand = [
    { uid: "small", defId: "dist25" },
    { uid: "fast", defId: "dist200" },
  ];
  assert.deepEqual(chooseBotAction(state), { type: "PLAY_DISTANCE", cardUid: "fast" });
});

test("bot repairs an active stop before choosing progress", () => {
  const state = game();
  state.players[1].hazard = "collision";
  state.players[1].hand = [{ uid: "repair", defId: "reparation" }, { uid: "small", defId: "dist25" }];
  const action = chooseBotAction(state);
  assert.deepEqual(action, { type: "PLAY_DEFENSE", cardUid: "repair" });
  const next = gameReducer(state, action!);
  assert.equal(next.players[1].hazard, null);
});

test("bot targets the leading valid opponent", () => {
  const state = game(3);
  state.players[0].distance = 100;
  state.players[2].distance = 600;
  state.players[1].hand = [{ uid: "attack", defId: "barrage" }];
  assert.deepEqual(chooseBotAction(state), { type: "PLAY_ATTACK", cardUid: "attack", targetId: "p2" });
});

test("bot discards when it has no legal move", () => {
  const state = game();
  state.players[1].hazard = "collision";
  state.players[1].hand = [{ uid: "stuck", defId: "dist200" }];
  assert.deepEqual(chooseBotAction(state), { type: "DISCARD_CARD", cardUid: "stuck" });
});
