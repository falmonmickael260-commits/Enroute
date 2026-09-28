import { memo } from "react";
import type { AmbianceId } from "@/game/types/game";
import { AMBIANCES } from "@/game/lib/ambiances";
import { BOARD } from "./roadPath";
import { Terrain, TerrainDefs } from "./art/terrain";
import { Road, TunnelMountain } from "./art/road";
import { Scenery } from "./art/scenery";
import { LightDefs, NightLights } from "./art/lights";

/**
 * The static printed board. Memoised and kept in its own <svg> so the browser
 * can cache its rasterisation while pions animate in the layer above.
 */
export const BoardArt = memo(function BoardArt({ ambiance, target }: { ambiance: AmbianceId; target: number }) {
  const theme = AMBIANCES[ambiance];
  const lit = theme.lights > 0;
  return (
    <svg
      viewBox={`0 0 ${BOARD.width} ${BOARD.height}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <TerrainDefs />
        <LightDefs />
        <radialGradient id="boardVignette" cx="50%" cy="48%" r="72%">
          <stop offset="0.62" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </radialGradient>
      </defs>

      <Terrain />
      <Road />
      <Scenery target={target} lit={lit} />
      <TunnelMountain />

      {/* printed-cardboard grain over everything */}
      <rect width={BOARD.width} height={BOARD.height} fill="url(#paperNoise)" opacity={0.35} style={{ mixBlendMode: "overlay" }} />

      {theme.tint ? (
        <rect width={BOARD.width} height={BOARD.height} fill={theme.tint} opacity={theme.tintOpacity} style={{ mixBlendMode: "multiply" }} />
      ) : null}
      {lit ? <NightLights strength={theme.lights} /> : null}

      <rect width={BOARD.width} height={BOARD.height} fill="url(#boardVignette)" />
    </svg>
  );
});
