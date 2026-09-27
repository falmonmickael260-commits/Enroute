"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CardInstance } from "@/game/types/game";
import { Card } from "./Card";

export function DiscardPile({ pile }: { pile: CardInstance[] }) {
  const top = pile[pile.length - 1];
  const under = pile.slice(-3, -1);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-24 sm:w-20 sm:h-28">
        {under.map((c, i) => (
          <div
            key={c.uid}
            className="absolute inset-0 opacity-70"
            style={{ transform: `translate(${(i - under.length) * 2}px, ${i * 2}px) rotate(${(i - 1) * 4}deg)` }}
          >
            <Card size="sm" defId={c.defId} />
          </div>
        ))}
        <AnimatePresence mode="popLayout">
          {top ? (
            <motion.div
              key={top.uid}
              layoutId={`hand-${top.uid}`}
              initial={{ rotate: -12, scale: 0.9, opacity: 0 }}
              animate={{ rotate: -4, scale: 1, opacity: 1 }}
              className="absolute inset-0"
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
              <Card size="sm" defId={top.defId} />
            </motion.div>
          ) : (
            <div className="absolute inset-0 rounded-lg border-2 border-dashed border-white/15" />
          )}
        </AnimatePresence>
      </div>
      <span className="font-hud text-xs tracking-widest uppercase text-[var(--color-paper)]/60">
        Défausse · {pile.length}
      </span>
    </div>
  );
}
