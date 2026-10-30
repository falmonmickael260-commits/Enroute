import assert from "node:assert/strict";
import test from "node:test";
import { slotsFor } from "../game/components/scene/carLayout";

test("3D race grid fills four lanes while keeping groups centred", () => {
  for (let count = 1; count <= 18; count++) {
    const slots = slotsFor(count);
    assert.equal(slots.length, count);
    assert.ok(slots.every(({ lateral, along }) => Number.isFinite(lateral) && Number.isFinite(along)));
    assert.ok(new Set(slots.map(({ lateral, along }) => `${lateral}:${along}`)).size === count);
    assert.ok(slots.every(({ lateral }) => Math.abs(lateral) <= 0.75));
  }
});

test("six cars occupy four lanes and continue in a centred second row", () => {
  assert.deepEqual(slotsFor(6), [
    { lateral: -0.75, along: 0 },
    { lateral: -0.25, along: 0 },
    { lateral: 0.25, along: 0 },
    { lateral: 0.75, along: 0 },
    { lateral: -0.25, along: -1.1 },
    { lateral: 0.25, along: -1.1 },
  ]);
});
