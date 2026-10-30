"use client";

import { useEffect } from "react";
import clsx from "clsx";
import type { PlayerColor } from "@/game/types/game";
import { CARS, carInfo, carThumb, type CarId } from "@/game/lib/cars";
import { prefetchCar } from "@/game/components/scene/carModels";

/** The compact, one-tap garage used by the original lobby. */
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
  const index = Math.max(0, CARS.findIndex((car) => car.id === value));
  const car = carInfo(value);
  const step = (delta: number) =>
    onChange(CARS[(index + delta + CARS.length) % CARS.length].id);

  useEffect(() => prefetchCar(car.id), [car.id]);

  const arrow =
    "flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/25 bg-black/40 font-menu text-2xl font-bold text-white transition active:scale-90 disabled:opacity-30";

  return (
    <div
      data-car-picker
      data-selected-car={car.id}
      className={clsx(
        "flex min-w-0 items-center gap-2",
        compact ? "justify-end" : "justify-center",
      )}
    >
      <button
        type="button"
        className={arrow}
        onClick={() => step(-1)}
        disabled={disabled}
        aria-label="Voiture précédente"
      >
        ‹
      </button>
      <div className="flex w-[7.5rem] min-w-0 flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={carThumb(car.id, color)}
          alt={car.label}
          width={240}
          height={160}
          draggable={false}
          className={clsx(
            "h-auto object-contain",
            compact ? "w-[6.2rem]" : "w-[7.5rem]",
          )}
        />
        <span className="-mt-1 text-center font-menu text-sm font-bold uppercase tracking-wide text-white/90">
          {car.label}
        </span>
      </div>
      <button
        type="button"
        className={arrow}
        onClick={() => step(1)}
        disabled={disabled}
        aria-label="Voiture suivante"
      >
        ›
      </button>
    </div>
  );
}
