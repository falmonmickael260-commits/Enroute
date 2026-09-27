import type { EnvironmentTheme } from "@/game/lib/environments";
import { roadPoint } from "./roadPath";

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="10" ry="3" fill="rgba(0,0,0,0.15)" />
      <rect x="-2.2" y="-8" width="4.4" height="12" rx="1.5" fill="#7a5535" />
      <circle cx="0" cy="-16" r="11" fill="#4d8a3f" />
      <circle cx="-7" cy="-10" r="8" fill="#5a9a49" />
      <circle cx="7" cy="-11" r="8.5" fill="#427a35" />
    </g>
  );
}

function Building({ x, y, h, color }: { x: number; y: number; h: number; color: string }) {
  const w = 26;
  const windows = Array.from({ length: Math.floor(h / 10) });
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-h} width={w} height={h} rx={2} fill={color} />
      {windows.map((_, i) => (
        <g key={i}>
          <rect x={-w / 2 + 5} y={-h + 8 + i * 10} width={6} height={6} fill="rgba(255,230,150,0.8)" />
          <rect x={w / 2 - 11} y={-h + 8 + i * 10} width={6} height={6} fill="rgba(255,230,150,0.5)" />
        </g>
      ))}
    </g>
  );
}

function Mountain({ x, y, h, snow = true }: { x: number; y: number; h: number; snow?: boolean }) {
  const w = h * 1.4;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M ${-w / 2} 0 L 0 ${-h} L ${w / 2} 0 Z`} fill="#8b98a0" />
      {snow ? <path d={`M -6 ${-h + 14} L 0 ${-h} L 6 ${-h + 14} L 0 ${-h + 22} Z`} fill="white" opacity={0.9} /> : null}
    </g>
  );
}

function Palm({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 C -2 -14 -1 -26 2 -34" stroke="#8a6a3d" strokeWidth={3} fill="none" strokeLinecap="round" />
      {[-1, -0.4, 0.3, 0.9, 1.5].map((a, i) => (
        <path
          key={i}
          d={`M2 -34 Q ${2 + a * 16} ${-34 - 6} ${2 + a * 22} ${-30 - Math.abs(a) * 4}`}
          stroke="#3f8f4d"
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function LampPost({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-1.2} y={-26} width={2.4} height={26} fill="#2b2f38" />
      <circle cx="0" cy="-28" r="4" fill="#ffd37a" opacity={0.95} />
      <circle cx="0" cy="-28" r="9" fill="#ffd37a" opacity={0.25} />
    </g>
  );
}

const DECOR_T_POSITIONS = [0.06, 0.16, 0.27, 0.38, 0.49, 0.6, 0.71, 0.82, 0.92];

export function Scenery({ theme }: { theme: EnvironmentTheme }) {
  return (
    <g aria-hidden>
      {DECOR_T_POSITIONS.map((t, i) => {
        const above = i % 2 === 0;
        const p = roadPoint(t);
        const yOff = above ? -46 - (i % 3) * 6 : 40 + (i % 3) * 6;
        const x = p.x + (above ? -8 : 8);
        const y = p.y + yOff;

        switch (theme.decor) {
          case "trees":
            return <Tree key={t} x={x} y={y} scale={0.9 + (i % 3) * 0.15} />;
          case "buildings":
            return <Building key={t} x={x} y={y} h={40 + (i % 4) * 16} color={i % 2 ? "#5b6472" : "#454d59"} />;
          case "mountains":
            return <Mountain key={t} x={x} y={y} h={60 + (i % 3) * 22} snow={i % 2 === 0} />;
          case "palms":
            return <Palm key={t} x={x} y={y} />;
          case "lamps":
            return <LampPost key={t} x={x} y={y} />;
          default:
            return null;
        }
      })}
    </g>
  );
}
