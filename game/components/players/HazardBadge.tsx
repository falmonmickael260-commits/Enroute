import type { HazardType } from "@/game/types/game";

const HAZARD_GLYPH: Record<HazardType, string> = {
  collision: "💥",
  crevaison: "🛞",
  panne: "⛽",
  radar: "🚨",
  barrage: "🛑",
};

export function HazardBadge({ hazard }: { hazard: HazardType }) {
  return (
    <g>
      <circle r="10" fill="var(--color-brand-crimson)" stroke="white" strokeWidth={1.4} />
      <text x={0} y={4} textAnchor="middle" fontSize="11">
        {HAZARD_GLYPH[hazard]}
      </text>
    </g>
  );
}
