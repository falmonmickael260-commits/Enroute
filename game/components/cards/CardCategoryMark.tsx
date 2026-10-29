import type { CardCategory } from "@/game/types/game";

export const CARD_IDENTITY: Record<
  CardCategory,
  {
    label: string;
    symbol: string;
    color: string;
    dark: string;
    pattern: string;
  }
> = {
  distance: {
    label: "DISTANCE",
    symbol: "↗",
    color: "#f4bf50",
    dark: "#41300d",
    pattern:
      "repeating-linear-gradient(90deg,transparent 0 10px,#f4bf5020 10px 12px)",
  },
  attaque: {
    label: "MALUS",
    symbol: "!",
    color: "#ff625c",
    dark: "#541c23",
    pattern:
      "repeating-linear-gradient(-45deg,transparent 0 8px,#ff625c30 8px 12px)",
  },
  defense: {
    label: "PARADE",
    symbol: "+",
    color: "#55e3b0",
    dark: "#103c34",
    pattern:
      "repeating-linear-gradient(0deg,transparent 0 8px,#55e3b020 8px 10px)",
  },
  special: {
    label: "BONUS",
    symbol: "ϟ",
    color: "#c2a0ff",
    dark: "#36214f",
    pattern: "radial-gradient(#c2a0ff45 1px,transparent 2px) 0 0/9px 9px",
  },
};

/** Shape and word accompany colour, including for colour-blind players. */
export function CardCategoryMark({
  category,
  className = "",
}: {
  category: CardCategory;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      {category === "attaque" ? (
        <>
          <path d="M12 2 23 21H1Z" />
          <path d="M12 8v6m0 3v1" />
        </>
      ) : category === "defense" ? (
        <>
          <path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" />
          <path d="m8 12 3 3 5-6" />
        </>
      ) : category === "special" ? (
        <path d="m14 1-11 13h8l-1 9L22 9h-9Z" />
      ) : (
        <>
          <path d="M8 23 10 1m6 22L14 1M12 4v4m0 4v4m0 4v3" />
        </>
      )}
    </svg>
  );
}

export function CardCategoryLegend() {
  return (
    <div className="card-category-legend" aria-label="Familles de cartes">
      {(Object.keys(CARD_IDENTITY) as CardCategory[]).map((category) => (
        <span key={category} style={{ color: CARD_IDENTITY[category].color }}>
          <CardCategoryMark category={category} />
          {CARD_IDENTITY[category].label}
        </span>
      ))}
    </div>
  );
}
