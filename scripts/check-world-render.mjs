import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = process.env.TEST_ARTIFACTS ?? "/tmp/kilomax-world";
mkdirSync(output, { recursive: true });
const bundle = await build({
  entryPoints: ["test/support/world-gallery.ts"],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  plugins: [{
    name: "project-alias",
    setup(build) {
      build.onResolve({ filter: /^@\// }, ({ path }) => ({ path: resolve(process.cwd(), path.slice(2)) }));
    },
  }],
});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const assetStatuses = new Map();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://world.local/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = resolve(process.cwd(), "public", `.${path}`);
    try {
      await route.fulfill({
        body: readFileSync(file),
        contentType: path.endsWith(".glb") ? "model/gltf-binary" : "image/webp",
      });
    } catch {
      await route.fulfill({ status: 404, body: "Not found" });
    }
  });
  page.on("response", (response) => {
    if (/landscape-world|models\/cars\//.test(response.url())) {
      assetStatuses.set(new URL(response.url()).pathname, response.status());
    }
  });
  await page.goto("http://world.local/");
  await page.setContent("<html><body style='margin:0;background:#15212b'></body></html>");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForFunction(() => window.worldGalleryReady === true, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${output}/race-idle.png` });
  await page.evaluate(() => window.moveGalleryCars?.());
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/race-driving.png` });
  await page.evaluate(() => window.finishWorldGallery?.());
  assert.deepEqual(errors, []);
  assert.equal(assetStatuses.get("/images/premium/landscape-world.webp"), 200);
  assert.equal(assetStatuses.get("/models/cars/supercar.glb"), 200);
  assert.equal(assetStatuses.get("/models/cars/sedan-sports.glb"), 200);
  console.log(JSON.stringify({ status: "PASS", assets: Object.fromEntries(assetStatuses), errors }));
} finally {
  await browser.close();
}
