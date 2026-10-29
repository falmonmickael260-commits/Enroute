import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTouringCar } from "../game/components/scene/premiumCars";
import { CARS } from "../game/lib/cars";
import { loadCarModel } from "../game/components/scene/carModels";

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
  test(`${car.id}: the race loader actually builds the new vehicle with working wheel hubs`, async () => {
    const model = await loadCarModel(car.id, "#b92332", car.repaint, true);
    assert.ok(model);
    assert.equal(model.root.userData.vehicleId, car.id);
    assert.equal(model.root.userData.renderRevision, 2);
    assert.equal(
      model.wheels.length,
      ["moto", "scooter"].includes(car.id) ? 2 : 4,
    );
    for (const wheel of model.wheels) {
      assert.ok(wheel.parent);
      assert.ok(["x", "y", "z"].includes(wheel.userData.axle));
      assert.ok(wheel.userData.rest instanceof THREE.Vector3);
    }
    assert.ok(
      Object.values(model.mounts).every((m) => m.parent === model.body),
    );
    let count = 0;
    model.root.traverse((o) => {
      if (o instanceof THREE.Mesh) count++;
    });
    assert.ok(count < 40, `${count} draw calls`);
    model.root.userData.disposeModel();
  });
