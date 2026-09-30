import { offsetPoint, roadPoint } from "../roadPath";
import {
  Barn,
  Borne,
  Building,
  Bush,
  Cow,
  DirectionSign,
  Fence,
  GroundShadow,
  HayBale,
  House,
  LampPost,
  Palm,
  Parasol,
  ParkedCar,
  PicnicTable,
  Pine,
  Sailboat,
  Silo,
  Tree,
  Windmill,
} from "./props";

function Mountain({ x, y, w, h, snow = true }: { x: number; y: number; w: number; h: number; snow?: boolean }) {
  const peakX = x + w * 0.46;
  return (
    <g>
      <path d={`M ${x} ${y} L ${peakX} ${y - h} L ${x + w} ${y} Z`} fill="#9b958c" />
      <path d={`M ${peakX} ${y - h} L ${x + w} ${y} L ${peakX + w * 0.08} ${y} Z`} fill="#77716a" />
      <path d={`M ${x} ${y} L ${peakX} ${y - h} L ${x + w * 0.2} ${y} Z`} fill="#aea89e" opacity={0.6} />
      {snow ? (
        <path
          d={`M ${peakX} ${y - h} L ${peakX + w * 0.13} ${y - h * 0.72} L ${peakX + w * 0.05} ${y - h * 0.76} L ${peakX} ${y - h * 0.68} L ${peakX - w * 0.06} ${y - h * 0.75} L ${peakX - w * 0.12} ${y - h * 0.71} Z`}
          fill="#f4f7fb"
        />
      ) : null}
    </g>
  );
}

function MountainRange() {
  return (
    <g>
      <Mountain x={-40} y={206} w={230} h={170} />
      <Mountain x={120} y={210} w={260} h={196} />
      <Mountain x={300} y={206} w={200} h={140} />
      <Mountain x={700} y={206} w={210} h={150} />
      <Mountain x={640} y={212} w={150} h={96} snow={false} />
      {[30, 70, 110, 150, 205, 250, 300, 345].map((x, i) => (
        <Pine key={x} x={x} y={214 - (i % 2) * 6} s={0.7 + (i % 3) * 0.1} snow={i % 4 === 0} />
      ))}
      {[726, 770].map((x, i) => (
        <Pine key={x} x={x} y={212 - (i % 2) * 6} s={0.75} />
      ))}
    </g>
  );
}

function StartBanner({ lights }: { lights: number }) {
  const x = 196;
  const y = 808;
  return (
    <g>
      <GroundShadow x={x} y={y} rx={70} ry={8} opacity={0.25} />
      <rect x={x - 66} y={y - 70} width={6} height={70} fill="#5b606b" />
      <rect x={x + 60} y={y - 70} width={6} height={70} fill="#5b606b" />
      <rect x={x - 74} y={y - 96} width={148} height={34} rx={6} fill="#14161c" stroke="#e6bf5c" strokeWidth={2.5} />
      <text x={x} y={y - 70} textAnchor="middle" fontFamily="var(--font-display)" fontSize={27} letterSpacing={3} fill="#f6f3ea">
        DÉPART
      </text>
      {[-40, 40].map((dx) => (
        <circle key={dx} cx={x + dx} cy={y - 104} r={5} fill={lights > 0 ? "#7dff9a" : "#3ecf6a"} stroke="#14161c" strokeWidth={2} />
      ))}
    </g>
  );
}

