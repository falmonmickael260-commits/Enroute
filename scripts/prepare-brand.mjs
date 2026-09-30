// Brings the official KILOMAX files into the app, untouched in their drawing:
//   - the logo (transparent PNG): checked for a real alpha channel and a fully
//     transparent surround, stripped of empty margins only, kept lossless at
//     full resolution, plus a lighter copy for small uses (card backs, header);
//   - the loading-screen backgrounds (portrait + landscape): re-encoded as
//     high-quality WebP at their native resolution.
// It then writes game/lib/brand/assets.json (paths, sizes, byte counts) which
// the Logo component and the loader read.
//
// Usage:
//   node scripts/prepare-brand.mjs               downloads the official files
//   node scripts/prepare-brand.mjs --from <dir>  uses logo.png, portrait.png and
//                                                landscape.png from <dir>
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
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

function sourceFiles() {
  const i = process.argv.indexOf("--from");
  if (i > 0) {
    const dir = path.resolve(process.argv[i + 1]);
    return Object.fromEntries(Object.keys(SOURCES).map((k) => [k, path.join(dir, `${k}.png`)]));
  }
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
  const report = {
    size: `${w}x${h}`,
    transparentPixels: `${((clear / (w * h)) * 100).toFixed(1)} %`,
    opaqueBorder: `${((edgeOpaque / edge) * 100).toFixed(1)} %`,
  };
  console.log("logo", report);
  if (edgeOpaque / edge > 0.02) throw new Error(`${file}: le pourtour du logo n'est pas transparent (fond intégré).`);
}

async function main() {
  const files = sourceFiles();
  mkdirSync(outDir, { recursive: true });
  mkdirSync(path.dirname(jsonPath), { recursive: true });

  await checkLogo(files.logo);
  // only the fully transparent margins go: the drawing itself is not touched
  const logoBuf = await sharp(files.logo).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 }).png().toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoFile = path.join(outDir, "kilomax-logo.png");
  await sharp(logoBuf).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(logoFile);
  const smallW = Math.min(logoMeta.width, 960);
  const logoSmallFile = path.join(outDir, "kilomax-logo-960.png");
  await sharp(logoBuf).resize({ width: smallW, kernel: "lanczos3" }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(logoSmallFile);

  const backgrounds = {};
  for (const key of ["portrait", "landscape"]) {
    const meta = await sharp(files[key]).metadata();
    const out = path.join(outDir, `loader-${key}.webp`);
    await sharp(files[key]).webp({ quality: 92, smartSubsample: true, effort: 6 }).toFile(out);
    backgrounds[key] = { src: `/images/brand/loader-${key}.webp`, width: meta.width, height: meta.height, bytes: statSync(out).size };
  }

  const assets = {
    ready: true,
    logo: {
      src: "/images/brand/kilomax-logo.png",
      small: "/images/brand/kilomax-logo-960.png",
      smallWidth: smallW,
      width: logoMeta.width,
      height: logoMeta.height,
      bytes: statSync(logoFile).size,
    },
    ...backgrounds,
  };
  writeFileSync(jsonPath, JSON.stringify(assets, null, 2) + "\n");
  console.log("brand assets written to", outDir);
  console.log(JSON.stringify(assets, null, 2));
}

await main();
