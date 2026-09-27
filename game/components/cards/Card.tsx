"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { forwardRef } from "react";
import type { CardCategory } from "@/game/types/game";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import { CardArt } from "./CardArt";

const CATEGORY_ACCENT: Record<CardCategory, string> = {
  distance: "var(--color-brand-gold)",
  attaque: "var(--color-brand-crimson)",
  defense: "var(--color-player-emerald)",
  special: "var(--color-brand-violet)",
};

const CATEGORY_LABEL: Record<CardCategory, string> = {
  distance: "Distance",
  attaque: "Attaque",
  defense: "Défense",
  special: "Spécial",
};

const SIZES = {
  xs: "w-12 h-16 rounded-md",
  sm: "w-16 h-24 rounded-lg",
  md: "w-24 h-36 rounded-xl",
  lg: "w-32 h-48 rounded-2xl",
  xl: "w-44 h-64 rounded-2xl",
} as const;

export type CardSize = keyof typeof SIZES;

interface CardProps {
  defId?: string;
  size?: CardSize;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  highlight?: boolean;
  layoutId?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { defId, size = "md", faceDown = false, selected = false, disabled = false, highlight = false, layoutId, onClick, className, style, title },
  ref,
) {
  const def = defId ? getCardDef(defId) : null;
  const accent = def ? CATEGORY_ACCENT[def.category] : "var(--color-asphalt-600)";

  const interactive = Boolean(onClick) && !disabled;
  const label = title ?? (def ? `${def.title} — ${def.subtitle}` : faceDown ? "Carte face cachée" : "Carte");

  return (
    <motion.div
      ref={ref}
      layoutId={layoutId}
      style={style}
      title={title}
      data-card-id={def?.id}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? label : undefined}
      aria-disabled={onClick ? disabled : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={clsx(
        SIZES[size],
        "relative shrink-0 select-none",
        interactive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]",
        disabled && "cursor-not-allowed",
        className,
      )}
      whileHover={interactive ? { y: -14, scale: 1.06, rotate: 0 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <div
        className={clsx(
          "absolute inset-0 rounded-[inherit] overflow-hidden border",
          faceDown ? "border-white/10" : "border-black/10",
        )}
        style={{
          background: faceDown
            ? "linear-gradient(155deg, var(--color-asphalt-700), var(--color-asphalt-900))"
            : "linear-gradient(155deg, var(--color-paper) 0%, var(--color-paper-dim) 100%)",
          boxShadow: selected
            ? `0 18px 32px rgba(0,0,0,0.45), 0 0 0 3px ${accent}`
            : highlight
              ? `0 10px 22px rgba(0,0,0,0.35), 0 0 0 2px ${accent}88`
              : "0 8px 18px rgba(0,0,0,0.35)",
          opacity: disabled ? 0.55 : 1,
          filter: disabled ? "grayscale(0.25)" : undefined,
        }}
      >
        {faceDown ? (
          <FaceDownPattern />
        ) : def ? (
          <FaceUp size={size} accent={accent} def={def} />
        ) : null}
      </div>
    </motion.div>
  );
});

function FaceDownPattern() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="absolute inset-1.5 rounded-[inherit] border border-white/10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(242,194,48,0.08) 0 6px, transparent 6px 14px)",
        }}
      />
      <span className="font-display text-[var(--color-brand-gold)]/80 text-[0.6em] tracking-widest rotate-[-8deg] drop-shadow">
        EN ROUTE
      </span>
    </div>
  );
}

function FaceUp({
  accent,
  def,
  size,
}: {
  accent: string;
  def: ReturnType<typeof getCardDef>;
  size: CardSize;
}) {
  const compact = size === "xs" || size === "sm";
  return (
    <div className="absolute inset-0 flex flex-col p-[8%] text-[var(--color-brand-ink)]">
      <div
        className="absolute top-0 left-0 right-0 h-[16%] opacity-90"
        style={{ background: accent }}
      />
      <div className="relative z-10 flex items-center justify-between">
        <span
          className="font-hud font-semibold uppercase tracking-wider text-white"
          style={{ fontSize: compact ? "0.42rem" : "0.58rem" }}
        >
          {CATEGORY_LABEL[def.category]}
        </span>
        {def.value ? (
          <span
            className="font-display text-white leading-none"
            style={{ fontSize: compact ? "0.7rem" : "1rem" }}
          >
            {def.value}
          </span>
        ) : null}
      </div>

      <div className="relative flex-1 flex items-center justify-center py-1" style={{ color: accent }}>
        <div className={compact ? "w-8 h-8" : "w-[62%] aspect-square max-h-full"}>
          <CardArt def={def} />
        </div>
      </div>

      <div className="relative z-10 text-center">
        <p
          className="font-display leading-tight tracking-wide"
          style={{ fontSize: compact ? "0.5rem" : size === "md" ? "0.72rem" : "0.95rem" }}
        >
          {def.title}
        </p>
        {!compact ? (
          <p className="font-sans text-[0.5rem] leading-tight text-black/55 mt-0.5 line-clamp-2">
            {def.subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
