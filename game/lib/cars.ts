import type { PlayerColor } from "@/game/types/game";

/**
 * The cars a pilot can drive. All but the first come from Kenney's Car Kit
 * (CC0, see public/models/cars/CREDITS.md); `repaint` cars take the pilot's
 * colour, the others (taxi, police) keep their livery.
 */
export const CARS = [
  { id: "sedan-sports", label: "Coupé sport", repaint: true },
  { id: "hatchback-sports", label: "Citadine", repaint: true },
  { id: "sedan", label: "Berline", repaint: true },
  { id: "suv", label: "SUV", repaint: true },
  { id: "suv-luxury", label: "SUV luxe", repaint: true },
  { id: "van", label: "Van", repaint: true },
  { id: "truck", label: "Pick-up", repaint: true },
  { id: "race", label: "Formule", repaint: true },
  { id: "race-future", label: "Proto", repaint: true },
  { id: "kart-oodi", label: "Kart", repaint: false },
  { id: "tractor", label: "Tracteur", repaint: true },
  { id: "taxi", label: "Taxi", repaint: false },
  { id: "police", label: "Police", repaint: false },
  { id: "kilomax", label: "KILOMAX", repaint: true },
] as const;

export type CarId = (typeof CARS)[number]["id"];

export const DEFAULT_CAR: CarId = "sedan-sports";

export function isCarId(value: unknown): value is CarId {
  return typeof value === "string" && CARS.some((c) => c.id === value);
}

export function carInfo(id: CarId | undefined) {
  return CARS.find((c) => c.id === id) ?? CARS[0];
}

/** Picture of a car in a pilot's colour (a render of its model, see public/models/cars/CREDITS.md). */
export function carThumb(id: CarId, color: PlayerColor) {
  const car = carInfo(id);
  return `/images/cars/${car.id}${car.repaint ? `-${color}` : ""}.webp`;
}
