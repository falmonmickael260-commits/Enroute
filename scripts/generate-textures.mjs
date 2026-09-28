// Renders the static table backdrops (wood + inlaid EN ROUTE logo) and the
// board paper-noise tile, then encodes them with sharp.
// Usage: node scripts/generate-textures.mjs   (Playwright + sharp are devDeps)
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public/images");
mkdirSync(outDir, { recursive: true });

const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const CHROME_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

// Headless Chromium doesn't route through the environment proxy, so fetch the
// fonts with curl (which does) and inline them as data URLs.
function inlineGoogleFont(family, cssFamily) {
  const css = execFileSync("curl", ["-sSL", "-A", CHROME_UA, `https://fonts.googleapis.com/css2?family=${family}&display=block`]).toString();
  const match = css.match(/\/\* latin \*\/\s*@font-face\s*{([^}]*)}/);
  if (!match) throw new Error(`latin subset not found for ${family}`);
  const block = match[1];
  const url = block.match(/url\(([^)]+)\)/)[1];
  const weight = (block.match(/font-weight:\s*(\d+)/) || [, "400"])[1];
  const data = execFileSync("curl", ["-sSL", url]).toString("base64");
  return `@font-face{font-family:"${cssFamily}";font-weight:${weight};src:url(data:font/woff2;base64,${data}) format("woff2");}`;
}

function oscillatingTable(lo, hi, bands, seed) {
  // Many alternating light/dark stops: smooth noise pushed through this table
  // turns into meandering growth rings.
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const values = [];
  for (let i = 0; i < bands * 2 + 1; i++) {
    const base = i % 2 === 0 ? lo : hi;
    values.push((base * (0.9 + rand() * 0.2)).toFixed(3));
  }
  return values.join(" ");
}

function woodFilter(id, seed) {
  return `
  <filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.0011 0.016" numOctaves="4" seed="${seed}" result="low"/>
    <feColorMatrix in="low" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="lowL"/>
    <feComponentTransfer in="lowL" result="rings">
      <feFuncR type="table" tableValues="${oscillatingTable(0.2, 0.36, 26, seed)}"/>
      <feFuncG type="table" tableValues="${oscillatingTable(0.105, 0.205, 26, seed)}"/>
      <feFuncB type="table" tableValues="${oscillatingTable(0.055, 0.115, 26, seed)}"/>
    </feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency="0.003 0.42" numOctaves="2" seed="${seed + 5}" result="fiber"/>
    <feColorMatrix in="fiber" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="fiberL"/>
    <feComponentTransfer in="fiberL" result="fiberT">
      <feFuncR type="table" tableValues="0.72 1.12"/>
      <feFuncG type="table" tableValues="0.72 1.12"/>
      <feFuncB type="table" tableValues="0.72 1.12"/>
    </feComponentTransfer>
    <feBlend in="rings" in2="fiberT" mode="multiply"/>
  </filter>`;
}

const GOLD_DEFS = `
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff1b8"/>
    <stop offset="0.35" stop-color="#e6bf5c"/>
    <stop offset="0.65" stop-color="#b9862a"/>
    <stop offset="1" stop-color="#7a5413"/>
  </linearGradient>
  <linearGradient id="enamel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ff6a5c"/>
    <stop offset="0.55" stop-color="#d6372d"/>
    <stop offset="1" stop-color="#8f1d17"/>
  </linearGradient>
  <filter id="inlay" x="-10%" y="-30%" width="120%" height="160%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur"/>
    <feSpecularLighting in="blur" surfaceScale="4" specularConstant="1.05" specularExponent="22" lighting-color="#fff4d2" result="spec">
      <fePointLight x="900" y="-600" z="700"/>
    </feSpecularLighting>
    <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
    <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.75" k4="0" result="lit"/>
    <feOffset in="SourceAlpha" dy="-3" result="up"/>
    <feGaussianBlur in="up" stdDeviation="2" result="upBlur"/>
    <feComposite in="SourceAlpha" in2="upBlur" operator="out" result="groove"/>
    <feFlood flood-color="#000" flood-opacity="0.55"/>
    <feComposite in2="groove" operator="in" result="grooveShade"/>
    <feOffset in="SourceAlpha" dy="4" result="down"/>
    <feGaussianBlur in="down" stdDeviation="3" result="downBlur"/>
    <feFlood flood-color="#000" flood-opacity="0.6"/>
    <feComposite in2="downBlur" operator="in" result="carved"/>
    <feMerge>
      <feMergeNode in="carved"/>
      <feMergeNode in="lit"/>
      <feMergeNode in="grooveShade"/>
    </feMerge>
  </filter>`;

