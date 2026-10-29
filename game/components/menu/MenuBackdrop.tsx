import clsx from "clsx";

/**
 * Grand Tourisme panorama, shared with the loader and cropped responsively.
 * `inner` softens its edges so the panel reads first.
 */
export function MenuBackdrop({ variant = "home" }: { variant?: "home" | "inner" }) {
  return (
    <div aria-hidden className={clsx("menu-backdrop", variant === "inner" && "menu-backdrop-inner")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/premium/coast.webp" alt="" draggable={false} fetchPriority="high" />
      {variant === "inner" ? <div className="menu-backdrop-blur" /> : null}
      <div className="menu-backdrop-shade" />
    </div>
  );
}
