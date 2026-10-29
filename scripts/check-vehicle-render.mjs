import { build } from "esbuild";
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const output = process.env.TEST_ARTIFACTS ?? "/tmp/kilomax-vehicles";
mkdirSync(output, { recursive: true });
const bundle = await build({
  entryPoints: ["test/support/vehicle-gallery.ts"],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1250 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /models\/cars|premium\/vehicles/.test(message.text())) errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (/models\/cars|premium\/vehicles/.test(request.url())) errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  await page.route("http://gallery.local/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = resolve(process.cwd(), "public", `.${path}`);
    try {
      const contentType = path.endsWith(".glb")
        ? "model/gltf-binary"
        : "image/webp";
      await route.fulfill({ body: readFileSync(file), contentType });
    } catch {
      await route.fulfill({ status: 404, body: "Not found" });
    }
  });
  await page.goto("http://gallery.local/");
  await page.setContent(
    "<html><body style='margin:0;background:#15212b'></body></html>",
    { waitUntil: "domcontentloaded" },
  );
  const ids = [
    "supercar", "retro", "sedan-sports", "hatchback-sports", "sedan",
    "suv", "suv-luxury", "van", "truck", "race", "race-future",
    "kart-oodi", "tractor", "taxi", "police", "kilomax", "moto",
    "scooter", "quad",
  ];
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  try {
    await page.waitForFunction(() => Array.isArray(window.vehicleGalleryResults), null, { timeout: 20000 });
  } catch (error) {
    await page.screenshot({ path: `${output}/vehicle-gallery-error.png` });
    console.error(JSON.stringify({ error: error.message, errors }));
    throw error;
  }
  await page.screenshot({ path: `${output}/native-vehicles.png` });
  console.log(
    JSON.stringify({
      models: await page.evaluate(() => window.vehicleGalleryResults),
      errors,
    }),
  );
  const results = await page.evaluate(() => window.vehicleGalleryResults ?? []);
  if (errors.length || results.length !== ids.length || results.some((model, index) => model.id !== ids[index] || model.triangles < 10 || model.artwork)) process.exitCode = 1;
} finally {
  await browser.close();
}
