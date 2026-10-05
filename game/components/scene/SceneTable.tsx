"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { GameTableProps } from "@/game/components/table/GameTable";
import { useAnimationQueue } from "@/game/hooks/useAnimationQueue";
import { useElementSize } from "@/game/hooks/useElementSize";
import { useSound } from "@/game/hooks/useSound";
import { useRaceAudio } from "@/game/audio/useRaceAudio";
import { EventToast } from "@/game/components/animations/EventToast";
import { VictoryOverlay } from "@/game/components/animations/VictoryOverlay";
import { TargetPicker } from "@/game/components/ui/TargetPicker";
import { SoundToggle } from "@/game/components/ui/SoundToggle";
import { ViewToggle } from "@/game/components/ui/ViewToggle";
import { Logo } from "@/game/components/ui/Logo";
import { SceneBoard } from "./SceneBoard";
import { WorldBoard } from "./WorldBoard";
import { CAR_PAINT } from "./sceneSync";
import { SceneHand } from "./SceneHand";
import { PlayerStatus } from "./PlayerStatus";
import type { SceneDef } from "./scenePath";

/**
 * The game screen on the illustrated 3D board. Same inputs as the classic
 * GameTable, so local and online games can show either.
 */
export function SceneTable({
  state,
  controls,
  consumeAnimation,
  viewerId,
  offlineIds,
  headerExtra,
  notice,
  onExit,
  onReplay,
  replayHint,
  onNewGame,
  scene,
  showViewToggle = true,
}: GameTableProps & {
  /** An illustrated picture to race on instead of the 3D world. */
  scene?: SceneDef;
  showViewToggle?: boolean;
}) {
  const currentEvent = useAnimationQueue(state.animationQueue, consumeAnimation);
  const { enabled: soundOn, toggle: toggleSound, play } = useSound();
  const [handRef, handBox] = useElementSize<HTMLDivElement>();
  const [overview, setOverview] = useState(false);

  useRaceAudio(state, currentEvent, { simulate: false });

  const current = state.players[state.currentPlayerIndex];
  // online: this device's player holds the hand; hotseat: whoever's turn it is
  const handOwner = (viewerId && state.players.find((p) => p.id === viewerId)) || current;
  const over = state.phase === "gameover";
  const isMyTurn = !over && handOwner.id === current.id;
  const leaderKm = Math.max(...state.players.map((p) => p.distance));

  // let the fireworks play before the results panel covers the road
  const [victoryReady, setVictoryReady] = useState(false);
  const [prevOver, setPrevOver] = useState(over);
  if (over !== prevOver) {
    setPrevOver(over);
    if (!over) setVictoryReady(false);
  }
  useEffect(() => {
    if (!over) return;
    const t = setTimeout(() => setVictoryReady(true), 3000);
    return () => clearTimeout(t);
  }, [over]);

  const yourTurn = viewerId ? current.id === viewerId : true;
  // from 4 pilots on, each one fits on a single line so the road stays visible
  const crowded = state.players.length >= 4;

  return (
    <main className="relative isolate h-dvh overflow-hidden bg-[#0d1420] text-white">
      {scene ? (
        // blurred copy of the picture behind the stage on wide screens
        // eslint-disable-next-line @next/next/no-img-element
        <img src={scene.image} alt="" className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
      ) : null}

      {/* the 3D world fills the screen; the picture keeps its portrait proportions */}
      {!scene ? <WorldBoard state={state} event={currentEvent} bottomInset={handBox.height} overview={overview} /> : null}
      <div className={clsx("absolute inset-0 mx-auto", scene && "max-w-[min(100vw,calc(100dvh*0.78))]")}>
        {scene ? <SceneBoard state={state} event={currentEvent} def={scene} bottomInset={handBox.height} /> : null}

        {/* top: players · logo · turn */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 via-black/15 to-transparent pb-10">
          <div className="flex items-start justify-between gap-2 px-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
            <div className={clsx("pointer-events-auto flex min-w-0 max-w-[16rem] flex-1 flex-col sm:w-[46%] sm:flex-none", crowded ? "gap-1" : "gap-1.5")}>
              {state.players.map((p, i) => {
                const active = p.id === current.id && !over;
                const offline = offlineIds?.includes(p.id) ?? false;
                return (
                  <div
                    key={p.id}
                    className={clsx(
                      "flex flex-col gap-1 rounded-xl border px-2 backdrop-blur-md transition-all",
                      crowded ? "py-0.5" : "py-1",
                      active ? "border-white/60 bg-[#12305c]/85 shadow-[0_0_18px_rgba(80,160,255,0.55)]" : "border-white/10 bg-black/45",
                      offline && "opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-sm text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]"
                        style={{ background: CAR_PAINT[p.color] }}
                      >
                        {i + 1}
                      </span>
                      <span className={clsx("min-w-0 flex-1 truncate font-hud font-bold", crowded ? "text-[0.8rem]" : "text-sm")}>
                        {p.name}
                        {p.id === viewerId && !crowded ? <span className="ml-1 font-semibold text-white/50">(vous)</span> : null}
                      </span>
                      {crowded && !offline ? <PlayerStatus player={p} mini /> : null}
                      {offline ? (
                        <span className="font-hud text-[0.55rem] font-bold uppercase tracking-wider text-[#ff8a7e]">Hors ligne</span>
                      ) : (
                        <span className={clsx("shrink-0 font-display leading-none text-[#ffd23f] drop-shadow", crowded ? "text-base" : "text-lg")}>
                          {p.distance}
                          <span className="ml-0.5 text-[0.65em] text-white/70">km</span>
                        </span>
                      )}
                      {p.distance === leaderKm && leaderKm > 0 && !offline ? <span className="text-xs">👑</span> : null}
                    </div>
                    {crowded ? null : <PlayerStatus player={p} compact />}
                  </div>
                );
              })}
            </div>

            {/* phones: no room for three columns, the logo moves under the buttons */}
            <div className="hidden flex-col items-center pt-0.5 sm:flex">
              <Logo size="sm" />
            </div>

            <div className="pointer-events-auto flex w-[7.5rem] shrink-0 flex-col items-end gap-1.5 sm:w-[34%] sm:max-w-[13rem]">
              <div className="flex gap-1.5">
                {showViewToggle ? <ViewToggle /> : null}
                <SoundToggle enabled={soundOn} onToggle={toggleSound} />
                <button onClick={onExit} aria-label="Quitter" className="btn-enroute-ghost panel-leather !h-9 !w-9 !p-0 !text-sm">
                  ✕
                </button>
              </div>
              <Logo size="sm" className="pointer-events-none -my-1 !w-full sm:hidden" />
              {!over ? (
                <div className="w-full rounded-xl border border-white/15 bg-black/50 px-2.5 py-1.5 text-right backdrop-blur-md">
                  <p className="font-hud text-[0.6rem] uppercase tracking-[0.2em] text-white/60">{yourTurn && viewerId ? "À vous" : "Tour de"}</p>
                  <p className="truncate font-hud text-base font-bold" style={{ color: CAR_PAINT[current.color] }}>
                    {current.name}
                  </p>
                  <p className="font-hud text-[0.62rem] font-semibold uppercase tracking-wider text-white/70">
                    {!yourTurn ? "Réfléchit…" : state.phase === "draw" ? "Piochez" : "Jouez ou défaussez"}
                  </p>
                </div>
              ) : null}
              {headerExtra}
            </div>
          </div>
          <div className="relative mx-auto mt-1 h-8 w-full max-w-md">
            <EventToast event={currentEvent} state={state} />
          </div>
        </div>

        {/* bottom: piles and the hand */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent pt-10">
          {notice ? <div className="pointer-events-none relative z-[55] mb-1 flex justify-center px-3">{notice}</div> : null}
          <div ref={handRef} className="pb-[env(safe-area-inset-bottom)]">
            <SceneHand
              middle={
                !scene && !over ? (
                  <button
                    onClick={() => setOverview((v) => !v)}
                    className="flex items-center gap-1.5 rounded-full border-2 border-white/40 bg-[#0e1522]/80 px-3 py-1.5 font-hud text-xs font-bold text-white shadow-[0_6px_16px_rgba(0,0,0,0.4)] backdrop-blur-md active:scale-95 sm:text-sm"
                  >
                    <span className="text-sm leading-none" aria-label={overview ? "Vue normale" : "Vue d'ensemble"}>
                      {overview ? "🚗" : "🗺️"}
                    </span>
                    {/* narrow phones: the icon alone, so the bigger draw pile keeps its room */}
                    <span className="hidden min-[400px]:inline">{overview ? "Vue normale" : "Vue d'ensemble"}</span>
                  </button>
                ) : null
              }
              player={handOwner}
              state={state}
              isMyTurn={isMyTurn}
              onDraw={controls.draw}
              onPlay={(card) => {
                play("cardPlay");
                controls.requestPlay(card);
              }}
              onDiscard={(card) => controls.discard(card)}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {currentEvent?.kind === "turnChange" ? (
          <motion.div
            key={currentEvent.id}
            // up top, under the players: the middle of the screen is where the action is
            className="pointer-events-none fixed inset-x-0 top-[calc(8.5rem+env(safe-area-inset-top))] z-40 flex justify-center px-6"
            initial={{ opacity: 0, scale: 0.8, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <div
              className="flex items-baseline gap-3 rounded-2xl border-2 bg-[#0d1626]/85 px-5 py-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur-md"
              style={{ borderColor: CAR_PAINT[current.color] }}
            >
              <p className="font-hud text-[0.65rem] font-bold uppercase tracking-[0.3em] text-white/70">{yourTurn ? "À toi" : "Tour de"}</p>
              <p className="font-display text-2xl tracking-wide" style={{ color: CAR_PAINT[current.color] }}>
                {yourTurn && viewerId ? "À VOUS !" : current.name.toUpperCase()}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {isMyTurn ? (
        <TargetPicker pending={controls.pendingTarget} state={state} onPick={controls.resolveTarget} onCancel={controls.cancelTarget} />
      ) : null}
      {over && victoryReady ? (
        <VictoryOverlay state={state} onReplay={onReplay} replayHint={replayHint} onNewGame={onNewGame} onMenu={onExit} />
      ) : null}
    </main>
  );
}
