// Renders the provisional illustrated decor for the /play/3d prototype:
// a sunny coastal landscape with a winding road that follows the control
// points of game/components/scene/scenes/provisoire.json, so pieces placed
// with ScenePath line up exactly. Replaced later by a hand-made illustration.
//
//   node scripts/generate-scene-decor.mjs
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const scene = JSON.parse(readFileSync(new URL("../game/components/scene/scenes/provisoire.json", import.meta.url)));
const W = scene.width;
const H = scene.height;

// ---------- deterministic randomness ----------
let seed = 20260929;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a, b) => a + rand() * (b - a);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const f = (n) => n.toFixed(1);

// ---------- road samples (same curve as ScenePath) ----------
const cr = (p0, p1, p2, p3, t) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const pts = scene.road;
const at = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
const road = [];
for (let i = 0; i < pts.length - 1; i++) {
  const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
  for (let k = 0; k < 48; k++) {
    const t = k / 48;
    road.push({ x: cr(a.x, b.x, c.x, d.x, t), y: cr(a.y, b.y, c.y, d.y, t), s: cr(a.s, b.s, c.s, d.s, t) });
  }
}
road.push(pts[pts.length - 1]);
// extend past both ends so the road runs off the picture / into the headland
{
  const [a, b] = [road[1], road[0]];
  for (let k = 1; k <= 6; k++) road.unshift({ x: b.x + (b.x - a.x) * k * 4, y: b.y + (b.y - a.y) * k * 4, s: b.s * (1 + k * 0.02) });
}
let len = 0;
road.forEach((p, i) => {
  if (i > 0) len += Math.hypot(p.x - road[i - 1].x, p.y - road[i - 1].y) * (140 / p.s) ** 0.6;
  p.len = len;
  const q = road[Math.min(road.length - 1, i + 1)];
  const r = road[Math.max(0, i - 1)];
  const dx = q.x - r.x;
  const dy = q.y - r.y;
  const dl = Math.hypot(dx, dy) || 1;
  p.nx = -dy / dl;
  p.ny = dx / dl;
});
const edge = (k) => road.map((p) => [p.x + p.nx * p.s * k, p.y + p.ny * p.s * k]);
const ribbon = (k0, k1) => {
  const a = edge(k0);
  const b = edge(k1).reverse();
  return [...a, ...b].map(([x, y]) => `${f(x)},${f(y)}`).join(" ");
};
const distToRoad = (x, y) => {
  let best = Infinity;
  let s = 1;
  for (let i = 0; i < road.length; i += 2) {
    const d = Math.hypot(road[i].x - x, road[i].y - y);
    if (d < best) {
      best = d;
      s = road[i].s;
    }
  }
  return { d: best, s };
};

// ---------- coastline ----------
const coast = [
  [1024, 262], [960, 300], [918, 350], [905, 430], [868, 520], [880, 640], [846, 760], [872, 880],
  [826, 1010], [852, 1150], [806, 1290], [838, 1420], [800, 1536],
];
const coastX = (y) => {
  for (let i = 1; i < coast.length; i++) {
    if (y <= coast[i][1]) {
      const [x0, y0] = coast[i - 1];
      const [x1, y1] = coast[i];
      return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    }
  }
  return coast[coast.length - 1][0];
};
const coastPath = coast.map(([x, y]) => `${x},${y}`).join(" ");
const depth = (y) => Math.max(0.18, Math.min(1.25, (y - 220) / 1100)); // perspective size factor

