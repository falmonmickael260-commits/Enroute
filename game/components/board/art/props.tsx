/**
 * Illustrated map props for the board. Everything is drawn around its ground
 * anchor (x, y) in board units, lit from the top-left, with a soft ground shadow
 * so pieces read as standing on the board.
 */

export function GroundShadow({ x, y, rx, ry, opacity = 0.22 }: { x: number; y: number; rx: number; ry: number; opacity?: number }) {
  return <ellipse cx={x + rx * 0.25} cy={y + ry * 0.35} rx={rx} ry={ry} fill="#1b2a12" opacity={opacity} />;
}

export function Tree({ x, y, s = 1, hue = 0 }: { x: number; y: number; s?: number; hue?: 0 | 1 | 2 }) {
  const greens = [
    ["#3f7d34", "#5c9e45", "#8cc463"],
    ["#356e3b", "#4f9150", "#7fbf6a"],
    ["#6f8a2c", "#93ad3a", "#c3d65c"],
  ][hue];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <GroundShadow x={0} y={0} rx={20} ry={7} />
      <rect x={-3} y={-14} width={6} height={15} rx={2} fill="#6b4a2b" />
      <circle cx={0} cy={-30} r={19} fill={greens[0]} />
      <circle cx={-9} cy={-24} r={13} fill={greens[0]} />
      <circle cx={9} cy={-23} r={12} fill={greens[0]} />
      <circle cx={-3} cy={-33} r={14} fill={greens[1]} />
      <circle cx={-8} cy={-38} r={7} fill={greens[2]} opacity={0.9} />
    </g>
  );
}

export function Pine({ x, y, s = 1, snow = false }: { x: number; y: number; s?: number; snow?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <GroundShadow x={0} y={0} rx={16} ry={6} />
      <rect x={-3} y={-8} width={6} height={9} fill="#5a3d24" />
      <path d="M0 -58 L18 -18 L-18 -18 Z" fill="#23533a" />
      <path d="M0 -58 L-18 -18 L-2 -18 Z" fill="#2f6b49" />
      <path d="M0 -40 L22 -6 L-22 -6 Z" fill="#23533a" />
      <path d="M0 -40 L-22 -6 L-2 -6 Z" fill="#2f6b49" />
      {snow ? <path d="M0 -58 L7 -44 L2 -46 L-3 -42 L-7 -44 Z" fill="#f4f7fb" /> : null}
    </g>
  );
}

export function Palm({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <GroundShadow x={0} y={0} rx={18} ry={6} />
      <path d="M0 0 C 2 -16 -2 -34 8 -52" stroke="#8a6436" strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M0 0 C 2 -16 -2 -34 8 -52" stroke="#b58a52" strokeWidth={2} fill="none" strokeDasharray="3 5" />
      {[
        "M8 -52 C 20 -62 34 -58 40 -46 C 30 -52 20 -52 8 -50",
        "M8 -52 C 0 -66 -16 -66 -24 -56 C -12 -58 -2 -56 8 -50",
        "M8 -52 C 22 -52 32 -40 30 -28 C 24 -40 16 -46 8 -50",
        "M8 -52 C -6 -52 -18 -40 -16 -28 C -10 -40 -2 -46 8 -50",
        "M8 -52 C 12 -68 24 -74 34 -70 C 24 -66 16 -60 8 -52",
      ].map((d, i) => (
        <path key={i} d={d} fill={i % 2 === 0 ? "#3f9a4b" : "#2f7a3c"} />
      ))}
      <circle cx={8} cy={-50} r={3.5} fill="#6b4a2b" />
    </g>
  );
}

export function Bush({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <GroundShadow x={0} y={0} rx={14} ry={5} />
      <circle cx={-6} cy={-6} r={8} fill="#3f7d34" />
      <circle cx={6} cy={-6} r={8} fill="#3f7d34" />
      <circle cx={0} cy={-10} r={9} fill="#5c9e45" />
    </g>
  );
}

