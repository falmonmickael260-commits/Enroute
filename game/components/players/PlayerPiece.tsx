"use client";

import { animate, useMotionValue } from "framer-motion";
import { useEffect, useRef } from "react";
import type { PlayerState } from "@/game/types/game";
import { pointAtLength } from "@/game/components/board/roadPath";
import type { PieceSlot } from "@/game/components/board/pieceLayout";
import { displayHazard } from "@/game/lib/engine/rules";

export const PLAYER_COLOR: Record<PlayerState["color"], string> = {
  crimson: "var(--color-player-crimson)",
  azure: "var(--color-player-azure)",
  amber: "var(--color-player-amber)",
  emerald: "var(--color-player-emerald)",
  violet: "var(--color-player-violet)",
  rose: "var(--color-player-rose)",
};

const PAINT: Record<PlayerState["color"], [string, string, string]> = {
  crimson: ["#7e1f19", "#e0483e", "#ff9a8f"],
  azure: ["#173f73", "#3e8fe0", "#9fd0ff"],
  amber: ["#7a4f0f", "#e0a93e", "#ffe29e"],
  emerald: ["#135733", "#3eab6f", "#9eeac0"],
  violet: ["#43237a", "#8e5ae0", "#cfb3ff"],
  rose: ["#7a1f55", "#e05aa8", "#ffb3dd"],
};

