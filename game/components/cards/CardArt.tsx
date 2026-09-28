import type { CardDef, DefenseType } from "@/game/types/game";

/** Line-art glyphs (64x64) drawn in currentColor, with a few fixed accents. */
function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full overflow-visible">
      <g stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {children}
      </g>
    </svg>
  );
}

const ACCENT = "#ffd35a";

function RoadGlyph({ tier }: { tier: number }) {
  const dashes = Math.min(5, Math.max(1, tier));
  return (
    <Glyph>
      <path d="M8 56 L25 10 H39 L56 56 Z" fill="#23262e" stroke="none" />
      <path d="M8 56 L25 10 M39 10 L56 56" />
      {Array.from({ length: dashes }).map((_, i) => (
        <line key={i} x1={32} y1={50 - i * 8} x2={32} y2={46 - i * 8} stroke={ACCENT} strokeWidth={3} />
      ))}
      <path d="M14 8 h-6 M58 8 h-6" opacity={0.5} />
    </Glyph>
  );
}

function CollisionGlyph() {
  return (
    <Glyph>
      <path d="M32 8 L37 22 L51 16 L43 29 L57 34 L42 38 L47 52 L34 43 L27 56 L25 41 L10 44 L20 32 L8 22 L23 23 Z" fill="currentColor" fillOpacity={0.18} />
      <path d="M32 20 L35 28 L42 27 L37 33 L41 39 L33 37 L29 43 L28 36 L21 34 L27 30 L24 23 L30 27 Z" fill={ACCENT} stroke="none" />
    </Glyph>
  );
}

function CrevaisonGlyph() {
  return (
    <Glyph>
      <circle cx={30} cy={34} r={20} />
      <circle cx={30} cy={34} r={8} />
      <path d="M30 14 v6 M30 48 v6 M10 34 h6 M44 34 h6" />
      <path d="M46 10 L50 18 L44 20 L52 28" stroke={ACCENT} strokeWidth={3} />
    </Glyph>
  );
}

function PanneGlyph() {
  return (
    <Glyph>
      <rect x={12} y={18} width={24} height={36} rx={3} />
      <rect x={17} y={24} width={14} height={10} rx={1} fill="currentColor" fillOpacity={0.2} />
      <path d="M36 26 h5 a4 4 0 0 1 4 4 v14 a3 3 0 0 0 6 0 v-18 l-5 -5" />
      <path d="M44 6 l10 10 M54 6 l-10 10" stroke={ACCENT} strokeWidth={3.2} />
    </Glyph>
  );
}

function RadarGlyph() {
  return (
    <Glyph>
      <circle cx={30} cy={34} r={18} fill="#fff" stroke="#d6372d" strokeWidth={5} />
      <text x={30} y={41} textAnchor="middle" fontFamily="var(--font-display)" fontSize={20} fill="#14161c" stroke="none">
        50
      </text>
      <path d="M50 18 a14 14 0 0 1 0 20" opacity={0.8} />
      <path d="M55 12 a22 22 0 0 1 0 32" opacity={0.5} />
    </Glyph>
  );
}

function BarrageGlyph() {
  return (
    <Glyph>
      <path d="M14 56 V26 M50 56 V26" />
      <rect x={6} y={22} width={52} height={12} rx={2} fill="#fff" stroke="none" />
      {[6, 22, 38].map((x) => (
        <path key={x} d={`M${x + 4} 22 h8 l-8 12 h-8 z`} fill="#d6372d" stroke="none" />
      ))}
      <rect x={6} y={22} width={52} height={12} rx={2} />
    </Glyph>
  );
}

function ReparationGlyph() {
  return (
    <Glyph>
      <path d="M44 10 a11 11 0 1 0 8 17 l-8 -8 4 -4 8 8 a11 11 0 0 0 -12 -13 z" fill="currentColor" fillOpacity={0.2} />
      <path d="M36 28 L14 50" strokeWidth={6} />
      <circle cx={12} cy={52} r={3} fill={ACCENT} stroke="none" />
    </Glyph>
  );
}

function RoueSecoursGlyph() {
  return (
    <Glyph>
      <circle cx={32} cy={32} r={20} />
      <circle cx={32} cy={32} r={7} fill="currentColor" fillOpacity={0.25} />
      <path d="M32 12 v8 M32 44 v8 M12 32 h8 M44 32 h8" />
      <path d="M45 50 h10 M50 45 v10" stroke={ACCENT} strokeWidth={3.4} />
    </Glyph>
  );
}

function PleinEssenceGlyph() {
  return (
    <Glyph>
      <rect x={12} y={16} width={24} height={38} rx={3} fill="currentColor" fillOpacity={0.15} />
      <rect x={17} y={22} width={14} height={10} rx={1} />
      <path d="M36 24 h5 a4 4 0 0 1 4 4 v14 a3 3 0 0 0 6 0 v-18 l-5 -5" />
      <path d="M24 38 c-5 6 -5 9 0 10 c5 -1 5 -4 0 -10 z" fill={ACCENT} stroke="none" />
    </Glyph>
  );
}

