import clsx from "clsx";
import { BACKGROUND } from "@/game/lib/brand";

/**
 * The official KILOMAX picture behind the menus: portrait on phones and tall
 * screens, landscape elsewhere, always covering the screen without distortion.
 * `home` keeps it sharp; `inner` softens its edges so the panel reads first.
 */
export function MenuBackdrop({ variant = "home" }: { variant?: "home" | "inner" }) {
  return (
    <div aria-hidden className={clsx("menu-backdrop", variant === "inner" && "menu-backdrop-inner")}>
      {BACKGROUND.portrait && BACKGROUND.landscape ? (
        <picture>
          <source media="(orientation: portrait)" srcSet={BACKGROUND.portrait.src} />
          <img
            src={BACKGROUND.landscape.src}
            alt=""
            draggable={false}
            fetchPriority="high"
            style={{ ["--landscape-position" as string]: BACKGROUND.landscapePosition }}
          />
        </picture>
      ) : (
        <div className="menu-backdrop-fallback" />
      )}
      {variant === "inner" ? <div className="menu-backdrop-blur" /> : null}
      <div className="menu-backdrop-shade" />
    </div>
  );
}
