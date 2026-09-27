"use client";

import { create } from "zustand";
import type { EnvironmentId, PlayerColor } from "@/game/types/game";
import { generateGameCode } from "@/game/lib/gameCode";

export interface SetupPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  ready: boolean;
}

export const PLAYER_COLORS: PlayerColor[] = ["crimson", "azure", "amber", "emerald"];

interface SetupState {
  code: string | null;
  players: SetupPlayer[];
  environment: EnvironmentId;
  target: number;
  createLocalGame: (playerNames: string[], environment: EnvironmentId, target: number) => string;
  joinByCode: (code: string) => void;
  toggleReady: (id: string) => void;
  reset: () => void;
}

export const useSetupStore = create<SetupState>((set, get) => ({
  code: null,
  players: [],
  environment: "campagne",
  target: 1000,
  createLocalGame: (playerNames, environment, target) => {
    const code = generateGameCode();
    const players: SetupPlayer[] = playerNames.map((name, i) => ({
      id: `p${i + 1}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || `Joueur ${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      ready: false,
    }));
    set({ code, players, environment, target });
    return code;
  },
  joinByCode: (code) => {
    if (get().code === code) return;
    set({ code });
  },
  toggleReady: (id) => {
    set({ players: get().players.map((p) => (p.id === id ? { ...p, ready: !p.ready } : p)) });
  },
  reset: () => set({ code: null, players: [], environment: "campagne", target: 1000 }),
}));
