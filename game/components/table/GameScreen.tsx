"use client";

import { useBoardView } from "@/game/lib/store/boardViewStore";
import { SceneTable } from "@/game/components/scene/SceneTable";
import { ViewToggle } from "@/game/components/ui/ViewToggle";
import { GameTable, type GameTableProps } from "./GameTable";
import { BoardBoundary } from "./BoardBoundary";
import { DEFAULT_SCENE } from "@/game/components/scene/scenes/default";

/** The game screen on the board this device prefers: 3D scene or classic. */
export function GameScreen(props: GameTableProps) {
  const view = useBoardView();
  if (view === "3d")
    return (
      <BoardBoundary
        fallback={
          <GameTable
            {...props}
            headerExtra={
              <>
                <span role="status" className="text-xs text-amber-200">
                  Mode classique · rendu 3D indisponible
                </span>
                {props.headerExtra}
                <ViewToggle />
              </>
            }
          />
        }
      >
        <SceneTable {...props} scene={DEFAULT_SCENE} />
      </BoardBoundary>
    );
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