export function House({
  x,
  y,
  s = 1,
  wall = "#f1e4c8",
  roof = "#c2503a",
}: {
  x: number;
  y: number;
  s?: number;
  wall?: string;
  roof?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <GroundShadow x={0} y={0} rx={34} ry={8} />
      <rect x={-26} y={-30} width={52} height={30} fill={wall} />
      <rect x={-26} y={-30} width={52} height={30} fill="url(#wallShade)" />
      <path d="M-32 -30 L0 -54 L32 -30 Z" fill={roof} />
      <path d="M0 -54 L32 -30 L16 -30 Z" fill="#000" opacity={0.15} />
      <rect x={14} y={-58} width={7} height={14} fill="#8d4a36" />
      <rect x={-6} y={-16} width={11} height={16} rx={1.5} fill="#6b4a2b" />
      <rect x={-20} y={-23} width={10} height={9} fill="#8fb7d8" stroke="#fff" strokeWidth={1.5} />
      <rect x={11} y={-23} width={10} height={9} fill="#8fb7d8" stroke="#fff" strokeWidth={1.5} />
    </g>
  );
}

export function Barn({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <GroundShadow x={0} y={0} rx={40} ry={9} />
      <rect x={-32} y={-36} width={64} height={36} fill="#b3372c" />
      <path d="M-38 -36 L-26 -56 L26 -56 L38 -36 Z" fill="#6d3a2a" />
      <path d="M-14 0 L-14 -24 L14 -24 L14 0" fill="#7e241d" stroke="#f4ead8" strokeWidth={2.5} />
      <path d="M-14 -24 L14 0 M14 -24 L-14 0" stroke="#f4ead8" strokeWidth={2} />
      <rect x={-5} y={-48} width={10} height={8} fill="#f4ead8" />
    </g>
  );
}

export function Silo({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <GroundShadow x={0} y={0} rx={16} ry={6} />
      <rect x={-12} y={-62} width={24} height={62} fill="#c9ced6" />
      <rect x={-12} y={-62} width={10} height={62} fill="#e3e7ec" />
      <path d="M-12 -62 Q0 -76 12 -62 Z" fill="#9aa2ad" />
      {[-48, -34, -20].map((yy) => (
        <line key={yy} x1={-12} y1={yy} x2={12} y2={yy} stroke="#9aa2ad" strokeWidth={1.2} />
      ))}
    </g>
  );
}

export function Windmill({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <GroundShadow x={0} y={0} rx={22} ry={7} />
      <path d="M-14 0 L-9 -58 L9 -58 L14 0 Z" fill="#efe4cc" />
      <path d="M2 0 L4 -58 L9 -58 L14 0 Z" fill="#d9c9a6" />
      <path d="M-11 -58 L0 -72 L11 -58 Z" fill="#8a4a33" />
      <rect x={-4} y={-14} width={8} height={14} rx={2} fill="#6b4a2b" />
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 0 -62" to="360 0 -62" dur="14s" repeatCount="indefinite" />
        {[0, 90, 180, 270].map((a) => (
          <g key={a} transform={`rotate(${a} 0 -62)`}>
            <rect x={-2} y={-104} width={4} height={42} fill="#6b4a2b" />
            <rect x={2} y={-100} width={9} height={34} fill="#f7f1e2" stroke="#b9a785" strokeWidth={0.8} />
          </g>
        ))}
        <circle cx={0} cy={-62} r={4} fill="#4a3322" />
      </g>
    </g>
  );
}

export function HayBale({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <GroundShadow x={0} y={0} rx={11} ry={4} />
      <circle cx={0} cy={-9} r={10} fill="#e0b85a" />
      <circle cx={0} cy={-9} r={6} fill="none" stroke="#b98f35" strokeWidth={1.5} />
      <circle cx={0} cy={-9} r={2.5} fill="#b98f35" />
    </g>
  );
}