function Countryside() {
  return (
    <g>
      {/* farm near the start */}
      <House x={78} y={676} s={0.95} />
      <Barn x={170} y={680} s={0.85} />
      <Silo x={226} y={676} s={0.8} />
      <Windmill x={340} y={704} s={1} />
      {[40, 110, 180, 250].map((x, i) => (
        <HayBale key={x} x={x} y={960 + (i % 2) * 18} />
      ))}
      <HayBale x={300} y={760} />
      <HayBale x={400} y={784} />
      {/* hedgerow trees between fields */}
      {[277, 515, 743, 997, 1238].map((x, i) => (
        <Tree key={x} x={x} y={986} s={0.8} hue={(i % 3) as 0 | 1 | 2} />
      ))}
      {[40, 120].map((x) => (
        <Tree key={x} x={x} y={600} s={0.75} hue={1} />
      ))}
      <Bush x={20} y={720} />
      {/* pasture */}
      <Fence x1={1256} x2={1590} y={904} />
      <Cow x={1320} y={950} />
      <Cow x={1400} y={975} flip />
      <Cow x={1480} y={945} />
      <Cow x={1540} y={985} flip />
      <Tree x={1580} y={930} s={0.9} />
      {/* farm between the lake and town */}
      <House x={1010} y={708} s={0.8} wall="#f4ead8" roof="#8a4a33" />
      <Tree x={960} y={804} s={0.85} hue={2} />
      <Tree x={1070} y={806} s={0.8} />
      {/* lake details */}
      <g>
        <rect x={700} y={740} width={36} height={8} fill="#8a6436" />
        <path d="M 690 764 q 14 8 28 0 l -4 6 h -20 z" fill="#c2503a" />
      </g>
      {[492, 505, 718].map((x, i) => (
        <path key={x} d={`M ${x} ${720 + i * 10} v -16 M ${x + 4} ${722 + i * 10} v -12 M ${x - 4} ${722 + i * 10} v -10`} stroke="#4f7a32" strokeWidth={2} strokeLinecap="round" />
      ))}
    </g>
  );
}

const TOWN_COLORS = ["#e7b98a", "#d98f6f", "#f0d9a8", "#b8c7d9", "#e3a6a0", "#c9d6b8", "#e8c77a"];

type Block = { x: number; w: number; h: number; awning?: string };

const BLOCK_ROWS: { blocks: Block[]; baseY: number; colorShift: number }[] = [
  {
    baseY: 372,
    colorShift: 3,
    blocks: [
      { x: 1110, w: 60, h: 70 },
      { x: 1190, w: 56, h: 64 },
      { x: 1270, w: 64, h: 60 },
    ],
  },
  {
    baseY: 500,
    colorShift: 0,
    blocks: [
      { x: 760, w: 44, h: 64 },
      { x: 1082, w: 50, h: 118 },
      { x: 1138, w: 56, h: 92 },
      { x: 1200, w: 50, h: 132 },
      { x: 1258, w: 54, h: 104 },
      { x: 1316, w: 46, h: 84 },
    ],
  },
  {
    baseY: 672,
    colorShift: 2,
    blocks: [
      { x: 752, w: 46, h: 56, awning: "#e0483e" },
      { x: 806, w: 52, h: 64 },
      { x: 866, w: 48, h: 50, awning: "#3e8fe0" },
      { x: 925, w: 54, h: 68 },
      { x: 1068, w: 50, h: 60, awning: "#e0a93e" },
      { x: 1128, w: 56, h: 72 },
      { x: 1188, w: 44, h: 54, awning: "#3eab6f" },
    ],
  },
];

export const TOWN_LAMPS = [
  ...[770, 860, 950, 1090, 1180, 1270].map((x) => ({ x, y: 512 })),
  ...[790, 900, 1010, 1110].map((x) => ({ x, y: 596 })),
];

function TownBlocks({ row, lit, emissive = false }: { row: number; lit: boolean; emissive?: boolean }) {
  const { blocks, baseY, colorShift } = BLOCK_ROWS[row];
  return (
    <g>
      {blocks.map((b, i) => (
        <Building
          key={b.x}
          x={b.x}
          y={baseY}
          w={b.w}
          h={b.h}
          color={TOWN_COLORS[(i + colorShift) % TOWN_COLORS.length]}
          awning={b.awning}
          lit={lit}
          emissive={emissive}
        />
      ))}
    </g>
  );
}

