import clsx from "clsx";
import { BRAND, BRAND_NAME, LOGO_ASPECT, LOGO_READY, LOGO_SRCSET } from "@/game/lib/brand";

/** Displayed widths; `sizes` lets the browser pick a file sharp enough for the screen. */
const sizes = {
  sm: { box: "w-[7.5rem] md:w-[9.5rem]", sizes: "(min-width: 768px) 152px, 120px" },
  md: { box: "w-[min(70vw,18rem)]", sizes: "(min-width: 412px) 288px, 70vw" },
  lg: { box: "w-[min(80vw,28rem)]", sizes: "(min-width: 560px) 448px, 80vw" },
  xl: { box: "w-[min(86vw,40rem)]", sizes: "(min-width: 745px) 640px, 86vw" },
} as const;

/**
 * The official KILOMAX logo: the transparent PNG laid straight over whatever
 * is behind it, at its own proportions (no frame, no backing, no redraw).
 */
export function Logo({
  size = "md",
  className,
  priority = false,
}: {
  size?: keyof typeof sizes;
  className?: string;
  priority?: boolean;
}) {
  const s = sizes[size];
  return (
    <div className={clsx("inline-flex select-none", s.box, className)}>
      {LOGO_READY ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BRAND.logo.src}
          srcSet={LOGO_SRCSET}
          sizes={s.sizes}
          width={BRAND.logo.width}
          height={BRAND.logo.height}
          alt={BRAND_NAME}
          draggable={false}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="block h-auto w-full"
          style={{ aspectRatio: LOGO_ASPECT }}
        />
      ) : (
        // placeholder until scripts/prepare-brand.mjs has brought the official file in
        <span className="block w-full text-center font-display text-[2em] leading-none tracking-[0.08em] text-white">{BRAND_NAME}</span>
      )}
    </div>
  );
}
