"use client";

import { motion } from "framer-motion";

function Cloud({ top, scale, duration, delay }: { top: string; scale: number; duration: number; delay: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ top, left: "-20%" }}
      initial={{ x: "-10vw" }}
      animate={{ x: "120vw" }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    >
      <svg width={120 * scale} height={50 * scale} viewBox="0 0 120 50">
        <g fill="white" opacity={0.55}>
          <ellipse cx="30" cy="30" rx="26" ry="16" />
          <ellipse cx="60" cy="22" rx="22" ry="18" />
          <ellipse cx="88" cy="30" rx="24" ry="15" />
        </g>
      </svg>
    </motion.div>
  );
}

function DriftingCar({ bottom, duration, delay, color, scale = 1 }: { bottom: string; duration: number; delay: number; color: string; scale?: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ bottom }}
      initial={{ x: "-15vw" }}
      animate={{ x: "115vw" }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    >
      <svg width={64 * scale} height={30 * scale} viewBox="0 0 64 30">
        <ellipse cx="32" cy="26" rx="26" ry="3" fill="rgba(0,0,0,0.3)" />
        <path
          d="M6 18 C6 10 16 6 26 6 L36 6 C42 6 48 10 54 14 C58 15 58 20 56 22 L8 22 Z"
          fill={color}
        />
        <path d="M22 8 L26 14 L46 14 L40 8 Z" fill="rgba(255,255,255,0.5)" />
        <circle cx="18" cy="23" r="5" fill="#181a1f" />
        <circle cx="46" cy="23" r="5" fill="#181a1f" />
      </svg>
    </motion.div>
  );
}

function Mountains() {
  return (
    <svg
      className="absolute bottom-[18%] left-0 w-full h-[22%] opacity-70"
      viewBox="0 0 400 100"
      preserveAspectRatio="none"
    >
      <path d="M0 100 L40 40 L80 100 Z" fill="#3a4150" />
      <path d="M60 100 L110 20 L160 100 Z" fill="#2d3340" />
      <path d="M140 100 L185 50 L230 100 Z" fill="#3a4150" />
      <path d="M260 100 L300 30 L350 100 Z" fill="#2d3340" />
      <path d="M320 100 L360 55 L400 100 Z" fill="#3a4150" />
    </svg>
  );
}

export function HomeBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #0c2a4a 0%, #123a5e 35%, #1a2338 65%, #0e1119 100%)" }}
      />
      <Cloud top="8%" scale={1.1} duration={48} delay={0} />
      <Cloud top="15%" scale={0.8} duration={62} delay={10} />
      <Cloud top="5%" scale={0.6} duration={55} delay={22} />

      <Mountains />

      <div
        className="absolute bottom-0 left-0 right-0 h-[22%]"
        style={{ background: "linear-gradient(180deg, #232838 0%, #14161c 100%)" }}
      />
      <div className="absolute bottom-[8%] left-0 right-0 h-[3px] bg-[repeating-linear-gradient(90deg,var(--color-brand-gold)_0_28px,transparent_28px_54px)] opacity-70" />

      <DriftingCar bottom="6%" duration={9} delay={0} color="var(--color-player-crimson)" />
      <DriftingCar bottom="9%" duration={13} delay={3} color="var(--color-player-azure)" scale={0.85} />
      <DriftingCar bottom="4.5%" duration={16} delay={7} color="var(--color-player-amber)" scale={1.15} />

      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 100%, rgba(0,0,0,0), rgba(0,0,0,0.55) 100%)" }}
      />
    </div>
  );
}