// ---------- svg pieces ----------
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6fc0ec"/><stop offset="1" stop-color="#d8f0f8"/>
  </linearGradient>
  <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#a9cc72"/><stop offset="0.35" stop-color="#86b857"/><stop offset="1" stop-color="#5b9636"/>
  </linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0" stop-color="#7dd0e3"/><stop offset="0.45" stop-color="#2fa4cc"/><stop offset="1" stop-color="#1778ad"/>
  </linearGradient>
  <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e3f4fb" stop-opacity="0.7"/><stop offset="0.5" stop-color="#e3f4fb" stop-opacity="0.18"/><stop offset="1" stop-color="#e3f4fb" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="sun" cx="0.15" cy="0.08" r="0.9">
    <stop offset="0" stop-color="#fff0c2" stop-opacity="0.35"/><stop offset="1" stop-color="#fff0c2" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
    <stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0b1a10" stop-opacity="0.35"/>
  </radialGradient>
  <linearGradient id="asphalt" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6c727a"/><stop offset="1" stop-color="#474c54"/>
  </linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>`);

// distant mountains and hills
const ridge = (y0, amp, color, step, seedOffset) => {
  const p = [[0, H]];
  for (let x = 0; x <= W + step; x += step) p.push([x, y0 - Math.abs(Math.sin((x + seedOffset) / 97)) * amp - between(0, amp * 0.35)]);
  p.push([W, H]);
  return `<polygon points="${p.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="${color}"/>`;
};
out.push(ridge(250, 90, "#a9c3cf", 38, 0));
out.push(ridge(262, 60, "#98b7a6", 30, 40));
out.push(`<rect y="255" width="${W}" height="${H - 255}" fill="url(#land)"/>`);
out.push(ridge(300, 26, "#9fc56f", 24, 90));

// sea, beach, cliffs
out.push(`<polygon points="${coastPath} 1024,1536" fill="url(#sea)"/>`);
for (let i = 0; i < 120; i++) {
  const y = between(300, H);
  const x = between(coastX(y) + 20, W);
  const w = 4 + 14 * depth(y);
  out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(1 + depth(y))}" rx="1" fill="#e8fbff" opacity="${f(between(0.25, 0.7))}"/>`);
}
out.push(`<polyline points="${coastPath}" fill="none" stroke="#b98753" stroke-width="30" stroke-linejoin="round"/>`);
out.push(`<polyline points="${coastPath}" fill="none" stroke="#d9a86f" stroke-width="18" stroke-linejoin="round"/>`);
out.push(`<polyline points="${coast.map(([x, y]) => `${x + 12},${y}`).join(" ")}" fill="none" stroke="#f2e1b3" stroke-width="10" stroke-linejoin="round"/>`);
out.push(`<polyline points="${coast.map(([x, y]) => `${x + 19},${y}`).join(" ")}" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="3" stroke-linejoin="round"/>`);

// field patches (lavender, wheat, meadow), flattened by perspective
const fields = [];
for (let i = 0; i < 26; i++) {
  const y = between(330, 1300);
  const x = between(20, coastX(y) - 60);
  const { d, s } = distToRoad(x, y);
  const k = depth(y);
  const w = 90 * k + 30;
  if (d < s * 1.4 + w * 0.7) continue;
  fields.push({ x, y, w, h: w * 0.55, color: pick(["#b39ddb", "#e3c86a", "#9ccc65", "#c5a46b", "#aed581"]) });
}
for (const fl of fields) {
  out.push(`<g transform="translate(${f(fl.x)} ${f(fl.y)}) rotate(${f(between(-18, 18))})">
    <rect x="${f(-fl.w / 2)}" y="${f(-fl.h / 2)}" width="${f(fl.w)}" height="${f(fl.h)}" rx="${f(fl.h * 0.12)}" fill="${fl.color}"/>
    ${Array.from({ length: 6 }, (_, r) => `<line x1="${f(-fl.w / 2 + 4)}" x2="${f(fl.w / 2 - 4)}" y1="${f(-fl.h / 2 + ((r + 1) * fl.h) / 7)}" y2="${f(-fl.h / 2 + ((r + 1) * fl.h) / 7)}" stroke="#000" stroke-opacity="0.08" stroke-width="${f(Math.max(1, fl.h / 22))}"/>`).join("")}
  </g>`);
}