/** Lit windows only, drawn above the night tint. */
export function TownWindows() {
  return (
    <g>
      {BLOCK_ROWS.map((_, row) => (
        <TownBlocks key={row} row={row} lit emissive />
      ))}
    </g>
  );
}

function Town({ lit }: { lit: boolean }) {
  return (
    <g>
      <TownBlocks row={0} lit={lit} />
      {/* church + plaza */}
      <g>
        <GroundShadow x={960} y={440} rx={40} ry={8} />
        <rect x={930} y={380} width={60} height={60} fill="#efe4cc" />
        <path d="M 924 380 L 960 352 L 996 380 Z" fill="#8d877f" />
        <rect x={948} y={316} width={24} height={64} fill="#f4ead8" />
        <path d="M 944 316 L 960 284 L 976 316 Z" fill="#6e6962" />
        <circle cx={960} cy={336} r={7} fill="#fff" stroke="#8d877f" strokeWidth={2} />
        <path d="M 960 336 V 331 M 960 336 H 964" stroke="#333" strokeWidth={1.5} />
        <rect x={953} y={416} width={14} height={24} rx={7} fill="#6b4a2b" />
      </g>
      <g>
        <circle cx={880} cy={400} r={20} fill="#b9ae96" />
        <circle cx={880} cy={400} r={15} fill="#6fd0e3" />
        <circle cx={880} cy={400} r={4} fill="#e8f8fb">
          <animate attributeName="r" values="3;6;3" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </g>
      {[[820, 360], [930, 470], [830, 460], [1000, 340]].map(([x, y]) => (
        <Tree key={`${x}-${y}`} x={x} y={y} s={0.7} hue={1} />
      ))}
      <Tree x={740} y={330} s={0.8} />
      <TownBlocks row={1} lit={lit} />
      <TownBlocks row={2} lit={lit} />
      {TOWN_LAMPS.map(({ x, y }) => (
        <LampPost key={`${x}-${y}`} x={x} y={y} lights={lit ? 1 : 0} />
      ))}
      <ParkedCar x={1033} y={330} color="#3e8fe0" angle={90} />
      <ParkedCar x={1033} y={420} color="#e0a93e" angle={-90} />
    </g>
  );
}

function GasStation({ lit }: { lit: boolean }) {
  return (
    <g>
      <GroundShadow x={1330} y={726} rx={78} ry={10} opacity={0.25} />
      {[1278, 1382].map((x) => (
        <rect key={x} x={x - 3} y={670} width={6} height={54} fill="#8a8f9a" />
      ))}
      {[1304, 1330, 1356].map((x) => (
        <g key={x}>
          <rect x={x - 7} y={700} width={14} height={24} rx={2} fill="#e0483e" />
          <rect x={x - 4.5} y={704} width={9} height={6} fill={lit ? "#fff1b0" : "#dfe8f0"} />
        </g>
      ))}
      <rect x={1264} y={650} width={132} height={20} rx={3} fill="#f6f3ea" stroke="#c9c1ac" strokeWidth={1.5} />
      <rect x={1264} y={662} width={132} height={8} fill="#e0483e" />
      <text x={1330} y={661} textAnchor="middle" fontFamily="var(--font-display)" fontSize={12} letterSpacing={2} fill="#14161c">
        KILOMAX
      </text>
      <ParkedCar x={1318} y={744} color="#3eab6f" angle={0} />
      {/* shop */}
      <GroundShadow x={1415} y={744} rx={32} ry={7} />
      <rect x={1390} y={700} width={50} height={44} fill="#f1e4c8" />
      <rect x={1386} y={694} width={58} height={10} fill="#14161c" />
      <rect x={1397} y={714} width={20} height={14} fill={lit ? "#ffd982" : "#a9c6de"} />
      <rect x={1424} y={718} width={12} height={26} fill="#6b4a2b" />
      {/* price pole */}
      <rect x={1248} y={744} width={5} height={46} fill="#5b606b" />
      <rect x={1230} y={716} width={42} height={30} rx={4} fill="#14161c" stroke="#e6bf5c" strokeWidth={2} />
      <text x={1251} y={737} textAnchor="middle" fontSize={16}>
        ⛽
      </text>
    </g>
  );
}

