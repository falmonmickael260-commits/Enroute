import { LANDMARKS, ROWS } from "../roadPath";
import { TOWN_LAMPS, TownWindows } from "./scenery";

export function LightDefs() {
  return (
    <radialGradient id="glow">
      <stop offset="0" stopColor="#ffe6a0" stopOpacity="0.95" />
      <stop offset="0.35" stopColor="#ffc861" stopOpacity="0.45" />
      <stop offset="1" stopColor="#ffb040" stopOpacity="0" />
    </radialGradient>
  );
}

function Glow({ x, y, r, opacity = 1 }: { x: number; y: number; r: number; opacity?: number }) {
  return <circle cx={x} cy={y} r={r} fill="url(#glow)" opacity={opacity} />;
}

function Pool({ x, y, rx, ry }: { x: number; y: number; rx: number; ry: number }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="url(#glow)" opacity={0.55} />;
}

/** Emissive elements drawn above the dusk/night tint so they stay bright. */
export function NightLights({ strength }: { strength: number }) {
  return (
    <g opacity={strength}>
      <TownWindows />
      {TOWN_LAMPS.map(({ x, y }) => (
        <g key={`${x}-${y}`}>
          <Pool x={x + 12} y={y + 4} rx={42} ry={16} />
          <Glow x={x + 9.5} y={y - 40} r={20} />
          <rect x={x + 5} y={y - 42} width={9} height={4} rx={1.5} fill="#fff6d0" />
        </g>
      ))}
      {/* gas station canopy */}
      <Pool x={1330} y={712} rx={86} ry={28} />
      <rect x={1270} y={668} width={120} height={3} fill="#fff6d0" />
      <rect x={1397} y={714} width={20} height={14} fill="#ffd982" />
      <Glow x={1251} y={731} r={24} opacity={0.7} />
      {/* rest area lamp */}
      <Pool x={274} y={336} rx={44} ry={16} />
      <Glow x={271.5} y={290} r={20} />
      {/* start lights + finish floodlights */}
      <Glow x={156} y={704} r={16} />
      <Glow x={236} y={704} r={16} />
      <Glow x={LANDMARKS.finishX} y={ROWS.top - 52} r={30} opacity={0.8} />
      <Glow x={LANDMARKS.finishX} y={ROWS.top + 52} r={30} opacity={0.8} />
      <Pool x={1452} y={340} rx={90} ry={34} />
      {/* lighthouse: lantern + sweeping beam */}
      <Glow x={1514} y={417} r={26} />
      <rect x={1502} y={410} width={24} height={14} fill="#fff1b0" />
      <g>
        <path d="M 1514 417 L 1760 360 L 1760 474 Z" fill="url(#glow)" opacity={0.6} />
        <animateTransform attributeName="transform" type="rotate" from="0 1514 417" to="360 1514 417" dur="9s" repeatCount="indefinite" />
      </g>
      {/* farm windows */}
      {[
        [66, 657],
        [95, 657],
        [1001, 692],
        [1024, 692],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <Glow x={x} y={y} r={10} opacity={0.8} />
          <rect x={x - 4} y={y - 4} width={8} height={7} fill="#ffd982" />
        </g>
      ))}
    </g>
  );
}
