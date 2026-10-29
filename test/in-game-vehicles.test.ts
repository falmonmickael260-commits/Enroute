import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTouringCar } from "../game/components/scene/premiumCars";
import { CARS } from "../game/lib/cars";
import { vehicleArtUrl } from "../game/components/scene/carModels";
import { buildVehicleModel } from "../game/components/scene/vehicleModels";
import { BUILT_CARS } from "../game/lib/cars";
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

for (const car of CARS) {
  test(`${car.id}: the garage keeps its high-resolution vehicle artwork`, () => {
    const url = vehicleArtUrl(car.id);
    assert.equal(url, `/images/premium/vehicles/${car.id}.webp`);
    assert.ok(existsSync(resolve(process.cwd(), `public${url}`)));
  });

  if (BUILT_CARS.has(car.id)) {
    test(`${car.id}: the race model is real geometry with animated wheels`, () => {
      const model = buildVehicleModel(car.id, "#cd2839");
      let meshes = 0;
      model.root.traverse((object) => {
        if (object instanceof THREE.Mesh) meshes++;
      });
      assert.ok(meshes > 0);
      assert.ok(model.wheels.length > 0);
      model.root.userData.disposeModel?.();
    });
  } else {
    test(`${car.id}: the race has a 3D GLB model instead of a flat cutout`, () => {
      assert.ok(existsSync(resolve(process.cwd(), `public/models/cars/${car.id}.glb`)));
    });
  }
}
