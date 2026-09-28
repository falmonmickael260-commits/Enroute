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

/**
 * Cars that would overlap are laid out two abreast, extra cars queueing behind
 * (a starting grid at the départ, a traffic jam elsewhere).
 */
export function layoutPieces(players: { id: string; distance: number }[], target: number): Record<string, PieceSlot> {
  const items = players
    .map((p, index) => ({ id: p.id, index, s: (Math.min(p.distance, target) / target) * ROAD_LENGTH - NOSE }))
    .sort((a, b) => b.s - a.s || a.index - b.index);

  const clusters: (typeof items)[] = [];
  for (const item of items) {
    const current = clusters[clusters.length - 1];
    const prev = current?.[current.length - 1];
    if (prev && prev.s - item.s < CAR_GAP) current.push(item);
    else clusters.push([item]);
  }

  const slots: Record<string, PieceSlot> = {};
  for (const cluster of clusters) {
    const placed: number[] = [];
    cluster.forEach((item, k) => {
      const solo = cluster.length === 1;
      const side = solo || k % 2 === 1 ? 1 : -1;
      const s = k >= 2 ? Math.min(item.s, placed[k - 2] - CAR_GAP) : item.s;
      placed.push(s);
      slots[item.id] = {
        s,
        lateral: solo ? 0 : side * LANE,
        labelOffset: side * (LABEL_BASE + Math.floor(k / 2) * LABEL_STEP),
      };
    });
  }
  return slots;
}
