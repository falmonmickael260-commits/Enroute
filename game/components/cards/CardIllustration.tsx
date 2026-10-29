"use client";

import { useState } from "react";
import type { CardDef } from "@/game/types/game";
import { CardArt } from "./CardArt";

/** The catalogue supplies every word and value; artwork is presentation only. */
export function CardIllustration({ def }: { def: CardDef }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <CardArt def={def} />;
  const distance = def.category === "distance";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="premium-card-art"
      src={`/images/premium/${distance ? "coast" : `cards/${def.id}`}.webp`}
      alt=""
      width={768}
      height={512}
      draggable={false}
      onError={() => setFailed(true)}
      style={
        distance
          ? { objectPosition: `${20 + (def.value ?? 25) / 4}% center` }
          : undefined
      }
    />
  );
}
