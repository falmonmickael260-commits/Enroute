"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useElementSize } from "@/game/hooks/useElementSize";
import { BOARD } from "./roadPath";

const RATIO = BOARD.width / BOARD.height;
/** Room under the frame for its visible thickness and the hanging turn plate. */
const BELOW_FRAME = 56;

/**
 * Fills its (flex) parent and renders the board as large as fits both the
 * available width and height, so the game screen never has to scroll.
 */
export function BoardFit({ className, children }: { className?: string; children: ReactNode }) {
  const [ref, box] = useElementSize<HTMLDivElement>();

  let width = 0;
  if (box.width > 0 && box.height > 0) {
    // Mirrors .board-frame's padding: clamp(10px, 1.6vw, 20px).
    const pad = Math.min(20, Math.max(10, window.innerWidth * 0.016));
    const byHeight = (box.height - BELOW_FRAME - 2 * pad) * RATIO + 2 * pad;
    width = Math.max(160, Math.min(box.width, byHeight));
  }

  return (
    // Centered in its slot (phones leave spare height when the width is the limit);
    // the bottom margin keeps the hanging turn plate inside the slot.
    <div ref={ref} className={clsx("flex min-h-0 min-w-0 items-center justify-center", className)}>
      {width > 0 ? (
        <div className="relative" style={{ width, marginBottom: BELOW_FRAME }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
