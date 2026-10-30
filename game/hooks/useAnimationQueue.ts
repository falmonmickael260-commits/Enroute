"use client";

import { useEffect, useState } from "react";
import type { AnimationEvent } from "@/game/types/game";

const DEFAULT_DURATIONS: Record<AnimationEvent["kind"], number> = {
  draw: 500,
  discard: 650,
  move: 950,
  hazard: 1300,
  shield: 1300,
  turnChange: 1500,
  victory: 10,
};

export function useAnimationQueue(queue: AnimationEvent[], onConsume: () => void) {
  const [current, setCurrent] = useState<AnimationEvent | null>(null);
  const [seenQueue, setSeenQueue] = useState(queue);

  // Adjust state during render when the queue prop changes, instead of an effect,
  // so a freshly-pushed event is picked up on the same render (see react.dev/learn/you-might-not-need-an-effect).
  if (queue !== seenQueue) {
    setSeenQueue(queue);
    const next = queue[0] ?? null;
    if (next && next.id !== current?.id) {
      setCurrent(next);
    }
  }

  useEffect(() => {
    if (!current) return;
    const duration = DEFAULT_DURATIONS[current.kind];
    const timer = setTimeout(() => {
      setCurrent(null);
      onConsume();
    }, duration);
    return () => clearTimeout(timer);
  }, [current, onConsume]);

  return current;
}
