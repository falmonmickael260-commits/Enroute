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
  const stackDepth = Math.min(5, Math.max(1, Math.ceil(count / 16)));

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2">
      <div className="panel-leather rounded-2xl p-1.5 sm:p-2.5">
        <div className="pile-tray">
          {Array.from({ length: stackDepth }).map((_, i) => (
            <div key={i} className="absolute inset-0" style={{ transform: `translate(${i * 1.6}px, ${-i * 2}px)` }}>
              <Card size="md" faceDown className="!h-full !w-full" />
            </div>
          ))}
          {canDraw ? (
            <motion.button
              aria-label="Piocher une carte"
              onClick={onDraw}
              className="absolute inset-0 rounded-xl"
              style={{ transform: `translate(${(stackDepth - 1) * 1.6}px, ${-(stackDepth - 1) * 2}px)` }}
              animate={{ boxShadow: ["0 0 0 0 rgba(242,194,48,0.7)", "0 0 0 14px rgba(242,194,48,0)"] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.95 }}
            />
          ) : null}
        </div>
      </div>
      <span className="font-hud text-[0.7rem] font-bold uppercase tracking-[0.25em] text-[var(--color-brass-300)] drop-shadow">
        {canDraw ? "Piochez ↑" : `Pioche · ${count}`}
      </span>
    </div>
  );
}
