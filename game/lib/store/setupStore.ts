"use client";

import { create } from "zustand";
import type { AmbianceId, PlayerColor } from "@/game/types/game";
import { generateGameCode } from "@/game/lib/gameCode";
import { DEFAULT_CAR, type CarId } from "@/game/lib/cars";

export interface SetupPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  car: CarId;
  ready: boolean;
}

export const PLAYER_COLORS: PlayerColor[] = ["crimson", "azure", "amber", "emerald"];

interface SetupState {
  code: string | null;
  players: SetupPlayer[];
  ambiance: AmbianceId;
  target: number;
  createLocalGame: (playerNames: string[], ambiance: AmbianceId, target: number) => string;
  joinByCode: (code: string) => void;
  toggleReady: (id: string) => void;
  setCar: (id: string, car: CarId) => void;
  reset: () => void;
}

export const useSetupStore = create<SetupState>((set, get) => ({
  code: null,
  players: [],
  ambiance: "jour",
  target: 1000,
  createLocalGame: (playerNames, ambiance, target) => {
    const code = generateGameCode();
    const players: SetupPlayer[] = playerNames.map((name, i) => ({
      id: `p${i + 1}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || `Joueur ${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      car: DEFAULT_CAR,
      ready: false,
    }));
    set({ code, players, ambiance, target });
    return code;
  },
  joinByCode: (code) => {
    if (get().code === code) return;
    set({ code });
  },
  toggleReady: (id) => {
    set({ players: get().players.map((p) => (p.id === id ? { ...p, ready: !p.ready } : p)) });
  },
  setCar: (id, car) => {
    set({ players: get().players.map((p) => (p.id === id ? { ...p, car } : p)) });
  },
  reset: () => set({ code: null, players: [], ambiance: "jour", target: 1000 }),
}));
