"use client";

import { useState } from "react";
import type { PlayerColor } from "@/game/types/game";
import { carInfo, carThumb, type CarId } from "@/game/lib/cars";

const PAINT: Record<PlayerColor, string> = {
  crimson: "none",
  azure: "hue-rotate(205deg)",
  amber: "hue-rotate(42deg)",
  emerald: "hue-rotate(120deg)",
  violet: "hue-rotate(265deg)",
  rose: "hue-rotate(320deg)",
};

/** Cosmetic paint only: the stored vehicle identifier and player colour stay intact. */
export function VehicleArt({
  car,
  color,
  className = "",
}: {
  car: CarId;
  color: PlayerColor;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={
        failed ? carThumb(car, color) : `/images/premium/vehicles/${car}.webp`
      }
      alt={carInfo(car).label}
      width={768}
      height={512}
      draggable={false}
      onError={() => {
        if (!failed) setFailed(true);
      }}
      style={{
        filter: !failed && carInfo(car).repaint ? PAINT[color] : undefined,
      }}
      className={`vehicle-art ${className}`}
    />
  );
}
