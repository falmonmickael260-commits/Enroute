import type { CardDef } from "@/game/types/game";

const STROKE = "currentColor";

function Badge({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <circle cx="32" cy="32" r="30" fill={tint} opacity={0.14} />
      <circle cx="32" cy="32" r="23" fill={tint} opacity={0.12} />
      <g stroke={STROKE} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {children}
      </g>
    </svg>
  );
}

function RoadArt({ tier }: { tier: number }) {
  // tier 1..5 controls how "big" the stretch of road feels
  const dashes = Math.min(5, Math.max(1, tier));
  return (
    <Badge tint="var(--color-brand-gold)">
      <path d="M14 46 L26 16 H38 L50 46 Z" fill="var(--color-asphalt-700)" opacity={0.9} stroke="none" />
      {Array.from({ length: dashes }).map((_, i) => (
        <line
          key={i}
          x1={32}
          y1={40 - i * 5.4}
          x2={32}
          y2={37 - i * 5.4}
          stroke="var(--color-brand-gold)"
          strokeWidth={2.2}
        />
      ))}
      <path d="M14 46 L26 16 H38 L50 46" />
    </Badge>
  );
}

function CollisionArt() {
  return (
    <Badge tint="var(--color-brand-crimson)">
      <path d="M14 34 h12 l4 -6 h6 l4 6 h10" />
      <circle cx="21" cy="38" r="3" />
      <circle cx="43" cy="38" r="3" />
      <path d="M30 22 L34 30 L26 30 Z" fill="var(--color-brand-gold)" stroke="none" />
      <path d="M32 16 L34 22 M40 20 L36 25 M24 20 L28 25" />
    </Badge>
  );
}

function CrevaisonArt() {
  return (
    <Badge tint="var(--color-brand-crimson)">
      <circle cx="32" cy="32" r="14" />
      <circle cx="32" cy="32" r="6" />
      <path d="M32 18 V26 M32 38 V46 M18 32 H26 M38 32 H46" />
      <path d="M42 22 L46 18 M45 25 L50 22" stroke="var(--color-brand-gold)" />
    </Badge>
  );
}

function PanneArt() {
  return (
    <Badge tint="var(--color-brand-crimson)">
      <path d="M20 44 V26 h16 l6 6 v12 z" />
      <path d="M20 32 h22" />
      <circle cx="26" cy="44" r="2.4" />
      <circle cx="36" cy="44" r="2.4" />
      <path d="M44 22 L50 16 M50 22 L44 16" stroke="var(--color-brand-gold)" />
    </Badge>
  );
}

function RadarArt() {
  return (
    <Badge tint="var(--color-brand-crimson)">
      <rect x="24" y="34" width="16" height="12" rx="2" />
      <circle cx="32" cy="26" r="7" />
      <path d="M32 26 h9" stroke="var(--color-brand-gold)" />
      <path d="M44 16 a14 14 0 0 1 0 20" opacity={0.7} />
      <path d="M48 12 a20 20 0 0 1 0 28" opacity={0.4} />
    </Badge>
  );
}

function BarrageArt() {
  return (
    <Badge tint="var(--color-brand-crimson)">
      <rect x="12" y="28" width="40" height="8" rx="2" transform="rotate(-8 32 32)" />
      <rect x="12" y="28" width="6" height="8" fill="var(--color-brand-gold)" stroke="none" transform="rotate(-8 32 32)" />
      <rect x="30" y="28" width="6" height="8" fill="var(--color-brand-gold)" stroke="none" transform="rotate(-8 32 32)" />
      <path d="M18 46 V22 M46 46 V22" />
    </Badge>
  );
}

function ReparationArt() {
  return (
    <Badge tint="var(--color-player-emerald)">
      <path d="M40 18 a8 8 0 1 0 6 13 l-6 -6 3 -3 6 6 a8 8 0 0 0 -9 -10z" />
      <path d="M20 44 L34 30" />
      <circle cx="18" cy="46" r="3" />
    </Badge>
  );
}

function RoueSecoursArt() {
  return (
    <Badge tint="var(--color-player-emerald)">
      <circle cx="32" cy="32" r="14" />
      <circle cx="32" cy="32" r="5" />
      <path d="M32 18 V22 M32 42 V46 M18 32 H22 M42 32 H46" />
      <path d="M24 44 L20 50 M40 44 L44 50" stroke="var(--color-brand-gold)" />
    </Badge>
  );
}

function PleinEssenceArt() {
  return (
    <Badge tint="var(--color-player-emerald)">
      <rect x="18" y="20" width="16" height="26" rx="2" />
      <rect x="21" y="24" width="10" height="7" />
      <path d="M34 26 h4 a4 4 0 0 1 4 4 v10 a3 3 0 0 0 6 0 v-14 l-4 -4" />
      <path d="M22 46 h10" />
    </Badge>
  );
}

