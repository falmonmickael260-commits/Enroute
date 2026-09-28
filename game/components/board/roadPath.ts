/**
 * Board geometry. The route is a serpentine on a 1600x1000 board:
 * three straight rows joined by two half-turns. Everything is parametrised by
 * arc length so pions can be placed at any distance and animated along the
 * actual curve (never cutting across the landscape).
 */
export const BOARD = { width: 1600, height: 1000 } as const;
export const ROAD_WIDTH = 64;

export const ROWS = { bottom: 850, middle: 550, top: 250 } as const;
const TURN_RADIUS = 150;
const START_X = 200;
const FINISH_X = 1400;
const RIGHT_TURN_X = 1340;
const LEFT_TURN_X = 260;

type Segment =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; length: number }
  | { kind: "arc"; cx: number; cy: number; r: number; a0: number; a1: number; length: number };

function line(x1: number, y1: number, x2: number, y2: number): Segment {
  return { kind: "line", x1, y1, x2, y2, length: Math.hypot(x2 - x1, y2 - y1) };
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number): Segment {
  return { kind: "arc", cx, cy, r, a0, a1, length: Math.abs(a1 - a0) * r };
}

const SEGMENTS: Segment[] = [
  line(START_X, ROWS.bottom, RIGHT_TURN_X, ROWS.bottom),
  arc(RIGHT_TURN_X, (ROWS.bottom + ROWS.middle) / 2, TURN_RADIUS, Math.PI / 2, -Math.PI / 2),
  line(RIGHT_TURN_X, ROWS.middle, LEFT_TURN_X, ROWS.middle),
  arc(LEFT_TURN_X, (ROWS.middle + ROWS.top) / 2, TURN_RADIUS, Math.PI / 2, (3 * Math.PI) / 2),
  line(LEFT_TURN_X, ROWS.top, FINISH_X, ROWS.top),
];

export const ROAD_LENGTH = SEGMENTS.reduce((sum, s) => sum + s.length, 0);

export interface RoadPoint {
  x: number;
  y: number;
  /** Heading in degrees (0 = east, SVG y-down). */
  angle: number;
  /** Unit normal pointing to the right-hand side of travel. */
  nx: number;
  ny: number;
}

function pointOnSegment(seg: Segment, local: number): RoadPoint {
  if (seg.kind === "line") {
    const t = seg.length === 0 ? 0 : local / seg.length;
    const tx = (seg.x2 - seg.x1) / seg.length;
    const ty = (seg.y2 - seg.y1) / seg.length;
    return {
      x: seg.x1 + (seg.x2 - seg.x1) * t,
      y: seg.y1 + (seg.y2 - seg.y1) * t,
      angle: (Math.atan2(ty, tx) * 180) / Math.PI,
      nx: -ty,
      ny: tx,
    };
  }
  const dir = Math.sign(seg.a1 - seg.a0);
  const a = seg.a0 + (dir * local) / seg.r;
  const tx = -Math.sin(a) * dir;
  const ty = Math.cos(a) * dir;
  return {
    x: seg.cx + seg.r * Math.cos(a),
    y: seg.cy + seg.r * Math.sin(a),
    angle: (Math.atan2(ty, tx) * 180) / Math.PI,
    nx: -ty,
    ny: tx,
  };
}

function extend(p: RoadPoint, by: number): RoadPoint {
  const rad = (p.angle * Math.PI) / 180;
  return { ...p, x: p.x + Math.cos(rad) * by, y: p.y + Math.sin(rad) * by };
}

/** Point at `s` units of road from the start line. Values outside the route
 * continue straight along the lead-in / run-out (used for the starting grid). */
export function pointAtLength(s: number): RoadPoint {
  if (s < 0) return extend(pointOnSegment(SEGMENTS[0], 0), s);
  if (s > ROAD_LENGTH) {
    const last = SEGMENTS[SEGMENTS.length - 1];
    return extend(pointOnSegment(last, last.length), s - ROAD_LENGTH);
  }
  let remaining = s;
  for (const seg of SEGMENTS) {
    if (remaining <= seg.length) return pointOnSegment(seg, remaining);
    remaining -= seg.length;
  }
  const last = SEGMENTS[SEGMENTS.length - 1];
  return pointOnSegment(last, last.length);
}

/** Point at fraction `t` (0 = départ, 1 = arrivée). */
export function roadPoint(t: number): RoadPoint {
  return pointAtLength(t * ROAD_LENGTH);
}

/** Offset a road point sideways (positive = right-hand side of travel). */
export function offsetPoint(p: RoadPoint, lateral: number): { x: number; y: number } {
  return { x: p.x + p.nx * lateral, y: p.y + p.ny * lateral };
}

const PATH_BODY = [
  `L ${RIGHT_TURN_X} ${ROWS.bottom}`,
  `A ${TURN_RADIUS} ${TURN_RADIUS} 0 0 0 ${RIGHT_TURN_X} ${ROWS.middle}`,
  `L ${LEFT_TURN_X} ${ROWS.middle}`,
  `A ${TURN_RADIUS} ${TURN_RADIUS} 0 0 1 ${LEFT_TURN_X} ${ROWS.top}`,
  `L ${FINISH_X} ${ROWS.top}`,
].join(" ");

export const PLAZA = { x: 1490, y: ROWS.top, r: 44 } as const;

/** SVG path for the playable route, from the start line to the finish line. */
export const ROAD_PATH_D = `M ${START_X} ${ROWS.bottom} ${PATH_BODY}`;

/** What is drawn: the route plus a lead-in from off-board and a run-out to the podium plaza. */
export const ROAD_VISUAL_D = `M -40 ${ROWS.bottom} L ${START_X} ${ROWS.bottom} ${PATH_BODY} L ${PLAZA.x} ${ROWS.top}`;

export const LANDMARKS = {
  startX: START_X,
  finishX: FINISH_X,
  rightTurn: { cx: RIGHT_TURN_X, cy: (ROWS.bottom + ROWS.middle) / 2, r: TURN_RADIUS },
  leftTurn: { cx: LEFT_TURN_X, cy: (ROWS.middle + ROWS.top) / 2, r: TURN_RADIUS },
  bridgeX: 600,
  tunnel: { from: 470, to: 700 },
} as const;
