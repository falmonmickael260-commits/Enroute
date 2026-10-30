"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, motionValue } from "framer-motion";
import type { AnimationEvent, GameState } from "@/game/types/game";
import { useElementSize } from "@/game/hooks/useElementSize";
import { ScenePath, type SceneDef } from "./scenePath";
import { SceneRenderer, type CarScreenPos } from "./SceneRenderer";
import { PictureStage } from "./PictureStage";
import { CAR_PAINT, pushState } from "./sceneSync";
import { raceAudio } from "@/game/audio/race";
import styles from "./scene.module.css";

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
export { CAR_PAINT };

export function SceneBoard({
  state,
  event,
  def,
  bottomInset = 0,
  intro = false,
  onReady,
}: {
  state: GameState;
  event: AnimationEvent | null;
  def: SceneDef;
  /** Height covered by the hand at the bottom: the start line must stay above it. */
  bottomInset?: number;
  /** Opening countdown for this race. */
  intro?: boolean;
  onReady?: () => void;
}) {
  const path = useMemo(() => new ScenePath(def), [def]);
  const [boxRef, box] = useElementSize<HTMLDivElement>();
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (loaded) onReady?.();
  }, [loaded, onReady]);

  const previousIntro = useRef(intro);
  useEffect(() => {
    if (previousIntro.current && !intro) rendererRef.current?.launchGrid();
    previousIntro.current = intro;
  }, [intro]);

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
  const cameraValues = useMemo(() => ({ x: motionValue(0), y: motionValue(0), scale: motionValue(1) }), []);
  const coverRef = useRef(cover);
  const viewportRef = useRef({ width: box.width, height: box.height, bottomInset });
  const eventRef = useRef(event);

  useEffect(() => {
    coverRef.current = cover;
    viewportRef.current = { width: box.width, height: box.height, bottomInset };
    eventRef.current = event;
  }, [cover, box.width, box.height, bottomInset, event]);

  // create the WebGL layer once the canvas is in the page
  useEffect(() => {
    if (!canvas) return;
    const renderer = new SceneRenderer(canvas, new PictureStage(path));
    renderer.resize(def.width, def.height, 1);
    rendererRef.current = renderer;
    renderer.onFrame = (positions: Map<string, CarScreenPos>) => {
      // stack labels that would overlap, nearest car's label lowest
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      const order = [...positions.entries()].sort((a, b) => b[1].y - a[1].y);
      for (const [id, p] of order) {
        const el = labelRefs.current.get(id);
        if (!el) continue;
        const scale = Math.max(0.45, Math.min(0.9, p.size / 150));
        const w = 118 * scale;
        const h = 38 * scale;
        let y = p.y - p.size * 0.62;
        for (let guard = 0; guard < 6; guard++) {
          const hit = placed.find((q) => Math.abs(q.x - p.x) < (q.w + w) / 2 && Math.abs(q.y - y) < (q.h + h) / 2);
          if (!hit) break;
          y = hit.y - (hit.h + h) / 2 - 2;
        }
        placed.push({ x: p.x, y, w, h });
        el.style.transform = `translate(${p.x}px, ${y}px) translate(-50%, -100%) scale(${scale})`;
        el.dataset.active = p.active ? "1" : "0";
        el.dataset.carX = String(p.x);
        el.dataset.carY = String(p.y);
        el.dataset.carSize = String(p.size);
      }

      // Keep the active car framed during the whole authoritative move. The
      // renderer supplies its interpolated position every frame, so this shot
      // follows real game progress instead of animating toward a fake endpoint.
      const activeEvent = eventRef.current;
      const movingCar = activeEvent?.kind === "move" ? positions.get(activeEvent.playerId) : undefined;
      const frameCover = coverRef.current;
      const viewport = viewportRef.current;
      if (movingCar && frameCover && viewport.width && viewport.height) {
        const zoom = Math.max(1.15, Math.min(2.6, 230 / Math.max(1, movingCar.size / 0.9)));
        const fx = frameCover.left + movingCar.x * frameCover.scale;
        const fy = frameCover.top + movingCar.y * frameCover.scale;
        const cx = viewport.width / 2;
        const cy = Math.max(viewport.height * 0.3, (viewport.height - viewport.bottomInset) * 0.48);
        const wantedX = Math.min(-frameCover.left * zoom, Math.max(viewport.width - (frameCover.left + frameCover.w) * zoom, cx - fx * zoom));
        const wantedY = Math.min(-frameCover.top * zoom, Math.max(viewport.height - (frameCover.top + frameCover.h) * zoom, cy - fy * zoom));
        cameraValues.x.set(cameraValues.x.get() + (wantedX - cameraValues.x.get()) * 0.16);
        cameraValues.y.set(cameraValues.y.get() + (wantedY - cameraValues.y.get()) * 0.16);
      }
    };
    renderer.onMotion = (cars) => raceAudio.motion(cars);
    pushState(renderer, null, stateRef.current);
    return () => {
      renderer.onMotion = null;
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, path, cameraValues]);

  // sharper canvas on dense screens
  useEffect(() => {
    if (!cover) return;
    const q = Math.max(0.8, Math.min(2, (cover.w * (window.devicePixelRatio || 1) * 1.2) / def.width));
    rendererRef.current?.resize(def.width, def.height, q);
  }, [cover, def.width, def.height]);

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
    return { x, y, scale: z, rotateX: 4 };
  }, [cover, focus, box.width, box.height, bottomInset]);

  useEffect(() => {
    const scale = animate(cameraValues.scale, camera.scale, { duration: 0.75, ease: [0.22, 1, 0.36, 1] });
    if (event?.kind === "move") return () => scale.stop();
    const x = animate(cameraValues.x, camera.x, { duration: 1.1, ease: [0.45, 0, 0.2, 1] });
    const y = animate(cameraValues.y, camera.y, { duration: 1.1, ease: [0.45, 0, 0.2, 1] });
    return () => { scale.stop(); x.stop(); y.stop(); };
  }, [camera, cameraValues, event?.kind]);

  const start = path.start;
  const startHalfWidth = start.s * 1.45;
  const startAngle = (Math.atan2(start.tx, -start.ty) * 180) / Math.PI;
  const finish = path.finish;
  const finishHalfWidth = finish.s * 1.45;
  const finishAngle = (Math.atan2(finish.tx, -finish.ty) * 180) / Math.PI;

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden" style={{ perspective: 1000 }}>
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
            data-race-camera
            className="absolute left-0 top-0"
            style={{ width: box.width, height: box.height, transformOrigin: "0 0", x: cameraValues.x, y: cameraValues.y, scale: cameraValues.scale }}
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
                <svg
                  aria-hidden="true"
                  viewBox={`0 0 ${def.width} ${def.height}`}
                  preserveAspectRatio="none"
                  className={styles.water}
                >
                  <defs>
                    <clipPath id="coastal-water">
                      <path d="M700 300 C800 285 938 300 1024 330 L1024 820 C980 792 946 748 910 708 C872 666 836 622 800 584 C770 548 756 498 735 458 C720 422 700 366 700 300 Z" />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#coastal-water)">
                    <path className={styles.waterWave} d="M900 252 C937 242 968 258 1025 244 M944 316 C970 306 990 321 1030 310 M914 390 C949 380 979 399 1032 385 M898 472 C936 460 971 480 1031 466 M890 555 C932 545 969 565 1032 551 M906 650 C944 638 978 659 1032 646 M897 750 C936 738 976 760 1034 745 M882 856 C926 844 970 865 1035 851 M860 970 C914 958 965 980 1036 965 M864 1082 C918 1070 970 1092 1037 1078 M874 1200 C925 1188 973 1210 1036 1195 M892 1320 C936 1308 979 1330 1038 1316 M894 1432 C940 1420 984 1442 1036 1428" />
                    <path className={`${styles.waterWave} ${styles.waterWaveSoft}`} d="M920 276 C953 267 984 283 1030 270 M930 430 C962 420 992 438 1031 425 M908 604 C949 594 981 612 1032 600 M914 806 C953 796 987 814 1035 802 M880 1030 C927 1020 978 1038 1037 1026 M896 1250 C940 1240 982 1258 1037 1246 M910 1460 C950 1450 991 1468 1036 1456" />
                  </g>
                </svg>
                <svg
                  aria-label="Ligne de départ"
                  role="img"
                  viewBox={`0 0 ${def.width} ${def.height}`}
                  preserveAspectRatio="none"
                  className={`${styles.startLine} absolute inset-0 h-full w-full ${intro ? styles.startLineIntro : ""}`}
                >
                  <defs>
                    <pattern id="start-checkers" width="32" height="40" patternUnits="userSpaceOnUse">
                      <rect width="32" height="40" fill="#f7f4e8" />
                      <path d="M0 0h16v20H0zM16 20h16v20H16z" fill="#171b22" />
                    </pattern>
                  </defs>
                  <g transform={`translate(${start.x} ${start.y}) rotate(${startAngle})`}>
                    <rect
                      x={-startHalfWidth}
                      y={-20}
                      width={startHalfWidth * 2}
                      height={40}
                      rx={3}
                      fill="url(#start-checkers)"
                      stroke="#fff"
                      strokeWidth={4}
                    />
                    <path d={`M${-startHalfWidth} 24 H${startHalfWidth}`} stroke="rgba(0,0,0,.7)" strokeWidth={8} />
                  </g>
                </svg>
                <svg
                  aria-label="Ligne d'arrivée"
                  role="img"
                  viewBox={`0 0 ${def.width} ${def.height}`}
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                >
                  <defs>
                    <pattern id="finish-checkers" width="24" height="24" patternUnits="userSpaceOnUse">
                      <rect width="24" height="24" fill="#f7f4e8" />
                      <path d="M0 0h12v12H0zM12 12h12v12H12z" fill="#171b22" />
                    </pattern>
                  </defs>
                  <g transform={`translate(${finish.x} ${finish.y}) rotate(${finishAngle})`}>
                    <rect
                      x={-finishHalfWidth}
                      y={-14}
                      width={finishHalfWidth * 2}
                      height={28}
                      fill="url(#finish-checkers)"
                      stroke="#fff"
                      strokeWidth={3}
                    />
                    <text
                      x={0}
                      y={-20}
                      textAnchor="middle"
                      fill="#fff"
                      stroke="rgba(8, 14, 24, .9)"
                      strokeWidth={5}
                      paintOrder="stroke"
                      fontFamily="sans-serif"
                      fontSize={20}
                      fontWeight={800}
                      letterSpacing={2}
                    >
                      ARRIVÉE
                    </text>
                  </g>
                </svg>
                <canvas ref={setCanvas} className="pointer-events-none absolute inset-0 h-full w-full" />
                {state.players.map((p, i) => (
                  <div
                    key={p.id}
                    data-car-label={p.id}
                    data-car-id={p.car ?? ""}
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
