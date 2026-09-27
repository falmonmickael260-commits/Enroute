import type { CardDef, DefenseType, HazardType } from "@/game/types/game";

/**
 * The full EN ROUTE card catalog. `count` controls how many copies
 * ship in a standard deck (tuned for 2-4 players, hand size 7).
 */
export const CARD_CATALOG: Record<string, CardDef & { count: number }> = {
  // ---- Distance cards ----
  dist25: { category: "distance", id: "dist25", title: "25 KM", subtitle: "Petite ligne droite", value: 25, count: 10 },
  dist50: { category: "distance", id: "dist50", title: "50 KM", subtitle: "Route dégagée", value: 50, count: 10 },
  dist75: { category: "distance", id: "dist75", title: "75 KM", subtitle: "Bonne cadence", value: 75, count: 10 },
  dist100: { category: "distance", id: "dist100", title: "100 KM", subtitle: "Grande ligne droite", value: 100, count: 12 },
  dist200: { category: "distance", id: "dist200", title: "200 KM", subtitle: "Autoroute libre", value: 200, count: 4 },

  // ---- Attack cards ----
  collision: {
    category: "attaque",
    id: "collision",
    title: "COLLISION",
    subtitle: "Immobilise un adversaire",
    hazard: "collision",
    count: 3,
  },
  crevaison: {
    category: "attaque",
    id: "crevaison",
    title: "CREVAISON",
    subtitle: "Un pneu lâche",
    hazard: "crevaison",
    count: 3,
  },
  panne: {
    category: "attaque",
    id: "panne",
    title: "PANNE",
    subtitle: "Plus une goutte d'essence",
    hazard: "panne",
    count: 3,
  },
  radar: {
    category: "attaque",
    id: "radar",
    title: "RADAR",
    subtitle: "Limité à 50 km/h",
    hazard: "radar",
    count: 3,
  },
  barrage: {
    category: "attaque",
    id: "barrage",
    title: "BARRAGE",
    subtitle: "Route bloquée",
    hazard: "barrage",
    count: 4,
  },

  // ---- Defense cards ----
  reparation: {
    category: "defense",
    id: "reparation",
    title: "RÉPARATION",
    subtitle: "Remet le véhicule en état",
    defense: "reparation",
    counters: "collision",
    count: 6,
  },
  roueSecours: {
    category: "defense",
    id: "roueSecours",
    title: "ROUE DE SECOURS",
    subtitle: "Change le pneu crevé",
    defense: "roueSecours",
    counters: "crevaison",
    count: 6,
  },
  pleinEssence: {
    category: "defense",
    id: "pleinEssence",
    title: "PLEIN D'ESSENCE",
    subtitle: "Fait le plein au plus vite",
    defense: "pleinEssence",
    counters: "panne",
    count: 6,
  },
  gps: {
    category: "defense",
    id: "gps",
    title: "GPS",
    subtitle: "Évite les zones radar",
    defense: "gps",
    counters: "radar",
    count: 6,
  },
  passageLibre: {
    category: "defense",
    id: "passageLibre",
    title: "PASSAGE LIBRE",
    subtitle: "La route s'ouvre à nouveau",
    defense: "passageLibre",
    counters: "barrage",
    count: 6,
  },

  // ---- Special EN ROUTE cards ----
  turbo: {
    category: "special",
    id: "turbo",
    title: "TURBO",
    subtitle: "Coup d'accélérateur, ignore les limitations de vitesse",
    special: "turbo",
    value: 100,
    count: 3,
  },
  raccourci: {
    category: "special",
    id: "raccourci",
    title: "RACCOURCI",
    subtitle: "Un chemin de traverse bien connu",
    special: "raccourci",
    value: 30,
    count: 3,
  },
  depassement: {
    category: "special",
    id: "depassement",
    title: "DÉPASSEMENT",
    subtitle: "Doublez un adversaire de 10 km",
    special: "depassement",
    count: 3,
  },
  gpsStrategique: {
    category: "special",
    id: "gpsStrategique",
    title: "GPS STRATÉGIQUE",
    subtitle: "Choisissez librement une action de défense",
    special: "gpsStrategique",
    count: 2,
  },
  derniereLigneDroite: {
    category: "special",
    id: "derniereLigneDroite",
    title: "DERNIÈRE LIGNE DROITE",
    subtitle: "Un dernier effort avant l'arrivée",
    special: "derniereLigneDroite",
    value: 100,
    count: 3,
  },
};

export function getCardDef(defId: string): CardDef {
  const def = CARD_CATALOG[defId];
  if (!def) throw new Error(`Unknown card definition: ${defId}`);
  return def;
}

export const HAZARD_TO_DEFENSE: Record<HazardType, DefenseType> = {
  collision: "reparation",
  crevaison: "roueSecours",
  panne: "pleinEssence",
  radar: "gps",
  barrage: "passageLibre",
};

export const DEFENSE_TO_HAZARD: Record<DefenseType, HazardType> = {
  reparation: "collision",
  roueSecours: "crevaison",
  pleinEssence: "panne",
  gps: "radar",
  passageLibre: "barrage",
};
