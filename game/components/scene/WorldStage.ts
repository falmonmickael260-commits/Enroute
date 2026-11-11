import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { finishTexture, createBoatWakes } from "./coastalFinish";
import { createAirShow } from "./airShow";
import { createRoadsideCrowd, placeSpectators } from "./roadsideCrowd";
import { createDistanceSign, createFinishBanner, decorateStartGantry, createChevronParts, checkerLineTexture, disposeSignGroup } from "./roadFurniture";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createSailboatParts, createSeaMaterial } from "./coastalMarine";
import { buildCoastalVillage, selectVillageHouses } from "./coastalArchitecture";
import type { Placement, ScreenPoint, Shot, Stage, StageCar } from "./stage";
import { branchingTrunk, treeCrown, layeredCypress, sculptedRock, buildWildPlants } from "./coastalNature";
import { arrangeVegetation, mountainRange, inlandFoothills, buildVillageGardens, buildGroveBackdrop, groveDensity } from "./coastalLandscape";
import type { AmbianceId } from "@/game/types/game";

/**
 * A small Mediterranean coast built in 3D: a winding road with red and white
 * kerbs runs along cliffs above a turquoise sea, over a stone viaduct and
 * past a village of cream houses with terracotta roofs, cypresses and pines,
 * with mountains in the haze. Units: 1 = one car length.
 *
 * The camera stays behind the active vehicle, looking down the road.
 * Intro, attacks, shortcuts and the finish retain their animated effects
 * without changing to overhead or frontal views.
 */

// ---------------------------------------------------------------- the road

const ROAD_POINTS: [number, number, number][] = [
  [0, 0, 26],
  [0, 0, 12], // start line
  [4, 0, 2],
  [8, 0, -9],
  [5, 0, -21],
  [-2, 0, -31],
  [-4, 0.2, -43],
  [1, 0.8, -55],
  [9, 1.6, -65], // viaduct over the cove
  [13, 1.8, -77],
  [12, 1.4, -90],
  [6, 0.8, -102],
  [2, 0.6, -114],
  [5, 0.6, -126], // finish line
  [11, 0.6, -134],
  [17, 0.6, -140],
];
const START_INDEX = 1;
const FINISH_INDEX = 13;
const HALF_WIDTH = 2;
/** Lane offsets come in car lengths for a 2.7-wide road; the road is wider now. */
const LANE_SCALE = 1.7;
const SEA_LEVEL = -1.4;

/** Where the cliffs meet the sea, as x for a given z (the sea is on the right). */
function coastX(z: number) {
  return 12.5 + 2.6 * Math.sin(z / 13) + 1.4 * Math.sin(z / 5.3) - coveAt(z) * 9;
}

/** 0..1: how deep into the inlet the viaduct crosses. */
function coveAt(z: number) {
  return Math.exp(-Math.pow((z + 76) / 16, 2));
}

// deterministic randomness so the scenery is the same for everyone
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise2(x: number, z: number) {
  return (
    Math.sin(x * 0.21 + z * 0.13) * 0.5 +
    Math.sin(x * 0.07 - z * 0.11 + 1.7) * 0.8 +
    Math.sin(x * 0.53 + z * 0.41 + 0.3) * 0.18
  );
}

class Road {
  readonly pts: THREE.Vector3[] = [];
  readonly len: number[] = [];
  readonly startLen: number;
  readonly finishLen: number;

  constructor() {
    const curve = new THREE.CatmullRomCurve3(ROAD_POINTS.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.5);
    const n = (ROAD_POINTS.length - 1) * 60;
    let startLen = 0;
    let finishLen = 0;
    for (let i = 0; i <= n; i++) {
      const p = curve.getPoint(i / n);
      const prev = this.pts[this.pts.length - 1];
      this.len.push(prev ? this.len[this.len.length - 1] + prev.distanceTo(p) : 0);
      this.pts.push(p);
      if (i === START_INDEX * 60) startLen = this.len[i];
      if (i === FINISH_INDEX * 60) finishLen = this.len[i];
    }
    this.startLen = startLen;
    this.finishLen = finishLen;
  }

  get total() {
    return this.len[this.len.length - 1];
  }

  /** Point, forward and right vectors at a length along the road. */
  at(l: number) {
    const L = this.len;
    const clamped = Math.max(0, Math.min(L[L.length - 1], l));
    let lo = 1;
    let hi = L.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (L[mid] < clamped) lo = mid + 1;
      else hi = mid;
    }
    const a = this.pts[lo - 1];
    const b = this.pts[lo];
    const t = (clamped - L[lo - 1]) / (L[lo] - L[lo - 1] || 1);
    const point = a.clone().lerp(b, t);
    const forward = b.clone().sub(a).setY(0).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    return { point, forward, right };
  }

  kmToLen(km: number, target: number) {
    return this.startLen + (this.finishLen - this.startLen) * (target > 0 ? km / target : 0);
  }

  /** Horizontal distance from (x, z) to the road and the road height there. */
  nearest(x: number, z: number) {
    let best = Infinity;
    let y = 0;
    for (let i = 0; i < this.pts.length; i += 3) {
      const p = this.pts[i];
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < best) {
        best = d;
        y = p.y;
      }
    }
    return { dist: Math.sqrt(best), y };
  }
}

// ---------------------------------------------------------------- textures

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const asphaltTexture = () =>
  canvasTexture(256, 512, (g) => {
    // Fresh motorway asphalt: neutral black with fine, low-contrast aggregate.
    g.fillStyle = "#111315";
    g.fillRect(0, 0, 256, 512);
    const r = rng(7);
    for (let i = 0; i < 6400; i++) {
      g.fillStyle = r() > 0.45
        ? `rgba(180,181,178,${0.015 + r() * 0.025})`
        : `rgba(0,0,0,${0.04 + r() * 0.04})`;
      g.fillRect(r() * 256, r() * 512, 0.7, 0.7);
    }
    // Very restrained wheel tracks; the surface stays visually continuous.
    for (const x of [52, 92, 164, 204]) {
      const grad = g.createLinearGradient(x - 16, 0, x + 16, 0);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.5, "rgba(0,0,0,0.045)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;g.fillRect(x - 16, 0, 32, 512);
    }
    // edge lines and the dashed centre line
    g.fillStyle = "#f4f4ef";
    g.fillRect(7, 0, 6, 512);
    g.fillRect(243, 0, 6, 512);
    g.fillStyle = "#fff6d8";
    g.fillRect(125, 0, 6, 220);
    g.fillRect(125, 256, 6, 220);
  });

/** Soft ripples on the sea (multiplies its colour). */
const rippleTexture = () =>
  canvasTexture(128, 128, (g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 128, 128);
    const r = rng(31);
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(10,70,110,${0.03 + r() * 0.06})`;
      g.lineWidth = 0.8 + r() * 1.6;
      const x = r() * 128;
      const y = r() * 128;
      g.beginPath();
      g.arc(x, y, 3 + r() * 14, Math.PI * (1.05 + r() * 0.2), Math.PI * (1.6 + r() * 0.3));
      g.stroke();
    }
  });

/** Sun glints: a few bright specks on black, used as glow. */
const glintTexture = () =>
  canvasTexture(128, 128, (g) => {
    g.fillStyle = "#000000";
    g.fillRect(0, 0, 128, 128);
    const r = rng(32);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.5})`;
      g.fillRect(r() * 128, r() * 128, 2 + r() * 3, 1);
    }
  });

const kerbTexture = () =>
  canvasTexture(16, 64, (g) => {
    g.fillStyle = "#f4f2ec";
    g.fillRect(0, 0, 16, 64);
    g.fillStyle = "#df3b30";
    g.fillRect(0, 0, 16, 32);
  });

const skyTexture = ([top, middle, horizon]: readonly [string, string, string]) =>
  canvasTexture(
    2,
    256,
    (g) => {
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, top);
      grad.addColorStop(0.55, middle);
      grad.addColorStop(1, horizon);
      g.fillStyle = grad;
      g.fillRect(0, 0, 2, 256);
    },
    false,
  );

// ---------------------------------------------------------------- geometry helpers