function RestArea({ lit }: { lit: boolean }) {
  return (
    <g>
      <Tree x={190} y={336} s={0.9} />
      <Tree x={330} y={330} s={0.8} hue={2} />
      <Tree x={172} y={470} s={0.85} hue={1} />
      <PicnicTable x={240} y={372} />
      <PicnicTable x={292} y={420} />
      <PicnicTable x={214} y={432} />
      <House x={318} y={486} s={0.55} wall="#e7dcc0" roof="#5b6270" />
      <ParkedCar x={236} y={488} color="#e3a6a0" angle={-8} />
      <LampPost x={262} y={330} lights={lit ? 1 : 0} />
    </g>
  );
}

function Forest() {
  const trees: [number, number, number][] = [
    [400, 330, 0.9], [440, 380, 0.8], [410, 440, 0.95], [460, 480, 0.8], [520, 330, 0.85],
    [540, 400, 0.9], [505, 460, 0.8], [660, 350, 0.85], [690, 420, 0.8], [670, 490, 0.9],
  ];
  return (
    <g>
      {trees.map(([x, y, s], i) =>
        i % 3 === 0 ? <Tree key={`${x}-${y}`} x={x} y={y} s={s} hue={(i % 3) as 0 | 1 | 2} /> : <Pine key={`${x}-${y}`} x={x} y={y} s={s} />,
      )}
      {/* spring below the mountain */}
      <circle cx={620} cy={300} r={16} fill="#9b958c" />
      <circle cx={600} cy={306} r={11} fill="#77716a" />
      <circle cx={640} cy={308} r={10} fill="#aea89e" />
    </g>
  );
}

function Coast({ lit }: { lit: boolean }) {
  return (
    <g>
      {[
        [1040, 60, 0.9],
        [1280, 118, 1],
        [1470, 54, 0.8],
      ].map(([x, y, s]) => (
        <g key={x}>
          <Sailboat x={x} y={y} s={s} />
          <animateTransform attributeName="transform" type="translate" values="0 0; 8 2; 0 0" dur={`${9 + s * 3}s`} repeatCount="indefinite" additive="sum" />
        </g>
      ))}
      {[
        "M 960 110 q 14 -6 28 0 q 14 6 28 0",
        "M 1150 70 q 14 -6 28 0 q 14 6 28 0",
        "M 1340 150 q 14 -6 28 0 q 14 6 28 0",
        "M 1530 100 q 12 -5 24 0",
        "M 1500 300 q 12 -5 24 0",
      ].map((d, i) => (
        <path key={d} d={d} stroke="#e8f8fb" strokeWidth={3} fill="none" strokeLinecap="round">
          <animate attributeName="opacity" values="0.2;0.85;0.2" dur="3.2s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
        </path>
      ))}
      {[960, 1050, 1150, 1250, 1340].map((x, i) => (
        <Palm key={x} x={x} y={210} s={0.85} flip={i % 2 === 1} />
      ))}
      {[
        [1005, "#e0483e"],
        [1100, "#3e8fe0"],
        [1200, "#e0a93e"],
        [1295, "#3eab6f"],
      ].map(([x, c]) => (
        <Parasol key={x as number} x={x as number} y={200} color={c as string} />
      ))}
      <Palm x={1545} y={560} s={0.9} flip />
      <Palm x={1400} y={500} s={0.85} />
      {/* lighthouse on the headland */}
      <g>
        <GroundShadow x={1514} y={500} rx={22} ry={6} />
        <path d="M 1500 500 L 1504 424 L 1524 424 L 1528 500 Z" fill="#f6f3ea" />
        {[488, 464, 440].map((y) => (
          <path key={y} d={`M ${1501 - (500 - y) * 0.05} ${y} L ${1527 + (500 - y) * 0.05} ${y} L ${1527 + (500 - y + 10) * 0.05} ${y - 10} L ${1501 - (500 - y + 10) * 0.05} ${y - 10} Z`} fill="#d6372d" />
        ))}
        <rect x={1502} y={410} width={24} height={14} fill={lit ? "#fff1b0" : "#bfe3ef"} stroke="#14161c" strokeWidth={2} />
        <path d="M 1500 410 L 1514 396 L 1528 410 Z" fill="#14161c" />
      </g>
    </g>
  );
}

