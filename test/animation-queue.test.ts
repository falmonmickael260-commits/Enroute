import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useAnimationQueue } from "../game/hooks/useAnimationQueue";
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
