"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { CardInstance, GameState } from "@/game/types/game";
import { createGame, gameReducer, type NewGameOptions } from "@/game/lib/engine/gameReducer";
import { useGameControls } from "@/game/hooks/useGameEngine";
import { useAnimationQueue } from "@/game/hooks/useAnimationQueue";
import { useElementSize } from "@/game/hooks/useElementSize";
import { useSound } from "@/game/hooks/useSound";
import { uid } from "@/game/utils/array";
import { EventToast } from "@/game/components/animations/EventToast";
import { VictoryOverlay } from "@/game/components/animations/VictoryOverlay";
import { TargetPicker } from "@/game/components/ui/TargetPicker";
import { SoundToggle } from "@/game/components/ui/SoundToggle";
import { Logo } from "@/game/components/ui/Logo";
import { SceneBoard, CAR_PAINT } from "./SceneBoard";
import { SceneHand } from "./SceneHand";
import type { SceneDef } from "./scenePath";

/** Hands dealt in demo mode, so every effect can be tried without luck. */
const DEMO_HANDS: string[][] = [
  ["dist200", "crevaison", "collision", "radar", "barrage", "passageLibre", "turbo", "raccourci", "gpsStrategique"],
  ["dist100", "roueSecours", "reparation", "panne", "pleinEssence", "gps", "depassement", "derniereLigneDroite", "passageLibre"],
];

function init({ options, demo }: { options: NewGameOptions; demo: boolean }): GameState {
  const state = createGame(options);
  if (demo) {
    DEMO_HANDS.forEach((ids, i) => {
      const player = state.players[i];
      if (player) player.hand = ids.map((defId) => ({ uid: uid(`${defId}-`), defId }) as CardInstance);
    });
  }
  return state;
}

export function SceneGame({
  options,
  demo,
  scene,
  onExit,
}: {
  options: NewGameOptions;
  demo: boolean;
  scene: SceneDef;
  onExit: () => void;
}) {
  const [state, dispatch] = useReducer(gameReducer, { options, demo }, init);
  const controls = useGameControls(state, dispatch);
  const consumeAnimation = useCallback(() => dispatch({ type: "CLEAR_ANIMATION" }), []);
  const currentEvent = useAnimationQueue(state.animationQueue, consumeAnimation);
  const { enabled: soundOn, toggle: toggleSound, play } = useSound();

  useEffect(() => {
    if (!currentEvent) return;
    const sound = {
      draw: "cardDraw",
      discard: "cardDiscard",
      move: "move",
      hazard: "hazard",
      shield: "shield",
      turnChange: "turnChange",
      victory: "victory",
    } as const;
    play(sound[currentEvent.kind]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent]);

  const current = state.players[state.currentPlayerIndex];
  const [handRef, handBox] = useElementSize<HTMLDivElement>();

  // let the fireworks play before the results panel covers the road
  const over = state.phase === "gameover";
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

  const leaderKm = Math.max(...state.players.map((p) => p.distance));

  return (
    <main className="relative isolate h-dvh overflow-hidden bg-[#0d1420] text-white">
      {/* blurred copy of the scene behind the stage on wide screens */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={scene.image} alt="" className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />

      <div className="absolute inset-0 mx-auto max-w-[min(100vw,calc(100dvh*0.78))]">
        <SceneBoard state={state} event={currentEvent} def={scene} bottomInset={handBox.height} />

        {/* top: players · logo · turn */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 via-black/15 to-transparent pb-10">
          <div className="flex items-start justify-between gap-2 px-2.5 pt-2.5">
            <div className="pointer-events-auto flex w-[46%] max-w-[16rem] flex-col gap-1.5">
              {state.players.map((p, i) => {
                const active = p.id === current.id && state.phase !== "gameover";
                return (
                  <div
                    key={p.id}
                    className={clsx(
                      "flex items-center gap-2 rounded-xl border px-2 py-1 backdrop-blur-md transition-all",
                      active ? "border-white/60 bg-[#12305c]/85 shadow-[0_0_18px_rgba(80,160,255,0.55)]" : "border-white/10 bg-black/45",
                    )}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-sm text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]"
                      style={{ background: CAR_PAINT[p.color] }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-hud text-sm font-bold">{p.name}</span>
                    <span className="font-display text-lg leading-none text-[#ffd23f] drop-shadow">
                      {p.distance}
                      <span className="ml-0.5 text-[0.65em] text-white/70">km</span>
                    </span>
                    {p.distance === leaderKm && leaderKm > 0 ? <span className="text-xs">👑</span> : null}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col items-center pt-0.5">
              <Logo size="sm" />
            </div>

            <div className="pointer-events-auto flex w-[30%] max-w-[12rem] flex-col items-end gap-1.5">
              <div className="flex gap-1.5">
                <SoundToggle enabled={soundOn} onToggle={toggleSound} />
                <button onClick={onExit} aria-label="Quitter" className="btn-enroute-ghost panel-leather !h-9 !w-9 !p-0 !text-sm">
                  ✕
                </button>
              </div>
              {state.phase !== "gameover" ? (
                <div className="w-full rounded-xl border border-white/15 bg-black/50 px-2.5 py-1.5 text-right backdrop-blur-md">
                  <p className="font-hud text-[0.6rem] uppercase tracking-[0.2em] text-white/60">Tour de</p>
                  <p className="truncate font-hud text-base font-bold" style={{ color: CAR_PAINT[current.color] }}>
                    {current.name}
                  </p>
                  <p className="font-hud text-[0.62rem] font-semibold uppercase tracking-wider text-white/70">
                    {state.phase === "draw" ? "Piochez" : "Jouez ou défaussez"}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="relative mx-auto mt-1 h-8 w-full max-w-md">
            <EventToast event={currentEvent} state={state} />
          </div>
        </div>

        {/* bottom: piles and the hand */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent pt-10">
          <div ref={handRef}>
          <SceneHand
            player={current}
            state={state}
            isMyTurn={state.phase !== "gameover"}
            onDraw={controls.draw}
            onPlay={(card) => {
              play("cardPlay");
              controls.requestPlay(card);
            }}
            onDiscard={(card) => {
              play("cardDiscard");
              controls.discard(card);
            }}
          />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {currentEvent?.kind === "turnChange" ? (
          <motion.div
            key={currentEvent.id}
            className="pointer-events-none fixed inset-x-0 top-[34%] z-40 flex justify-center px-6"
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            <div
              className="rounded-3xl border-2 bg-[#0d1626]/85 px-8 py-3 text-center shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-md"
              style={{ borderColor: CAR_PAINT[current.color] }}
            >
              <p className="font-hud text-xs font-bold uppercase tracking-[0.4em] text-white/70">À toi de jouer</p>
              <p className="font-display text-4xl tracking-wide" style={{ color: CAR_PAINT[current.color] }}>
                {current.name.toUpperCase()}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <TargetPicker pending={controls.pendingTarget} state={state} onPick={controls.resolveTarget} onCancel={controls.cancelTarget} />
      {over && victoryReady ? (
        <VictoryOverlay state={state} onReplay={() => dispatch({ type: "NEW_GAME", options })} onNewGame={onExit} onMenu={onExit} />
      ) : null}
    </main>
  );
}
