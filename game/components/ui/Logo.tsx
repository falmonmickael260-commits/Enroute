import clsx from "clsx";

const sizes = {
  sm: { text: "text-2xl md:text-3xl", stripe: "w-16 h-1" },
  md: { text: "text-4xl md:text-5xl", stripe: "w-24 h-1.5" },
  lg: { text: "text-6xl md:text-8xl", stripe: "w-36 h-2" },
  xl: { text: "text-7xl md:text-[9rem]", stripe: "w-48 h-2.5" },
} as const;

export function Logo({
  size = "md",
  tagline = false,
  className,
}: {
  size?: keyof typeof sizes;
  tagline?: boolean;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <div className={clsx("inline-flex flex-col items-center select-none", className)}>
      <h1
        className={clsx(
          s.text,
          "font-display leading-none tracking-[0.06em] text-brand-shadow flex items-baseline gap-[0.14em]",
        )}
      >
        <span className="text-[var(--color-paper)]">EN</span>
        <span className="text-[var(--color-brand-crimson)]">ROUTE</span>
      </h1>
      <span
        className={clsx(
          s.stripe,
          "mt-2 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-brand-gold)_0_14px,transparent_14px_24px)] opacity-90",
        )}
      />
      {tagline ? (
        <p className="mt-3 font-hud text-sm md:text-base tracking-[0.3em] uppercase text-[var(--color-paper)]/70">
          À toi de prendre la route
        </p>
      ) : null}
    </div>
  );
}
