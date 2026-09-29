"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AnimationEvent, GameState, PlayerColor } from "@/game/types/game";
import { useElementSize } from "@/game/hooks/useElementSize";
import { ScenePath, type SceneDef } from "./scenePath";
import { SceneRenderer, type CarScreenPos } from "./SceneRenderer";
import styles from "./scene.module.css";

/** Car paint: livelier than the UI tokens, they have to pop on the landscape. */
export const CAR_PAINT: Record<PlayerColor, string> = {
  crimson: "#e8352b",
  azure: "#1f86ea",
  amber: "#ffc21a",
  emerald: "#2fae55",
};

function pushState(renderer: SceneRenderer, state: GameState) {
  const current = state.players[state.currentPlayerIndex]?.id;
  renderer.update(
    state.players.map((p) => ({
      id: p.id,
      color: CAR_PAINT[p.color],
      km: p.distance,
      hazard: p.hazard,
      limited: p.limited,
      active: p.id === current,
    })),
    state.target,
  );
}

interface Focus {
  x: number;
  y: number;
  zoom: number;
}

/**
 * The illustrated scene with the 3D cars on top. The whole stage (picture,
 * WebGL canvas, signs and labels) moves as one piece, so the camera can zoom
 * and tilt towards the action while everything stays aligned.
 */