function GpsArt() {
  return (
    <Badge tint="var(--color-player-azure)">
      <path d="M32 14 c8 0 13 6 13 13 c0 9 -13 23 -13 23 s-13 -14 -13 -23 c0 -7 5 -13 13 -13z" />
      <circle cx="32" cy="27" r="4.5" />
    </Badge>
  );
}

function PassageLibreArt() {
  return (
    <Badge tint="var(--color-player-emerald)">
      <rect x="26" y="14" width="12" height="30" rx="4" />
      <circle cx="32" cy="21" r="2.2" fill="var(--color-brand-crimson)" stroke="none" opacity={0.35} />
      <circle cx="32" cy="29" r="2.2" fill="var(--color-brand-gold)" stroke="none" opacity={0.35} />
      <circle cx="32" cy="37" r="2.2" fill="var(--color-player-emerald)" stroke="none" />
      <path d="M40 32 L50 32 M45 27 L50 32 L45 37" />
    </Badge>
  );
}

function TurboArt() {
  return (
    <Badge tint="var(--color-brand-gold)">
      <path d="M28 14 L20 34 h8 l-4 16 20 -24 h-9 l6 -12z" fill="var(--color-brand-gold)" opacity={0.25} stroke="none" />
      <path d="M28 14 L20 34 h8 l-4 16 20 -24 h-9 l6 -12z" />
      <path d="M12 40 h4 M10 32 h5 M12 24 h4" opacity={0.6} />
    </Badge>
  );
}

function RaccourciArt() {
  return (
    <Badge tint="var(--color-brand-gold)">
      <path d="M14 46 C 22 46 22 32 30 32 C 22 32 22 18 14 18" opacity={0.5} />
      <path d="M14 46 C 26 46 24 20 40 20 H48" />
      <path d="M43 15 L50 20 L43 25" />
    </Badge>
  );
}

function DepassementArt() {
  return (
    <Badge tint="var(--color-brand-gold)">
      <path d="M14 40 h14 l4 -6 h6" />
      <circle cx="19" cy="42" r="2.6" />
      <circle cx="35" cy="42" r="2.6" />
      <path d="M28 24 h14 l4 -6 h6" opacity={0.55} />
      <circle cx="33" cy="26" r="2.2" opacity={0.55} />
      <circle cx="47" cy="26" r="2.2" opacity={0.55} />
      <path d="M46 34 L52 30 M46 34 L52 38" />
    </Badge>
  );
}

function GpsStrategiqueArt() {
  return (
    <Badge tint="var(--color-brand-gold)">
      <rect x="22" y="14" width="20" height="12" rx="2" transform="rotate(-18 32 20)" />
      <path d="M32 30 V48" />
      <path d="M24 40 L32 48 L40 40" />
      <path d="M18 20 L14 16 M46 20 L50 16" opacity={0.6} />
    </Badge>
  );
}

function DerniereLigneDroiteArt() {
  return (
    <Badge tint="var(--color-brand-crimson)">
      <path d="M20 14 V50" />
      <path d="M20 16 h18 v6 h-9 v6 h9 v6 H20z" fill="var(--color-asphalt-800)" stroke="none" />
      <path d="M20 16 h18 v6 h-9 v6 h9 v6 H20z" />
    </Badge>
  );
}

export function CardArt({ def }: { def: CardDef }) {
  if (def.category === "distance" || (def.category === "special" && def.value && def.special !== "depassement" && def.special !== "gpsStrategique")) {
    if (def.special === "turbo") return <TurboArt />;
    if (def.special === "raccourci") return <RaccourciArt />;
    if (def.special === "derniereLigneDroite") return <DerniereLigneDroiteArt />;
    const tier = def.value ? Math.min(5, Math.ceil(def.value / 40)) : 2;
    return <RoadArt tier={tier} />;
  }
  switch (def.hazard) {
    case "collision":
      return <CollisionArt />;
    case "crevaison":
      return <CrevaisonArt />;
    case "panne":
      return <PanneArt />;
    case "radar":
      return <RadarArt />;
    case "barrage":
      return <BarrageArt />;
  }
  switch (def.defense) {
    case "reparation":
      return <ReparationArt />;
    case "roueSecours":
      return <RoueSecoursArt />;
    case "pleinEssence":
      return <PleinEssenceArt />;
    case "gps":
      return <GpsArt />;
    case "passageLibre":
      return <PassageLibreArt />;
  }
  switch (def.special) {
    case "depassement":
      return <DepassementArt />;
    case "gpsStrategique":
      return <GpsStrategiqueArt />;
  }
  return <RoadArt tier={2} />;
}
