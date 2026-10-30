"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { PlayerColor } from "@/game/types/game";
import { CARS, carInfo, type CarId } from "@/game/lib/cars";
import { VehicleArt } from "./VehicleArt";
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
  const [expanded, setExpanded] = useState(false);
  const index = Math.max(
    0,
    CARS.findIndex((c) => c.id === value),
  );
  const step = (d: number) =>
    onChange(CARS[(index + d + CARS.length) % CARS.length].id);
  const car = carInfo(value);

  // the car file starts loading as soon as it's chosen, so the race opens with it
  useEffect(() => prefetchCar(value), [value]);

  const arrow =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 font-menu text-xl font-bold text-white transition active:scale-90 disabled:opacity-30";
  return (
    <div
      className={clsx("premium-garage", compact && "premium-garage-compact")}
    >
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className={arrow}
          onClick={() => step(-1)}
          disabled={disabled}
          aria-label="Voiture précédente"
        >
          ‹
        </button>
        <button
          type="button"
          className="garage-preview"
          onClick={() => setExpanded(!expanded)}
          disabled={disabled}
          aria-expanded={expanded}
          aria-label={`Choisir un véhicule : ${car.label}`}
        >
          <VehicleArt key={`${car.id}:${color}`} car={car.id} color={color} />
          <span className="garage-car-name">{car.label}</span>
          <span className="garage-index">
            {String(index + 1).padStart(2, "0")} / {CARS.length} · Garage
          </span>
        </button>
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
      {expanded && (
        <div className="garage-grid" aria-label="Les véhicules">
          {CARS.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-pressed={value === option.id}
              onClick={() => {
                onChange(option.id);
                setExpanded(false);
              }}
            >
              <VehicleArt car={option.id} color={color} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
