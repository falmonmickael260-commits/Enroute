export const ROAD_VIEWBOX = { width: 1000, height: 320 };

const X_MARGIN = 50;
const X_SPAN = ROAD_VIEWBOX.width - X_MARGIN * 2;
const BASELINE_Y = 190;
const AMPLITUDE = 58;
const FREQ = 1.15; // wave cycles across the whole board
const PHASE = 0.25;

function angularArg(t: number): number {
  return t * FREQ * Math.PI * 2 + PHASE;
}

export function roadX(t: number): number {
  return X_MARGIN + t * X_SPAN;
}

export function roadY(t: number): number {
  return BASELINE_Y + AMPLITUDE * Math.sin(angularArg(t));
}

export function roadAngleDeg(t: number): number {
  const dy = AMPLITUDE * FREQ * Math.PI * 2 * Math.cos(angularArg(t));
  const dx = X_SPAN;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function roadPoint(t: number): { x: number; y: number; angle: number } {
  const clamped = Math.min(1, Math.max(0, t));
  return { x: roadX(clamped), y: roadY(clamped), angle: roadAngleDeg(clamped) };
}

/** Builds an SVG path `d` string tracing the road centerline. */
export function buildRoadPathD(steps = 48): string {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { x, y } = roadPoint(t);
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d;
}