function GpsGlyph() {
  return (
    <Glyph>
      <path d="M32 6 c11 0 18 8 18 18 c0 13 -18 32 -18 32 s-18 -19 -18 -32 c0 -10 7 -18 18 -18 z" fill="currentColor" fillOpacity={0.18} />
      <circle cx={32} cy={24} r={6} fill={ACCENT} stroke="none" />
    </Glyph>
  );
}

function PassageLibreGlyph() {
  return (
    <Glyph>
      <rect x={20} y={6} width={18} height={44} rx={6} fill="#14161c" stroke="currentColor" />
      <circle cx={29} cy={16} r={4} fill="#5a1d1a" stroke="none" />
      <circle cx={29} cy={28} r={4} fill="#5a4a1a" stroke="none" />
      <circle cx={29} cy={40} r={4.5} fill="#5cff8f" stroke="none" />
      <path d="M29 50 v8" />
      <path d="M44 28 h12 M50 22 l6 6 -6 6" />
    </Glyph>
  );
}

function TurboGlyph() {
  return (
    <Glyph>
      <path d="M36 4 L18 34 h12 l-6 26 26 -34 h-13 l9 -22 z" fill={ACCENT} stroke="currentColor" />
      <path d="M6 30 h8 M4 40 h10 M8 50 h8" opacity={0.7} />
    </Glyph>
  );
}

function RaccourciGlyph() {
  return (
    <Glyph>
      <path d="M8 56 C 20 56 20 34 32 34 C 20 34 20 12 8 12" opacity={0.45} strokeDasharray="4 5" />
      <path d="M8 56 C 26 56 22 18 46 18 H56" strokeWidth={4} />
      <path d="M48 10 L57 18 L48 26" strokeWidth={4} />
    </Glyph>
  );
}

function DepassementGlyph() {
  return (
    <Glyph>
      <rect x={6} y={36} width={24} height={13} rx={5} fill="currentColor" fillOpacity={0.25} />
      <rect x={30} y={16} width={24} height={13} rx={5} fill={ACCENT} stroke="currentColor" />
      <path d="M18 34 C 20 24 26 22 30 22" strokeDasharray="3 4" />
      <path d="M52 40 l6 4 -6 4" />
    </Glyph>
  );
}

function GpsStrategiqueGlyph() {
  return (
    <Glyph>
      <rect x={20} y={8} width={24} height={14} rx={2} transform="rotate(-18 32 15)" fill="currentColor" fillOpacity={0.2} />
      <path d="M10 14 l-6 -4 M54 14 l6 -4" />
      <path d="M32 28 V54" />
      <path d="M22 44 L32 54 L42 44" />
      <circle cx={32} cy={28} r={3.5} fill={ACCENT} stroke="none" />
    </Glyph>
  );
}

function DerniereLigneDroiteGlyph() {
  return (
    <Glyph>
      <path d="M16 6 V58" />
      <g stroke="none">
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <rect key={`${r}-${c}`} x={18 + c * 8} y={8 + r * 7} width={8} height={7} fill={(r + c) % 2 === 0 ? "#14161c" : "#fff"} />
          )),
        )}
      </g>
      <rect x={18} y={8} width={32} height={28} />
    </Glyph>
  );
}

const DEFENSE_GLYPHS: Record<DefenseType, () => React.ReactElement> = {
  reparation: ReparationGlyph,
  roueSecours: RoueSecoursGlyph,
  pleinEssence: PleinEssenceGlyph,
  gps: GpsGlyph,
  passageLibre: PassageLibreGlyph,
};

export function DefenseGlyph({ defense }: { defense: DefenseType }) {
  const G = DEFENSE_GLYPHS[defense];
  return <G />;
}

export function CardArt({ def }: { def: CardDef }) {
  switch (def.special) {
    case "turbo":
      return <TurboGlyph />;
    case "raccourci":
      return <RaccourciGlyph />;
    case "derniereLigneDroite":
      return <DerniereLigneDroiteGlyph />;
    case "depassement":
      return <DepassementGlyph />;
    case "gpsStrategique":
      return <GpsStrategiqueGlyph />;
  }
  switch (def.hazard) {
    case "collision":
      return <CollisionGlyph />;
    case "crevaison":
      return <CrevaisonGlyph />;
    case "panne":
      return <PanneGlyph />;
    case "radar":
      return <RadarGlyph />;
    case "barrage":
      return <BarrageGlyph />;
  }
  if (def.defense) return <DefenseGlyph defense={def.defense} />;
  const tier = def.value ? Math.min(5, Math.ceil(def.value / 40)) : 2;
  return <RoadGlyph tier={tier} />;
}
