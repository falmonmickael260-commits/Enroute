import { BOARD, LANDMARKS } from "../roadPath";

export const COASTLINE_D =
  "M 880 -10 L 1610 -10 L 1610 640 C 1590 610 1578 570 1582 530 C 1586 480 1572 430 1576 380 " +
  "C 1580 330 1572 270 1550 228 C 1532 196 1500 180 1460 178 L 985 178 C 935 178 908 152 902 112 " +
  "C 897 72 889 32 880 -10 Z";

export const RIVER_D =
  "M 614 300 C 590 350 640 410 610 462 C 592 494 600 528 600 560 C 600 600 614 628 602 668";

export const LAKE_D =
  "M 480 712 C 478 668 540 646 604 648 C 672 650 728 670 726 716 C 724 764 662 784 598 782 " +
  "C 536 780 482 758 480 712 Z";

export function TerrainDefs() {
  return (
    <>
      <linearGradient id="meadow" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#9ccb70" />
        <stop offset="0.55" stopColor="#86bd5f" />
        <stop offset="1" stopColor="#74ad52" />
      </linearGradient>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1f7fb0" />
        <stop offset="0.6" stopColor="#2aa2c7" />
        <stop offset="1" stopColor="#4cc3d6" />
      </linearGradient>
      <radialGradient id="lakeWater" cx="45%" cy="40%" r="70%">
        <stop offset="0" stopColor="#6fd0e3" />
        <stop offset="1" stopColor="#2b8fb8" />
      </radialGradient>
      <linearGradient id="rockGround" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b9b3a0" />
        <stop offset="1" stopColor="#9fae78" />
      </linearGradient>
      <linearGradient id="wallShade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.14" />
      </linearGradient>
      <pattern id="fieldWheat" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
        <rect width="14" height="14" fill="#e9c664" />
        <rect width="14" height="4" fill="#d9ad45" />
      </pattern>
      <pattern id="fieldPlowed" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(6)">
        <rect width="14" height="14" fill="#a3703f" />
        <rect width="14" height="5" fill="#8a5a31" />
      </pattern>
      <pattern id="fieldGreen" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-4)">
        <rect width="16" height="16" fill="#86bf5a" />
        <rect width="16" height="6" fill="#6ea648" />
      </pattern>
      <pattern id="fieldLavender" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(10)">
        <rect width="14" height="14" fill="#7da35a" />
        <rect width="14" height="7" fill="#9c86cf" />
      </pattern>
      <pattern id="paving" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#d9d2c2" />
        <path d="M0 12 H24 M12 0 V12 M0 0 V0 M6 12 V24 M18 12 V24" stroke="#c7bfad" strokeWidth="1" />
      </pattern>
      <pattern id="paperNoise" width="256" height="256" patternUnits="userSpaceOnUse">
        <image href="/images/noise.png" width="256" height="256" />
      </pattern>
    </>
  );
}

function Field({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} />
      <rect x={x} y={y} width={w} height={h} rx={10} fill="none" stroke="#4f8a3a" strokeWidth={5} opacity={0.75} />
    </g>
  );
}

export function Terrain() {
  const { leftTurn } = LANDMARKS;
  return (
    <g>
      <rect x={0} y={0} width={BOARD.width} height={BOARD.height} fill="url(#meadow)" />
      {/* soft meadow variation */}
      <ellipse cx={330} cy={930} rx={260} ry={70} fill="#6ea64e" opacity={0.35} />
      <ellipse cx={1120} cy={430} rx={280} ry={120} fill="#a3d27a" opacity={0.25} />
      <ellipse cx={560} cy={390} rx={200} ry={110} fill="#5f9a47" opacity={0.3} />

      {/* Mountain foothills (top-left) */}
      <path d="M -10 -10 L 890 -10 C 900 60 880 150 840 190 C 700 214 400 212 -10 214 Z" fill="url(#rockGround)" />

      {/* Countryside fields — below the first row */}
      <Field x={18} y={900} w={250} h={92} fill="url(#fieldWheat)" />
      <Field x={286} y={900} w={220} h={92} fill="url(#fieldLavender)" />
      <Field x={524} y={900} w={210} h={92} fill="url(#fieldPlowed)" />
      <Field x={752} y={900} w={236} h={92} fill="url(#fieldGreen)" />
      <Field x={1006} y={900} w={222} h={92} fill="url(#fieldWheat)" />
      {/* between rows 1 and 2 */}
      <Field x={250} y={690} w={200} h={112} fill="url(#fieldWheat)" />
      <Field x={752} y={712} w={196} h={92} fill="url(#fieldLavender)" />
      <Field x={1090} y={716} w={116} h={88} fill="url(#fieldPlowed)" />

      {/* Town ground */}
      <rect x={712} y={300} width={640} height={206} rx={26} fill="url(#paving)" />
      <rect x={712} y={594} width={500} height={96} rx={22} fill="url(#paving)" />
      <rect x={712} y={506} width={630} height={12} fill="#c9c2b2" />
      <rect x={712} y={582} width={520} height={12} fill="#c9c2b2" />
      {/* cross street + plaza */}
      <rect x={1016} y={300} width={34} height={206} fill="#4a4d55" />
      <circle cx={880} cy={400} r={46} fill="#cfc6b2" stroke="#b9ae96" strokeWidth={3} />

      {/* Gas station forecourt inside the right-hand turn */}
      <circle cx={1340} cy={700} r={112} fill="#cdc8bd" />
      <circle cx={1340} cy={700} r={112} fill="none" stroke="#b3ad9f" strokeWidth={4} />

      {/* Rest area lawn inside the left-hand turn */}
      <circle cx={leftTurn.cx} cy={leftTurn.cy} r={112} fill="#a5d67c" />
      <path d={`M ${leftTurn.cx + 30} ${leftTurn.cy + 112} C 250 440 230 380 ${leftTurn.cx + 40} ${leftTurn.cy - 112}`} stroke="#e7dcc0" strokeWidth={10} fill="none" strokeLinecap="round" />

      {/* Coast: beach band then sea */}
      <path d={COASTLINE_D} fill="#ecd8a4" stroke="#ecd8a4" strokeWidth={70} strokeLinejoin="round" />
      <path d={COASTLINE_D} fill="url(#sea)" />
      <path d={COASTLINE_D} fill="none" stroke="#e8f8fb" strokeWidth={4} strokeDasharray="18 10" opacity={0.75} />

      {/* River + lake */}
      <path d={RIVER_D} stroke="#d9cfae" strokeWidth={46} fill="none" strokeLinecap="round" />
      <path d={RIVER_D} stroke="#2b8fb8" strokeWidth={32} fill="none" strokeLinecap="round" />
      <path d={RIVER_D} stroke="#6fd0e3" strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.7} />
      <path d={LAKE_D} fill="#d9cfae" stroke="#d9cfae" strokeWidth={16} strokeLinejoin="round" />
      <path d={LAKE_D} fill="url(#lakeWater)" />
      <path d="M 540 700 q 16 -6 32 0 M 620 736 q 16 -6 32 0 M 660 690 q 12 -5 24 0" stroke="#e8f8fb" strokeWidth={3} fill="none" opacity={0.7} strokeLinecap="round" />
    </g>
  );
}
