import { ROAD_LENGTH } from "./roadPath";

export interface PieceSlot {
  /** Arc position of the car's centre (units along the road). */
  s: number;
  /** Sideways offset from the road centre (positive = right of travel). */
  lateral: number;
  /** Sideways offset of the name plaque from the road centre. */
  labelOffset: number;
}

const CAR_GAP = 60;
const LANE = 18;
/** The car's centre sits this far behind its true distance, so the nose touches the mark. */
const NOSE = 36;
const LABEL_BASE = 62;
const LABEL_STEP = 32;

/** Rendered length of a pion in board units at scale 1. */
export const PIECE_LENGTH = 72;

/**
 * Pions grow when the board is shown small so they stay readable on screen
 * (`pxPerUnit` = on-screen pixels per board unit, camera zoom included).
 */
export function pieceScaleFor(pxPerUnit: number): number {
  if (pxPerUnit <= 0) return 1;
  const MIN_ON_SCREEN_PX = 36;
  return Math.min(2, Math.max(1, MIN_ON_SCREEN_PX / (PIECE_LENGTH * pxPerUnit)));
}

/**
 * Cars that would overlap are laid out two abreast, extra cars queueing behind
 * (a starting grid at the départ, a traffic jam elsewhere).
 */
export function layoutPieces(
  players: { id: string; distance: number }[],
  target: number,
  scale = 1,
): Record<string, PieceSlot> {
  const gap = CAR_GAP * scale;
  const items = players
    .map((p, index) => ({ id: p.id, index, s: (Math.min(p.distance, target) / target) * ROAD_LENGTH - NOSE * scale }))
    .sort((a, b) => b.s - a.s || a.index - b.index);

  const clusters: (typeof items)[] = [];
  for (const item of items) {
    const current = clusters[clusters.length - 1];
    const prev = current?.[current.length - 1];
    if (prev && prev.s - item.s < gap) current.push(item);
    else clusters.push([item]);
  }

  const slots: Record<string, PieceSlot> = {};
  for (const cluster of clusters) {
    const placed: number[] = [];
    cluster.forEach((item, k) => {
      const solo = cluster.length === 1;
      const side = solo || k % 2 === 1 ? 1 : -1;
      const s = k >= 2 ? Math.min(item.s, placed[k - 2] - gap) : item.s;
      placed.push(s);
      slots[item.id] = {
        s,
        lateral: solo ? 0 : side * LANE * scale,
        labelOffset: side * (LABEL_BASE + Math.floor(k / 2) * LABEL_STEP) * scale,
      };
    });
  }
  return slots;
}
