import assets from "./assets.json";

/** The game's name, as players see it. */
export const BRAND_NAME = "KILOMAX";

/**
 * The official KILOMAX files (brought in by scripts/prepare-brand.mjs). The
 * logo is a transparent PNG shown as-is: never redrawn, never put on a box.
 * Each file can arrive on its own; `ready` says whether it is in.
 */
export const BRAND = assets;

export const LOGO_READY = assets.logo.ready;

export const LOGO_ASPECT = assets.logo.width / assets.logo.height;

/** srcset for the logo: the light copy for small sizes, full resolution above. */
export const LOGO_SRCSET =
  assets.logo.width > assets.logo.smallWidth
    ? `${assets.logo.small} ${assets.logo.smallWidth}w, ${assets.logo.src} ${assets.logo.width}w`
    : `${assets.logo.src} ${assets.logo.width}w`;

type Background = { src: string; width: number; height: number; bytes: number };

/**
 * The background picture per orientation. Until a landscape picture exists,
 * wide screens show the portrait one, framed on the coast and the road.
 */
export const BACKGROUND: { portrait: Background | null; landscape: Background | null; landscapePosition: string } = {
  portrait: assets.portrait.ready ? assets.portrait : assets.landscape.ready ? assets.landscape : null,
  landscape: assets.landscape.ready ? assets.landscape : assets.portrait.ready ? assets.portrait : null,
  landscapePosition: assets.landscape.ready ? "50% 50%" : "50% 58%",
};
