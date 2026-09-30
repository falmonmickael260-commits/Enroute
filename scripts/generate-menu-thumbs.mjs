// Captures the two "Plateau" pictures of the create menu from the game itself,
// so each tile shows exactly what the player will get:
//   public/images/menu/plateau-3d.webp         the 3D world with the cars at the start
//   public/images/menu/plateau-classique.webp  the classic board seen from above
// Usage: with `npm run dev` running,  node scripts/generate-menu-thumbs.mjs
//        (BASE_URL overrides http://localhost:3000)
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public/images/menu");
mkdirSync(outDir, { recursive: true });

const BASE = process.env.BASE_URL || "http://localhost:3000";
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = { width: 840, height: 400 };

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

async function save(buf, name, focusY = 0.5) {
  const img = sharp(buf);
  const { width, height } = await img.metadata();
  const scale = Math.max(OUT.width / width, OUT.height / height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const top = Math.max(0, Math.min(h - OUT.height, Math.round(h * focusY - OUT.height / 2)));
  await sharp(buf)
    .resize(w, h, { kernel: "lanczos3" })
    .extract({ left: Math.round((w - OUT.width) / 2), top, width: OUT.width, height: OUT.height })
    .webp({ quality: 88 })
    .toFile(path.join(outDir, name));
  console.log("written", name);
}

// 3D: the cars on the start line, nothing drawn over the world
{
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/play/3d?n=2`);
  await page.waitForSelector("canvas");
  await page.waitForTimeout(12000);
  const canvas = page.locator("canvas").first();
  await page.addStyleTag({ content: "body *{visibility:hidden!important} canvas{visibility:visible!important}" });
  await page.waitForTimeout(1500);
  await save(await canvas.screenshot(), "plateau-3d.webp", 0.8);
  await page.close();
}

// classic: a local game on the board seen from above
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    localStorage.setItem("enroute:board-view", "classic");
    sessionStorage.setItem("enroute:intro-shown", "1");
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/play/create`);
  await page.getByRole("button", { name: /Sur cet appareil/ }).click();
  await page.getByRole("button", { name: /Générer le code de partie/i }).click();
  await page.waitForURL(/lobby/);
  for (const btn of await page.getByRole("button", { name: "PRÊT" }).all()) await btn.click();
  await page.getByRole("button", { name: "LANCER LA PARTIE" }).click();
  await page.waitForURL(/game/);
  await page.waitForSelector(".board-frame");
  await page.waitForTimeout(2500);
  await save(await page.locator(".board-frame").first().screenshot(), "plateau-classique.webp", 0.42);
  await ctx.close();
}

await browser.close();
