export const VEHICLE_PRICE = 500;
export const CHEST_PRICE = 300;

export const PREMIUM_VEHICLES = [
  { id: "concept-gt", name: "Concept GT", category: "Voiture", description: "Carrosserie sculptée, jantes détaillées et peinture carmin." },
  { id: "gt-circuit", name: "GT Circuit", category: "Voiture", description: "Une sportive au profil bas et à l’aileron arrière." },
  { id: "pickup-classic", name: "Pick-up Vintage", category: "Voiture", description: "Un pick-up classique aux ailes rondes et à la benne ouverte." },
  { id: "moto-amethyste", name: "Moto Violette", category: "Moto", description: "Un deux-roues aux lignes compactes et à la livrée violette." },
  { id: "chenille", name: "Chenille", category: "Tank", description: "Un véhicule de collection à chenilles, avec les mêmes règles de course." },
] as const;

export type ChestReward = "purple" | "repair";
export type ChestReceipt = { id: string; match: string; player: string; reward: ChestReward; proof: string };

export function raceWalletKey(state: { id: string; startedAt: number }) {
  return `${state.id}:${state.startedAt}`;
}

export function isPremiumVehicle(id: string) {
  return PREMIUM_VEHICLES.some(vehicle => vehicle.id === id);
}
