"use client";

import type { GameState } from "@/game/types/game";
import { ENVIRONMENTS } from "@/game/lib/environments";
import { Scenery } from "./Scenery";
import { buildRoadPathD, roadPoint, ROAD_VIEWBOX } from "./roadPath";
import { PlayerCar } from "@/game/components/players/PlayerCar";

const MILESTONE_COUNT = 4;

export function Board({ state }: { state: GameState }) {
  const theme = ENVIRONMENTS[state.environment];
  const roadD = buildRoadPathD();
  const start = roadPoint(0);
  const finish = roadPoint(1);

  return (
    <svg
      viewBox={`0 0 ${ROAD_VIEWBOX.width} ${ROAD_VIEWBOX.height}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label={`Plateau EN ROUTE — environnement ${theme.label}`}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.sky[0]} />
          <stop offset="100%" stopColor={theme.sky[1]} />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.ground[0]} />
          <stop offset="100%" stopColor={theme.ground[1]} />
        </linearGradient>
        <radialGradient id="vignette" cx="50%" cy="42%" r="75%">
          <stop offset="60%" stopColor="black" stopOpacity={0} />
          <stop offset="100%" stopColor="black" stopOpacity={0.28} />
        </radialGradient>
      </defs>

      <rect x={0} y={0} width={ROAD_VIEWBOX.width} height={ROAD_VIEWBOX.height} fill="url(#sky)" />

      <path d={roadD} stroke="url(#ground)" strokeWidth={230} fill="none" strokeLinecap="round" />

      <Scenery theme={theme} />

      <path d={roadD} stroke={theme.road} strokeWidth={62} fill="none" strokeLinecap="round" />
      <path
        d={roadD}
        stroke="#f4efe3"
        strokeWidth={3}
        fill="none"
        strokeDasharray="16 18"
        opacity={0.8}
      />

      {/* Départ */}
      <g transform={`translate(${start.x} ${start.y})`}>
        <line x1={0} y1={-70} x2={0} y2={40} stroke="#f4efe3" strokeWidth={3} />
        <rect x={-4} y={-78} width={54} height={18} fill="white" />
        {Array.from({ length: 6 }).map((_, i) => (
          <rect
            key={i}
            x={-4 + (i % 3) * 18}
            y={-78 + Math.floor(i / 3) * 9}
            width={18}
            height={9}
            fill={i % 2 === 0 ? "#1a1f2b" : "white"}
          />
        ))}
        <text x={0} y={58} textAnchor="middle" fontSize="13" fontFamily="var(--font-display)" fill="#f4efe3" letterSpacing="0.08em">
          DÉPART
        </text>
      </g>

      {/* Milestones */}
      {Array.from({ length: MILESTONE_COUNT }).map((_, i) => {
        const t = (i + 1) / (MILESTONE_COUNT + 1);
        const p = roadPoint(t);
        const km = Math.round(t * state.target);
        return (
          <g key={i} transform={`translate(${p.x} ${p.y - 46})`}>
            <rect x={-16} y={-11} width={32} height={16} rx={3} fill="#1a1f2b" stroke={theme.accent} strokeWidth={1.2} />
            <text x={0} y={1} textAnchor="middle" fontSize="8.5" fontFamily="var(--font-hud)" fontWeight={700} fill={theme.accent}>
              {km}
            </text>
          </g>
        );
      })}

      {/* Arrivée */}
      <g transform={`translate(${finish.x} ${finish.y})`}>
        <line x1={0} y1={-92} x2={0} y2={40} stroke="#f4efe3" strokeWidth={3} />
        <line x1={-56} y1={-92} x2={0} y2={-92} stroke="#f4efe3" strokeWidth={3} />
        <g>
          {Array.from({ length: 24 }).map((_, i) => {
            const col = i % 6;
            const row = Math.floor(i / 6);
            const isDark = (col + row) % 2 === 0;
            return (
              <rect
                key={i}
                x={-56 + col * 9.3}
                y={-92 + row * 9}
                width={9.3}
                height={9}
                fill={isDark ? "#14161c" : "#f4efe3"}
              />
            );
          })}
        </g>
        <text x={-28} y={58} textAnchor="middle" fontSize="13" fontFamily="var(--font-display)" fill="#f4efe3" letterSpacing="0.08em">
          ARRIVÉE
        </text>
      </g>

      <g>
        {state.players.map((p, i) => {
          const n = state.players.length;
          const lane = (i - (n - 1) / 2) * 30;
          return (
            <PlayerCar
              key={p.id}
              player={p}
              target={state.target}
              isActive={state.players[state.currentPlayerIndex].id === p.id && state.phase !== "gameover"}
              laneOffset={lane}
            />
          );
        })}
      </g>

      <rect x={0} y={0} width={ROAD_VIEWBOX.width} height={ROAD_VIEWBOX.height} fill="url(#vignette)" />
    </svg>
  );
}
