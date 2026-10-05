"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { raceAudio } from "@/game/audio/race";

/** Length of the opening flyover (the camera path in WorldStage lasts as long). */
export const INTRO_MS = 6500;

/** Black bands top and bottom, as in the cinema. */
export function Letterbox({ on, size = "11vh" }: { on: boolean; size?: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      {(["top-0", "bottom-0"] as const).map((edge) => (
        <motion.div
          key={edge}
          className={`absolute inset-x-0 ${edge} bg-black`}
          initial={false}
          animate={{ height: on ? size : 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}

const COUNT = [
  { at: 3600, label: "3" },
  { at: 4300, label: "2" },
  { at: 5000, label: "1" },
  { at: 5700, label: "PARTEZ !" },
];

/**
 * The race opens like a film: bands, the place and the distance over the
 * flyover, then the start count with its beeps. A tap skips it.
 */
export function IntroCinematic({ title, subtitle, onDone }: { title: string; subtitle: string; onDone: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let beeped = -1;
    const tick = () => {
      const e = performance.now() - start;
      let step = -1;
      COUNT.forEach((c, i) => {
        if (e >= c.at) step = i;
      });
      if (step > beeped) {
        beeped = step;
        raceAudio.countdown(COUNT.length - 1 - step);
      }
      setElapsed(e);
      if (e < INTRO_MS) raf = requestAnimationFrame(tick);
      else setClosing(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(onDone, 450);
    return () => clearTimeout(t);
  }, [closing, onDone]);

  const titleOn = elapsed > 500 && elapsed < 3300;
  const count = [...COUNT].reverse().find((c) => elapsed >= c.at);
  const countOn = count && elapsed < INTRO_MS;

  return (
    <div className="fixed inset-0 z-[60]" onClick={() => setClosing(true)} role="button" aria-label="Passer l'introduction">
      <Letterbox on={!closing} />
      <AnimatePresence>
        {titleOn && !closing ? (
          <motion.div
            key="title"
            className="pointer-events-none absolute inset-x-0 top-[22%] flex flex-col items-center px-6 text-center"
            initial={{ opacity: 0, y: 14, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.18em" }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <p className="font-display text-4xl text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)] sm:text-6xl">{title}</p>
            <p className="mt-1 font-hud text-sm font-bold uppercase tracking-[0.35em] text-[#ffd23f] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">{subtitle}</p>
          </motion.div>
        ) : null}
        {countOn && !closing ? (
          <motion.p
            key={count.label}
            className="pointer-events-none absolute inset-x-0 top-[30%] text-center font-display text-7xl text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)] sm:text-8xl"
            style={{ color: count.label === "PARTEZ !" ? "#7dff9b" : undefined }}
            initial={{ opacity: 0, scale: 1.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {count.label}
          </motion.p>
        ) : null}
      </AnimatePresence>
      {!closing ? (
        <p className="pointer-events-none absolute bottom-[calc(11vh+0.5rem)] right-4 font-hud text-xs font-bold uppercase tracking-widest text-white/60">
          Touchez pour passer ›
        </p>
      ) : null}
    </div>
  );
}

/** The winner crosses the line: bands and a headline while the camera films it. */
export function FinishCinematic({ name, color }: { name: string; color: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <Letterbox on />
      <motion.div
        className="absolute inset-x-0 top-[16%] flex flex-col items-center text-center"
        initial={{ opacity: 0, scale: 1.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
      >
        <p className="font-hud text-sm font-bold uppercase tracking-[0.4em] text-white/80 drop-shadow">Ligne d&apos;arrivée</p>
        <p className="font-display text-5xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)] sm:text-7xl" style={{ color }}>
          {name.toUpperCase()}
        </p>
      </motion.div>
    </div>
  );
}