function FinishArea({ lit }: { lit: boolean }) {
  const crowd = ["#e0483e", "#3e8fe0", "#e0a93e", "#3eab6f", "#f6f3ea", "#8b6fe0"];
  return (
    <g>
      <GroundShadow x={1452} y={372} rx={86} ry={10} opacity={0.28} />
      {/* grandstand steps */}
      {[0, 1, 2].map((row) => (
        <rect key={row} x={1378} y={330 + row * 14} width={148} height={14} fill={row % 2 ? "#c9ced6" : "#b3b9c2"} />
      ))}
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 16 }).map((__, i) => (
          <circle key={`${row}-${i}`} cx={1384 + i * 9.2} cy={334 + row * 14} r={3.4} fill={crowd[(i * 7 + row * 3) % crowd.length]} />
        )),
      )}
      <rect x={1372} y={306} width={160} height={24} rx={4} fill="#14161c" stroke="#e6bf5c" strokeWidth={2} />
      <text x={1452} y={325} textAnchor="middle" fontFamily="var(--font-display)" fontSize={21} letterSpacing={4} fill="#f6f3ea">
        ARRIVÉE
      </text>
      {[1376, 1528].map((x) => (
        <g key={x}>
          <rect x={x - 2} y={286} width={4} height={24} fill="#5b606b" />
          <path d={`M ${x + 2} 286 l 18 6 l -18 6 z`} fill="#e0483e">
            <animate attributeName="d" values={`M ${x + 2} 286 l 18 6 l -18 6 z;M ${x + 2} 286 l 16 8 l -16 4 z;M ${x + 2} 286 l 18 6 l -18 6 z`} dur="1.6s" repeatCount="indefinite" />
          </path>
        </g>
      ))}
      {lit ? <circle cx={1452} cy={300} r={4} fill="#fff1b0" /> : null}
    </g>
  );
}

function Bornes({ target }: { target: number }) {
  const step = target >= 800 ? 100 : 50;
  const marks = [];
  for (let km = step; km < target; km += step) marks.push(km);
  return (
    <g>
      {marks.map((km) => {
        const p = roadPoint(km / target);
        const o = offsetPoint(p, 46);
        return <Borne key={km} x={o.x} y={o.y + 12} km={km} />;
      })}
    </g>
  );
}

export function Scenery({ target, lit }: { target: number; lit: boolean }) {
  return (
    <g>
      <MountainRange />
      <Countryside />
      <Forest />
      <RestArea lit={lit} />
      <Town lit={lit} />
      <GasStation lit={lit} />
      <Coast lit={lit} />
      <FinishArea lit={lit} />
      <StartBanner lights={lit ? 1 : 0} />
      <DirectionSign x={1238} y={944} lines={["STATION ⛽"]} color="#1f5fae" />
      <DirectionSign x={420} y={674} lines={["AIRE DE", "REPOS"]} color="#1f5fae" />
      <DirectionSign x={400} y={212} lines={["TUNNEL"]} />
      <DirectionSign x={858} y={212} lines={["LA CÔTE"]} />
      <Bornes target={target} />
    </g>
  );
}

