"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { GameState } from "@/game/types/game";
import { AMBIANCES } from "@/game/lib/ambiances";
import { useElementSize } from "@/game/hooks/useElementSize";
import { BoardArt } from "./BoardArt";
import { BOARD, pointAtLength } from "./roadPath";
import { layoutPieces, pieceScaleFor, type PieceSlot } from "./pieceLayout";
import { PieceDefs, PlayerPiece } from "@/game/components/players/PlayerPiece";

/** Below this rendered width the camera zooms in and follows the active car. */
const CLOSE_UP_BELOW = 620;
const CLOSE_UP_ZOOM = 1.9;

function PiecesLayer({ state, slots, scale }: { state: GameState; slots: Record<string, PieceSlot>; scale: number }) {
  const activeId = state.phase === "gameover" ? state.winnerId : state.players[state.currentPlayerIndex]?.id;
  const headlights = AMBIANCES[state.ambiance].lights;
  // Active player's pion is drawn last so it sits on top.
  const order = [...state.players.keys()].sort((a, b) => Number(state.players[a].id === activeId) - Number(state.players[b].id === activeId));

  return (
    <svg viewBox={`0 0 ${BOARD.width} ${BOARD.height}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <PieceDefs />
      </defs>
      {order.map((i) => {
        const p = state.players[i];
        return (
          <PlayerPiece
            key={p.id}
            player={p}
            number={i + 1}
            slot={slots[p.id]}
            active={p.id === activeId}
            headlights={headlights}
            scale={scale}
          />
        );
      })}
    </svg>
  );
}

export function Board({ state, caption }: { state: GameState; caption?: ReactNode }) {
  const [surfaceRef, surface] = useElementSize<HTMLDivElement>();
  const [overview, setOverview] = useState(false);

  // Follow-camera only on phones (portrait or short landscape); tablets and
  // laptops keep the whole board in view and rely on bigger pions instead.
  const phone = surface.width > 0 && (window.innerWidth < 640 || window.innerHeight < 520);
  const small = phone && surface.width < CLOSE_UP_BELOW;
  const zoom = small && !overview ? CLOSE_UP_ZOOM : 1;
  const pieceScale = pieceScaleFor((surface.width / BOARD.width) * zoom);

  const slots = useMemo(
    () => layoutPieces(state.players.map((p) => ({ id: p.id, distance: p.distance })), state.target, pieceScale),
    [state.players, state.target, pieceScale],
  );

  const camera = useMemo(() => {
    if (zoom === 1) return { x: 0, y: 0, scale: 1 };
    const focusId = state.phase === "gameover" ? state.winnerId : state.players[state.currentPlayerIndex]?.id;
    const focus = pointAtLength(focusId ? slots[focusId].s : 0);
    const k = surface.width / BOARD.width;
    const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
    return {
      x: clamp(surface.width / 2 - focus.x * k * zoom, surface.width - surface.width * zoom),
      y: clamp(surface.height / 2 - focus.y * k * zoom, surface.height - surface.height * zoom),
      scale: zoom,
    };
  }, [zoom, slots, state.phase, state.winnerId, state.players, state.currentPlayerIndex, surface.width, surface.height]);

  return (
    <div className="relative w-full md:[perspective:1900px]">
      {/* No tilt while the camera is zoomed: a 3D-transformed layer gets rasterised
          before the zoom and turns blurry. */}
      <div className={clsx("board-frame", zoom === 1 && "md:[transform:rotateX(11deg)] md:[transform-origin:50%_85%]")}>
        {caption ? (
          <div className="absolute bottom-0 left-1/2 z-20 w-max max-w-[92%] -translate-x-1/2 translate-y-[55%]">{caption}</div>
        ) : null}
        <div ref={surfaceRef} className="board-surface" style={{ aspectRatio: `${BOARD.width} / ${BOARD.height}` }}>
          <motion.div
            className="absolute inset-0 origin-top-left"
            initial={false}
            animate={camera}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
          >
            <BoardArt ambiance={state.ambiance} target={state.target} />
            <PiecesLayer key={state.startedAt} state={state} slots={slots} scale={pieceScale} />
          </motion.div>
          {small ? (
            <button
              onClick={() => setOverview((v) => !v)}
              className="absolute bottom-2 right-2 z-10 rounded-full bg-black/60 px-3 py-1.5 font-hud text-[0.7rem] font-semibold uppercase tracking-wider text-white backdrop-blur-sm"
            >
              {overview ? "Suivre la voiture" : "Vue d'ensemble"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
