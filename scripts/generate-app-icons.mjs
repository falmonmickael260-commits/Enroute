// App icons (home screen, install prompt, browser tab) from the official
// KILOMAX logo. A home-screen icon must be square and opaque (iOS turns
// transparency black), so the logo sits, untouched, on a deep night-blue
// square with a soft golden glow.
//   icon-512 / icon-192           "any": logo across most of the square
//   icon-maskable-512 / -192      Android adaptive icons: logo inside the safe circle
//   icon-180                      iPhone / iPad home screen
//   icon-32                       browser tab (logo alone, transparent)
// Usage: node scripts/generate-app-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = JSON.parse(readFileSync(path.join(root, "game/lib/brand/assets.json"), "utf8"));
if (!assets.logo.ready) throw new Error("Logo absent : lancez d'abord scripts/prepare-brand.mjs --logo …");
const logoFile = path.join(root, "public", assets.logo.src);
const outDir = path.join(root, "public/icons");

const BACKDROP = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0" stop-color="#1d3160"/>
      <stop offset="0.55" stop-color="#0e1a36"/>
      <stop offset="1" stop-color="#060a14"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffc24a" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffc24a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#bg)"/>
  <ellipse cx="50" cy="52" rx="44" ry="30" fill="url(#glow)"/>
</svg>`;

async function icon(name, size, logoShare) {
  const logo = await sharp(logoFile)
    .resize({ width: Math.round(size * logoShare), kernel: "lanczos3" })
    .png()
    .toBuffer();
  const { width, height } = await sharp(logo).metadata();
  await sharp(Buffer.from(BACKDROP(size)))
    .composite([{ input: logo, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, name));
  console.log("written", name);
}

await icon("icon-512.png", 512, 0.94);
await icon("icon-192.png", 192, 0.94);
await icon("icon-180.png", 180, 0.9);
// the safe zone of an adaptive icon is the centred circle of 80 % diameter
await icon("icon-maskable-512.png", 512, 0.66);
await icon("icon-maskable-192.png", 192, 0.66);

await sharp(logoFile)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
  .png()
  .toFile(path.join(outDir, "icon-32.png"));
console.log("written icon-32.png");
