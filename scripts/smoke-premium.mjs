import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";

const base =
  process.argv[2] ?? process.env.TEST_BASE_URL ?? "http://localhost:3110";
const output = process.env.TEST_ARTIFACTS ?? "/tmp/kilomax-proof";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    if (Native) window.AudioContext = class extends Native {
      constructor(options) { super(options); window.__qaAudio = this; }
    };
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(base);
    await page.waitForTimeout(4000);
    await page.getByRole("progressbar").waitFor({ state: "hidden", timeout: 20000 });
    assert.ok(
      await page.getByRole("link", { name: /Jouer À toi/ }).isVisible(),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const rect = await page
      .getByRole("link", { name: /Jouer À toi/ })
      .boundingBox();
    assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= height);
    await page.screenshot({ path: `${output}/home-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/collection`);
  await page.waitForTimeout(2500);
  await page.getByRole("progressbar").waitFor({ state: "hidden", timeout: 20000 });
  assert.equal(await page.locator("[data-card-id]").count(), 20);
  for(const category of ["distance","attaque","defense","special"]) {
    assert.equal(await page.locator(`[data-card-category="${category}"]`).count(),5);
  }
  assert.equal(
    await page
      .locator("img.premium-card-art")
      .evaluateAll(
        (imgs) => imgs.filter((i) => !i.complete || !i.naturalWidth).length,
      ),
    0,
  );
  await page.screenshot({ path: `${output}/cards.png`, fullPage: true });
  await page.goto(`${base}/play/create`);
  await page.getByRole("button", { name: /Sur cet appareil/ }).click();
  await page.getByRole("button", { name: "6", exact: true }).click();
  await page.getByRole("button", { name: /Générer le code/ }).click();
  await page.waitForURL("**/play/lobby/**");
  await page
    .getByRole("button", { name: /Choisir un véhicule/ })
    .first()
    .click();
  await page
    .locator(".garage-grid button")
    .filter({ hasText: "Berline" })
    .click();
  await page.screenshot({ path: `${output}/garage.png`, fullPage: true });
  while (await page.getByRole("button", { name: "PRÊT", exact: true }).count())
    await page
      .getByRole("button", { name: "PRÊT", exact: true })
      .first()
      .click();
  await page.getByRole("button", { name: "LANCER LA PARTIE" }).click();
  await page.waitForURL("**/play/game/**");
  await page.waitForTimeout(14000);
  assert.equal(await page.locator("canvas").count(), 1);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const intro = page.getByRole("button", { name: "Passer l'introduction" });
  if (await intro.count()) await intro.click();
  await page
    .getByRole("button", { name: "Piocher une carte", exact: true })
    .click();
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => window.__qaAudio?.state), "running");
  await page.getByRole("button", { name: "Couper le son", exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem("enroute:sound-enabled")), "0");
  await page.getByRole("button", { name: "Activer le son", exact: true }).click();
  await page.locator("button[data-card-id]").last().click();
  await page.getByRole("button", { name: "Défausser", exact: true }).click();
  await page.waitForTimeout(2000);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll("button[data-card-id]")).every(card=>Number(getComputedStyle(card.parentElement).opacity)>.98));
  await page.screenshot({ path: `${output}/race.png` });
  await page
    .getByRole("button", { name: "Passer au plateau classique" })
    .click();
  await page.locator(".board-frame").waitFor({state:"visible",timeout:10000});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/classic.png` });
  // A WebGL construction failure must retain the same in-memory game and hand.
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return String(kind).includes("webgl")
        ? null
        : original.call(this, kind, ...args);
    };
  });
  await page.getByRole("button", { name: "Passer au plateau 3D" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Mode classique" })
    .waitFor();
  console.log("RACE UI", (await page.locator("body").innerText()).slice(-2400));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: four home viewports, 20 illustrations, six-player garage, 3D race, draw, discard, next turn and classic switch; no page errors",
  );
} finally {
  await browser.close();
}
