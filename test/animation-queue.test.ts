import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { animationDuration, useAnimationQueue } from "../game/hooks/useAnimationQueue";
import type { AnimationEvent } from "../game/types/game";

function Probe({ queue }: { queue: AnimationEvent[] }) {
  const event = useAnimationQueue(queue, () => {});
  return createElement("span", null, event?.id ?? "empty");
}
test("a remounted board immediately picks up its pending animation", () => {
  assert.equal(
    renderToString(
      createElement(Probe, {
        queue: [{ id: "reconnected-event", kind: "draw", playerId: "p1" }],
      }),
    ),
    "<span>reconnected-event</span>",
  );
});
test("an empty restored queue displays no stale event", () => {
  assert.equal(
    renderToString(createElement(Probe, { queue: [] })),
    "<span>empty</span>",
  );
});

test("the follow camera remains with a longer authoritative distance move", () => {
  const shortMove = animationDuration({ id: "short", kind: "move", playerId: "p1", from: 0, to: 50 });
  const longMove = animationDuration({ id: "long", kind: "move", playerId: "p1", from: 0, to: 200 });
  assert.ok(shortMove > 950);
  assert.ok(longMove > shortMove);
  assert.ok(longMove <= 3300);
});
