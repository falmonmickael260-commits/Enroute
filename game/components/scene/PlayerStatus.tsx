import clsx from "clsx";
import type { PlayerState } from "@/game/types/game";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import { hazardLabel } from "@/game/lib/engine/rules";
import { CardArt } from "@/game/components/cards/CardArt";

/**
 * What a player is dealing with, readable at a glance: the attack stopping
 * them (red), the radar limiting them (amber), the protections they hold
 * (green), or a clear road.
 */
export function PlayerStatus({ player, compact = false }: { player: PlayerState; compact?: boolean }) {
  const chip = "flex items-center gap-1 rounded-md font-hud font-bold uppercase leading-none";
  const size = compact ? "h-[18px] px-1 text-[0.58rem]" : "h-5 px-1.5 text-[0.62rem]";
  const icon = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {player.hazard ? (
        <span className={clsx(chip, size, "bg-[#e0342c] text-white shadow-[0_0_8px_rgba(224,52,44,0.6)]")}>
          <span className={icon}>
            <CardArt def={getCardDef(player.hazard)} />
          </span>
          {hazardLabel(player.hazard)}
        </span>
      ) : null}
      {player.limited ? (
        <span className={clsx(chip, size, "bg-[#ffb020] text-[#2a1800]")}>
          <span className={icon}>
            <CardArt def={getCardDef("radar")} />
          </span>
          Radar 50
        </span>
      ) : null}
      {!player.hazard && !player.limited ? (
        <span className={clsx(chip, size, "bg-[#1f9a55]/85 text-white")}>✓ Route libre</span>
      ) : null}
      {player.shields.map((shield) => {
        const def = getCardDef(shield);
        return (
          <span
            key={shield}
            title={`Protégé : ${def.title.toLowerCase()}`}
            className={clsx("flex items-center justify-center rounded-md bg-[#1f9a55] text-white", compact ? "h-[18px] w-[18px]" : "h-5 w-5")}
          >
            <span className={icon}>
              <CardArt def={def} />
            </span>
          </span>
        );
      })}
    </div>
  );
}
