// Brings the official KILOMAX files into the app, untouched in their drawing.
// Each file can be brought on its own; the others stay as they are.
//   --logo <file>       transparent PNG/WebP: checked for a real alpha channel
//                       and a fully transparent surround, stripped of empty
//                       margins only, kept lossless at full resolution, plus a
//                       lighter copy for small uses (card backs, header)
//   --portrait <file>   background for phones and tall screens
//   --landscape <file>  background for wide screens
// Backgrounds already in WebP are copied byte for byte (no second compression);
// others are encoded as high-quality WebP at their native resolution.
// Writes game/lib/brand/assets.json, which the logo, menus and loader read.
//
//   node scripts/prepare-brand.mjs --portrait ~/fond.webp --logo ~/logo.png
//   node scripts/prepare-brand.mjs --download   (the official Cloudinary files)
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public/images/brand");
const jsonPath = path.join(root, "game/lib/brand/assets.json");

const SOURCES = {
  logo: "https://res.cloudinary.com/dkm8cbylh/image/upload/v1790753014/Logo_de_course_KILOMAX_%D1%81%D0%B8%D1%8F_eoiopn.png",
  portrait: "https://res.cloudinary.com/dkm8cbylh/image/upload/v1790753716/ChatGPT_Image_30_sept._2026_09_34_57_qruuq1.png",
  landscape: "https://res.cloudinary.com/dkm8cbylh/image/upload/v1790753861/ChatGPT_Image_30_sept._2026_09_37_28_assaxh.png",
};

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? path.resolve(process.argv[i + 1]) : null;
}

function sourceFiles() {
  if (process.argv.includes("--download")) {
    const dir = path.join(os.tmpdir(), "kilomax-brand");
    mkdirSync(dir, { recursive: true });
    return Object.fromEntries(
      Object.entries(SOURCES).map(([k, url]) => {
        const file = path.join(dir, `${k}.png`);
        execFileSync("curl", ["-sSfL", "-o", file, url], { stdio: "inherit" });
        return [k, file];
      }),
    );
  }
  return { logo: arg("logo"), portrait: arg("portrait"), landscape: arg("landscape") };
}

/** Refuses a logo without real transparency: it must never sit on a box. */
async function checkLogo(file) {
  const img = sharp(file);
  const meta = await img.metadata();
  if (!meta.hasAlpha) throw new Error(`${file}: pas de canal alpha — le logo n'est pas transparent.`);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const alpha = (x, y) => data[(y * w + x) * 4 + 3];
  let edge = 0;
  let edgeOpaque = 0;
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      edge++;
      if (alpha(x, y) > 8) edgeOpaque++;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      edge++;
      if (alpha(x, y) > 8) edgeOpaque++;
    }
  }
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] === 0) clear++;
  console.log("logo", {
    size: `${w}x${h}`,
    transparentPixels: `${((clear / (w * h)) * 100).toFixed(1)} %`,
    opaqueBorder: `${((edgeOpaque / edge) * 100).toFixed(1)} %`,
  });
  if (edgeOpaque / edge > 0.02) throw new Error(`${file}: le pourtour du logo n'est pas transparent (fond intégré).`);
}

async function prepareLogo(file) {
  await checkLogo(file);
  // only the fully transparent margins go: the drawing itself is not touched
  const buf = await sharp(file).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 }).png().toBuffer();
  const meta = await sharp(buf).metadata();
  const full = path.join(outDir, "kilomax-logo.png");
  await sharp(buf).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(full);
  const smallWidth = Math.min(meta.width, 960);
  await sharp(buf)
    .resize({ width: smallWidth, kernel: "lanczos3" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(outDir, "kilomax-logo-960.png"));
  return {
    ready: true,
    src: "/images/brand/kilomax-logo.png",
    small: "/images/brand/kilomax-logo-960.png",
    smallWidth,
    width: meta.width,
    height: meta.height,
    bytes: statSync(full).size,
  };
}

async function prepareBackground(key, file) {
  const meta = await sharp(file).metadata();
  const out = path.join(outDir, `loader-${key}.webp`);
  if (meta.format === "webp") copyFileSync(file, out);
  else await sharp(file).webp({ quality: 92, smartSubsample: true, effort: 6 }).toFile(out);
  console.log(key, `${meta.width}x${meta.height}`, meta.format);
  return { ready: true, src: `/images/brand/loader-${key}.webp`, width: meta.width, height: meta.height, bytes: statSync(out).size };
}

const files = sourceFiles();
if (!files.logo && !files.portrait && !files.landscape) {
  console.error("Rien à faire : --logo, --portrait, --landscape ou --download.");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const assets = JSON.parse(readFileSync(jsonPath, "utf8"));
if (files.logo) assets.logo = await prepareLogo(files.logo);
for (const key of ["portrait", "landscape"]) if (files[key]) assets[key] = await prepareBackground(key, files[key]);
writeFileSync(jsonPath, JSON.stringify(assets, null, 2) + "\n");
console.log(JSON.stringify(assets, null, 2));