export function SceneBoard({ state, event, def }: { state: GameState; event: AnimationEvent | null; def: SceneDef }) {
  const path = useMemo(() => new ScenePath(def), [def]);
  const [boxRef, box] = useElementSize<HTMLDivElement>();
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());

  // cover the box with the picture, keeping the road centred horizontally
  const cover = useMemo(() => {
    if (!box.width || !box.height) return null;
    const scale = Math.max(box.width / def.width, box.height / def.height);
    const w = def.width * scale;
    const h = def.height * scale;
    const roadXs = def.road.slice(def.startIndex, def.finishIndex + 1).map((p) => p.x);
    const roadMid = ((Math.min(...roadXs) + Math.max(...roadXs)) / 2) * scale;
    const left = Math.min(0, Math.max(box.width - w, box.width / 2 - roadMid));
    const top = (box.height - h) / 2;
    return { scale, w, h, left, top };
  }, [box.width, box.height, def]);

  // create the WebGL layer once the canvas is in the page
  useEffect(() => {
    if (!canvas) return;
    const renderer = new SceneRenderer(canvas, path, 1);
    rendererRef.current = renderer;
    renderer.onFrame = (positions: Map<string, CarScreenPos>) => {
      for (const [id, p] of positions) {
        const el = labelRefs.current.get(id);
        if (el) el.style.transform = `translate(${p.x}px, ${p.y - p.size * 0.62}px) translate(-50%, -100%) scale(${Math.max(0.55, Math.min(1.25, p.size / 110))})`;
      }
    };
    pushState(renderer, stateRef.current);
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [canvas, path]);

  // sharper canvas on dense screens
  useEffect(() => {
    if (!cover) return;
    const q = Math.max(0.8, Math.min(2, (cover.w * (window.devicePixelRatio || 1) * 1.2) / def.width));
    rendererRef.current?.setQuality(q);
  }, [cover, def.width]);

  // feed the game state to the 3D layer
  useEffect(() => {
    stateRef.current = state;
    if (rendererRef.current) pushState(rendererRef.current, state);
  }, [state]);

  // camera: follow what the current event is about, then settle back
  const eventKey = event?.id ?? null;
  const eventFocus = useMemo<Focus | null>(() => {
    if (!event) return null;
    const player = state.players.find((p) => p.id === event.playerId);
    if (!player) return null;
    if (event.kind === "move") {
      const a = path.atKm(event.from, state.target);
      const b = path.atKm(event.to, state.target);
      const span = Math.hypot(a.x - b.x, a.y - b.y);
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, zoom: Math.max(1.15, Math.min(1.9, 900 / (span + 360))) };
    }
    if (event.kind === "hazard" || event.kind === "shield") {
      const p = path.atKm(player.distance, state.target);
      return { x: p.x, y: p.y, zoom: Math.max(1.5, Math.min(2.3, 230 / p.s)) };
    }
    if (event.kind === "turnChange") {
      const p = path.atKm(player.distance, state.target);
      return { x: p.x, y: p.y, zoom: 1.2 };
    }
    return null;
    // only re-aim when a new event starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey, path]);
  // keep looking at the last shot for a moment before pulling back
  const [held, setHeld] = useState<Focus | null>(null);
  const [prevEventFocus, setPrevEventFocus] = useState<Focus | null>(null);
  if (eventFocus !== prevEventFocus) {
    setPrevEventFocus(eventFocus);
    if (eventFocus) setHeld(eventFocus);
  }
  useEffect(() => {
    if (eventFocus || !held) return;
    const t = setTimeout(() => setHeld(null), 700);
    return () => clearTimeout(t);
  }, [eventFocus, held]);
  const focus = eventFocus ?? held;

  const camera = useMemo(() => {
    if (!cover || !focus) return { x: 0, y: 0, scale: 1, rotateX: 0 };
    const z = focus.zoom;
    // bring the focus point to the middle of the upper two thirds (the hand covers the bottom)
    const fx = cover.left + focus.x * cover.scale;
    const fy = cover.top + focus.y * cover.scale;
    const cx = box.width / 2;
    const cy = box.height * 0.42;
    let x = cx - fx * z;
    let y = cy - fy * z;
    // never show past the picture's edges
    x = Math.min(-cover.left * z + 0, Math.max(box.width - (cover.left + cover.w) * z, x));
    y = Math.min(-cover.top * z, Math.max(box.height - (cover.top + cover.h) * z, y));
    return { x, y, scale: z, rotateX: 5 };
  }, [cover, focus, box.width, box.height]);

  const markers = useMemo(() => {
    const steps = 5;
    return Array.from({ length: steps }, (_, i) => {
      const km = Math.round((state.target * i) / steps);
      const p = path.atKm(km, state.target);
      // on the inner side of the bend, a little off the road
      const side = p.tx > 0 ? -1 : 1;
      return { km, x: p.x + -p.ty * p.s * 1.45 * side, y: p.y + p.tx * p.s * 1.45 * side, s: p.s };
    });
  }, [path, state.target]);
  const finish = path.finish;

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden" style={{ perspective: 1400 }}>
      {cover ? (
        <motion.div
          className="absolute left-0 top-0"
          style={{ width: box.width, height: box.height, transformOrigin: "50% 42%" }}
          animate={{ rotateX: camera.rotateX * (focus ? 1 : 0) }}
          transition={{ duration: 1.1, ease: [0.45, 0, 0.2, 1] }}
        >
          <motion.div
            className="absolute left-0 top-0"
            style={{ width: box.width, height: box.height, transformOrigin: "0 0" }}
            animate={{ x: camera.x, y: camera.y, scale: camera.scale }}
            transition={{ duration: 1.1, ease: [0.45, 0, 0.2, 1] }}
          >
            <div
              className="absolute"
              style={{ left: cover.left, top: cover.top, width: cover.w, height: cover.h }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={def.image} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{ width: def.width, height: def.height, transform: `scale(${cover.scale})` }}
              >
                {markers.map((m) => (
                  <div
                    key={m.km}
                    className={`${styles.sign} absolute`}
                    style={{ left: m.x, top: m.y, transform: `translate(-50%, -100%) scale(${Math.max(0.45, m.s / 120)})` }}
                  >
                    <span>{m.km}</span>
                  </div>
                ))}
                <div
                  className={`${styles.finish} absolute`}
                  style={{ left: finish.x, top: finish.y, transform: `translate(-50%, -100%) scale(${Math.max(0.5, finish.s / 55)})` }}
                >
                  <span>{state.target}</span>
                </div>
                <canvas ref={setCanvas} className="pointer-events-none absolute inset-0 h-full w-full" />
                {state.players.map((p, i) => (
                  <div
                    key={p.id}
                    ref={(el) => {
                      if (el) labelRefs.current.set(p.id, el);
                      else labelRefs.current.delete(p.id);
                    }}
                    className={`${styles.label} absolute left-0 top-0 origin-bottom`}
                    style={{ ["--car" as string]: CAR_PAINT[p.color] }}
                  >
                    <span className={styles.labelName}>{p.name || `Joueur ${i + 1}`}</span>
                    <span className={styles.labelArrow} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  );
}
