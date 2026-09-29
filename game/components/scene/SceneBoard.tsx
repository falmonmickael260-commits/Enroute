"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AnimationEvent, GameState, PlayerColor } from "@/game/types/game";
import { useElementSize } from "@/game/hooks/useElementSize";
import { ScenePath, type SceneDef } from "./scenePath";
import { SceneRenderer, type CarScreenPos, type MoveStyle, type SceneCue } from "./SceneRenderer";
import { getCardDef } from "@/game/lib/engine/cardCatalog";
import styles from "./scene.module.css";

/** Car paint: livelier than the UI tokens, they have to pop on the landscape. */
export const CAR_PAINT: Record<PlayerColor, string> = {
  crimson: "#e8352b",
  azure: "#1f86ea",
  amber: "#ffc21a",
  emerald: "#2fae55",
};

/** Which card was just played, read from how the state changed. */
function cueFor(prev: GameState, next: GameState): { playerId: string; cue: SceneCue } | null {
  if (prev.startedAt !== next.startedAt || next.discard.length !== prev.discard.length + 1) return null;
  const def = getCardDef(next.discard[next.discard.length - 1].defId);
  const before = prev.players[prev.currentPlayerIndex];
  const after = next.players.find((p) => p.id === before.id);
  if (!after) return null;
  if (after.distance !== before.distance) {
    const style: MoveStyle =
      def.special === "turbo"
        ? "turbo"
        : def.special === "raccourci"
          ? "shortcut"
          : def.special === "depassement"
            ? "overtake"
            : def.special === "derniereLigneDroite"
              ? "sprint"
              : (def.value ?? 0) >= 200
                ? "fast"
                : "drive";
    return { playerId: after.id, cue: { kind: "move", style } };
  }
  if (def.category === "defense") {
    return { playerId: after.id, cue: { kind: after.shields.length > before.shields.length ? "shield" : "repair" } };
  }
  if (def.special === "gpsStrategique") return { playerId: after.id, cue: { kind: "gps" } };
  return null;
}