export function Cow({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <GroundShadow x={0} y={0} rx={12} ry={3.5} />
      <rect x={-10} y={-13} width={18} height={9} rx={4} fill="#fbfaf6" />
      <circle cx={-4} cy={-10} r={2.5} fill="#2b2b2b" />
      <circle cx={3} cy={-8} r={2} fill="#2b2b2b" />
      <rect x={6} y={-16} width={7} height={6} rx={2} fill="#fbfaf6" />
      <rect x={-8} y={-5} width={2} height={5} fill="#2b2b2b" />
      <rect x={4} y={-5} width={2} height={5} fill="#2b2b2b" />
    </g>
  );
}

export function Fence({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const posts = [];
  for (let px = x1; px <= x2; px += 16) posts.push(px);
  return (
    <g>
      <line x1={x1} y1={y - 8} x2={x2} y2={y - 8} stroke="#f2e6cc" strokeWidth={2} />
      <line x1={x1} y1={y - 3} x2={x2} y2={y - 3} stroke="#f2e6cc" strokeWidth={2} />
      {posts.map((px) => (
        <rect key={px} x={px - 1.5} y={y - 12} width={3} height={12} fill="#e4d4b0" />
      ))}
    </g>
  );
}

export function Building({
  x,
  y,
  w,
  h,
  color,
  roof = "#5b6270",
  awning,
  lit = false,
  emissive = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  roof?: string;
  awning?: string;
  lit?: boolean;
  /** Only draw the lit windows (layered above the night tint). */
  emissive?: boolean;
}) {
  const cols = Math.max(2, Math.floor((w - 10) / 14));
  const rows = Math.max(1, Math.floor((h - 26) / 18));
  const gapX = (w - cols * 8) / (cols + 1);
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      windows.push({ wx: x - w / 2 + gapX + c * (8 + gapX), wy: y - h + 12 + r * 18, key: `${r}-${c}` });
    }
  }
  if (emissive) {
    // Deterministic "some lights on, some off" pattern per building.
    return (
      <g>
        {windows.map(({ wx, wy, key }, i) =>
          wy < y - 22 && (i * 7 + Math.round(x)) % 5 !== 0 ? (
            <rect key={key} x={wx} y={wy} width={8} height={10} rx={1} fill="#ffd982" />
          ) : null,
        )}
        {awning ? <rect x={x - 6} y={y - 12} width={12} height={12} fill="#ffe3a0" /> : null}
      </g>
    );
  }
  return (
    <g>
      <GroundShadow x={x} y={y} rx={w * 0.62} ry={9} opacity={0.28} />
      <rect x={x - w / 2} y={y - h} width={w} height={h} fill={color} />
      <rect x={x + w * 0.18} y={y - h} width={w * 0.32} height={h} fill="#000" opacity={0.12} />
      <path d={`M${x - w / 2 - 3} ${y - h} L${x - w / 2 + 6} ${y - h - 10} L${x + w / 2 + 6} ${y - h - 10} L${x + w / 2 + 3} ${y - h} Z`} fill={roof} />
      {windows.map(({ wx, wy, key }) =>
        wy < y - 22 ? (
          <rect key={key} x={wx} y={wy} width={8} height={10} rx={1} fill={lit ? "#ffd982" : "#a9c6de"} opacity={lit ? 0.95 : 0.9} />
        ) : null,
      )}
      {awning ? (
        <>
          <rect x={x - w / 2 + 3} y={y - 20} width={w - 6} height={20} fill="#2c2f36" />
          <path d={`M${x - w / 2 + 1} ${y - 22} L${x + w / 2 - 1} ${y - 22} L${x + w / 2 - 4} ${y - 14} L${x - w / 2 + 4} ${y - 14} Z`} fill={awning} />
          <rect x={x - 6} y={y - 12} width={12} height={12} fill={lit ? "#ffd982" : "#6f8aa3"} />
        </>
      ) : (
        <rect x={x - 5} y={y - 14} width={10} height={14} fill="#3b2c22" />
      )}
    </g>
  );
}

export function LampPost({ x, y, lights = 0 }: { x: number; y: number; lights?: number }) {
  return (
    <g>
      <rect x={x - 1.5} y={y - 34} width={3} height={34} fill="#2d313a" />
      <path d={`M${x} ${y - 34} q 0 -6 8 -6`} stroke="#2d313a" strokeWidth={3} fill="none" />
      <rect x={x + 5} y={y - 42} width={9} height={4} rx={1.5} fill={lights > 0 ? "#fff1b0" : "#8a8f9a"} />
    </g>
  );
}

