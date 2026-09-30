"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { forwardRef } from "react";
import type { CardCategory, CardDef } from "@/game/types/game";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import { CardArt } from "./CardArt";
import { BRAND, BRAND_NAME, LOGO_ASPECT, LOGO_READY } from "@/game/lib/brand";

export const CATEGORY_STYLE: Record<CardCategory, { from: string; to: string; label: string; accent: string }> = {
  distance: { from: "#f8c94e", to: "#c27410", label: "Distance", accent: "#e0a93e" },
  attaque: { from: "#f3665d", to: "#931d17", label: "Attaque", accent: "#e0483e" },
  defense: { from: "#4fc98b", to: "#14603b", label: "Défense", accent: "#3eab6f" },
  special: { from: "#a78cf7", to: "#3f2296", label: "Spécial", accent: "#8b6fe0" },
};

const SIZES = {
  xs: { box: "w-12 h-[4.5rem] rounded-md", title: "0.42rem", value: "0.62rem", sub: null },
  sm: { box: "w-16 h-24 rounded-lg", title: "0.52rem", value: "0.72rem", sub: null },
  md: { box: "w-24 h-36 rounded-xl", title: "0.78rem", value: "1rem", sub: "0.5rem" },
  lg: { box: "w-32 h-48 rounded-2xl", title: "1rem", value: "1.3rem", sub: "0.58rem" },
  xl: { box: "w-44 h-64 rounded-2xl", title: "1.35rem", value: "1.7rem", sub: "0.72rem" },
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
  const accent = def ? CATEGORY_STYLE[def.category].accent : "#e6bf5c";
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
        SIZES[size].box,
        "relative shrink-0 select-none",
        interactive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]",
        className,
      )}
      whileHover={interactive ? { y: -16, scale: 1.07, rotate: 0 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-[inherit]"
        style={{
          boxShadow: selected
            ? `0 22px 36px rgba(0,0,0,0.5), 0 0 0 3px ${accent}, 0 0 24px ${accent}88`
            : highlight
              ? `0 12px 24px rgba(0,0,0,0.45), 0 0 0 2px ${accent}, 0 0 14px ${accent}66`
              : "0 10px 20px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.3)",
          filter: disabled ? "saturate(0.85) brightness(0.93)" : undefined,
        }}
      >
        {faceDown ? <CardBack /> : def ? <CardFace def={def} size={size} /> : null}
      </div>
    </motion.div>
  );
});

function CardBack() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, rgba(255,214,150,0.18), transparent 55%), repeating-linear-gradient(45deg, rgba(230,191,92,0.1) 0 2px, transparent 2px 9px), repeating-linear-gradient(-45deg, rgba(230,191,92,0.1) 0 2px, transparent 2px 9px), linear-gradient(160deg, #2a1712, #120a07)",
        border: "1px solid rgba(0,0,0,0.6)",
      }}
    >
      <div className="absolute inset-[7%] rounded-[inherit] border border-[#e6bf5c]/60" style={{ borderRadius: "10%" }} />
      <div className="relative flex w-[78%] flex-col items-center">
        {LOGO_READY ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={BRAND.logo.small}
            width={BRAND.logo.smallWidth}
            height={Math.round(BRAND.logo.smallWidth / LOGO_ASPECT)}
            alt=""
            draggable={false}
            className="block h-auto w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
          />
        ) : (
          <span className="font-display leading-none tracking-[0.08em] text-[0.62em]" style={{ color: "#e6bf5c" }}>
            {BRAND_NAME}
          </span>
        )}
        <span className="mt-[0.25em] h-[2px] w-[2.2em] bg-[repeating-linear-gradient(90deg,#e6bf5c_0_5px,transparent_5px_9px)]" />
      </div>
    </div>
  );
}

function CardFace({ def, size }: { def: CardDef; size: CardSize }) {
  const cat = CATEGORY_STYLE[def.category];
  const s = SIZES[size];
  const compact = size === "xs" || size === "sm";
  return (
    <div
      className="absolute inset-0"
      style={{
        background: "linear-gradient(170deg, #fffaf0 0%, #f1e7d2 100%)",
        border: def.category === "special" ? "2px solid #d9aa45" : "1px solid rgba(0,0,0,0.3)",
        borderRadius: "inherit",
      }}
    >
      {/* illustration panel */}
      <div
        className="absolute left-[6%] right-[6%] top-[5%] h-[60%] overflow-hidden"
        style={{
          borderRadius: compact ? "6px" : "10px",
          background: `repeating-conic-gradient(from 0deg at 50% 62%, rgba(255,255,255,0.11) 0deg 7deg, transparent 7deg 18deg), radial-gradient(90% 70% at 50% 35%, rgba(255,255,255,0.28), transparent 60%), linear-gradient(165deg, ${cat.from}, ${cat.to})`,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25), inset 0 -10px 18px rgba(0,0,0,0.18)",
        }}
      >
        <div className="absolute inset-x-[16%] bottom-[7%] top-[14%] text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.35)]">
          <CardArt def={def} />
        </div>
        {def.value ? (
          <div
            className="absolute left-[6%] top-[6%] flex items-baseline gap-[0.12em] rounded-full bg-black/55 px-[0.45em] py-[0.05em] text-white"
            style={{ fontSize: s.value }}
          >
            <span className="font-display leading-none">{def.value}</span>
            {!compact ? <span className="font-hud text-[0.45em] font-bold leading-none">KM</span> : null}
          </div>
        ) : null}
        {!compact && !def.value ? (
          <span className="absolute right-[6%] top-[7%] font-hud text-[0.5rem] font-bold uppercase tracking-[0.14em] text-white/85">
            {cat.label}
          </span>
        ) : null}
      </div>

      {/* title block */}
      <div className="absolute inset-x-[6%] bottom-[5%] top-[67%] flex flex-col items-center justify-center text-center text-[#16130f]">
        <p className="font-display leading-[0.95] tracking-wide" style={{ fontSize: s.title }}>
          {def.title}
        </p>
        {s.sub ? (
          <p className="mt-[0.2em] line-clamp-2 font-sans leading-tight text-black/55" style={{ fontSize: s.sub }}>
            {def.subtitle}
          </p>
        ) : null}
      </div>
      <div className="absolute inset-x-[30%] bottom-[3%] h-[2px] rounded-full" style={{ background: cat.accent, opacity: 0.8 }} />

      {/* laminated gloss */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ borderRadius: "inherit", background: "linear-gradient(125deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.12) 100%)" }}
      />
    </div>
  );
}