// road: shoulder, kerbs, asphalt, lines
out.push(`<polygon points="${ribbon(1.32, -1.32)}" fill="#cdbb8e" opacity="0.9"/>`);
out.push(`<polygon points="${ribbon(1.16, -1.16)}" fill="#f4f1ea"/>`);
// red kerb stripes on both sides
for (let i = 0; i < road.length - 1; i++) {
  const stripe = Math.floor(road[i].len / 26) % 2 === 0;
  if (!stripe) continue;
  const a = road[i];
  const b = road[i + 1];
  for (const side of [1, -1]) {
    const q = [
      [a.x + a.nx * a.s * 1.0 * side, a.y + a.ny * a.s * 1.0 * side],
      [a.x + a.nx * a.s * 1.16 * side, a.y + a.ny * a.s * 1.16 * side],
      [b.x + b.nx * b.s * 1.16 * side, b.y + b.ny * b.s * 1.16 * side],
      [b.x + b.nx * b.s * 1.0 * side, b.y + b.ny * b.s * 1.0 * side],
    ];
    out.push(`<polygon points="${q.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="#e0453a"/>`);
  }
}
out.push(`<polygon points="${ribbon(1.0, -1.0)}" fill="url(#asphalt)"/>`);
// subtle asphalt wear bands
out.push(`<polygon points="${ribbon(0.55, 0.35)}" fill="#000" opacity="0.06"/>`);
out.push(`<polygon points="${ribbon(-0.35, -0.55)}" fill="#000" opacity="0.06"/>`);
for (const side of [0.9, -0.9]) {
  out.push(`<polygon points="${ribbon(side + 0.035, side - 0.035)}" fill="#ffffff" opacity="0.85"/>`);
}
for (let i = 0; i < road.length - 1; i++) {
  if (Math.floor(road[i].len / 34) % 2 !== 0) continue;
  const a = road[i];
  const b = road[i + 1];
  const w = 0.045;
  const q = [
    [a.x + a.nx * a.s * w, a.y + a.ny * a.s * w],
    [b.x + b.nx * b.s * w, b.y + b.ny * b.s * w],
    [b.x - b.nx * b.s * w, b.y - b.ny * b.s * w],
    [a.x - a.nx * a.s * w, a.y - a.ny * a.s * w],
  ];
  out.push(`<polygon points="${q.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="#fff6d8"/>`);
}
// trees and houses, far first
const things = [];
for (let i = 0; i < 1400; i++) {
  const y = between(285, H + 30);
  const x = between(-20, W + 20);
  if (x > coastX(y) - 24) continue;
  const k = depth(y);
  const r = 5 + 22 * k;
  const { d, s } = distToRoad(x, y);
  if (d < s * 1.42 + r) continue;
  const kind = rand() < 0.16 ? "cypress" : "tree";
  things.push({ kind, x, y, r });
}
const villages = [
  { cx: 170, cy: 600, n: 14, spread: 110 },
  { cx: 260, cy: 360, n: 9, spread: 90 },
  { cx: 760, cy: 470, n: 6, spread: 50 },
  { cx: 120, cy: 1200, n: 7, spread: 90 },
];
for (const v of villages) {
  for (let i = 0; i < v.n; i++) {
    const x = v.cx + between(-v.spread, v.spread);
    const y = v.cy + between(-v.spread * 0.6, v.spread * 0.6);
    const k = depth(y);
    const { d, s } = distToRoad(x, y);
    if (d < s * 1.5 + 30 * k || x > coastX(y) - 30) continue;
    things.push({ kind: "house", x, y, r: 16 + 26 * k });
  }
}
things.sort((a, b) => a.y - b.y);
for (const t of things) {
  if (t.kind === "tree") {
    const r = t.r;
    out.push(`<ellipse cx="${f(t.x + r * 0.35)}" cy="${f(t.y + r * 0.15)}" rx="${f(r * 1.05)}" ry="${f(r * 0.45)}" fill="#1d3a16" opacity="0.28"/>
<rect x="${f(t.x - r * 0.1)}" y="${f(t.y - r * 0.5)}" width="${f(r * 0.2)}" height="${f(r * 0.6)}" fill="#6b4a2e"/>
<circle cx="${f(t.x)}" cy="${f(t.y - r * 0.95)}" r="${f(r)}" fill="${pick(["#2f6d2b", "#38782f", "#2b6428"])}"/>
<circle cx="${f(t.x - r * 0.45)}" cy="${f(t.y - r * 0.75)}" r="${f(r * 0.7)}" fill="${pick(["#3d8434", "#478f36"])}"/>
<circle cx="${f(t.x + r * 0.2)}" cy="${f(t.y - r * 1.3)}" r="${f(r * 0.55)}" fill="#6fb246" opacity="0.9"/>
<circle cx="${f(t.x - r * 0.25)}" cy="${f(t.y - r * 1.25)}" r="${f(r * 0.28)}" fill="#a3d36a" opacity="0.8"/>`);
  } else if (t.kind === "cypress") {
    const r = t.r * 0.7;
    out.push(`<ellipse cx="${f(t.x + r * 0.4)}" cy="${f(t.y)}" rx="${f(r * 0.9)}" ry="${f(r * 0.35)}" fill="#1d3a16" opacity="0.28"/>
<ellipse cx="${f(t.x)}" cy="${f(t.y - r * 1.9)}" rx="${f(r * 0.55)}" ry="${f(r * 2)}" fill="#24552a"/>
<ellipse cx="${f(t.x - r * 0.18)}" cy="${f(t.y - r * 2.2)}" rx="${f(r * 0.25)}" ry="${f(r * 1.4)}" fill="#3f7d3a" opacity="0.9"/>`);
  } else {
    const r = t.r;
    const w = r * 1.2;
    const h = r * 0.75;
    out.push(`<ellipse cx="${f(t.x + w * 0.2)}" cy="${f(t.y + 2)}" rx="${f(w * 0.8)}" ry="${f(h * 0.35)}" fill="#1d3a16" opacity="0.25"/>
<rect x="${f(t.x - w / 2)}" y="${f(t.y - h)}" width="${f(w)}" height="${f(h)}" fill="#f5e6c8"/>
<rect x="${f(t.x + w * 0.18)}" y="${f(t.y - h)}" width="${f(w * 0.32)}" height="${f(h)}" fill="#dcc6a0"/>
<polygon points="${f(t.x - w * 0.62)},${f(t.y - h)} ${f(t.x - w * 0.1)},${f(t.y - h - r * 0.55)} ${f(t.x + w * 0.62)},${f(t.y - h - r * 0.55)} ${f(t.x + w * 0.62)},${f(t.y - h)}" fill="#d9683c"/>
<polygon points="${f(t.x - w * 0.62)},${f(t.y - h)} ${f(t.x - w * 0.1)},${f(t.y - h - r * 0.55)} ${f(t.x + w * 0.1)},${f(t.y - h)}" fill="#b8522f"/>
<rect x="${f(t.x - w * 0.3)}" y="${f(t.y - h * 0.62)}" width="${f(w * 0.14)}" height="${f(h * 0.3)}" fill="#6a8fb3"/>
<rect x="${f(t.x - w * 0.02)}" y="${f(t.y - h * 0.62)}" width="${f(w * 0.14)}" height="${f(h * 0.3)}" fill="#6a8fb3"/>`);
  }
}

