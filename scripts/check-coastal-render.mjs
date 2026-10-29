import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = process.env.TEST_ARTIFACTS ?? "/tmp/kilomax-coastal-race";
mkdirSync(output, { recursive: true });
const bundle = await build({
  entryPoints: ["test/support/coastal-race-preview.ts"],
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
  const page = await browser.newPage({ viewport: { width: 1024, height: 1536 } });
  const errors = [];
  const statuses = new Map();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://coast.local/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = resolve(process.cwd(), "public", `.${path}`);
    try {
      const type = extname(file) === ".glb" ? "model/gltf-binary" : "image/webp";
      await route.fulfill({ body: readFileSync(file), contentType: type });
    } catch {
      await route.fulfill({ status: 404, body: "Not found" });
    }
  });
  page.on("response", (response) => {
    if (/kilomax-coast|premium\/vehicles\/|models\/cars\//.test(response.url())) {
      statuses.set(new URL(response.url()).pathname, response.status());
    }
  });
  await page.goto("http://coast.local/");
  await page.setContent("<html><body style='margin:0'></body></html>");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForFunction(() => window.coastalPreviewReady === true, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/race-idle.png` });
  const beforeMotion = await page.evaluate(() => window.coastalPositions?.one ?? null);
  await page.evaluate(() => window.playCoastalMove?.());
  await page.waitForTimeout(1000);
  const afterMotion = await page.evaluate(() => window.coastalPositions?.one ?? null);
  assert.ok(beforeMotion && afterMotion && Math.hypot(afterMotion.x - beforeMotion.x, afterMotion.y - beforeMotion.y) > 20,
    `a 200 km move visibly advances the car on the road (${JSON.stringify({ beforeMotion, afterMotion })})`);
  await page.screenshot({ path: `${output}/race-moving.png` });
  await page.evaluate(() => window.showUtilityCars?.());
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/race-utility-cars.png` });
  await page.evaluate(() => window.stopCoastalPreview?.());
  assert.deepEqual(errors, []);
  assert.equal(statuses.get("/images/scene/kilomax-coast.webp"), 200);
  for (const car of ["supercar", "retro", "suv", "race", "sedan", "van", "truck", "hatchback-sports"])
    assert.equal(statuses.get(`/models/cars/${car}.glb`), 200);
  console.log(JSON.stringify({ status: "PASS", assets: Object.fromEntries(statuses), errors }));
} finally {
  await browser.close();
}