/** French-style direction panel (green, white border). */
export function DirectionSign({
  x,
  y,
  lines,
  color = "#1f7a45",
}: {
  x: number;
  y: number;
  lines: string[];
  color?: string;
}) {
  const w = Math.max(...lines.map((l) => l.length)) * 10.5 + 22;
  const h = lines.length * 20 + 10;
  return (
    <g>
      <GroundShadow x={x} y={y} rx={w * 0.4} ry={5} opacity={0.2} />
      <rect x={x - w / 2 + 6} y={y - 30} width={3.5} height={30} fill="#7c828c" />
      <rect x={x + w / 2 - 9.5} y={y - 30} width={3.5} height={30} fill="#7c828c" />
      <rect x={x - w / 2} y={y - 30 - h} width={w} height={h} rx={4} fill={color} stroke="#fff" strokeWidth={2.2} />
      {lines.map((line, i) => (
        <text
          key={line}
          x={x}
          y={y - 30 - h + 23 + i * 20}
          textAnchor="middle"
          fontFamily="var(--font-hud)"
          fontWeight={700}
          fontSize={17}
          fill="#fff"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/** Kilometre stone: white body, red cap, distance engraved. */
export function Borne({ x, y, km }: { x: number; y: number; km: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <GroundShadow x={0} y={0} rx={13} ry={4} opacity={0.3} />
      <path d="M-11 0 L-11 -24 Q-11 -38 0 -38 Q11 -38 11 -24 L11 0 Z" fill="#f7f4ec" stroke="#b9b2a2" strokeWidth={1} />
      <path d="M-11 -24 Q-11 -38 0 -38 Q11 -38 11 -24 Z" fill="#d6372d" />
      <text x={0} y={-8} textAnchor="middle" fontFamily="var(--font-hud)" fontWeight={700} fontSize={km >= 1000 ? 9 : 11} fill="#2b2b2b">
        {km}
      </text>
    </g>
  );
}

export function ParkedCar({ x, y, color, angle = 0 }: { x: number; y: number; color: string; angle?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x={-15} y={-8} width={30} height={16} rx={5} fill="#000" opacity={0.22} transform="translate(2 3)" />
      <rect x={-15} y={-8} width={30} height={16} rx={5} fill={color} />
      <rect x={-3} y={-6} width={9} height={12} rx={2} fill="#2a3440" opacity={0.85} />
      <rect x={-12} y={-5.5} width={6} height={11} rx={2} fill="#2a3440" opacity={0.7} />
    </g>
  );
}

export function PicnicTable({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <GroundShadow x={0} y={0} rx={16} ry={5} />
      <rect x={-14} y={-12} width={28} height={6} rx={1} fill="#9b6a3c" />
      <rect x={-16} y={-5} width={32} height={3} fill="#7c5230" />
      <rect x={-12} y={-6} width={3} height={6} fill="#6b4a2b" />
      <rect x={9} y={-6} width={3} height={6} fill="#6b4a2b" />
    </g>
  );
}

export function Parasol({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <GroundShadow x={0} y={0} rx={12} ry={4} opacity={0.18} />
      <rect x={-1} y={-20} width={2} height={20} fill="#6b4a2b" />
      <path d="M-14 -18 Q0 -34 14 -18 Z" fill={color} />
      <path d="M-4 -18 Q0 -33 4 -18 Z" fill="#fff" opacity={0.85} />
    </g>
  );
}

export function Sailboat({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-16 0 L16 0 L11 7 L-11 7 Z" fill="#f4efe3" />
      <rect x={-1} y={-30} width={2} height={30} fill="#5a4a3a" />
      <path d="M1 -28 L16 -3 L1 -3 Z" fill="#fff" />
      <path d="M-1 -24 L-12 -3 L-1 -3 Z" fill="#e0483e" />
    </g>
  );
}
