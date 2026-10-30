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
  const raceCarModels = new Map();
  page.on("response", (response) => {
    const match = response.url().match(/\/models\/cars\/([^/?]+)\.glb(?:\?|$)/);
    if (match) raceCarModels.set(match[1], response.status());
  });
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
    const playCtas = page.locator('a[href="/play/create"]:visible');
    assert.ok(await playCtas.count(), `home play action is visible at ${width}x${height}`);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const fullyVisiblePlay = await playCtas.evaluateAll((items) => items.some((item) => {
      const rect = item.getBoundingClientRect();
      return rect.y >= 0 && rect.y + rect.height <= innerHeight;
    }));
    assert.ok(fullyVisiblePlay, `home play action fits at ${width}x${height}`);
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
  for (const count of [2, 3, 4]) {
    await page.goto(`${base}/play/create`);
    await page.getByRole("button", { name: /Sur cet appareil/ }).click();
    await page.getByRole("button", { name: String(count), exact: true }).click();
    await page.getByRole("button", { name: /Générer le code/ }).click();
    await page.waitForURL("**/play/lobby/**");
    const picker = page.locator("[data-car-picker]").first();
    assert.equal(await picker.getAttribute("data-selected-car"), "supercar");
    await page.getByRole("button", { name: "Voiture suivante" }).first().click();
    await page.waitForFunction(() => document.querySelector("[data-car-picker]")?.getAttribute("data-selected-car") === "sedan-sports");
    while (await page.getByRole("button", { name: "PRÊT", exact: true }).count())
      await page.getByRole("button", { name: "PRÊT", exact: true }).first().click();
    await page.getByRole("button", { name: "LANCER LA PARTIE" }).click();
    await page.waitForURL("**/play/game/**");
    await page.waitForFunction((n) => document.querySelectorAll("[data-car-label]").length === n, count);
    assert.equal(await page.locator("[data-car-label]").first().getAttribute("data-car-id"), "sedan-sports");
    const startIntro = page.getByRole("button", { name: "Passer l'introduction" });
    await startIntro.waitFor({ state: "visible", timeout: 12000 });
    const introCinematic = page.locator('[data-cinematic="intro"]');
    await introCinematic.waitFor({ state: "visible" });
    await page.screenshot({ path: `${output}/intro-${count}.png` });
    if (await startIntro.isVisible().catch(() => false))
      await startIntro.click({ timeout: 1500 }).catch(() => {});
    await introCinematic.waitFor({ state: "detached", timeout: 8000 });
    await page.getByRole("img", { name: "Ligne d'arrivée" }).waitFor();
    const placement = await page.locator("[data-car-label]").evaluateAll((nodes) => nodes.map((node) => ({
      x: Number(node.dataset.carX),
      size: Number(node.dataset.carSize),
    })));
    assert.equal(placement.length, count);
    assert.ok(placement.every((car) => Number.isFinite(car.x) && car.size >= 200), `${count} cars remain large enough to read at the starting grid`);
    assert.ok(new Set(placement.map((car) => Math.round(car.x))).size === count, `${count} cars occupy distinct road positions`);
    await page.screenshot({ path: `${output}/grid-${count}.png` });
  }
  await page.goto(`${base}/play/create`);
  await page.getByRole("button", { name: /Sur cet appareil/ }).click();
  await page.getByRole("button", { name: "6", exact: true }).click();
  await page.getByRole("button", { name: /Générer le code/ }).click();
  await page.waitForURL("**/play/lobby/**");
  const firstPicker = page.locator("[data-car-picker]").first();
  assert.equal(await firstPicker.getAttribute("data-selected-car"), "supercar");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Voiture suivante" }).first().click();
  assert.equal(await firstPicker.getAttribute("data-selected-car"), "sedan");
  await page.screenshot({ path: `${output}/garage.png`, fullPage: true });
  while (await page.getByRole("button", { name: "PRÊT", exact: true }).count())
    await page
      .getByRole("button", { name: "PRÊT", exact: true })
      .first()
      .click();
  await page.getByRole("button", { name: "LANCER LA PARTIE" }).click();
  await page.waitForURL("**/play/game/**");
  await page.getByRole("img", { name: "Ligne de départ" }).waitFor();
  await page.waitForFunction(() => document.querySelector("[data-car-label]")?.getAttribute("data-car-id") === "sedan");
  await page.getByRole("button", { name: "Passer l'introduction" }).waitFor();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${output}/race-start.png` });
  await page.waitForTimeout(14000);
  for (const id of ["supercar", "sedan", "sedan-sports", "suv", "race", "van"])
    assert.equal(raceCarModels.get(id), 200, `3D race model ${id}.glb loaded`);
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
  let movedPlayerId = null;
  for (let attempt = 0; attempt < 6 && !movedPlayerId; attempt++) {
    const distanceCard = page.locator('button[data-card-id^="dist"]').first();
    if (await page.locator('button[data-card-id^="dist"]').count()) {
      movedPlayerId = await page
        .locator('[data-player-active="true"]')
        .first()
        .getAttribute("data-player-id");
      const carLabel = page.locator(`[data-car-label="${movedPlayerId}"]`);
      const beforeY = Number(await carLabel.getAttribute("data-car-y"));
      const beforeX = Number(await carLabel.getAttribute("data-car-x"));
      const beforeSize = Number(await carLabel.getAttribute("data-car-size"));
      const beforeCamera = await page.locator("[data-race-camera]").evaluate((node) => {
        const matrix = new DOMMatrix(getComputedStyle(node).transform);
        return [matrix.m41, matrix.m42];
      });
      await distanceCard.click();
      await page.getByRole("button", { name: /JOUER CETTE CARTE/ }).click();
      await page.waitForFunction((id) => {
        const row = [...document.querySelectorAll("[data-player-id]")].find(
          (element) => element.getAttribute("data-player-id") === id,
        );
        return Number(row?.getAttribute("data-distance-km")) > 0;
      }, movedPlayerId);
      const distanceCounter = page.locator(`[data-distance-counter="${movedPlayerId}"]`);
      try {
        await page.waitForFunction((id) => {
          const counter = document.querySelector(`[data-distance-counter="${id}"]`);
          const row = [...document.querySelectorAll("[data-player-id]")].find((element) => element.getAttribute("data-player-id") === id);
          const value = Number(counter?.getAttribute("data-distance-value"));
          const target = Number(row?.getAttribute("data-distance-km"));
          return value > 0 && value < target;
        }, movedPlayerId, { timeout: 5000 });
      } catch (error) {
        console.error("distance animation state", await page.locator(`[data-distance-counter="${movedPlayerId}"]`).getAttribute("outerHTML"), await page.locator(`[data-player-id="${movedPlayerId}"]`).getAttribute("data-distance-km"));
        throw error;
      }
      const midDistance = Number(await distanceCounter.getAttribute("data-distance-value"));
      const finalDistance = Number(await page.locator(`[data-player-id="${movedPlayerId}"]`).getAttribute("data-distance-km"));
      assert.ok(midDistance > 0 && midDistance < finalDistance, "the HUD distance counts up during the car's move");
      await page.waitForTimeout(1800);
      const afterY = Number(await carLabel.getAttribute("data-car-y"));
      const afterX = Number(await carLabel.getAttribute("data-car-x"));
      const afterSize = Number(await carLabel.getAttribute("data-car-size"));
      const afterCamera = await page.locator("[data-race-camera]").evaluate((node) => {
        const matrix = new DOMMatrix(getComputedStyle(node).transform);
        return [matrix.m41, matrix.m42];
      });
      assert.ok(
        Math.max(Math.abs(afterX - beforeX), Math.abs(afterY - beforeY), Math.abs(afterSize - beforeSize)) > 2,
        "distance cards visibly move the car along the road",
      );
      assert.ok(
        Math.hypot(afterCamera[0] - beforeCamera[0], afterCamera[1] - beforeCamera[1]) > 2,
        "the camera follows the car during a real distance move",
      );
      break;
    }
    await page.locator("button[data-card-id]").last().click();
    await page.getByRole("button", { name: "Défausser", exact: true }).click();
    await page.getByRole("button", { name: "Piocher une carte", exact: true }).click();
  }
  assert.ok(movedPlayerId, "a distance card moves a real 3D race car");
  await page.getByRole("button", { name: "Piocher une carte", exact: true }).click();
  await page.locator("button[data-card-id]").last().click();
  await page.getByRole("button", { name: "Défausser", exact: true }).click();
  await page.waitForTimeout(1000);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll("button[data-card-id]")).every(card=>Number(getComputedStyle(card.parentElement).opacity)>.98));
  await page.screenshot({ path: `${output}/race.png` });
  await page
    .getByRole("button", { name: "Passer au plateau classique" })
    .click();
  await page.locator(".board-frame").waitFor({state:"visible",timeout:10000});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/classic.png` });

  await page.goto(`${base}/play/create`);
  await page.getByRole("button", { name: /Contre des bots/ }).click();
  await page.getByRole("button", { name: "3D — Voitures et effets animés" }).click();
  await page.getByRole("button", { name: "2 bots", exact: true }).click();
  await page.getByRole("button", { name: "Voiture suivante" }).click();
  await page.getByRole("button", { name: "Voiture suivante" }).click();
  assert.equal(await page.locator("[data-car-picker]").getAttribute("data-selected-car"), "hatchback-sports");
  await page.getByLabel("Nom du joueur 1").fill("Pilote humain");
  await page.getByRole("button", { name: "Démarrer la course" }).click();
  await page.waitForURL("**/play/game/**");
  await page.waitForFunction(() => document.querySelectorAll("[data-player-id]").length === 3);
  await page.waitForFunction(() => document.querySelector("[data-car-label]")?.getAttribute("data-car-id") === "hatchback-sports");
  const humanId = await page.locator('[data-player-active="true"]').getAttribute("data-player-id");
  assert.ok(humanId);
  assert.match(await page.locator(`[data-player-id="${humanId}"]`).innerText(), /Pilote humain/);
  assert.equal(await page.getByText("BOT", { exact: true }).count(), 2);
  await page.getByRole("button", { name: "Piocher une carte", exact: true }).click();
  await page.locator("button[data-card-id]").last().click();
  await page.getByRole("button", { name: "Défausser", exact: true }).click();
  await page.waitForFunction((id) => document.querySelector('[data-player-active="true"]')?.getAttribute("data-player-id") !== id, humanId);
  await page.waitForFunction((id) => document.querySelector('[data-player-active="true"]')?.getAttribute("data-player-id") === id, humanId, { timeout: 20000 });
  assert.deepEqual(errors, []);
  await page.getByRole("button", { name: "Passer au plateau classique" }).click();
  await page.locator(".board-frame").waitFor({ state: "visible", timeout: 10000 });

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
    "PASS: four home viewports, 20 illustrations, six-player garage, six real 3D GLB race models, distance-driven movement, automatic two-bot turns, draw, discard, next turn and classic switch; no page errors",
  );
} finally {
  await browser.close();
}
