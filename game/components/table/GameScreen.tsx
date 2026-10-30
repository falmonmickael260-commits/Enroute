"use client";

import { useBoardView } from "@/game/lib/store/boardViewStore";
import { SceneTable } from "@/game/components/scene/SceneTable";
import { ViewToggle } from "@/game/components/ui/ViewToggle";
import { GameTable, type GameTableProps } from "./GameTable";

/** The game screen on the board this device prefers: 3D scene or classic. */
export function GameScreen(props: GameTableProps) {
  const view = useBoardView();
  if (view === "3d") return <SceneTable {...props} />;
  return (
    <GameTable
      {...props}
      headerExtra={
        <>
          {props.headerExtra}
          <ViewToggle />
        </>
      }
    />
  );
}