function tableSvg({ width, height, logoSize, logoY }) {
  const plankH = Math.round(height / (height > width ? 11 : 6));
  const planks = Math.ceil(height / plankH);
  const filters = Array.from({ length: planks }, (_, i) => woodFilter(`wood${i}`, 11 + i * 17)).join("");
  const plankRects = Array.from({ length: planks }, (_, i) => {
    const y = i * plankH;
    const tone = [0, 0.06, -0.04, 0.03, -0.07, 0.05, -0.02, 0.04, -0.05, 0.02, -0.03, 0.06][i % 12];
    const overlay = tone >= 0 ? `rgba(255,220,180,${tone})` : `rgba(0,0,0,${-tone})`;
    return `
      <rect x="0" y="${y}" width="${width}" height="${plankH}" filter="url(#wood${i})"/>
      <rect x="0" y="${y}" width="${width}" height="${plankH}" fill="${overlay}"/>
      <rect x="0" y="${y}" width="${width}" height="3" fill="rgba(0,0,0,0.55)"/>
      <rect x="0" y="${y + 3}" width="${width}" height="1.5" fill="rgba(255,210,160,0.08)"/>`;
  }).join("");

  const cx = width / 2;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    ${filters}
    ${GOLD_DEFS}
    <radialGradient id="lamp" cx="50%" cy="${height > width ? 30 : 38}%" r="${height > width ? 75 : 62}%">
      <stop offset="0" stop-color="#ffcf8a" stop-opacity="0.22"/>
      <stop offset="0.45" stop-color="#ff9a4a" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="45%" r="${height > width ? 85 : 75}%">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.85" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.85"/>
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="#2a1a0f"/>
  ${plankRects}
  <rect width="${width}" height="${height}" fill="url(#lamp)"/>
  <rect width="${width}" height="${height}" fill="url(#vignette)"/>

  <g filter="url(#inlay)">
    <text x="${cx}" y="${logoY}" text-anchor="middle" font-family="Bebas Neue" font-size="${logoSize}" letter-spacing="${logoSize * 0.06}">
      <tspan fill="url(#gold)">EN </tspan><tspan fill="url(#enamel)" stroke="url(#gold)" stroke-width="${logoSize * 0.018}">ROUTE</tspan>
    </text>
  </g>
</svg>`;
}

function noiseSvg(size) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <filter id="n" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="4" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  1.2 0 0 0 -0.35"/>
  </filter>
  <rect width="${size}" height="${size}" filter="url(#n)"/>
</svg>`;
}

const FONT_CSS = inlineGoogleFont("Bebas+Neue", "Bebas Neue");

async function render(browser, svg, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><head><style>${FONT_CSS}html,body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`,
  );
  await page.evaluate(async () => {
    await document.fonts.load('100px "Bebas Neue"');
    await document.fonts.ready;
  });
  const buf = await page.screenshot({ type: "png", omitBackground: true });
  await page.close();
  return buf;
}

const browser = await chromium.launch({ executablePath: CHROMIUM });

// Keep in sync with --logo-band in app/globals.css (logo baseline / image size).
const landscape = await render(browser, tableSvg({ width: 2560, height: 1440, logoSize: 214, logoY: 182 }), 2560, 1440);
await sharp(landscape).webp({ quality: 80 }).toFile(path.join(outDir, "table-landscape.webp"));

const portrait = await render(browser, tableSvg({ width: 1170, height: 2532, logoSize: 170, logoY: 196 }), 1170, 2532);
await sharp(portrait).webp({ quality: 80 }).toFile(path.join(outDir, "table-portrait.webp"));

const noise = await render(browser, noiseSvg(256), 256, 256);
await sharp(noise).png({ compressionLevel: 9 }).toFile(path.join(outDir, "noise.png"));

await browser.close();
console.log("textures written to", outDir);
