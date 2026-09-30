import assets from "./assets.json";

/** The game's name, as players see it. */
export const BRAND_NAME = "KILOMAX";

/**
 * The official KILOMAX files (written by scripts/prepare-brand.mjs). The logo
 * is a transparent PNG shown as-is: never redrawn, never put on a box.
 */
export const BRAND = assets;

export const LOGO_ASPECT = assets.logo.width / assets.logo.height;

/** srcset for the logo: the light copy for small sizes, full resolution above. */
export const LOGO_SRCSET =
  assets.logo.width > assets.logo.smallWidth
    ? `${assets.logo.small} ${assets.logo.smallWidth}w, ${assets.logo.src} ${assets.logo.width}w`
    : `${assets.logo.src} ${assets.logo.width}w`;