export function PieceDefs() {
  return (
    <>
      {Object.entries(PAINT).map(([color, [dark, base, light]]) => (
        <linearGradient key={color} id={`paint-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark} />
          <stop offset="0.28" stopColor={base} />
          <stop offset="0.5" stopColor={light} />
          <stop offset="0.72" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      ))}
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8fb3d4" />
        <stop offset="1" stopColor="#1e2a3a" />
      </linearGradient>
      <linearGradient id="headlight" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff6c8" stopOpacity="0.75" />
        <stop offset="1" stopColor="#fff6c8" stopOpacity="0" />
      </linearGradient>
    </>
  );
}

const BODY_D =
  "M -27 -11 Q -28 -13.5 -24.5 -13.5 L 13 -13.5 Q 23.5 -13 27 -7 Q 28.6 0 27 7 Q 23.5 13 13 13.5 L -24.5 13.5 Q -28 13.5 -27 11 Z";

/** Top-down race car, nose pointing +x. */
function CarBody({ color, number, headlights }: { color: PlayerState["color"]; number: number; headlights: number }) {
  return (
    <g>
      {headlights > 0 ? (
        <g opacity={headlights}>
          <path d="M 26 -9 L 120 -40 L 120 -4 Z" fill="url(#headlight)" />
          <path d="M 26 9 L 120 40 L 120 4 Z" fill="url(#headlight)" />
        </g>
      ) : null}
      <path d={BODY_D} fill="#000" opacity={0.38} transform="translate(3 5)" />
      {[
        [-19, -15.5],
        [-19, 11.5],
        [10, -15.5],
        [10, 11.5],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={10} height={4} rx={1.5} fill="#16181d" />
      ))}
      <rect x={-31} y={-13} width={5} height={26} rx={1.5} fill="#1f2228" />
      <path d={BODY_D} fill={`url(#paint-${color})`} stroke="rgba(0,0,0,0.45)" strokeWidth={0.8} />
      {/* racing stripes on hood and trunk */}
      <rect x={13} y={-4} width={14} height={2.6} fill="#fff" opacity={0.9} />
      <rect x={13} y={1.4} width={14} height={2.6} fill="#fff" opacity={0.9} />
      <rect x={-26} y={-4} width={8} height={2.6} fill="#fff" opacity={0.9} />
      <rect x={-26} y={1.4} width={8} height={2.6} fill="#fff" opacity={0.9} />
      <path d="M 5 -10.5 L 13 -9.5 Q 15.5 0 13 9.5 L 5 10.5 Q 7.5 0 5 -10.5 Z" fill="url(#glass)" />
      <path d="M -12 -9.5 L -17.5 -8.5 Q -19 0 -17.5 8.5 L -12 9.5 Q -13.5 0 -12 -9.5 Z" fill="url(#glass)" />
      <rect x={-12} y={-10} width={17} height={20} rx={4} fill={`url(#paint-${color})`} />
      <rect x={-12} y={-10} width={17} height={20} rx={4} fill="#fff" opacity={0.1} />
      <circle cx={-3.5} cy={0} r={7} fill="#f6f3ea" stroke="rgba(0,0,0,0.35)" strokeWidth={0.8} />
      <text x={-3.5} y={4.2} textAnchor="middle" fontFamily="var(--font-display)" fontSize={12} fill="#14161c">
        {number}
      </text>
      <ellipse cx={8} cy={-14.6} rx={2.6} ry={1.6} fill={`url(#paint-${color})`} />
      <ellipse cx={8} cy={14.6} rx={2.6} ry={1.6} fill={`url(#paint-${color})`} />
      <rect x={24.6} y={-10} width={2.4} height={4} rx={1} fill="#fffbe6" />
      <rect x={24.6} y={6} width={2.4} height={4} rx={1} fill="#fffbe6" />
      <rect x={-27.2} y={-11} width={1.8} height={4} fill="#ff4d4d" />
      <rect x={-27.2} y={7} width={1.8} height={4} fill="#ff4d4d" />
    </g>
  );
}

function Plaque({ player, number, active }: { player: PlayerState; number: number; active: boolean }) {
  const name = player.name.toUpperCase();
  const hazard = displayHazard(player);
  const w = 46 + name.length * 10.5 + (hazard ? 28 : 0);
  const color = PLAYER_COLOR[player.color];
  return (
    <g>
      <rect x={-w / 2} y={-15} width={w} height={30} rx={15} fill="rgba(14,16,22,0.9)" stroke={active ? "#e6bf5c" : color} strokeWidth={active ? 2.6 : 1.6} />
      <circle cx={-w / 2 + 15} cy={0} r={11} fill={color} />
      <text x={-w / 2 + 15} y={5} textAnchor="middle" fontFamily="var(--font-display)" fontSize={15} fill="#fff">
        {number}
      </text>
      <text x={-w / 2 + 32} y={6.5} fontFamily="var(--font-hud)" fontWeight={700} fontSize={18} fill="#fff" letterSpacing={0.5}>
        {name}
      </text>
      {hazard === "radar" ? (
        <g transform={`translate(${w / 2 - 16} 0)`}>
          <circle r={11} fill="#fff" stroke="#d6372d" strokeWidth={3} />
          <text y={4.5} textAnchor="middle" fontFamily="var(--font-hud)" fontWeight={700} fontSize={12} fill="#14161c">
            50
          </text>
        </g>
      ) : hazard ? (
        <g transform={`translate(${w / 2 - 16} 0)`}>
          <path d="M 0 -11 L 11 9 L -11 9 Z" fill="#e0483e" stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
          <text y={7} textAnchor="middle" fontFamily="var(--font-hud)" fontWeight={700} fontSize={13} fill="#fff">
            !
          </text>
        </g>
      ) : null}
    </g>
  );
}

function Smoke() {
  return (
    <g>
      {[0, 0.7, 1.4].map((delay) => (
        <circle key={delay} cx={-6} cy={-10} r={6} fill="#c9ccd2" opacity={0}>
          <animate attributeName="cy" values="-10;-46" dur="2.1s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="r" values="5;13" dur="2.1s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.75;0" dur="2.1s" begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

/**
 * A player's pion. Position is driven by motion values and written straight to
 * the SVG transform attributes, so it glides along the curved road (arc-length
 * interpolation) without re-rendering React on every frame.
 */
export function PlayerPiece({
  player,
  number,
  slot,
  active,
  headlights,
  scale,
}: {
  player: PlayerState;
  number: number;
  slot: PieceSlot;
  active: boolean;
  headlights: number;
  /** Visual size multiplier (see pieceScaleFor). */
  scale: number;
}) {
  const s = useMotionValue(slot.s);
  const lateral = useMotionValue(slot.lateral);
  const labelOffset = useMotionValue(slot.labelOffset);
  const squash = useMotionValue(0);
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const rootRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const labelRef = useRef<SVGGElement>(null);
  const leaderRef = useRef<SVGLineElement>(null);
  const speedRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const draw = () => {
      const p = pointAtLength(s.get());
      const lat = lateral.get();
      const q = squash.get();
      rootRef.current?.setAttribute("transform", `translate(${p.x + p.nx * lat} ${p.y + p.ny * lat})`);
      bodyRef.current?.setAttribute("transform", `rotate(${p.angle}) scale(${1 + q * 0.07} ${1 - q * 0.1})`);
      // Label and leader live inside the scaled group, so convert board units back.
      const d = (labelOffset.get() - lat) / scaleRef.current;
      labelRef.current?.setAttribute("transform", `translate(${p.nx * d} ${p.ny * d})`);
      leaderRef.current?.setAttribute("x2", String(p.nx * d));
      leaderRef.current?.setAttribute("y2", String(p.ny * d));
    };
    draw();
    const stops = [s, lateral, labelOffset, squash].map((mv) => mv.on("change", draw));
    return () => stops.forEach((stop) => stop());
  }, [s, lateral, labelOffset, squash]);

  useEffect(() => {
    const delta = Math.abs(slot.s - s.get());
    const side = [
      animate(lateral, slot.lateral, { type: "spring", stiffness: 140, damping: 20 }),
      animate(labelOffset, slot.labelOffset, { type: "spring", stiffness: 140, damping: 20 }),
    ];
    if (delta < 0.5) return () => side.forEach((c) => c.stop());

    if (speedRef.current) speedRef.current.style.opacity = delta > 120 ? "1" : "0";
    const drive = animate(s, slot.s, {
      duration: Math.min(2.8, 0.8 + delta / 480),
      ease: [0.55, 0, 0.2, 1],
      onComplete: () => {
        if (speedRef.current) speedRef.current.style.opacity = "0";
        animate(squash, [0, 1, -0.45, 0], { duration: 0.5, ease: "easeOut" });
      },
    });
    return () => {
      drive.stop();
      side.forEach((c) => c.stop());
    };
  }, [slot.s, slot.lateral, slot.labelOffset, s, lateral, labelOffset, squash]);

  const color = PLAYER_COLOR[player.color];

  return (
    <g ref={rootRef}>
      <g transform={`scale(${scale})`}>
      {active ? (
        <circle r={40} fill={color} opacity={0.22} stroke={color} strokeWidth={2}>
          <animate attributeName="r" values="36;48;36" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.6s" repeatCount="indefinite" />
        </circle>
      ) : null}
      <line ref={leaderRef} x1={0} y1={0} x2={0} y2={0} stroke={color} strokeWidth={2} strokeDasharray="3 3" opacity={0.8} />
      <g ref={bodyRef}>
        <g ref={speedRef} style={{ opacity: 0, transition: "opacity 200ms" }}>
          {[-8, 0, 8].map((y) => (
            <line key={y} x1={-36} y1={y} x2={-78} y2={y} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={0.75} />
          ))}
        </g>
        <g transform="scale(1.22)">
          <CarBody color={player.color} number={number} headlights={headlights} />
        </g>
      </g>
      {player.hazard ? <Smoke /> : null}
      <g ref={labelRef}>
        <Plaque player={player} number={number} active={active} />
      </g>
      </g>
    </g>
  );
}
