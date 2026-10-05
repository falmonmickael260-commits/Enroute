"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import type { NewGameOptions } from "@/game/lib/engine/gameReducer";
import type { PlayerColor } from "@/game/types/game";
import { SceneGame } from "@/game/components/scene/SceneGame";
import { MAX_PLAYERS } from "@/game/lib/engine/deck";

const COLORS: PlayerColor[] = ["azure", "crimson", "emerald", "amber", "violet", "rose"];

/** Distances proposées (km), les mêmes que sur la page de création. */
const DISTANCES = [700, 1000, 1500];

/**
 * Prototype of the illustrated 3D board. Separate page: the regular game is
 * untouched. `?n=2..6` sets the number of players, `?km=700|1000|1500` the
 * distance, `?demo=1` deals hands with every kind of card so each effect can
 * be tried right away.
 */
export default function Scene3DPage({ searchParams }: { searchParams: Promise<{ n?: string; demo?: string; km?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const n = Math.max(2, Math.min(MAX_PLAYERS, Number(params.n) || 2));
  const demo = params.demo === "1";
  const target = DISTANCES.includes(Number(params.km)) ? Number(params.km) : 1000;
  const options: NewGameOptions = {
    id: "ENR-3D",
    target,
    players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}`, color: COLORS[i] })),
  };
  return <SceneGame options={options} demo={demo} onExit={() => router.push("/")} />;
}
