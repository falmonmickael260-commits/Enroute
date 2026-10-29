import assert from "node:assert/strict";
import test from "node:test";
import { slotsFor } from "../game/components/scene/carLayout";

test("3D road grid staggers groups onto at most two lanes", () => {
  for (let count = 1; count <= 18; count++) {
    const slots = slotsFor(count);
    assert.equal(slots.length, count);
    assert.ok(slots.every(({ lateral, along }) => Number.isFinite(lateral) && Number.isFinite(along)));
    assert.ok(new Set(slots.map(({ lateral, along }) => `${lateral}:${along}`)).size === count);
    assert.ok(slots.every(({ lateral }) => Math.abs(lateral) <= 0.5));
  }
});

test("six cars are arranged as three separated two-car rows", () => {
  assert.deepEqual(slotsFor(6), [
    { lateral: -0.5, along: 0 },
    { lateral: 0.5, along: 0 },
    { lateral: -0.5, along: -1.1 },
    { lateral: 0.5, along: -1.1 },
    { lateral: -0.5, along: -2.2 },
    { lateral: 0.5, along: -2.2 },
  ]);
});
