import { build } from "esbuild";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
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
  await page.setContent(
    "<html><body style='margin:0;background:#15212b'></body></html>",
  );
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForFunction(() => Array.isArray(window.vehicleGalleryResults), null, { timeout: 20000 });
  await page.screenshot({ path: `${output}/native-vehicles.png` });
  console.log(
    JSON.stringify({
      models: await page.evaluate(() => window.vehicleGalleryResults),
      errors,
    }),
  );
  if (errors.length || (await page.evaluate(() => window.vehicleGalleryResults?.length)) !== 19) process.exitCode = 1;
} finally {
  await browser.close();
}
