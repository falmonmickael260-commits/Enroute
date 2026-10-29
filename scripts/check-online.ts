/** Opt-in integration check. Creates its own private test room and leaves every seat. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createRoom,
  joinRoom,
  setReady,
  setCar,
  roomSync,
  startGame,
  commitState,
  leaveRoom,
  type Seat,
} from "../game/lib/online/api";
import { createGame, gameReducer } from "../game/lib/engine/gameReducer";

const seats: Seat[] = [];
let code = "";
async function main() {
  try {
    const playerId = randomUUID();
    const created = await createRoom(playerId, "QA Kilomax", {
      ambiance: "jour",
      target: 700,
    });
    code = created.code;
    seats.push({ playerId, secret: created.secret });
    const second = randomUUID();
    const joined = await joinRoom(code, second, "QA Copilote");
    seats.push({ playerId: second, secret: joined.secret });
    for (const seat of seats) await setReady(code, seat, true);
    await setCar(code, seats[0], "sedan");
    await setCar(code, seats[1], "race-future");
    const lobby = await roomSync(code, seats[0], -1);
    assert.equal(lobby.players.length, 2);
    assert.equal(lobby.players[0].car, "sedan");
    const state = createGame({ id: code, target: 700, players: lobby.players });
    await startGame(code, seats[0], state);
    const started = await roomSync(code, seats[0], -1);
    assert.equal(started.status, "playing");
    assert.ok(started.state);
    const actor = seats.find(
      (s) =>
        s.playerId ===
        started.state!.players[started.state!.currentPlayerIndex].id,
    )!;
    const drawn = gameReducer(started.state, { type: "DRAW_CARD" });
    const committed = await commitState(
      code,
      actor,
      started.version,
      drawn,
      drawn.animationQueue,
    );
    assert.equal(committed.ok, true);
    const other = seats.find((s) => s.playerId !== actor.playerId)!;
    const synchronized = await roomSync(code, other, -1);
    assert.equal(synchronized.version, committed.version);
    assert.equal(synchronized.state?.phase, "action");
    const reconnected = await roomSync(code, actor, -1);
    assert.equal(
      reconnected.state?.players[0].hand.length,
      drawn.players[0].hand.length,
    );
    console.log(
      "PASS: private room, two seats, garage, ready, start, action commit, remote synchronization and reconnect snapshot",
    );
  } catch (error) {
    console.error(
      "Online check:",
      error instanceof Error ? error.message : "unavailable",
    );
    process.exitCode = 1;
  } finally {
    for (const seat of [...seats].reverse()) {
      try {
        await leaveRoom(code, seat);
      } catch {
        console.error("Test seat cleanup unavailable");
      }
    }
  }
}
void main();
