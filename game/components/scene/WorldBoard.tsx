"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, GameState } from "@/game/types/game";
import { useElementSize } from "@/game/hooks/useElementSize";
import { SceneRenderer, type CarScreenPos } from "./SceneRenderer";
import { WorldStage } from "./WorldStage";
import { CAR_PAINT, pushState } from "./sceneSync";
import { raceAudio } from "@/game/audio/race";
import type { Shot } from "./stage";
import styles from "./scene.module.css";
import { CardArt } from "@/game/components/cards/CardArt";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import { hazardLabel } from "@/game/lib/engine/rules";

/** How long the camera stays on an action after it's over, before pulling back. */
const HOLD_MS = 900;

/**
 * The race in a full 3D world. The camera is directed by what happens in the
 * game: it follows the car that drives, swings round the car that gets hit,
 * circles the finish at the end, and otherwise sits behind the pack.
 */
export function WorldBoard({
  state,
  event,
  bottomInset = 0,
  overview = false,
}: {
  state: GameState;
  event: AnimationEvent | null;
  bottomInset?: number;
  /** Zoomed out over the whole road (the player's choice). */
  overview?: boolean;
}) {
  const [boxRef, box] = useElementSize<HTMLDivElement>();
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const stateRef = useRef(state);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const widthRef = useRef(0);

  useEffect(() => {
    if (!canvas) return;
    const renderer = new SceneRenderer(canvas, new WorldStage());
    rendererRef.current = renderer;
    let shown = false;
    renderer.onFrame = (positions: Map<string, CarScreenPos>) => {
      if (!shown) {
        shown = true;
        setReady(true);
      }
      // stack labels that would overlap, nearest car's label lowest
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      const order = [...positions.entries()].sort((a, b) => b[1].y - a[1].y);
      for (const [id, p] of order) {
        const el = labelRefs.current.get(id);
        if (!el) continue;
        if (p.size <= 0) {
          el.style.opacity = "0";
          continue;
        }
        const scale = Math.max(0.6, Math.min(1, p.size / 70));
        const w = (el.offsetWidth || 120) * scale;
        const h = (el.offsetHeight || 40) * scale;
        // keep the whole label on screen, even when its car is near an edge
        const x = widthRef.current > w + 12 ? Math.min(widthRef.current - w / 2 - 6, Math.max(w / 2 + 6, p.x)) : p.x;
        let y = p.y - p.size * 0.55;
        for (let guard = 0; guard < 6; guard++) {
          const hit = placed.find((q) => Math.abs(q.x - x) < (q.w + w) / 2 && Math.abs(q.y - y) < (q.h + h) / 2);
          if (!hit) break;
          y = hit.y - (hit.h + h) / 2 - 2;
        }
        placed.push({ x, y, w, h });
        el.style.opacity = "1";
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${scale})`;
        el.dataset.active = p.active ? "1" : "0";
      }
    };
    renderer.onMotion = (cars) => raceAudio.motion(cars);
    pushState(renderer, null, stateRef.current);
    return () => {
      renderer.onMotion = null;
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [canvas]);

  useEffect(() => {
    if (!box.width || !box.height) return;
    widthRef.current = box.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    rendererRef.current?.resize(box.width, box.height, dpr, bottomInset);
  }, [box.width, box.height, bottomInset, canvas]);

  useEffect(() => {
    const prev = stateRef.current;
    stateRef.current = state;
    if (rendererRef.current) pushState(rendererRef.current, prev, state);
  }, [state]);

  // camera direction from the game events
  const over = state.phase === "gameover";
  const eventKey = event?.id ?? null;
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    let shot: Shot | null = null;
    if (over) shot = { kind: "finish" };
    else if (overview) shot = { kind: "overview" };
    else if (event?.kind === "move") shot = { kind: "follow", id: event.playerId };
    else if (event?.kind === "hazard" || event?.kind === "shield") shot = { kind: "car", id: event.playerId };
    if (shot) {
      renderer.setShot(shot);
      return;
    }
    // nothing happening: stay on the last shot a moment, then back behind the pack
    const t = setTimeout(() => rendererRef.current?.setShot({ kind: "pack" }), HOLD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey, over, overview, canvas]);

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden bg-[#9fd3f0]">
      <canvas
        ref={setCanvas}
        className="absolute inset-0 h-full w-full transition-opacity duration-500"
        style={{ opacity: ready ? 1 : 0 }}
      />
      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-[#ffd23f]" />
        </div>
      ) : null}
      {state.players.map((p, i) => (
        <div
          key={p.id}
          ref={(el) => {
            if (el) labelRefs.current.set(p.id, el);
            else labelRefs.current.delete(p.id);
          }}
          className={`${styles.label} pointer-events-none absolute left-0 top-0 origin-bottom`}
          style={{ ["--car" as string]: CAR_PAINT[p.color], opacity: 0 }}
        >
          <span className={styles.labelName}>
            {p.name || `Joueur ${i + 1}`}
            {/* what stops or slows this car, readable from the road */}
            {p.hazard ? (
              <span className={styles.labelHazard} title={hazardLabel(p.hazard)}>
                <CardArt def={getCardDef(p.hazard)} />
              </span>
            ) : p.limited ? (
              <span className={styles.labelRadar}>50</span>
            ) : null}
          </span>
          <span className={styles.labelArrow} />
        </div>
      ))}
    </div>
  );
}
