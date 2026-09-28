import type { AmbianceId } from "@/game/types/game";

export interface AmbianceTheme {
  id: AmbianceId;
  label: string;
  hint: string;
  /** Multiply-blended over the day art; null for plain daylight. */
  tint: string | null;
  tintOpacity: number;
  /** Strength of street lamps / windows / headlights (0 = off). */
  lights: number;
  swatch: [string, string];
}

export const AMBIANCES: Record<AmbianceId, AmbianceTheme> = {
  jour: {
    id: "jour",
    label: "Jour",
    hint: "Grand soleil",
    tint: null,
    tintOpacity: 0,
    lights: 0,
    swatch: ["#8fd3f4", "#7cc46a"],
  },
  crepuscule: {
    id: "crepuscule",
    label: "Coucher de soleil",
    hint: "Lumière dorée",
    tint: "#ff9b6a",
    tintOpacity: 0.5,
    lights: 0.55,
    swatch: ["#ff9b6a", "#6b3d7a"],
  },
  nuit: {
    id: "nuit",
    label: "Nuit",
    hint: "Phares allumés",
    tint: "#1d2654",
    tintOpacity: 0.86,
    lights: 1,
    swatch: ["#1d2654", "#ffd37a"],
  },
};

export const AMBIANCE_LIST = Object.values(AMBIANCES);
