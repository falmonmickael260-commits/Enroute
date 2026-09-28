"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CardInstance } from "@/game/types/game";
import { Card } from "./Card";

export function DiscardPile({ pile }: { pile: CardInstance[] }) {
  const top = pile[pile.length - 1];
  const under = pile.slice(-3, -1);

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2">
      <div className="panel-leather rounded-2xl p-1.5 sm:p-2.5">
        <div className="relative h-[5.25rem] w-14 sm:h-[6.75rem] sm:w-[4.5rem] lg:h-36 lg:w-24">
          <div className="absolute inset-0 rounded-xl border-2 border-dashed border-[var(--color-brass-300)]/25" />
          {under.map((c, i) => (
            <div
              key={c.uid}
              className="absolute inset-0 opacity-80"
              style={{ transform: `rotate(${(i - 1) * 7}deg) translate(${(i - 1) * 3}px, 2px)` }}
            >
              <Card size="md" defId={c.defId} className="!h-full !w-full" />
            </div>
          ))}
          <AnimatePresence mode="popLayout">
            {top ? (
              <motion.div
                key={top.uid}
                layoutId={`hand-${top.uid}`}
                initial={{ rotate: -14, scale: 0.9, opacity: 0 }}
                animate={{ rotate: 4, scale: 1, opacity: 1 }}
                className="absolute inset-0"
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
              >
                <Card size="md" defId={top.defId} className="!h-full !w-full" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      <span className="font-hud text-[0.7rem] font-bold uppercase tracking-[0.25em] text-[var(--color-brass-300)] drop-shadow">
        Défausse · {pile.length}
      </span>
    </div>
  );
}
