import assert from "node:assert/strict";
import test from "node:test";
import { CARS, carFor, defaultCar, isCarId } from "../game/lib/cars";

test("the problematic retro model is not selectable, while old saved picks get a valid fallback", () => {
  assert.equal(CARS.some((car) => (car.id as string) === "retro"), false);
  assert.equal(isCarId("retro"), false);
  for (let seat = 0; seat < 6; seat++) {
    assert.equal(isCarId(defaultCar(seat)), true);
    assert.equal(carFor("retro", seat), defaultCar(seat));
  }
});