// sailboats
for (const [x, y, k] of [[960, 520, 0.5], [920, 900, 0.8], [980, 1240, 1.1]]) {
  out.push(`<g transform="translate(${x} ${y}) scale(${k})">
  <path d="M-22 0 L22 0 L15 9 L-15 9 Z" fill="#ffffff"/><path d="M0 -4 L0 -46 L18 -6 Z" fill="#fdfdfd"/><path d="M-2 -6 L-2 -38 L-16 -6 Z" fill="#e9eef2"/>
  <ellipse cx="0" cy="11" rx="26" ry="3" fill="#0b4d73" opacity="0.35"/></g>`);
}

// light, haze, vignette
out.push(`<rect width="${W}" height="${H}" fill="url(#haze)"/>`);
out.push(`<rect width="${W}" height="${H}" fill="url(#sun)"/>`);
out.push(`<rect width="${W}" height="${H}" fill="url(#vignette)"/>`);
out.push(`</svg>`);

mkdirSync(new URL("../public/images/scene/", import.meta.url), { recursive: true });
const target = new URL("../public/images/scene/decor-provisoire.webp", import.meta.url).pathname;
await sharp(Buffer.from(out.join("\n"))).webp({ quality: 86 }).toFile(target);
console.log("wrote", target, things.length, "trees/houses");
