import { BRAND, BRAND_NAME, LOGO_READY, LOGO_SRCSET } from "@/game/lib/brand";

/** The wooden game table with the KILOMAX logo over its top band. Place
 * inside an `isolate` container and give sibling content `relative z-10`. */
export function TableBackdrop() {
  return (
    <div aria-hidden className="table-backdrop">
      {LOGO_READY ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BRAND.logo.src}
          srcSet={LOGO_SRCSET}
          sizes="(orientation: portrait) 40vw, 34vw"
          width={BRAND.logo.width}
          height={BRAND.logo.height}
          alt=""
          draggable={false}
          className="table-logo"
        />
      ) : (
        <span className="table-logo font-display text-5xl text-white/80">{BRAND_NAME}</span>
      )}
    </div>
  );
}
