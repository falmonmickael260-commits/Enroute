"use client";

import { setBoardView, useBoardView } from "@/game/lib/store/boardViewStore";

/** Switches between the 3D scene and the classic board, mid-game. */
export function ViewToggle() {
  const view = useBoardView();
  const next = view === "3d" ? "classic" : "3d";
  return (
    <button
      onClick={() => setBoardView(next)}
      aria-label={view === "3d" ? "Passer au plateau classique" : "Passer au plateau 3D"}
      title={view === "3d" ? "Plateau classique" : "Plateau 3D"}
      className="btn-enroute-ghost panel-leather !h-9 !w-auto !px-2.5 !py-0 font-display !text-sm tracking-wide sm:!h-10"
    >
      {view === "3d" ? "2D" : "3D"}
    </button>
  );
}
