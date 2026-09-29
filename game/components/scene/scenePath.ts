/**
 * The road of an illustrated scene, traced as a Catmull-Rom curve through a
 * handful of control points in image pixels. Each point also carries `s`, the
 * road's half-width there, which doubles as the perspective scale: things far
 * away (small `s`) are drawn smaller.
 */

export interface RoadPoint {
  x: number;
  y: number;
  s: number;
}

export interface SceneDef {
  id: string;
  image: string;
  width: number;
  height: number;
  /** Viewing angle of the painting's camera above the ground, in degrees. */
  pitchDeg: number;
  /** Control points where km 0 and the finish line sit. */
  startIndex: number;
  finishIndex: number;
  road: RoadPoint[];
}

export interface RoadSample extends RoadPoint {
  /** Unit tangent on screen, pointing towards the finish. */
  tx: number;
  ty: number;
}

const STEPS_PER_SPAN = 48;
/**
 * How strongly distance on screen is stretched where the road is far away:
 * 0 = equal km look equal on screen, 1 = full perspective. In between keeps
 * the far end readable while still feeling deep.
 */
const DEPTH_WEIGHT = 0.6;

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export class ScenePath {
  readonly samples: RoadPoint[] = [];
  /** Cumulative perspective-corrected length at each sample. */
  private readonly lengths: number[] = [];
  private readonly startLen: number;
  private readonly finishLen: number;

  constructor(readonly def: SceneDef) {
    const pts = def.road;
    const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
    let startLen = 0;
    let finishLen = 0;
    const sRef = pts[def.startIndex].s;

    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      for (let k = 0; k < STEPS_PER_SPAN; k++) {
        const t = k / STEPS_PER_SPAN;
        const sample = {
          x: catmullRom(a.x, b.x, c.x, d.x, t),
          y: catmullRom(a.y, b.y, c.y, d.y, t),
          s: catmullRom(a.s, b.s, c.s, d.s, t),
        };
        this.push(sample, sRef);
        if (i === def.startIndex && k === 0) startLen = this.lengths[this.lengths.length - 1];
        if (i === def.finishIndex && k === 0) finishLen = this.lengths[this.lengths.length - 1];
      }
    }
    this.push(pts[pts.length - 1], sRef);
    if (def.finishIndex === pts.length - 1) finishLen = this.lengths[this.lengths.length - 1];
    this.startLen = startLen;
    this.finishLen = finishLen;
  }

  private push(p: RoadPoint, sRef: number) {
    const prev = this.samples[this.samples.length - 1];
    let len = 0;
    if (prev) {
      const d = Math.hypot(p.x - prev.x, p.y - prev.y);
      const s = (p.s + prev.s) / 2;
      len = this.lengths[this.lengths.length - 1] + d * Math.pow(sRef / s, DEPTH_WEIGHT);
    }
    this.samples.push(p);
    this.lengths.push(len);
  }

  /** Point on the road at a perspective-corrected length (extrapolates past the ends). */
  atLength(len: number): RoadSample {
    const L = this.lengths;
    let i = 1;
    if (len <= 0) i = 1;
    else if (len >= L[L.length - 1]) i = L.length - 1;
    else {
      let lo = 1;
      let hi = L.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (L[mid] < len) lo = mid + 1;
        else hi = mid;
      }
      i = lo;
    }
    const a = this.samples[i - 1];
    const b = this.samples[i];
    const span = L[i] - L[i - 1] || 1;
    const t = (len - L[i - 1]) / span;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dl = Math.hypot(dx, dy) || 1;
    return {
      x: a.x + dx * t,
      y: a.y + dy * t,
      s: a.s + (b.s - a.s) * t,
      tx: dx / dl,
      ty: dy / dl,
    };
  }

  /** Where a car with `km` out of `target` stands (0 = start line, target = finish). */
  atKm(km: number, target: number): RoadSample {
    const f = target > 0 ? km / target : 0;
    return this.atLength(this.startLen + (this.finishLen - this.startLen) * f);
  }

  /** Perspective scale relative to the start line (1 at km 0). */
  scaleAt(p: RoadPoint): number {
    return p.s / this.def.road[this.def.startIndex].s;
  }

  get start(): RoadSample {
    return this.atLength(this.startLen);
  }

  get finish(): RoadSample {
    return this.atLength(this.finishLen);
  }
}
