"use client";

import { useEffect } from "react";
import clsx from "clsx";
import type { PlayerColor } from "@/game/types/game";
import { CARS, carInfo, carThumb, type CarId } from "@/game/lib/cars";
import { prefetchCar } from "@/game/components/scene/carModels";

/**
 * The pilot's garage: the chosen car in their colour, the previous and next
 * ones a tap away (no scrolling).
 */
export function CarPicker({
  value,
  color,
  onChange,
  disabled = false,
  compact = false,
}: {
  value: CarId;
  color: PlayerColor;
  onChange: (car: CarId) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const index = Math.max(0, CARS.findIndex((c) => c.id === value));
  const step = (d: number) => onChange(CARS[(index + d + CARS.length) % CARS.length].id);
  const car = carInfo(value);

  // the car file starts loading as soon as it's chosen, so the race opens with it
  useEffect(() => prefetchCar(value), [value]);

  const arrow =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 font-menu text-xl font-bold text-white transition active:scale-90 disabled:opacity-30";
  return (
    <div className={clsx("flex items-center gap-2", compact ? "justify-end" : "justify-center")}>
      <button type="button" className={arrow} onClick={() => step(-1)} disabled={disabled} aria-label="Voiture précédente">
        ‹
      </button>
      <div className="flex w-[7.5rem] flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={carThumb(car.id, color)} alt="" width={240} height={160} draggable={false} className={clsx("h-auto", compact ? "w-[6.2rem]" : "w-[7.5rem]")} />
        <span className="-mt-1 font-menu text-sm font-bold uppercase tracking-wide text-white/90">{car.label}</span>
      </div>
      <button type="button" className={arrow} onClick={() => step(1)} disabled={disabled} aria-label="Voiture suivante">
        ›
      </button>
    </div>
  );
}
