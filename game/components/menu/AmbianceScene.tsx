import type { AmbianceId } from "@/game/types/game";

/** Coastal road at a given time of day, drawn in vectors for the ambiance tiles. */
const PALETTE: Record<
  AmbianceId,
  {
    sky: [string, string, string];
    sea: string;
    glint: string;
    far: string;
    near: string;
    ground: string;
    trees: string;
    road: string;
    line: string;
    rail: string;
  }
> = {
  jour: {
    sky: ["#2f86d8", "#7cc2f0", "#d8f0ff"],
    sea: "#1f86c6",
    glint: "#bfe8ff",
    far: "#8fb2c8",
    near: "#5f8a74",
    ground: "#4f8f3c",
    trees: "#2f6a2c",
    road: "#3b3f47",
    line: "#ffffff",
    rail: "#d9dde2",
  },
  crepuscule: {
    sky: ["#2c1f55", "#e65a3a", "#ffc861"],
    sea: "#7c3f5c",
    glint: "#ffb35a",
    far: "#6a3a5e",
    near: "#452843",
    ground: "#3b2a2e",
    trees: "#2a1b26",
    road: "#2d2831",
    line: "#ffd9a8",
    rail: "#c9a2a0",
  },
  nuit: {
    sky: ["#03071a", "#0f1a44", "#253a78"],
    sea: "#0d1a3c",
    glint: "#8fb0ff",
    far: "#1b2650",
    near: "#131b38",
    ground: "#0f1a1f",
    trees: "#081013",
    road: "#1a1c24",
    line: "#fff3c4",
    rail: "#6d7a96",
  },
};

export function AmbianceScene({ id, className }: { id: AmbianceId; className?: string }) {
  const c = PALETTE[id];
  const g = `amb-${id}`;
  return (
    <svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${g}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky[0]} />
          <stop offset="0.6" stopColor={c.sky[1]} />
          <stop offset="1" stopColor={c.sky[2]} />
        </linearGradient>
        <radialGradient id={`${g}-sun`}>
          <stop offset="0" stopColor={id === "nuit" ? "#fff9e0" : "#fffbe8"} />
          <stop offset="0.35" stopColor={id === "crepuscule" ? "#ffb347" : id === "nuit" ? "#dfe6ff" : "#fff3b0"} stopOpacity="0.9" />
          <stop offset="1" stopColor={id === "crepuscule" ? "#ff7a3a" : "#ffffff"} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${g}-road`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.road} stopOpacity="0.85" />
          <stop offset="1" stopColor={c.road} />
        </linearGradient>
        <radialGradient id={`${g}-beam`} cx="0.5" cy="1" r="1">
          <stop offset="0" stopColor="#fff2b8" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff2b8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="240" height="84" fill={`url(#${g}-sky)`} />
      {id === "nuit"
        ? [
            [20, 12],
            [48, 26],
            [70, 8],
            [96, 20],
            [130, 10],
            [160, 24],
            [196, 14],
            [222, 30],
            [34, 40],
            [118, 34],
          ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.9 : 0.6} fill="#fff" opacity={0.8} />)
        : null}
      {/* sun or moon */}
      {id === "jour" ? <circle cx="186" cy="26" r="26" fill={`url(#${g}-sun)`} /> : null}
      {id === "crepuscule" ? <circle cx="150" cy="76" r="34" fill={`url(#${g}-sun)`} /> : null}
      {id === "nuit" ? (
        <g>
          <circle cx="190" cy="24" r="16" fill={`url(#${g}-sun)`} opacity="0.6" />
          <circle cx="190" cy="24" r="7" fill="#f4f1dc" />
          <circle cx="193" cy="21.5" r="6" fill={c.sky[1]} />
        </g>
      ) : null}

      {/* mountains across the bay */}
      <path d="M0 70 L22 52 L40 60 L64 40 L92 58 L110 50 L132 66 L240 66 L240 84 L0 84Z" fill={c.far} />
      <path d="M150 72 L178 48 L198 58 L222 38 L240 46 L240 84 L150 84Z" fill={c.near} />
      {/* sea */}
      <rect y="70" width="240" height="18" fill={c.sea} />
      <path d="M90 76h40M104 80h26M140 74h30M60 82h24" stroke={c.glint} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />

      {/* hillside and trees */}
      <path d="M0 84 L0 140 L240 140 L240 78 C200 80 170 84 150 86 L110 88 C70 86 30 82 0 84Z" fill={c.ground} />
      {[
        [8, 96, 16],
        [22, 90, 12],
        [206, 92, 14],
        [222, 88, 18],
        [234, 98, 12],
        [192, 96, 10],
      ].map(([x, y, h], i) => (
        <path key={i} d={`M${x} ${y - h * 1.9} L${x + h * 0.45} ${y} L${x - h * 0.45} ${y}Z`} fill={c.trees} />
      ))}

      {/* the road, running into the distance */}
      <path d="M38 140 L204 140 L150 86 L138 86Z" fill={`url(#${g}-road)`} />
      <path d="M144 88 L121 140" stroke={c.line} strokeWidth="2.4" strokeDasharray="7 7" opacity="0.9" />
      <path d="M139 86.5 L44 140M149.5 86.5 L198 140" stroke={c.line} strokeWidth="1.3" opacity="0.55" />
      {/* guard rail on the sea side */}
      <path d="M137 84 L20 128" stroke={c.rail} strokeWidth="2.6" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = i / 5;
        const x = 137 - 117 * t;
        const y = 84 + 44 * t;
        return <path key={i} d={`M${x} ${y} v${2 + 7 * t}`} stroke={c.rail} strokeWidth={0.8 + 1.4 * t} opacity="0.85" />;
      })}

      {/* night: headlights coming up the road, lamps lit */}
      {id === "nuit" ? (
        <g>
          <path d="M126 140 L102 100 L170 100 L150 140Z" fill={`url(#${g}-beam)`} opacity="0.5" />
          <circle cx="128" cy="136" r="2.2" fill="#fff6cc" />
          <circle cx="146" cy="136" r="2.2" fill="#fff6cc" />
          <circle cx="210" cy="84" r="1.4" fill="#ffd982" />
          <circle cx="226" cy="80" r="1.4" fill="#ffd982" />
        </g>
      ) : null}
    </svg>
  );
}
