"use client";

import { motion } from "framer-motion";
import type { PlayerState } from "@/game/types/game";
import { roadPoint } from "@/game/components/board/roadPath";
import { displayHazard } from "@/game/lib/engine/rules";
import { HazardBadge } from "./HazardBadge";

const COLOR_VAR: Record<PlayerState["color"], string> = {
  crimson: "var(--color-player-crimson)",
  azure: "var(--color-player-azure)",
  amber: "var(--color-player-amber)",
  emerald: "var(--color-player-emerald)",
};

function CarShape({ color, id }: { color: string; id: string }) {
  return (
    <g>
      <ellipse cx="0" cy="15" rx="20" ry="5" fill="rgba(0,0,0,0.35)" />
      <path
        d="M -19 6 C -19 -2 -13 -6 -6 -6 L 2 -6 C 6 -10 12 -10 16 -6 L 19 -2 C 21 -1 21 6 19 8 L -19 8 Z"
        fill={color}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={1.2}
      />
      <path d="M -6 -6 L -3 -1 L 11 -1 L 7 -9 C 3 -10.5 -1 -9.5 -6 -6 Z" fill="rgba(255,255,255,0.55)" />
      <circle cx="-10" cy="9" r="4.6" fill="#181a1f" />
      <circle cx="-10" cy="9" r="1.8" fill="#8a8f9c" />
      <circle cx="10" cy="9" r="4.6" fill="#181a1f" />
      <circle cx="10" cy="9" r="1.8" fill="#8a8f9c" />
      <circle cx="18" cy="2" r="1.6" fill="#fff6d8" />
      <filter id={`carShadow-${id}`} />
    </g>
  );
}

export function PlayerCar({
  player,
  target,
  isActive,
  laneOffset,
}: {
  player: PlayerState;
  target: number;
  isActive: boolean;
  laneOffset: number;
}) {
  const t = Math.min(1, player.distance / target);
  const { x, y, angle } = roadPoint(t);
  const color = COLOR_VAR[player.color];
  const hazard = displayHazard(player);

  return (
    <>
      <motion.g
        animate={{ x, y: y + laneOffset, rotate: angle }}
        initial={false}
        transition={{ type: "spring", stiffness: 70, damping: 16, mass: 1 }}
      >
        <motion.g
          animate={isActive ? { y: [0, -3, 0] } : { y: 0 }}
          transition={isActive ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : undefined}
        >
          {isActive ? (
            <circle r="26" fill={color} opacity={0.16}>
              <animate attributeName="r" values="22;28;22" dur="1.6s" repeatCount="indefinite" />
            </circle>
          ) : null}
          <CarShape color={color} id={player.id} />
        </motion.g>
      </motion.g>

      {/* Label layer kept upright (not rotated with the car) so tags stay legible on slopes. */}
      <motion.g animate={{ x, y: y + laneOffset }} initial={false} transition={{ type: "spring", stiffness: 70, damping: 16, mass: 1 }}>
        {hazard ? (
          <g transform="translate(0 -30)">
            <HazardBadge hazard={hazard} />
          </g>
        ) : null}
        <g transform="translate(0 24)">
          <rect
            x={-(player.name.length * 3.2 + 6)}
            y={-7.5}
            width={player.name.length * 6.4 + 12}
            height={15}
            rx={7.5}
            fill="rgba(16,19,26,0.85)"
            stroke={color}
            strokeWidth={1}
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fontSize="8.5"
            fontFamily="var(--font-hud)"
            fontWeight={700}
            fill="white"
            style={{ letterSpacing: "0.04em" }}
          >
            {player.name.toUpperCase()}
          </text>
        </g>
      </motion.g>
    </>
  );
}
