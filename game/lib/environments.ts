import type { EnvironmentId } from "@/game/types/game";

export interface EnvironmentTheme {
  id: EnvironmentId;
  label: string;
  sky: [string, string];
  ground: [string, string];
  road: string;
  accent: string;
  decor: "trees" | "buildings" | "mountains" | "palms" | "lamps";
}

export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentTheme> = {
  campagne: {
    id: "campagne",
    label: "Campagne",
    sky: ["#bfe6f5", "#eaf7e8"],
    ground: ["#8fc47a", "#6ea75c"],
    road: "#4a4f5c",
    accent: "#f2c230",
    decor: "trees",
  },
  ville: {
    id: "ville",
    label: "Ville",
    sky: ["#9fb7d8", "#c9d6e8"],
    ground: ["#767c88", "#5c626d"],
    road: "#33363f",
    accent: "#f2c230",
    decor: "buildings",
  },
  montagne: {
    id: "montagne",
    label: "Montagne",
    sky: ["#c7d9ea", "#eef3f6"],
    ground: ["#9aa7ab", "#7c8a8e"],
    road: "#3b3e46",
    accent: "#e0483e",
    decor: "mountains",
  },
  cote: {
    id: "cote",
    label: "Côte",
    sky: ["#a9e4f2", "#eaf9f2"],
    ground: ["#e8d9a6", "#2fb6c8"],
    road: "#454a52",
    accent: "#2fb6c8",
    decor: "palms",
  },
  nuit: {
    id: "nuit",
    label: "Nuit",
    sky: ["#12162b", "#262c4a"],
    ground: ["#20263a", "#161a2b"],
    road: "#1c1f28",
    accent: "#ffd37a",
    decor: "lamps",
  },
};

export const ENVIRONMENT_LIST = Object.values(ENVIRONMENTS);