function pushState(renderer: SceneRenderer, prev: GameState | null, state: GameState) {
  if (prev && prev.startedAt !== state.startedAt) renderer.reset();
  const cue = prev ? cueFor(prev, state) : null;
  if (cue) renderer.cue(cue.playerId, cue.cue);
  const current = state.players[state.currentPlayerIndex]?.id;
  renderer.update(
    state.players.map((p) => ({
      id: p.id,
      color: CAR_PAINT[p.color],
      km: p.distance,
      hazard: p.hazard,
      limited: p.limited,
      shields: p.shields,
      active: p.id === current && state.phase !== "gameover",
    })),
    state.target,
  );
  if (state.phase === "gameover" && prev?.phase !== "gameover") renderer.celebrate();
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
export function SceneBoard({
  state,
  event,
  def,
  bottomInset = 0,
}: {
  state: GameState;
  event: AnimationEvent | null;
  def: SceneDef;
  /** Height covered by the hand at the bottom: the start line must stay above it. */
  bottomInset?: number;
}) {
  const path = useMemo(() => new ScenePath(def), [def]);
  const [boxRef, box] = useElementSize<HTMLDivElement>();
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());

  // cover the box with the picture, keeping the road centred horizontally
  const cover = useMemo(() => {
    if (!box.width || !box.height) return null;
    const startY = def.road[def.startIndex].y;
    const room = bottomInset + 70; // keep the start line and its cars clear of the hand
    const scale = Math.max(box.width / def.width, box.height / def.height, room / Math.max(1, def.height - startY));
    const w = def.width * scale;
    const h = def.height * scale;
    const roadXs = def.road.slice(def.startIndex, def.finishIndex + 1).map((p) => p.x);
    const roadMid = ((Math.min(...roadXs) + Math.max(...roadXs)) / 2) * scale;
    const left = Math.min(0, Math.max(box.width - w, box.width / 2 - roadMid));
    const top = Math.max(box.height - h, Math.min(0, box.height - room - startY * scale));
    return { scale, w, h, left, top };
  }, [box.width, box.height, def, bottomInset]);

  // create the WebGL layer once the canvas is in the page
  useEffect(() => {
    if (!canvas) return;
    const renderer = new SceneRenderer(canvas, path, 1);
    rendererRef.current = renderer;
    renderer.onFrame = (positions: Map<string, CarScreenPos>) => {
      // stack labels that would overlap, nearest car's label lowest
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      const order = [...positions.entries()].sort((a, b) => b[1].y - a[1].y);
      for (const [id, p] of order) {
        const el = labelRefs.current.get(id);
        if (!el) continue;
        const scale = Math.max(0.55, Math.min(1.25, p.size / 110));
        const w = 130 * scale;
        const h = 44 * scale;
        let y = p.y - p.size * 0.62;
        for (let guard = 0; guard < 6; guard++) {
          const hit = placed.find((q) => Math.abs(q.x - p.x) < (q.w + w) / 2 && Math.abs(q.y - y) < (q.h + h) / 2);
          if (!hit) break;
          y = hit.y - (hit.h + h) / 2 - 2;
        }
        placed.push({ x: p.x, y, w, h });
        el.style.transform = `translate(${p.x}px, ${y}px) translate(-50%, -100%) scale(${scale})`;
        el.dataset.active = p.active ? "1" : "0";
      }
    };
    pushState(renderer, null, stateRef.current);
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
    const prev = stateRef.current;
    stateRef.current = state;
    if (rendererRef.current) pushState(rendererRef.current, prev, state);
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
      // closer on the far (small) end of the road, but keep both ends in view
      const bySize = Math.max(1.15, Math.min(2.6, 170 / ((a.s + b.s) / 2)));
      const byFit = Math.max(1.15, 900 / (span + 360));
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, zoom: Math.min(bySize, byFit) };
    }
    if (event.kind === "hazard" || event.kind === "shield") {
      const p = path.atKm(player.distance, state.target);
      return { x: p.x, y: p.y, zoom: Math.max(1.5, Math.min(2.6, 230 / p.s)) };
    }
    if (event.kind === "turnChange") {
      const p = path.atKm(player.distance, state.target);
      return { x: p.x, y: p.y, zoom: Math.max(1.2, Math.min(2, 150 / p.s)) };
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
  // the race is over: stay on the finish line for the celebration
  const finishFocus = useMemo<Focus>(() => ({ x: path.finish.x, y: path.finish.y, zoom: Math.max(1.6, Math.min(2.8, 110 / path.finish.s)) }), [path]);
  const focus = state.phase === "gameover" ? finishFocus : (eventFocus ?? held);

  const camera = useMemo(() => {
    if (!cover || !focus) return { x: 0, y: 0, scale: 1, rotateX: 0 };
    const z = focus.zoom;
    // bring the focus point to the middle of the upper two thirds (the hand covers the bottom)
    const fx = cover.left + focus.x * cover.scale;
    const fy = cover.top + focus.y * cover.scale;
    const cx = box.width / 2;
    const cy = Math.max(box.height * 0.3, (box.height - bottomInset) * 0.52);
    let x = cx - fx * z;
    let y = cy - fy * z;
    // never show past the picture's edges
    x = Math.min(-cover.left * z + 0, Math.max(box.width - (cover.left + cover.w) * z, x));
    y = Math.min(-cover.top * z, Math.max(box.height - (cover.top + cover.h) * z, y));
    return { x, y, scale: z, rotateX: 5 };
  }, [cover, focus, box.width, box.height, bottomInset]);

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
      {!loaded ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#ffd23f]" />
        </div>
      ) : null}
      {cover ? (
        <motion.div
          className="absolute left-0 top-0"
          style={{ width: box.width, height: box.height, transformOrigin: "50% 42%" }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ rotateX: camera.rotateX * (focus ? 1 : 0), opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.08 }}
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
              <img
                src={def.image}
                alt=""
                draggable={false}
                ref={(img) => {
                  // cached images may be complete before React attaches onLoad
                  if (img?.complete && img.naturalWidth > 0 && !loaded) queueMicrotask(() => setLoaded(true));
                }}
                onLoad={() => setLoaded(true)}
                className="absolute inset-0 h-full w-full select-none"
              />
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
