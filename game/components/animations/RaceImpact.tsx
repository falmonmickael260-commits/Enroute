"use client";
import type { CSSProperties } from "react";
import type { AnimationEvent } from "@/game/types/game";

/** A short optical response to existing events; never delays or dispatches game actions. */
export function RaceImpact({ event }: { event: AnimationEvent | null }) {
  if (!event || !["move", "hazard", "shield"].includes(event.kind)) return null;
  const kind = event.kind === "hazard" ? event.hazard : event.kind;
  return (
    <div
      key={event.id}
      aria-hidden
      className={`race-impact race-impact-${kind}`}
    >
      {Array.from({ length: kind === "move" ? 12 : 8 }, (_, i) => (
        <i key={i} style={{ "--i": i } as CSSProperties} />
      ))}
    </div>
  );
}
