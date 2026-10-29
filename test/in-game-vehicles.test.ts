import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTouringCar } from "../game/components/scene/premiumCars";
import { BUILT_CARS, CARS } from "../game/lib/cars";
import { vehicleArtUrl, vehicleModelUrl } from "../game/components/scene/carModels";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

for (const id of [
  "sedan",
  "sedan-sports",
  "hatchback-sports",
  "suv",
  "kilomax",
]) {
  test(`${id}: the outside of the bonnet is visible from above`, () => {
    const model = createTouringCar(id, "#cd2839");
    model.root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 2, 0.35),
      new THREE.Vector3(0, -1, 0),
    );
    const hit = ray
      .intersectObject(model.body, true)
      .find((h) => (h.object as THREE.Mesh).material === model.paint);
    assert.ok(hit, "visible painted bonnet");
    assert.ok(
      hit.point.y > 0.22,
      `outside bonnet, not the inside floor: ${hit.point.y}`,
    );
    model.root.userData.disposeModel();
  });
}

for (const car of CARS)
  test(`${car.id}: garage art and its 3D model are available`, () => {
    const art = vehicleArtUrl(car.id);
    assert.equal(art, `/images/premium/vehicles/${car.id}.webp`);
    assert.ok(existsSync(resolve(process.cwd(), `public${art}`)));
    const model = vehicleModelUrl(car.id);
    if (model) {
      assert.equal(model, `/models/cars/${car.id}.glb`);
      assert.ok(existsSync(resolve(process.cwd(), `public${model}`)));
      return;
    }
    assert.ok(BUILT_CARS.has(car.id), `${car.id} has a native 3D model`);
  });
