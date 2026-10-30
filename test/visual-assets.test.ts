import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import * as THREE from "three";
import { CARS } from "../game/lib/cars";
import { CARD_CATALOG } from "../game/lib/engine/cardCatalog";
import { createTouringCar } from "../game/components/scene/premiumCars";
import coastalScene from "../game/components/scene/scenes/provisoire.json";
import { ScenePath } from "../game/components/scene/scenePath";

test("four-lane coastal race art is aligned with a longer in-game route", () => {
  assert.equal(coastalScene.image, "/images/scene/kilomax-coast-charcoal.webp");
  assert.ok(existsSync(`public${coastalScene.image}`));
  assert.ok(coastalScene.finishIndex - coastalScene.startIndex >= 8);
  const path = new ScenePath(coastalScene);
  const start = path.atKm(0, 1000);
  const finish = path.atKm(1000, 1000);
  assert.ok(start.s >= 240, "four-lane road width at the start");
  assert.ok(start.y - finish.y >= 600, "visibly extended race route");
});

test("every vehicle and every card has its delivered optimized illustration", () => {
  assert.ok(existsSync("public/images/premium/landscape-world.webp"));
  for (const car of CARS)
    assert.ok(
      existsSync(`public/images/premium/vehicles/${car.id}.webp`),
      car.id,
    );
  for (const card of Object.values(CARD_CATALOG))
    assert.ok(
      existsSync(
        `public/images/premium/${card.category === "distance" ? "coast" : `cards/${card.id}`}.webp`,
      ),
      card.id,
    );
});

for (const car of CARS.filter(
  (c) => !["moto", "scooter", "quad"].includes(c.id),
))
  test(`${car.id}: finite geometry, animated wheels and bounded draw calls`, () => {
    const model = createTouringCar(car.id, "#c63032");
    const bounds = new THREE.Box3().setFromObject(model.root);
    assert.ok(Number.isFinite(bounds.max.y));
    assert.ok(bounds.getSize(new THREE.Vector3()).z < 1.5);
    assert.equal(model.wheels.length, 4);
    assert.ok(
      Object.values(model.mounts).every((m) => m.parent === model.body),
    );
    let count = 0;
    model.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        count++;
        assert.ok(
          Array.from(o.geometry.getAttribute("position").array).every(
            Number.isFinite,
          ),
        );
      }
    });
    assert.ok(count < 32, `draw calls ${count}`);
    model.root.userData.disposeModel();
  });
