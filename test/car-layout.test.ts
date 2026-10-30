import assert from "node:assert/strict";
import test from "node:test";
import coastalScene from "../game/components/scene/scenes/provisoire.json";
import { slotsFor } from "../game/components/scene/carLayout";
import { ScenePath } from "../game/components/scene/scenePath";
import { PictureStage } from "../game/components/scene/PictureStage";

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
    { lateral: -0.25, along: -4 },
    { lateral: 0.25, along: -4 },
  ]);
});

test("2, 3 and 4 car grids use distinct, centred road positions", () => {
  const path = new ScenePath(coastalScene);
  const stage = new PictureStage(path);
  const start = path.start;
  for (const count of [2, 3, 4]) {
    const poses = slotsFor(count).map((slot) => {
      const pose = stage.place(0, 1000, slot.lateral, slot.along);
      return stage.project(pose.position, pose.scale);
    });
    const xs = poses.map(({ x }) => x).sort((a, b) => a - b);
    assert.equal(new Set(xs).size, count, `${count} distinct cars`);
    assert.ok(xs[0] > start.x - start.s, `${count} cars stay inside left road edge`);
    assert.ok(xs.at(-1)! < start.x + start.s, `${count} cars stay inside right road edge`);
    assert.ok(poses.every(({ size }) => size >= start.s * 0.62), `${count} cars remain prominent at the start`);
  }
});