/** A strip following the road between two lateral offsets, at a height above it. */
function ribbon(road: Road, from: number, to: number, lift: number, vScale: number, fromLen = 0, toLen = road.total) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  let row = 0;
  for (let i = 0; i < road.pts.length; i += 2) {
    const l = road.len[i];
    if (l < fromLen || l > toLen) continue;
    const { point, right } = road.at(l);
    for (const [k, u] of [
      [from, 0],
      [to, 1],
    ]) {
      positions.push(point.x + right.x * k, point.y + lift, point.z + right.z * k);
      uvs.push(u, l / vScale);
    }
    if (row > 0) {
      const a = (row - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    row++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** A solid block following the road: lateral offsets [left, right], heights [bottom, top] above it. */
function slab(road: Road, fromLen: number, toLen: number, left: number, right: number, bottom: number, top: number) {
  const corners: [number, number][] = [
    [left, bottom],
    [left, top],
    [right, top],
    [right, bottom],
  ];
  const positions: number[] = [];
  const index: number[] = [];
  const rows: { point: THREE.Vector3; right: THREE.Vector3 }[] = [];
  for (let l = fromLen; l < toLen; l += 0.3) rows.push(road.at(l));
  rows.push(road.at(toLen));
  const vertex = (r: { point: THREE.Vector3; right: THREE.Vector3 }, [k, y]: [number, number]) =>
    positions.push(r.point.x + r.right.x * k, r.point.y + y, r.point.z + r.right.z * k);
  // four long faces, each with its own vertices so the edges stay sharp
  for (let f = 0; f < 4; f++) {
    const base = positions.length / 3;
    rows.forEach((r, i) => {
      vertex(r, corners[f]);
      vertex(r, corners[(f + 1) % 4]);
      if (i > 0) {
        const a = base + (i - 1) * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
  }
  // the two ends
  for (const r of [rows[0], rows[rows.length - 1]]) {
    const base = positions.length / 3;
    corners.forEach((c) => vertex(r, c));
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, items: { m: THREE.Matrix4; c?: THREE.Color }[], shadows = true) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  items.forEach((it, i) => {
    mesh.setMatrixAt(i, it.m);
    if (it.c) mesh.setColorAt(i, it.c);
  });
  mesh.count = items.length;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

const mat4 = (x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
    new THREE.Vector3(sx, sy, sz),
  );

/**
 * Layers laid flat on one another (sea and shallows, ground and road, road and
 * paint) are a few centimetres apart: on phones with a coarse depth buffer they
 * would flicker into each other in the distance. Polygon offset keeps the order
 * whatever the precision.
 */
const BEHIND = { polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 } as const;
const IN_FRONT = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 } as const;

const SUN_SNAP = new THREE.Vector3();

/** How the coast looks at each time of day (the ambiance picked for the game). */
interface Look {
  sky: readonly [string, string, string];
  fog: readonly [string, number, number];
  hemi: readonly [string, string, number];
  /** Sun (or moon): colour, intensity, where it shines from relative to the view. */
  sun: readonly [string, number, readonly [number, number, number]];
  exposure: number;
  env: number;
  sea: string;
  shallows: string;
  glints: readonly [string, number];
  clouds: readonly [string, number];
  /** Street lamps, windows and headlights: 0 = off (day) … 1 = full night. */
  lights: number;
  /** A disc in the sky where the light comes from: the low sun or the moon. */
  disc: readonly [string, number] | null;
  stars: boolean;
}

const LOOKS: Record<AmbianceId, Look> = {
  jour: {
    sky: ["#2f86dc", "#8cc6ee", "#dceff8"],
    fog: ["#cfe6f2", 70, 320],
    hemi: ["#dcecff", "#6c7660", 1.18],
    sun: ["#fff0d8", 1.72, [-26, 40, 18]],
    exposure: 0.95,
    env: 0.35,
    sea: "#16a2c9",
    shallows: "#5fd4d8",
    glints: ["#ffffff", 0.55],
    clouds: ["#ffffff", 0.35],
    lights: 0,
    disc: null,
    stars: false,
  },
  crepuscule: {
    sky: ["#3b3f7c", "#e88a6c", "#ffc98e"],
    fog: ["#eea283", 60, 280],
    hemi: ["#ffd3b4", "#4e4038", 0.6],
    sun: ["#ffad66", 2.2, [42, 15, -40]],
    exposure: 0.95,
    env: 0.22,
    sea: "#3a8fb8",
    shallows: "#6fc2c6",
    glints: ["#ffc890", 1],
    clouds: ["#ffc2a8", 0.45],
    lights: 0.5,
    disc: ["#ffd08a", 26],
    stars: false,
  },
  nuit: {
    sky: ["#040817", "#0e1b3d", "#26365f"],
    fog: ["#111b38", 45, 240],
    hemi: ["#4a62a6", "#141a28", 0.95],
    sun: ["#b4c6ff", 1.15, [-22, 30, -42]],
    exposure: 1.15,
    env: 0.04,
    sea: "#123a5e",
    shallows: "#1d5670",
    glints: ["#cfdcff", 0.3],
    clouds: ["#59627e", 0.04],
    lights: 1,
    disc: ["#f6f2de", 10],
    stars: true,
  },
};

/** A soft round glow (for light pools, halos, headlight beams). */
const glowTexture = (falloff = 1) =>
  canvasTexture(
    64,
    64,
    (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35 * falloff, "rgba(255,255,255,0.45)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    },
    false,
  );

// ---------------------------------------------------------------- the stage

export class WorldStage implements Stage {
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.3, 700);
  private readonly look: Look;
  private readonly sunOffset: THREE.Vector3;
  private readonly sunToWorld: THREE.Matrix4;
  private readonly sunFromWorld: THREE.Matrix4;
  /** Headlight beams and lamps, one set per car (night and dusk). */
  private headlights = new Map<string, THREE.Group>();
  /** Stars and the sun or moon disc: far away, they travel with the camera. */
  private sky: THREE.Group | null = null;
  private headlightParts: { beam: THREE.MeshBasicMaterial; lamp: THREE.SpriteMaterial; beamGeo: THREE.PlaneGeometry } | null = null;

  constructor(ambiance: AmbianceId = "jour") {
    this.look = LOOKS[ambiance] ?? LOOKS.jour;
    this.sunOffset = new THREE.Vector3(...this.look.sun[2]);
    this.sunToWorld = new THREE.Matrix4().lookAt(this.sunOffset, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    this.sunFromWorld = this.sunToWorld.clone().transpose();
  }

  readonly castShadows = true;
  private readonly road = new Road();
  private sun = new THREE.DirectionalLight("#ffffff", 1);
  private width = 1;
  private height = 1;
  private virtualHeight = 1;
  private shot: Shot = { kind: "pack" };
  private camPos = new THREE.Vector3(0, 6, 36);
  private camLook = new THREE.Vector3(0, 0, 0);
  private placed = false;
  private cameraFocus: string | null = null;
  private shotSince = 0;
  /** Scratch camera to test a framing before using it. */
  private readonly probe = new THREE.PerspectiveCamera();
  /** Which side of the car the current close-up films (picked on its first frame). */
  /** The driving style the chase cam last framed (an overtake gets its own angle). */
  /** Camera shake: when it started and how hard. */
  private shake = { at: 0, amp: 0 };
  private baseFov = 50;
  private fovKick = 0;
  /** Stretches of road carried by the viaduct (no ground under them). */
  private bridges: [number, number][] = [];
  private readonly disposables: { dispose: () => void }[] = [];
  private finishTarget = 1000;
  private signs: THREE.Group | null = null;
  private scene: THREE.Scene | null = null;

  init(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.scene = scene;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const look = this.look;
    const sky = skyTexture(look.sky);
    scene.background = sky;
    scene.fog = new THREE.Fog(look.fog[0], look.fog[1], look.fog[2]);
    this.disposables.push(sky);

    // the studio reflections are for the cars' paint; keep them off the landscape
    scene.environmentIntensity = look.env;
    renderer.toneMappingExposure = look.exposure;
    scene.add(new THREE.HemisphereLight(look.hemi[0], look.hemi[1], look.hemi[2]));
    this.sun.color.set(look.sun[0]);
    this.sun.intensity = look.sun[1];
    this.sun.position.copy(this.sunOffset);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -28;
    sc.right = 28;
    sc.top = 28;
    sc.bottom = -28;
    sc.near = 1;
    sc.far = 140;
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.normalBias = 0.08;
    this.sun.shadow.radius = 2;
    scene.add(this.sun, this.sun.target);

    this.bridges = this.findBridges();
    this.buildTerrain(scene);
    this.buildSea(scene);
    this.buildRoad(scene);
    this.buildViaduct(scene);
    this.buildScenery(scene);
    this.buildMountainsAndClouds(scene);
    this.buildStartAndFinish(scene);
    this.buildRoadside(scene);
    this.buildGulls(scene);
    this.buildCelebration(scene);
    this.buildLighthouse(scene);
    this.buildSky(scene);
    this.airShow = createAirShow(scene,coastX);this.disposables.push(this.airShow);
    this.wakes = createBoatWakes(scene,this.boats,SEA_LEVEL);this.disposables.push(this.wakes);
  }

  // ------------------------------------------------------------ world building

  private terrainHeight(x: number, z: number) {
    const { dist, y: roadY } = this.road.nearest(x, z);
    // hills rise inland (to the left), cliffs drop into the sea on the right
    const original = Math.max(0, -x - 4) * 0.32 + Math.max(0, noise2(x, z)) * 2.2 + 0.3;
    const rolling = Math.max(0, -x - 4) * 0.23 + (noise2(x * 0.38, z * 0.38) + 1.5) * 0.8 + Math.max(0, noise2(x, z)) * 0.7;
    const inland = THREE.MathUtils.lerp(original, rolling, THREE.MathUtils.smoothstep(dist, HALF_WIDTH + 5, HALF_WIDTH + 10));
    const flat = THREE.MathUtils.smoothstep(dist, HALF_WIDTH + 1.4, HALF_WIDTH + 7);
    let h = THREE.MathUtils.lerp(roadY - 0.1, roadY + inland, flat);
    const toSea = x - coastX(z);
    if (toSea > -1.5) {
      // the road keeps solid ground under it where it skirts the cliff; only the
      // viaduct over the inlet crosses open water
      const bed = (1 - THREE.MathUtils.smoothstep(dist, HALF_WIDTH + 2.2, HALF_WIDTH + 5)) * (1 - THREE.MathUtils.smoothstep(coveAt(z), 0.15, 0.4));
      const freedom = THREE.MathUtils.smoothstep(dist, HALF_WIDTH + 5, HALF_WIDTH + 9);
      const erosion = freedom * (Math.sin(z * 0.43) * 0.2 + Math.sin(z * 0.91 + 1.4) * 0.1);
      const drop = THREE.MathUtils.smoothstep(toSea + erosion, -1.5, 1.5) * (1 - bed);
      h = THREE.MathUtils.lerp(h, SEA_LEVEL - 2.5, drop);
    }
    return h;
  }

  private buildTerrain(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(150, 250, 150, 250);
    geo.rotateX(-Math.PI / 2);
    geo.translate(-5, 0, -60);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const grass = new THREE.Color("#71934b");
    const olive = new THREE.Color("#a49b6c");
    const groveShade = new THREE.Color("#57714b");
    const rock = new THREE.Color("#d2c3a1");
    const sand = new THREE.Color("#ecdcae");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.terrainHeight(x, z);
      pos.setY(i, h);
      const n = noise2(x * 0.4, z * 0.4);
      c.copy(grass).lerp(olive, THREE.MathUtils.clamp(0.3 + 0.22 * n, 0.08, 0.6));
      c.lerp(groveShade,groveDensity(x,z)*.18);
      const toSea = x - coastX(z);
      if (toSea > -3.4) {
        const strata = 0.5 + 0.5 * Math.sin(h * 5 + z * 0.12);
        rock.set("#c8b692").lerp(new THREE.Color("#e1d4b6"), strata * 0.35);
        c.lerp(rock, THREE.MathUtils.smoothstep(toSea, -3.4, -0.3));
      }
      if (h < SEA_LEVEL + 0.35 && toSea > -1) c.copy(sand);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    // drawn a hair behind what lies on it, so the road never flickers through the grass
    const ground = canvasTexture(128, 128, (g) => {
      g.fillStyle = "#eeeadd";
      g.fillRect(0, 0, 128, 128);
      const grain = rng(725);
      for (let i = 0; i < 1300; i++) {
        g.fillStyle = i % 3 ? "rgba(63,70,33,0.045)" : "rgba(255,255,235,0.14)";
        g.fillRect(grain() * 128, grain() * 128, 1, 1 + grain() * 2);
      }
    });
    ground.repeat.set(45, 75);
    this.disposables.push(ground);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: ground, vertexColors: true, roughness: 0.95, ...BEHIND }));
    mesh.receiveShadow = true;
    scene.add(mesh);
    this.disposables.push(geo, mesh.material as THREE.Material);
  }

  private buildSea(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(400, 400, 128, 128);
    geo.rotateX(-Math.PI / 2);
    // ripples drift one way and the sun glints sparkle the other
    const ripples = rippleTexture();
    const glints = glintTexture();
    ripples.repeat.set(37, 41);
    glints.repeat.set(70, 70);
    this.seaMaps = [ripples, glints];
    this.water = createSeaMaterial(this.look.sea, ripples, glints, this.look.glints[0], this.look.glints[1]);
    const sea = new THREE.Mesh(geo, this.water.material);
    this.disposables.push(this.water.normalMap);
    sea.position.set(120, SEA_LEVEL, -80);
    sea.receiveShadow = true;
    scene.add(sea);
    const waterFade = canvasTexture(128, 4, (g) => {
      const fade = g.createLinearGradient(0, 0, 128, 0);
      fade.addColorStop(0, "white"); fade.addColorStop(0.55, "#999999"); fade.addColorStop(1, "black");
      g.fillStyle = fade; g.fillRect(0, 0, 128, 4);
    }, false);
    this.disposables.push(waterFade);
    // lighter shallows along the shore
    const shallow = new THREE.Mesh(
      ribbonCoast(),
      new THREE.MeshStandardMaterial({ color: this.look.shallows, alphaMap: waterFade, roughness: 0.2, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }),
    );
    const shallowUvs: number[] = [];
    const shallowPosition = shallow.geometry.attributes.position;
    for (let i = 0; i < shallowPosition.count; i++) shallowUvs.push(i % 2, 0.5);
    shallow.geometry.setAttribute("uv", new THREE.Float32BufferAttribute(shallowUvs, 2));
    shallow.position.y = SEA_LEVEL + 0.02;
    scene.add(shallow);
    this.disposables.push(geo, ripples, glints, sea.material as THREE.Material, shallow.geometry, shallow.material as THREE.Material);
    const foam = canvasTexture(128, 256, (g) => {
      g.fillStyle = "#000000"; g.fillRect(0, 0, 128, 256);
      for (let y = -20; y < 280; y += 32) {
        g.strokeStyle = "#515151"; g.lineWidth = 5;
        g.beginPath(); g.moveTo(0, y + 8);
        g.bezierCurveTo(28, y - 10, 70, y + 30, 110, y + 5); g.stroke();
        g.strokeStyle = "#ffffff"; g.lineWidth = 1.5; g.stroke();
      }
    });
    foam.repeat.set(1, 30);
    this.seaMaps.push(foam);
    const shore = ribbonCoast();
    const position = shore.attributes.position as THREE.BufferAttribute;
    const shoreUvs: number[] = [];
    for (let i = 0; i < position.count; i++) {
      const z = position.getZ(i);
      position.setX(i, coastX(z) + (i % 2 ? 3.4 : 0.6));
      shoreUvs.push(i % 2, (40 - z) / 260);
    }
    shore.setAttribute("uv", new THREE.Float32BufferAttribute(shoreUvs, 2));
    const foamMaterial = new THREE.MeshBasicMaterial({ color: "#f5ffff", alphaMap: foam, transparent: true, opacity: 0.46, depthWrite: false, side: THREE.DoubleSide });
    this.shoreFoam=foamMaterial;
    const foamMesh = new THREE.Mesh(shore, foamMaterial);
    foamMesh.position.y = SEA_LEVEL + 0.045;
    scene.add(foamMesh);
    this.disposables.push(foam, shore, foamMaterial);
  }

  private buildRoad(scene: THREE.Scene) {
    const asphalt = asphaltTexture();
    const kerb = kerbTexture();
    const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.96, metalness: 0, envMapIntensity: 0.08 });
    const kerbMat = new THREE.MeshStandardMaterial({ map: kerb, roughness: 0.6 });
    const aggregate = finishTexture('grain'), gravel = finishTexture('gravel');
    aggregate.repeat.set(2,16);gravel.repeat.set(1,4);roadMat.bumpMap=aggregate;roadMat.bumpScale=.0025;
    this.disposables.push(aggregate,gravel);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: "#c9c1ac", map: gravel, bumpMap: gravel, bumpScale:.008, roughness: 1 });
    const parts: [THREE.BufferGeometry, THREE.Material][] = [
      [ribbon(this.road, -HALF_WIDTH, HALF_WIDTH, 0.03, 10), roadMat],
      [ribbon(this.road, HALF_WIDTH, HALF_WIDTH + 0.28, 0.05, 1.6), kerbMat],
      [ribbon(this.road, -HALF_WIDTH - 0.28, -HALF_WIDTH, 0.05, 1.6), kerbMat],
      [ribbon(this.road, HALF_WIDTH + 0.28, HALF_WIDTH + 1.1, 0.02, 4), shoulderMat],
      [ribbon(this.road, -HALF_WIDTH - 1.1, -HALF_WIDTH - 0.28, 0.02, 4), shoulderMat],
    ];
    for (const [geo, material] of parts) {
      const mesh = new THREE.Mesh(geo, material);
      mesh.receiveShadow = true;
      scene.add(mesh);
      this.disposables.push(geo);
    }
    // the verges' outer edges reach down into the ground: no sliver of light under the road on slopes
    const skirtMat = new THREE.MeshStandardMaterial({ color: "#c9b78c", roughness: 1, side: THREE.DoubleSide });
    for (const k of [-1, 1]) {
      const skirt = new THREE.Mesh(railBand(this.road, k * (HALF_WIDTH + 1.1), -0.45, 0.02), skirtMat);
      skirt.receiveShadow = true;
      scene.add(skirt);
      this.disposables.push(skirt.geometry);
    }
    this.disposables.push(asphalt, kerb, roadMat, kerbMat, shoulderMat, skirtMat);

    // guard rail on the sea side
    const railGeo = railBand(this.road, HALF_WIDTH + 0.95, 0.32, 0.5);
    const rail = new THREE.Mesh(railGeo, new THREE.MeshStandardMaterial({ color: "#b6c1c6", metalness: 0.62, roughness: 0.43, side: THREE.DoubleSide }));
    rail.castShadow = true;
    scene.add(rail);
    const posts: { m: THREE.Matrix4 }[] = [];
    for (let l = 2; l < this.road.total; l += 2.2) {
      const { point, right } = this.road.at(l);
      posts.push({ m: mat4(point.x + right.x * (HALF_WIDTH + 0.95), point.y + 0.25, point.z + right.z * (HALF_WIDTH + 0.95), 0.08, 0.5, 0.08) });
    }
    const postMesh = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#8d939b", metalness: 0.5, roughness: 0.4 }), posts);
    scene.add(postMesh);
    this.disposables.push(railGeo, rail.material as THREE.Material, postMesh.geometry, postMesh.material as THREE.Material);

    // low stone wall on the hill side
    const walls: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const r = rng(11);
    for (let l = 4; l < this.road.total; l += 1.6) {
      if (Math.sin(l / 9) < 0.1 || this.onBridge(l)) continue;
      const { point, right, forward } = this.road.at(l);
      const k = -(HALF_WIDTH + 1.35);
      walls.push({
        m: mat4(point.x + right.x * k, point.y + 0.25, point.z + right.z * k, 0.35, 0.5, 1.7, Math.atan2(forward.x, forward.z)),
        c: new THREE.Color().setHSL(0.1, 0.25, 0.7 + r() * 0.08),
      });
    }
    const masonry = finishTexture('stone');this.disposables.push(masonry);
    const wallMesh = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map:masonry, bumpMap:masonry, bumpScale:.016, roughness: 0.95 }), walls);
    const capMesh = instanced(new RoundedBoxGeometry(1,1,1,1,.04),new THREE.MeshStandardMaterial({color:'#c6bca5',map:masonry,roughness:.94}),walls.map(w=>({m:w.m.clone().multiply(new THREE.Matrix4().makeTranslation(0,.56,0)).multiply(new THREE.Matrix4().makeScale(1.15,.11,1.04))})));
    scene.add(capMesh);this.disposables.push(capMesh.geometry,capMesh.material as THREE.Material);
    scene.add(wallMesh);
    this.disposables.push(wallMesh.geometry, wallMesh.material as THREE.Material);
  }

  /** Lengths of road with open air under them (the ground drops away below the verge). */
  private findBridges() {
    const out: [number, number][] = [];
    const edge = HALF_WIDTH + 1.1;
    for (let l = 0; l <= this.road.total; l += 0.25) {
      const { point, right } = this.road.at(l);
      const open = [-edge, 0, edge].some((k) => this.terrainHeight(point.x + right.x * k, point.z + right.z * k) < point.y - 0.3);
      if (!open) continue;
      const last = out[out.length - 1];
      if (last && l - last[1] <= 1) last[1] = l;
      else out.push([l, l]);
    }
    // run a little into the hillside at both ends
    return out.map(([a, b]): [number, number] => [Math.max(0, a - 1.5), Math.min(this.road.total, b + 1.5)]);
  }

  private onBridge(l: number) {
    return this.bridges.some(([a, b]) => l >= a && l <= b);
  }

  private buildViaduct(scene: THREE.Scene) {
    const stone = new THREE.MeshStandardMaterial({ color: "#d8c7a4", roughness: 0.9 });
    const deckStone = new THREE.MeshStandardMaterial({ color: "#d8c7a4", roughness: 0.9, side: THREE.DoubleSide, ...BEHIND });
    const piers: { m: THREE.Matrix4 }[] = [];
    const arches: { m: THREE.Matrix4 }[] = [];
    const step = 5;
    for (let l = 0; l < this.road.total; l += step) {
      const { point, forward } = this.road.at(l);
      const ground = this.terrainHeight(point.x, point.z);
      if (ground > point.y - 1.2) continue;
      const bottom = Math.max(SEA_LEVEL - 1, ground);
      const h = point.y - bottom;
      const yaw = Math.atan2(forward.x, forward.z);
      piers.push({ m: mat4(point.x, bottom + h / 2 - 0.3, point.z, HALF_WIDTH * 2 + 1.6, h, 1.1, yaw) });
      const mid = this.road.at(l + step / 2);
      arches.push({
        m: new THREE.Matrix4().compose(
          new THREE.Vector3(mid.point.x, mid.point.y - 0.55, mid.point.z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(mid.forward.x, mid.forward.z) + Math.PI / 2, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      });
    }
    const archGeo = new THREE.TorusGeometry(step / 2 - 0.4, 0.35, 6, 14, Math.PI);
    archGeo.rotateZ(Math.PI);
    archGeo.scale(1, 1.3, HALF_WIDTH * 2 + 2.8);
    const meshes: THREE.Mesh[] = [instanced(new THREE.BoxGeometry(1, 1, 1), stone, piers), instanced(archGeo, stone, arches)];
    // the deck follows the road exactly (slope and bends), wide enough to carry the
    // verges and the rail, with a low parapet on the hill side
    const deckEdge = HALF_WIDTH + 1.2;
    for (const [a, b] of this.bridges) {
      for (const geo of [slab(this.road, a, b, -deckEdge, deckEdge, -0.6, -0.01), slab(this.road, a, b, -deckEdge, -deckEdge + 0.22, -0.01, 0.3)]) {
        const mesh = new THREE.Mesh(geo, deckStone);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes.push(mesh);
      }
    }
    meshes.forEach((m) => scene.add(m));
    this.disposables.push(stone, deckStone, ...meshes.map((m) => m.geometry));
  }

  private buildScenery(scene: THREE.Scene) {
    const r = rng(20260929);
    const detail = rng(731);
    const cypress: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const pines: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const trunks: { m: THREE.Matrix4 }[] = [];
    const bushes: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const boats: { m: THREE.Matrix4 }[] = [];
    const houses: { x: number; y: number; z: number; w: number; h: number; d: number; yaw: number }[] = [];

    const free = (x: number, z: number, margin: number) => {
      if (x > coastX(z) - 1.2) return false;
      return this.road.nearest(x, z).dist > HALF_WIDTH + margin;
    };

    // villages on the hillside, like the picture
    const villages = [
      { x: -14, z: -30, n: 16, spread: 9 },
      { x: -12, z: -62, n: 14, spread: 8 },
      { x: -6, z: -120, n: 12, spread: 8 },
      { x: 20, z: -140, n: 6, spread: 5 },
      { x: -10, z: 4, n: 7, spread: 6 },
    ];
    for (const v of villages) {
      for (let i = 0; i < v.n * 3 && houses.length < 70; i++) {
        const x = v.x + (r() - 0.5) * 2 * v.spread;
        const z = v.z + (r() - 0.5) * 2 * v.spread;
        if (!free(x, z, 3.2)) continue;
        const y = this.terrainHeight(x, z);
        const w = 1.6 + r() * 1.4;
        const d = 1.4 + r() * 1.2;
        const h = 1.3 + (r() < 0.4 ? 1.1 : 0) + r() * 0.4;
        const yaw = r() * Math.PI;
        r(); r(); // preserve the original facade-colour random draws
        houses.push({ x, y, z, w, h, d, yaw });
        r(); r(); // keep the original placement random stream
        if (r() < 0.5) bushes.push({ m: mat4(x + w * 0.7, y + 0.35, z + 0.4, 0.7, 0.6, 0.7), c: new THREE.Color("#d9468f") });
      }
    }

    // A few villas along the first stretch make the new architecture visible
    // from the driving view. They use the same clearance test as the villages.
    for (const [x, z, w, h, d, yaw] of [
      [-4.5, -1, 3.4, 2.1, 2.7, 0.08],
      [0, -13, 3.2, 2.4, 2.6, -0.12],
      [-7.5, -28, 3.3, 1.7, 2.7, 0.15],
    ]) {
      if (free(x, z, 3.6)) houses.unshift({ x, y: this.terrainHeight(x, z), z, w, h, d, yaw });
    }

    // cypresses, umbrella pines and olive bushes everywhere else
    for (let i = 0; i < 1600; i++) {
      const x = -60 + r() * 90;
      const z = 30 - r() * 200;
      if (!free(x, z, 2.2)) continue;
      const y = this.terrainHeight(x, z);
      // tall trees stay clear of the road and of the camera behind the start,
      // so they never hide the cars
      const roadGap = this.road.nearest(x, z).dist;
      const behindStart = z > 8 && Math.abs(x) < 22;
      const tallOk = roadGap > 6.5 && !behindStart;
      let kind = r();
      if (!tallOk && kind < 0.55) kind = 0.6 + r() * 0.3;
      if (kind < 0.36) {
        const h = 2.2 + r() * 1.8;
        cypress.push({ m: mat4(x, y + h / 2, z, 0.55 + r() * 0.2, h, 0.55 + r() * 0.2), c: new THREE.Color().setHSL(0.31, 0.5, 0.13 + r() * 0.06) });
      } else if (kind < 0.55) {
        const h = 2 + r() * 1.2;
        trunks.push({ m: mat4(x, y + h / 2, z, 0.14, h, 0.14) });
        const crown = mat4(x, y + h + 0.1, z, 1.9 + r() * 0.8, 1.45, 1.9 + r() * 0.8, r() * 3);
        pines.push({ m: crown, c: new THREE.Color().setHSL(0.25 + detail() * 0.05, 0.32, 0.27 + detail() * 0.08) });
      } else if (kind < 0.9) {
        const s = behindStart ? 0.4 + r() * 0.3 : 0.5 + r() * 0.7;
        bushes.push({ m: mat4(x, y + s * 0.4, z, s * 1.2, s * 0.9, s * 1.2), c: new THREE.Color().setHSL(0.24 + r() * 0.06, 0.45, 0.24 + r() * 0.1) });
      }
    }

    for (const [x, z, h, radius] of [[-6.5, 4, 2.6, 2.7], [-7.5, -25, 2.5, 2.6]]) {
      if (!free(x, z, 4.5) || houses.some(house => Math.hypot(house.x - x, house.z - z) < 3.5)) continue;
      const y = this.terrainHeight(x, z);
      trunks.push({ m: mat4(x, y + h / 2, z, 0.15, h, 0.15) });
      pines.push({ m: mat4(x, y + h + 0.1, z, radius, 1.45, radius), c: new THREE.Color("#b3c58c") });
    }

    // sailboats
    for (let i = 0; i < 9; i++) {
      const z = 10 - r() * 170;
      const x = coastX(z) + 8 + r() * 30;
      const yaw = r() * 6;
      boats.push({ m: mat4(x, SEA_LEVEL, z, 1, 1, 1, yaw) });
      this.boats.push({ x, z, yaw, radius: 6 + (i % 4) * 3, speed: (0.012 + (i % 3) * 0.006) * (i % 2 ? 1 : -1), phase: i * 1.7 });
    }

    const add = (geo: THREE.BufferGeometry, material: THREE.Material, items: { m: THREE.Matrix4; c?: THREE.Color }[], shadows = true) => {
      const mesh = instanced(geo, material, items, shadows);
      scene.add(mesh);
      this.disposables.push(geo, material);
    };
    const planting = arrangeVegetation(pines, trunks, cypress, bushes, selectVillageHouses(houses));
    pines.splice(0, pines.length, ...planting.pines);trunks.splice(0, trunks.length, ...planting.trunks);
    cypress.splice(0, cypress.length, ...planting.cypress);bushes.splice(0, bushes.length, ...planting.bushes);
    // Shared geometry, but recognisably different pine and olive silhouettes.
    const olives = pines.filter((_, i) => i % 3 === 0);
    const needlePines = pines.filter((_, i) => i % 3 !== 0);
    needlePines.forEach(item => item.c.set("#b3c58c"));
    olives.forEach(item => {
      item.c.set("#d5dbc5");
      item.m.multiply(new THREE.Matrix4().makeScale(0.95, 1.5, 0.95));
    });
    const bark = canvasTexture(128, 256, (g) => {
      g.fillStyle = "#b2a08c";
      g.fillRect(0, 0, 128, 256);
      const grain = rng(162);
      for (let i = 0; i < 90; i++) {
        const x = grain() * 128, y = grain() * 256;
        g.strokeStyle = `rgba(52,34,22,${0.12 + grain() * 0.25})`;
        g.lineWidth = 1 + grain() * 2;
        g.beginPath(); g.moveTo(x, y);
        g.bezierCurveTo(x - 3, y + 15, x + 3, y + 28, x - 1, y + 48);
        g.stroke();
      }
    });
    const leaves = canvasTexture(128, 128, (g) => {
      // Alpha-tested leaf clusters break up the solid plastic silhouette.
      const leaf = rng(1472);
      for (let i = 0; i < 380; i++) {
        const x = leaf() * 128, y = leaf() * 128;
        g.save(); g.translate(x, y); g.rotate(leaf() * Math.PI);
        g.fillStyle = ["#fffde8", "#d8dfc6", "#aebf91", "#e9ebd0"][i % 4];
        g.beginPath(); g.ellipse(0, 0, 3 + leaf() * 4, 1.2 + leaf() * 2, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }, false);
    this.disposables.push(bark, leaves);
    const leafMaterial = () => {
      const material = new THREE.MeshStandardMaterial({ map: leaves, alphaTest: .45, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 1, vertexColors: true });
      material.onBeforeCompile = shader => {
        shader.uniforms.uCoastalWind = this.windTime;
        shader.vertexShader = `uniform float uCoastalWind;\n${shader.vertexShader}`;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 foliageCentre = vec4(position,1.0);
          #ifdef USE_INSTANCING
            foliageCentre = instanceMatrix * foliageCentre;
          #endif
          float breeze = uCoastalWind * 1.35 + foliageCentre.x * .31 + foliageCentre.z * .27;
          transformed.x += sin(breeze) * .012 * max(0.0,position.y);
          transformed.z += cos(breeze * .81) * .009 * max(0.0,position.y);
        `);
      };material.customProgramCacheKey=()=> 'coastal-foliage-breeze-v1';return material;
    };
    add(layeredCypress(), leafMaterial(), cypress);
    add(branchingTrunk(), new THREE.MeshStandardMaterial({ color: "#88735b", map: bark, bumpMap: bark, bumpScale: 0.04, roughness: 1 }), trunks);
    add(treeCrown(), leafMaterial(), needlePines);
    add(treeCrown(true), leafMaterial(), olives);
    add(treeCrown(true).translate(0, -0.15, 0), leafMaterial(), bushes);
    // Small shared maps give plaster and terracotta a tactile finish without
    // loading external assets or adding per-house draw calls on mobile.
    const plaster = canvasTexture(128, 128, (g) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 128, 128);
      const grain = rng(24);
      for (let i = 0; i < 1800; i++) {
        g.fillStyle = `rgba(91,74,50,${grain() * 0.07})`;
        g.fillRect(grain() * 128, grain() * 128, 1, 1);
      }
    });
    const tiles = canvasTexture(128, 128, (g) => {
      g.fillStyle = "#f6e6d7";
      g.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 8; row++) {
        const y = row * 16;
        g.fillStyle = "rgba(86,43,25,0.22)";
        g.fillRect(0, y + 14, 128, 2);
        for (let col = -1; col < 8; col++) {
          const x = col * 20 + (row % 2) * 10;
          g.fillStyle = "rgba(255,255,255,0.24)";
          g.fillRect(x + 2, y + 2, 3, 12);
          g.fillStyle = "rgba(86,43,25,0.15)";
          g.fillRect(x + 18, y, 2, 16);
        }
      }
    });
    this.disposables.push(plaster, tiles);
    const visibleHomes = buildCoastalVillage(scene, houses, plaster, tiles, this.look.lights, this.disposables);
    this.spectatorObstacles = [
      ...visibleHomes.map(h => ({ x: h.x, z: h.z, radius: Math.hypot(h.w, h.d) * .5 + .45 })),
      ...[...trunks,...cypress].map(item => { const p = new THREE.Vector3().setFromMatrixPosition(item.m); return { x:p.x, z:p.z, radius:.5 }; }),
    ];
    buildGroveBackdrop(scene,(x,z)=>this.terrainHeight(x,z),(x,z)=>this.road.nearest(x,z).dist>11 && x<coastX(z)-6,visibleHomes,this.disposables,leaves);
    buildVillageGardens(scene, visibleHomes, (x, z) => this.terrainHeight(x, z), (x, z) => free(x, z, 1.5), this.disposables);

    // All boat parts share the existing sailing and rocking transforms.
    this.boatMeshes = createSailboatParts().map(part => {
      const mesh = instanced(part.geometry, part.material, boats, false);
      if (part.hull) boats.forEach((_, i) => mesh.setColorAt(i, new THREE.Color(["#f2f2e9", "#456b87", "#e8dfcc"][i % 3])));
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
      this.disposables.push(part.geometry, part.material);
      return mesh;
    });
  }

  /** The things that make a road feel driven on: posts, signs, lamps, rocks, flowers. */
  private buildRoadside(scene: THREE.Scene) {
    const r = rng(5150);
    const yawAt = (f: THREE.Vector3) => Math.atan2(f.x, f.z);
    const posts: { m: THREE.Matrix4 }[] = [];
    const reflectors: { m: THREE.Matrix4 }[] = [];
    const chevrons: { m: THREE.Matrix4 }[] = [];
    const chevronPoles: { m: THREE.Matrix4 }[] = [];
    const lampPoles: { m: THREE.Matrix4 }[] = [];
    const lampArms: { m: THREE.Matrix4 }[] = [];
    const lampHeads: { m: THREE.Matrix4 }[] = [];
    const rocks: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const tufts: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const start = this.road.startLen - 6;

    const studs:{m:THREE.Matrix4}[]=[];
    for(let l=Math.ceil(this.road.startLen/5)*5+.35;l<this.road.finishLen;l+=5){const {point,forward}=this.road.at(l);studs.push({m:mat4(point.x,point.y+.052,point.z,.065,.022,.075,yawAt(forward))});}
    const studMesh=instanced(new RoundedBoxGeometry(1,1,1,1,.12),new THREE.MeshStandardMaterial({color:'#ddd7ad',emissive:'#a89e6a',emissiveIntensity:this.look.lights*.3,roughness:.4}),studs,false);
    scene.add(studMesh);this.disposables.push(studMesh.geometry,studMesh.material as THREE.Material);

    // white edge posts with a red reflector on the hill side, as on French country roads
    for (let l = start; l < this.road.total; l += 6) {
      if (this.onBridge(l)) continue;
      const { point, right, forward } = this.road.at(l);
      const k = -(HALF_WIDTH + 0.8);
      const x = point.x + right.x * k;
      const z = point.z + right.z * k;
      posts.push({ m: mat4(x, point.y + 0.3, z, 0.09, 0.6, 0.09, yawAt(forward)) });
      reflectors.push({ m: mat4(x - forward.x * 0.046, point.y + 0.48, z - forward.z * 0.046, 0.07, 0.1, 0.01, yawAt(forward)) });
    }

    // chevron boards on the outside of the tight bends, facing the cars coming
    for (let l = start; l < this.road.total - 2; l += 2.6) {
      const a = this.road.at(l - 1.5).forward;
      const b = this.road.at(l + 1.5).forward;
      const turn = a.x * b.z - a.z * b.x; // > 0: bending one way, < 0: the other
      const radius = 3 / Math.max(1e-4, a.angleTo(b));
      if (radius > 16) continue;
      const { point, right, forward } = this.road.at(l);
      const side = turn > 0 ? 1 : -1;
      const k = side * (HALF_WIDTH + 1.25);
      const x = point.x + right.x * k;
      const z = point.z + right.z * k;
      const ground = Math.max(point.y, this.onBridge(l) ? point.y : this.terrainHeight(x, z));
      // the board's arrows point where the road goes
      chevrons.push({
        m: new THREE.Matrix4().compose(
          new THREE.Vector3(x, ground + 0.85, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawAt(forward) + Math.PI, 0)),
          new THREE.Vector3(side > 0 ? -0.55 : 0.55, 0.42, 1),
        ),
      });
      chevronPoles.push({ m: mat4(x, ground + 0.4, z, 0.05, 0.8, 0.05) });
    }

    // street lamps where the road passes the villages
    // (none right at the start: the camera waits there, behind the cars)
    for (let l = this.road.startLen + 12; l < this.road.total; l += 15) {
      if (this.onBridge(l)) continue;
      const { point, right } = this.road.at(l);
      const k = -(HALF_WIDTH + 1.05);
      const x = point.x + right.x * k;
      const z = point.z + right.z * k;
      lampPoles.push({ m: mat4(x, point.y + 1.3, z, 0.07, 2.6, 0.07) });
      const ax = x + right.x * 0.38;
      const az = z + right.z * 0.38;
      lampArms.push({ m: mat4(ax, point.y + 2.58, az, 0.05, 0.05, 0.8, yawAt(right)) });
      lampHeads.push({ m: mat4(x + right.x * 0.74, point.y + 2.52, z + right.z * 0.74, 0.22, 0.08, 0.34, yawAt(right)) });
    }

    // rocks where the cliffs meet the water
    for (let i = 0; i < 160; i++) {
      const z = 20 - r() * 175;
      const x = coastX(z) + (r() - 0.3) * 3.5;
      if (this.road.nearest(x, z).dist < HALF_WIDTH + 2.5) continue;
      const y = Math.max(SEA_LEVEL - 0.2, this.terrainHeight(x, z));
      const s = 0.35 + r() * r() * 1.4;
      rocks.push({ m: mat4(x, y + s * 0.2, z, s * (1 + r() * 0.5), s * (0.6 + r() * 0.4), s, r() * 6), c: new THREE.Color().setHSL(0.09, 0.15 + r() * 0.1, 0.55 + r() * 0.15) });
    }

    // grass and wild flowers along the verge on the hill side
    const flowerColors = ["#f7d23e", "#ffffff", "#d9468f", "#9b6ee8"];
    for (let l = start; l < this.road.total; l += 0.9) {
      if (this.onBridge(l) || r() < 0.35) continue;
      const { point, right } = this.road.at(l);
      const k = -(HALF_WIDTH + 1.15 + r() * 1.2);
      const x = point.x + right.x * k + (r() - 0.5) * 0.4;
      const z = point.z + right.z * k + (r() - 0.5) * 0.4;
      const y = this.terrainHeight(x, z);
      const flower = r() < 0.3;
      const s = 0.35 + r() * 0.25;
      tufts.push({
        m: mat4(x, y + s * 0.5, z, s * 0.9, s, s * 0.9, r() * 6),
        c: flower ? new THREE.Color(flowerColors[Math.floor(r() * flowerColors.length)]) : new THREE.Color().setHSL(0.24 + r() * 0.05, 0.5, 0.3 + r() * 0.1),
      });
    }

    const add = (geo: THREE.BufferGeometry, material: THREE.Material, items: { m: THREE.Matrix4; c?: THREE.Color }[], shadows = true) => {
      if (!items.length) return;
      scene.add(instanced(geo, material, items, shadows));
      this.disposables.push(geo, material);
    };
    add(new RoundedBoxGeometry(1, 1, 1, 2, 0.08), new THREE.MeshStandardMaterial({ color: "#f2f2ee", roughness: 0.6 }), posts);
    add(new RoundedBoxGeometry(1, 1, 1, 2, 0.08), new THREE.MeshStandardMaterial({ color: "#d11f1f", emissive: "#ff2a1a", emissiveIntensity: 0.35 }), reflectors, false);
    for (const part of createChevronParts(this.look.lights)) {
      add(part.geometry, part.material, chevrons);
      if (part.material.map) this.disposables.push(part.material.map);
    }
    add(new THREE.CylinderGeometry(0.5, 0.5, 1, 12), new THREE.MeshStandardMaterial({ color: "#7d838b", metalness: 0.5, roughness: 0.4 }), chevronPoles);
    const lampMetal = new THREE.MeshStandardMaterial({ color: "#3b4048", metalness: 0.6, roughness: 0.35 });
    add(new THREE.CylinderGeometry(0.5, 0.6, 1, 6), lampMetal, lampPoles);
    add(new RoundedBoxGeometry(1, 1, 1, 2, 0.08), lampMetal.clone(), lampArms);
    add(new RoundedBoxGeometry(1, 1, 1, 2, 0.08), new THREE.MeshStandardMaterial({ color: "#fff3c4", emissive: "#ffd98a", emissiveIntensity: 0.6 + this.look.lights * 3 }), lampHeads, false);
    // after dark, each lamp lays a warm pool of light on the road
    if (this.look.lights > 0) {
      const glow = glowTexture();
      const pool = new THREE.MeshBasicMaterial({
        map: glow,
        color: "#ffc874",
        transparent: true,
        opacity: 0.55 * this.look.lights,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        ...IN_FRONT,
      });
      const pools = lampHeads.map(({ m }) => {
        const at = new THREE.Vector3().setFromMatrixPosition(m);
        const { y } = this.road.nearest(at.x, at.z);
        return { m: new THREE.Matrix4().compose(new THREE.Vector3(at.x, y + 0.06, at.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), new THREE.Vector3(4.2, 4.2, 1)) };
      });
      add(new THREE.PlaneGeometry(1, 1), pool, pools, false);
      this.disposables.push(glow);
    }
    const stone = canvasTexture(128, 128, (g) => {
      g.fillStyle = "#ddd5c2"; g.fillRect(0, 0, 128, 128);
      const grain = rng(286);
      for (let i = 0; i < 500; i++) {
        g.fillStyle = `rgba(84,77,64,${grain() * 0.16})`;
        g.fillRect(grain() * 128, grain() * 128, 1 + grain() * 3, 1);
      }
      g.strokeStyle = "rgba(90,80,60,0.14)";
      for (let y = 10; y < 128; y += 25) {
        g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(35, y - 9, 80, y + 13, 128, y - 4); g.stroke();
      }
    });
    this.disposables.push(stone);
    add(sculptedRock(), new THREE.MeshStandardMaterial({ map: stone, bumpMap: stone, bumpScale: 0.08, roughness: 0.95 }), rocks);
    buildWildPlants(scene, tufts, this.disposables);
  }

  private shoreFoam: THREE.MeshBasicMaterial | null = null;
  private water: ReturnType<typeof createSeaMaterial> | null = null;
  private seaMaps: THREE.Texture[] = [];
  private clouds: THREE.InstancedMesh | null = null;
  private boats: { x: number; z: number; yaw: number; radius: number; speed: number; phase: number }[] = [];
  private boatMeshes: THREE.InstancedMesh[] = [];
  private windTime = { value:0 };
  private wakes: ReturnType<typeof createBoatWakes> | null = null;
  private airShow: ReturnType<typeof createAirShow> | null = null;
  private spectators: ReturnType<typeof createRoadsideCrowd> | null = null;
  private spectatorObstacles: { x: number; z: number; radius: number }[] = [];
  private pennants: { base: THREE.Matrix4; phase: number }[] = [];
  private pennantMesh: THREE.InstancedMesh | null = null;
  private beacon: THREE.MeshStandardMaterial | null = null;
  /** The five start lamps, and whether the race has been given the green. */
  private startLamps: THREE.MeshStandardMaterial[] = [];
  private startGreen = false;
  private beam: THREE.Group | null = null;

  /**
   * Bunting at the start/finish and dense spectator groups along the course.
   */
  private buildCelebration(scene: THREE.Scene) {
    const shirts = ["#e8352b", "#1f86ea", "#ffc21a", "#2fae55", "#f04aa6", "#ffffff", "#8e4cf0", "#ff7a1a"];
    const poles: { m: THREE.Matrix4 }[] = [];
    const pennants: { m: THREE.Matrix4; c: THREE.Color }[] = [];

    for (const at of [this.road.startLen, this.road.finishLen]) {
      // bunting on two striped masts across the road
      // past the start line (the camera waits behind it), a few metres before the finish arch
      const { point, right, forward } = this.road.at(at + (at === this.road.startLen ? 9 : -5.5));
      const yaw = Math.atan2(forward.x, forward.z);
      const span = HALF_WIDTH + 0.7;
      for (const side of [-1, 1]) poles.push({ m: mat4(point.x + right.x * side * span, point.y + 1.75, point.z + right.z * side * span, 0.09, 3.5, 0.09) });
      const n = 18;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const k = (u * 2 - 1) * span;
        const sag = 0.55 * (1 - Math.pow(u * 2 - 1, 2));
        const base = new THREE.Matrix4().compose(
          new THREE.Vector3(point.x + right.x * k, point.y + 3.4 - sag, point.z + right.z * k),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
          new THREE.Vector3(1, 1, 1),
        );
        this.pennants.push({ base, phase: i * 0.7 });
        pennants.push({ m: base.clone(), c: new THREE.Color(shirts[i % 5]) });
      }
    }

    const spots = placeSpectators({
      start: this.road.startLen, finish: this.road.finishLen,
      at: distance => this.road.at(distance),
      ground: (x,z) => this.terrainHeight(x,z),
      allowed: (x,z,distance) => !this.onBridge(distance)
        && this.road.nearest(x,z).dist > HALF_WIDTH + 1.75
        && x < coastX(z) - 1.5 && this.terrainHeight(x,z) > SEA_LEVEL + .6
        && !this.spectatorObstacles.some(o => Math.hypot(x-o.x,z-o.z) < o.radius),
    });
    this.spectators = createRoadsideCrowd(scene, spots);
    this.disposables.push(this.spectators);

    const pennant = new THREE.BufferGeometry();
    pennant.setAttribute("position", new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.3, 0], 3));
    pennant.computeVertexNormals();
    this.pennantMesh = instanced(pennant, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 }), pennants, false);
    this.pennantMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const poleMesh = instanced(new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshStandardMaterial({ color: "#f2f2ee", roughness: 0.5 }), poles);
    scene.add(this.pennantMesh, poleMesh);
    this.disposables.push(pennant, this.pennantMesh.material as THREE.Material, poleMesh.geometry, poleMesh.material as THREE.Material);
  }

  /** A lighthouse on the point past the finish, its lamp flashing. */
  private buildLighthouse(scene: THREE.Scene) {
    const z = -152;
    const x = coastX(z) + 0.5;
    const y = Math.max(SEA_LEVEL, this.terrainHeight(x, z));
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: "#f4f1ea", roughness: 0.6 });
    const red = new THREE.MeshStandardMaterial({ color: "#c8302a", roughness: 0.6 });
    const parts: [THREE.BufferGeometry, THREE.Material, number][] = [
      [new THREE.CylinderGeometry(1.6, 2.1, 1.2, 32), new THREE.MeshStandardMaterial({ color: "#9a8f7c", roughness: 1 }), 0.6],
      [new THREE.CylinderGeometry(0.9, 1.25, 3, 32), white, 2.7],
      [new THREE.CylinderGeometry(0.75, 0.9, 2.2, 32), red, 5.3],
      [new THREE.CylinderGeometry(0.65, 0.75, 2, 32), white, 7.4],
      [new THREE.CylinderGeometry(1, 1, 0.2, 32), red, 8.5],
      [new THREE.ConeGeometry(0.75, 0.9, 32), red, 9.75],
    ];
    for (const [geo, material, h] of parts) {
      const m = new THREE.Mesh(geo, material);
      m.position.y = h;
      m.castShadow = true;
      g.add(m);
      this.disposables.push(geo, material);
    }
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.8, 32), new THREE.MeshStandardMaterial({ color: "#fff6c8", emissive: "#ffe9a0", emissiveIntensity: 1.2 }));
    lamp.position.y = 9;
    g.add(lamp);
    // after dark the lamp sweeps the sea
    if (this.look.lights > 0.8) {
      const beam = new THREE.Group();
      beam.position.y = 9;
      const beamGeo = new THREE.ConeGeometry(1.2, 22, 16, 1, true);
      beamGeo.rotateZ(Math.PI / 2);
      beamGeo.translate(11, 0, 0);
      const beamMat = new THREE.MeshBasicMaterial({ color: "#fff3c0", transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      for (const a of [0, Math.PI]) {
        const b = new THREE.Mesh(beamGeo, beamMat);
        b.rotation.y = a;
        beam.add(b);
      }
      g.add(beam);
      this.beam = beam;
      this.disposables.push(beamGeo, beamMat);
    }
    g.position.set(x, y, z);
    scene.add(g);
    this.beacon = lamp.material as THREE.MeshStandardMaterial;
    this.disposables.push(lamp.geometry, lamp.material as THREE.Material);
  }

  /**
   * The start lamps follow the opening countdown (see Cinematic.tsx: 3 at 3.6 s,
   * 2 at 4.3 s, 1 at 5 s, go at 5.7 s): red pair by pair, then all green.
   */
  private lightStart() {
    if (!this.startLamps.length) return;
    let red = 0;
    if (this.shot.kind === "intro") {
      const e = performance.now() - this.shotSince;
      red = e >= 5700 ? 0 : e >= 5000 ? 5 : e >= 4300 ? 4 : e >= 3600 ? 2 : 0;
      if (e >= 5700) this.startGreen = true;
    } else if (this.shotSince && !this.startGreen) {
      // the opening was skipped (or not shown): the race is under way
      this.startGreen = true;
    }
    this.startLamps.forEach((lamp, i) => {
      if (this.startGreen && red === 0) {
        lamp.emissive.set("#3dff6e");
        lamp.color.set("#0d2a14");
        lamp.emissiveIntensity = 2.2;
      } else {
        lamp.emissive.set("#ff2a1a");
        lamp.color.set("#2a0d0d");
        lamp.emissiveIntensity = i < red ? 3 : 0;
      }
    });
  }

  private animateWorld(t: number, cars: readonly StageCar[] = []) {
    const s = t / 1000;
    this.windTime.value = s;this.wakes?.update(s);
    if(this.shoreFoam)this.shoreFoam.opacity=.38+Math.sin(s*.7)*.07;
    // the sea moves
    this.water?.update(s);
    if (this.seaMaps.length) {
      this.seaMaps[0].offset.set(s * 0.018, s * 0.011);
      this.seaMaps[1].offset.set(-s * 0.03, s * 0.022);
      if (this.seaMaps[2]) this.seaMaps[2].offset.y = s * 0.025;
    }
    // the clouds drift
    if (this.clouds) this.clouds.position.x = Math.sin(s * 0.012) * 24;
    // the boats sail slow circles, rocking on the swell
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    this.boats.forEach((b, i) => {
      const a = b.phase + s * b.speed;
      v.set(b.x + Math.cos(a) * b.radius - b.radius, SEA_LEVEL + Math.sin(s * 1.3 + b.phase) * 0.05, b.z + Math.sin(a) * b.radius);
      e.set(Math.sin(s * 1.1 + b.phase) * 0.05, -a + (b.speed > 0 ? Math.PI : 0), Math.sin(s * 0.9 + b.phase) * 0.08);
      m.compose(v, q.setFromEuler(e), one);
      for (const mesh of this.boatMeshes) mesh.setMatrixAt(i, m);
    });
    for (const mesh of this.boatMeshes) mesh.instanceMatrix.needsUpdate = true;
    // Independent spectators applaud, take photos and wave to passing cars.
    this.spectators?.update(s,cars);
    // bunting flutters in the breeze
    if (this.pennantMesh) {
      const sway = new THREE.Matrix4();
      this.pennants.forEach((p, i) => {
        sway.makeRotationX(Math.sin(s * 3.2 + p.phase) * 0.35);
        this.pennantMesh!.setMatrixAt(i, m.multiplyMatrices(p.base, sway));
      });
      this.pennantMesh.instanceMatrix.needsUpdate = true;
    }
    if (this.beam) this.beam.rotation.y = s * 0.5;
    // the lighthouse flashes twice every few seconds
    if (this.beacon) {
      const f = s % 4;
      this.beacon.emissiveIntensity = f < 0.25 || (f > 0.5 && f < 0.75) ? 3 : 0.6;
    }
  }

  private gulls: { bird: THREE.Group; wings: THREE.Mesh[]; radius: number; height: number; speed: number; phase: number; centre: THREE.Vector3 }[] = [];

  /** A few gulls wheeling over the water. */
  private buildGulls(scene: THREE.Scene) {
    const r = rng(77);
    const wing = new THREE.BufferGeometry();
    wing.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.12, 0.7, 0.02, -0.05], 3));
    wing.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: "#fbfbf8", side: THREE.DoubleSide, roughness: 0.8 });
    for (let i = 0; i < 7; i++) {
      const bird = new THREE.Group();
      const wings = [1, -1].map((side) => {
        const w = new THREE.Mesh(wing, mat);
        w.scale.x = side;
        bird.add(w);
        return w;
      });
      const body = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.08, 0.36, 3, 0.035), mat);
      bird.add(body);
      this.disposables.push(body.geometry);
      scene.add(bird);
      const z = 10 - r() * 150;
      this.gulls.push({
        bird,
        wings,
        radius: 5 + r() * 9,
        height: 5 + r() * 6,
        speed: (0.18 + r() * 0.15) * (r() < 0.5 ? 1 : -1),
        phase: r() * Math.PI * 2,
        centre: new THREE.Vector3(coastX(z) + 6 + r() * 14, 0, z),
      });
    }
    this.disposables.push(wing, mat);
  }

  private flyGulls(t: number) {
    for (const g of this.gulls) {
      const a = g.phase + t * g.speed;
      g.bird.position.set(g.centre.x + Math.cos(a) * g.radius, g.height + Math.sin(t * 0.7 + g.phase) * 0.6, g.centre.z + Math.sin(a) * g.radius);
      // heading along the circle, banking into it
      g.bird.rotation.set(0, -a + (g.speed > 0 ? Math.PI : 0), 0.35 * Math.sign(g.speed));
      const flap = Math.sin(t * 7 + g.phase * 3) * 0.5 * Math.max(0, Math.sin(t * 0.9 + g.phase)); // flaps, then glides
      g.wings[0].rotation.z = flap;
      g.wings[1].rotation.z = -flap;
    }
  }

  /** Stars, and the low sun or the moon where the light comes from. */
  private buildSky(scene: THREE.Scene) {
    const look = this.look;
    const sky = new THREE.Group();
    if(look.lights===0){
      const atmosphere=new Sky();atmosphere.name='daylight-atmosphere';atmosphere.scale.setScalar(450);
      const uniforms=atmosphere.material.uniforms;uniforms.turbidity.value=2.2;uniforms.rayleigh.value=2.2;uniforms.mieCoefficient.value=.002;uniforms.mieDirectionalG.value=.82;uniforms.sunPosition.value.copy(this.sunOffset).normalize();
      uniforms.cloudCoverage.value=.18;uniforms.cloudDensity.value=.22;uniforms.time=this.windTime;
      atmosphere.material.fragmentShader=atmosphere.material.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );','gl_FragColor = vec4( texColor * vec3(.24,.29,.36), 1.0 );');
      atmosphere.renderOrder=5;sky.add(atmosphere);this.disposables.push(atmosphere.geometry,atmosphere.material);
    }
    if (look.stars) {
      const r = rng(99);
      const pos: number[] = [];
      for (let i = 0; i < 700; i++) {
        const a = r() * Math.PI * 2;
        const h = 0.08 + r() * 0.92; // above the horizon
        const c = Math.sqrt(1 - h * h);
        pos.push(Math.cos(a) * c * 600, h * 600, Math.sin(a) * c * 600);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: "#ffffff", size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 });
      sky.add(new THREE.Points(geo, mat));
      this.disposables.push(geo, mat);
    }
    if (look.disc) {
      const dir = this.sunOffset.clone().normalize();
      const glow = glowTexture(0.6);
      const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: look.disc[0], fog: false, depthWrite: false, transparent: true }));
      disc.scale.setScalar(look.disc[1]);
      disc.position.copy(dir).multiplyScalar(500);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: look.disc[0], fog: false, depthWrite: false, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(look.disc[1] * 4);
      halo.position.copy(disc.position);
      sky.add(halo, disc);
      this.disposables.push(glow, disc.material, halo.material);
    }
    sky.renderOrder = 5;
    scene.add(sky);
    this.sky = sky;
  }

  /** After dark, each car lights the road ahead of it. */
  private updateHeadlights(cars: StageCar[]) {
    if (!this.look.lights || !this.scene) return;
    if (!this.headlightParts) {
      const beamTex = canvasTexture(
        32,
        64,
        (g) => {
          const grad = g.createLinearGradient(0, 64, 0, 0);
          grad.addColorStop(0, "rgba(255,255,255,0.9)");
          grad.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = grad;
          g.beginPath();
          g.moveTo(10, 64);
          g.lineTo(22, 64);
          g.lineTo(32, 0);
          g.lineTo(0, 0);
          g.closePath();
          g.fill();
        },
        false,
      );
      const beamGeo = new THREE.PlaneGeometry(1.5, 3.2);
      // lying on the road, bright end at the car, fading out ahead (+z is the car's forward)
      beamGeo.rotateX(-Math.PI / 2);
      beamGeo.rotateY(Math.PI);
      beamGeo.translate(0, 0, 2.15);
      this.headlightParts = {
        beam: new THREE.MeshBasicMaterial({ map: beamTex, color: "#fff2cc", transparent: true, opacity: 0.45 * this.look.lights, blending: THREE.AdditiveBlending, depthWrite: false, ...IN_FRONT }),
        lamp: new THREE.SpriteMaterial({ map: glowTexture(0.5), color: "#fff6dc", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
        beamGeo,
      };
      this.disposables.push(beamTex, beamGeo, this.headlightParts.beam, this.headlightParts.lamp.map!, this.headlightParts.lamp);
    }
    const parts = this.headlightParts;
    for (const car of cars) {
      let g = this.headlights.get(car.id);
      if (!g) {
        g = new THREE.Group();
        g.add(new THREE.Mesh(parts.beamGeo, parts.beam));
        for (const side of [-1, 1]) {
          const lamp = new THREE.Sprite(parts.lamp);
          lamp.scale.setScalar(0.35);
          lamp.position.set(side * 0.16, 0.16, 0.6);
          g.add(lamp);
        }
        this.scene.add(g);
        this.headlights.set(car.id, g);
      }
      g.position.copy(car.position);
      g.position.y += 0.02;
      g.rotation.y = car.yaw;
    }
  }

  private buildMountainsAndClouds(scene: THREE.Scene) {
    const r = rng(3);
    for (const geometry of [mountainRange(), inlandFoothills()]) {
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
      const mesh = new THREE.Mesh(geometry, material);mesh.name = "landscape-ridge";mesh.receiveShadow = true;
      scene.add(mesh);this.disposables.push(geometry, material);
    }

    const cloudMap = finishTexture('cloud');this.disposables.push(cloudMap);
    const cloudMat = new THREE.MeshBasicMaterial({ map:cloudMap, color:this.look.clouds[0], transparent:true, opacity:this.look.stars ? .32 : .8, depthWrite:false, fog:false, side:THREE.DoubleSide });
    const puffs: { m: THREE.Matrix4 }[] = [];
    for (let i = 0; i < 9; i++) {
      const cx = -120 + r() * 260;
      const cz = -230 - r() * 60;
      const cy = 60 + r() * 30;
      for (let k = 0; k < 5; k++) {
        const s = 6 + r() * 7;
        puffs.push({ m: mat4(cx + (k - 2) * 7 + r() * 3, cy + r() * 3, cz + r() * 4, s * 1.4, s, s) });
      }
    }
    const cloudMesh = instanced(new THREE.PlaneGeometry(2.6,1.5), cloudMat, puffs, false);
    scene.add(cloudMesh);
    this.clouds = cloudMesh;
    this.disposables.push(cloudMesh.geometry, cloudMat);
  }

  private buildStartAndFinish(scene: THREE.Scene) {
    // chequered start line
    const chk = canvasTexture(64, 16, (g) => {
      for (let x = 0; x < 8; x++)
        for (let y = 0; y < 2; y++) {
          g.fillStyle = (x + y) % 2 ? "#111" : "#fff";
          g.fillRect(x * 8, y * 8, 8, 8);
        }
    });
    const start = this.road.at(this.road.startLen);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(HALF_WIDTH * 2, 0.5), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.7, ...IN_FRONT }));
    line.rotation.set(-Math.PI / 2, 0, Math.atan2(start.forward.x, start.forward.z));
    line.position.copy(start.point).setY(start.point.y + 0.05);
    line.receiveShadow = true;
    scene.add(line);
    this.disposables.push(chk, line.geometry, line.material as THREE.Material);

    // start gantry: five lamps over the line, lit one pair at a time by the countdown
    const gantry = new THREE.Group();
    gantry.name = "start-gantry";
    const metal = new THREE.MeshStandardMaterial({ color: "#2b2f36", metalness: 0.5, roughness: 0.45 });
    const span = HALF_WIDTH + 0.55;
    const poleGeo = new RoundedBoxGeometry(0.12, 3.9, 0.12, 2, 0.035);
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(poleGeo, metal);
      pole.position.set(side * span, 1.95, 0);
      pole.castShadow = true;
      gantry.add(pole);
    }
    const beam = new THREE.Mesh(new RoundedBoxGeometry(span * 2 + 0.12, 0.12, 0.12, 2, 0.035), metal);
    beam.position.y = 3.85;
    gantry.add(beam);
    const panel = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.42, 0.1, 2, 0.025), new THREE.MeshStandardMaterial({ color: "#111317", roughness: 0.6 }));
    panel.position.set(0, 3.55, -0.04);
    gantry.add(panel);
    const lampGeo = new THREE.CircleGeometry(0.14, 20);
    for (let i = 0; i < 5; i++) {
      const lamp = new THREE.MeshStandardMaterial({ color: "#2a0d0d", emissive: "#ff2a1a", emissiveIntensity: 0, side: THREE.DoubleSide });
      // facing back, towards the grid and the camera behind it
      const disc = new THREE.Mesh(lampGeo, lamp);
      disc.position.set((i - 2) * 0.4, 3.55, -0.095);
      disc.rotation.y = Math.PI;
      gantry.add(disc);
      this.startLamps.push(lamp);
      this.disposables.push(lamp);
    }
    const gantryDetails = decorateStartGantry(gantry, span);
    this.disposables.push({ dispose: () => disposeSignGroup(gantryDetails) });
    // a few metres past the line, so it stands over the road ahead of the grid
    // rather than right in front of the camera
    const at = this.road.at(this.road.startLen + 6);
    gantry.position.copy(at.point);
    gantry.rotation.y = Math.atan2(at.forward.x, at.forward.z);
    scene.add(gantry);
    this.disposables.push(metal, beam.geometry, panel.geometry, panel.material as THREE.Material, lampGeo, poleGeo);

    this.signs = new THREE.Group();
    scene.add(this.signs);
    this.buildSigns(1000);
  }

  /** Km boards along the road and the finish arch, for the race distance. */
  private buildSigns(target: number) {
    if (!this.signs) return;
    this.finishTarget = target;
    disposeSignGroup(this.signs);
    this.signs.clear();
    const post = new THREE.MeshStandardMaterial({ color: "#a7adb6", metalness: 0.5, roughness: 0.4 });
    for (let i = 0; i < 5; i++) {
      const km = Math.round((target * i) / 5);
      const { point, right, forward } = this.road.at(this.road.kmToLen(km, target));
      const k = -(HALF_WIDTH + 1.9);
      const g = createDistanceSign(km, this.look.lights);
      g.position.set(point.x + right.x * k, point.y, point.z + right.z * k);
      g.rotation.y = Math.atan2(forward.x, forward.z) + Math.PI;
      this.signs.add(g);
    }
    // finish arch
    const { point, right, forward } = this.road.at(this.road.finishLen);
    const arch = new THREE.Group();
    arch.name = "finish-gantry";
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 20), post);
      pole.position.set(side * (HALF_WIDTH + 0.6), 2.1, 0);
      pole.castShadow = true;
      arch.add(pole);
    }
    const banner = createFinishBanner(HALF_WIDTH * 2 + 1.4, target, this.look.lights);
    banner.position.y = 3.9;
    arch.add(banner);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF_WIDTH * 2, 0.6),
      new THREE.MeshStandardMaterial({ map: checkerLineTexture(), roughness: 0.7, ...IN_FRONT }),
    );
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.06;
    arch.add(line);
    arch.position.copy(point);
    arch.rotation.y = Math.atan2(forward.x, forward.z) + Math.PI;
    void right;
    this.signs.add(arch);
  }

  // ------------------------------------------------------------ Stage API

  resize(width: number, height: number, bottomInset: number) {
    this.width = width;
    this.height = height;
    // keep the action centred in the part of the screen above the hand
    const virtualH = height + bottomInset;
    this.virtualHeight = virtualH;
    this.camera.aspect = width / virtualH;
    this.baseFov = width / Math.max(1, height - bottomInset) < 0.8 ? 52 : 42;
    this.camera.fov = this.baseFov;
    this.camera.setViewOffset(width, virtualH, 0, bottomInset, width, height);
    this.camera.updateProjectionMatrix();
  }

  place(km: number, target: number, lateral: number, along = 0): Placement {
    if (target !== this.finishTarget) this.buildSigns(target);
    // une longueur de voiture vaut 1 unité du monde : on recule le long de la route
    const { point, forward, right } = this.road.at(this.road.kmToLen(km, target) + along);
    const position = point.clone().addScaledVector(right, lateral * LANE_SCALE);
    position.y += 0.04;
    return { position, yaw: Math.atan2(forward.x, forward.z), scale: 1 };
  }

  finish(target: number): Placement {
    return this.place(target, target, 0);
  }

  sideTowardView(position: THREE.Vector3, yaw: number) {
    // the side of the car facing the camera's line of sight
    const localX = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const toCam = this.camPos.clone().sub(position).setY(0);
    return Math.sign(localX.dot(toCam)) || 1;
  }

  project(position: THREE.Vector3): ScreenPoint {
    const v = position.clone().project(this.camera);
    const dist = this.camera.position.distanceTo(position);
    const perUnit = this.virtualHeight / (2 * Math.max(1, dist) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height, size: v.z < 1 ? perUnit : 0 };
  }

  /**
   * Between actions: the whole pack while it fits on screen; once the cars are
   * spread along the road, the one whose turn it is (else the leader), so the
   * picture never ends up on an empty stretch with the cars out of frame.
   */
  private packShot(cars: StageCar[], target: number) {
    const group = this.groupShot(cars, target);
    if (cars.length < 2 || this.inView(group, cars)) return group;
    const focus = cars.find((c) => c.active) ?? cars.reduce((a, b) => (b.km > a.km ? b : a));
    return this.groupShot([focus], target);
  }

  /** Would every car be on screen (above the hand, clear of the edges) from there? */
  private inView(shot: { pos: THREE.Vector3; look: THREE.Vector3 }, cars: StageCar[]) {
    const cam = this.probe;
    cam.copy(this.camera);
    cam.position.copy(shot.pos);
    cam.lookAt(shot.look);
    cam.updateMatrixWorld();
    const v = new THREE.Vector3();
    return cars.every((c) => {
      v.copy(c.position).project(cam);
      return v.z < 1 && Math.abs(v.x) < 0.9 && v.y > -0.85 && v.y < 0.6;
    });
  }

  /** Behind the last car, looking down the road past the leader. */
  private groupShot(cars: StageCar[], target: number) {
    const kms = cars.map((c) => c.km);
    const rear = kms.length ? Math.min(...kms) : 0;
    const front = kms.length ? Math.max(...kms) : 0;
    const rearLen = this.road.kmToLen(rear, target);
    const frontLen = this.road.kmToLen(front, target);
    const spread = frontLen - rearLen;
    // cars in the lower third, centred, the road running on towards the horizon
    const mid = this.road.at((rearLen + frontLen) / 2);
    const back = 11 + spread * 0.55;
    const height = 5.5 + spread * 0.22;
    const pos = mid.point.clone().addScaledVector(mid.forward, -back).add(new THREE.Vector3(0, height, 0));
    const run = back + 24;
    const look = mid.point.clone().addScaledVector(mid.forward, 24);
    look.y = pos.y - run * Math.tan(THREE.MathUtils.degToRad(16));
    // idle drift keeps the world alive
    pos.x += Math.sin(performance.now() / 5200) * 0.8;
    return { pos, look };
  }

  setShot(shot: Shot) {
    const prev = this.shot;
    const changed =
      shot.kind !== prev.kind ||
      (shot.kind === "finish" && prev.kind === "finish" && shot.winnerId !== prev.winnerId) ||
      (shot.kind === "car" && prev.kind === "car" && (shot.id !== prev.id || shot.hazard !== prev.hazard));
    // the scripted shots start from their first frame, with a cut
    if (changed) {
      this.shotSince = performance.now();
      // a new race opens: the lamps go dark again for the countdown
      if (shot.kind === "intro") this.startGreen = false;
      // cut in on an attack, and cut back out of it rather than drifting through the scenery
      if (
        shot.kind === "intro" ||
        shot.kind === "finish" ||
        prev.kind === "intro" ||
        (shot.kind === "car" && shot.hazard) ||
        (prev.kind === "car" && prev.hazard)
      )
        this.placed = false;
      if (shot.kind === "car" && (shot.hazard === "collision" || shot.hazard === "barrage")) {
        // the hit lands a moment after the cut
        this.shake = { at: this.shotSince + (shot.hazard === "barrage" ? 650 : 60), amp: shot.hazard === "barrage" ? 0.1 : 0.16 };
      }
    }
    this.shot = shot;
  }

  frame(dt: number, t: number, cars: StageCar[], target: number) {
    this.flyGulls(t);
    this.animateWorld(t,cars);
    this.lightStart();
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    const byId = new Map(cars.map((c) => [c.id, c]));
    const shot = this.shot;
    let stiffness = 3;
    let kick = 0;
    // Keep every event behind the vehicle, including shortcut, hazards and the
    // introduction. Their effects still animate; the camera never flies overhead.
    const focus = shot.kind === "follow" || shot.kind === "car"
      ? byId.get(shot.id)
      : shot.kind === "finish" && shot.winnerId ? byId.get(shot.winnerId) : undefined;
    const lead = focus ?? cars.find(c => c.active) ?? cars[0];
    const focusId = lead?.id ?? null;
    if (focusId !== this.cameraFocus) {
      this.cameraFocus = focusId;
      this.placed = false;
    }
    if (lead && shot.kind === "pack") {
      const pack = this.packShot(cars, target);
      wantPos.copy(pack.pos);
      wantLook.copy(pack.look);
    } else if (lead) {
      const forward = new THREE.Vector3(Math.sin(lead.yaw), 0, Math.cos(lead.yaw));
      const turbo = shot.kind === "follow" && lead.style === "turbo";
      const back = turbo ? 5.2 : 10;
      const height = turbo ? 1.6 : 5.2;
      wantPos.copy(lead.position).addScaledVector(forward, -back).add(new THREE.Vector3(0, height, 0));
      wantLook.copy(lead.position).addScaledVector(forward, 12);
      wantLook.y = wantPos.y - (back + 12) * Math.tan(THREE.MathUtils.degToRad(17));
      stiffness = shot.kind === "follow" ? 6 : 3;
      kick = turbo ? 1 : 0;
    } else {
      const pack = this.packShot(cars, target);
      wantPos.copy(pack.pos);
      wantLook.copy(pack.look);
    }

    const k = this.placed ? 1 - Math.exp(-dt * stiffness) : 1;
    this.placed = true;
    this.camPos.lerp(wantPos, k);
    this.camLook.lerp(wantLook, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    // a hit shakes the picture, briefly
    const since = (performance.now() - this.shake.at) / 1000;
    if (this.shake.amp && since > 0 && since < 0.6) {
      const a = this.shake.amp * (1 - since / 0.6);
      this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a));
    }
    // turbo: the lens widens with the speed, then settles
    this.fovKick += (kick - this.fovKick) * Math.min(1, dt * (kick ? 5 : 2.5));
    const fov = this.baseFov + this.fovKick * 14;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    // shadows follow what we look at, by whole shadow-map texels: moved by less,
    // their edges would shimmer while the camera glides
    const texel = (this.sun.shadow.camera.right - this.sun.shadow.camera.left) / this.sun.shadow.mapSize.x;
    const p = SUN_SNAP.copy(this.camLook).applyMatrix4(this.sunFromWorld);
    p.set(Math.round(p.x / texel) * texel, Math.round(p.y / texel) * texel, p.z).applyMatrix4(this.sunToWorld);
    this.sun.target.position.copy(p);
    this.sun.position.copy(p).add(this.sunOffset);
    if (this.sky) this.sky.position.copy(this.camera.position);
    this.updateHeadlights(cars);
    this.airShow?.update(t / 1000);
    this.sun.target.updateMatrixWorld();
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    if (this.signs) disposeSignGroup(this.signs);
    void this.scene;
  }
}

/** Band of shallow water hugging the coast. */
function ribbonCoast() {
  const positions: number[] = [];
  const index: number[] = [];
  let row = 0;
  for (let z = 40; z >= -220; z -= 1) {
    const x = coastX(z);
    positions.push(x - 1, 0, z, x + 5, 0, z);
    if (row > 0) {
      const a = (row - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    row++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Vertical metal band standing on the road edge (guard rail). */
function railBand(road: Road, offset: number, bottom: number, top: number) {
  const positions: number[] = [];
  const index: number[] = [];
  let row = 0;
  for (let i = 0; i < road.pts.length; i += 2) {
    const { point, right } = road.at(road.len[i]);
    const x = point.x + right.x * offset;
    const z = point.z + right.z * offset;
    positions.push(x, point.y + bottom, z, x, point.y + top, z);
    if (row > 0) {
      const a = (row - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    row++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}
