"use client";

import { motion } from "framer-motion";
import { Card } from "./Card";

export function DrawPile({
  count,
  canDraw,
  onDraw,
}: {
  count: number;
  canDraw: boolean;
  onDraw: () => void;
}) {
  const stackDepth = Math.min(4, Math.max(1, Math.ceil(count / 15)));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-24 sm:w-20 sm:h-28">
        {Array.from({ length: stackDepth }).map((_, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{ transform: `translate(${i * 1.5}px, ${-i * 1.5}px)` }}
          >
            <Card size="sm" faceDown className="w-full h-full !shrink" />
          </div>
        ))}
        {canDraw ? (
          <motion.button
            aria-label="Piocher une carte"
            onClick={onDraw}
            className="absolute inset-0 rounded-lg"
            animate={{ boxShadow: ["0 0 0 0 rgba(242,194,48,0.55)", "0 0 0 10px rgba(242,194,48,0)"] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.95 }}
          />
        ) : null}
      </div>
      <span className="font-hud text-xs tracking-widest uppercase text-[var(--color-paper)]/60">
        Pioche · {count}
      </span>
    </div>
  );
}
