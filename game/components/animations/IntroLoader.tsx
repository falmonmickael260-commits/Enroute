"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/game/components/ui/Logo";

const ROAD_D = "M 10 95 C 60 95 70 40 130 40 C 190 40 195 95 290 95";

export function IntroLoader({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<"road" | "logo" | "out">("road");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 1050);
    const t2 = setTimeout(() => setPhase("out"), 1900);
    const t3 = setTimeout(() => onFinish(), 2350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {phase !== "out" ? (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-asphalt-900)]"
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          <svg viewBox="0 0 300 120" className="w-64 sm:w-80 h-auto mb-6">
            <motion.path
              d={ROAD_D}
              fill="none"
              stroke="var(--color-asphalt-600)"
              strokeWidth={10}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
            <motion.path
              d={ROAD_D}
              fill="none"
              stroke="var(--color-brand-gold)"
              strokeWidth={2}
              strokeDasharray="8 8"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
            <motion.g
              initial={{ x: 10, y: 95 }}
              animate={{ x: [10, 70, 130, 195, 290], y: [95, 60, 40, 60, 95] }}
              transition={{ duration: 1, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
            >
              <g transform="translate(-8 -10)">
                <ellipse cx="8" cy="12" rx="9" ry="2.4" fill="rgba(0,0,0,0.3)" />
                <path d="M0 8 C0 4 3 2 7 2 L11 2 C14 2 16 5 16 8 C16 9.5 15 10.5 13 10.5 L2 10.5 C1 10.5 0 9.5 0 8 Z" fill="var(--color-brand-crimson)" />
                <circle cx="4" cy="10.5" r="2" fill="#181a1f" />
                <circle cx="12" cy="10.5" r="2" fill="#181a1f" />
              </g>
            </motion.g>
          </svg>

          <AnimatePresence>
            {phase === "logo" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <Logo size="lg" tagline />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
