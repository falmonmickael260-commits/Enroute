import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CarModel } from "./models";
import { BUILT_CARS } from "@/game/lib/cars";

/**
 * Kenney Car Kit vehicles (CC0) turned into the CarModel the scene animates:
 * scaled to the board, wheels found by name, brake lights and mount points
 * added, and the body repainted in the pilot's colour.
 */

/** Kenney units to scene units: a 2.55-long sedan ends up as long as the original car. */
const SCALE = 0.43;

const gltfCache = new Map<string, Promise<GLTF | null>>();
const paintCache = new Map<string, Promise<THREE.Texture | null>>();

function loadGltf(id: string): Promise<GLTF | null> {
  let p = gltfCache.get(id);
  if (!p) {
    p = new GLTFLoader().loadAsync(`/models/cars/${id}.glb`).catch(() => null);
    gltfCache.set(id, p);
  }
  return p;
}

/** Starts downloading a car before it's needed (e.g. as soon as it's picked). */
export function prefetchCar(id: string) {
  if (!BUILT_CARS.has(id)) void loadGltf(id);
}

// ---------------------------------------------------------------- repaint

type RGB = [number, number, number];

function hsl([r, g, b]: RGB) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function hexToRgb(hex: string): RGB {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

function imagePixels(image: CanvasImageSource & { width: number; height: number }) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  return { canvas, ctx, data: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

/** The body's main colour: the texel covering the most of its triangles, favouring vivid ones. */
function paintOf(body: THREE.Mesh, map: THREE.Texture, data: ImageData): RGB | null {
  const geo = body.geometry;
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  if (!pos || !uv) return null;
  const index = geo.index;
  const count = index ? index.count : pos.count;
  map.updateMatrix();
  const m = map.matrix;
  const weights = new Map<number, number>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const t = new THREE.Vector2();
  for (let i = 0; i < count; i += 3) {
    const i0 = index ? index.getX(i) : i;
    const i1 = index ? index.getX(i + 1) : i + 1;
    const i2 = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    const area = b.clone().sub(a).cross(c.clone().sub(a)).length();
    t.set((uv.getX(i0) + uv.getX(i1) + uv.getX(i2)) / 3, (uv.getY(i0) + uv.getY(i1) + uv.getY(i2)) / 3).applyMatrix3(m);
    const x = Math.min(data.width - 1, Math.max(0, Math.floor(t.x * data.width)));
    const y = Math.min(data.height - 1, Math.max(0, Math.floor(t.y * data.height)));
    const k = (y * data.width + x) * 4;
    const key = (data.data[k] << 16) | (data.data[k + 1] << 8) | data.data[k + 2];
    weights.set(key, (weights.get(key) ?? 0) + area);
  }
  let best: RGB | null = null;
  let bestW = 0;
  for (const [key, w] of weights) {
    const rgb: RGB = [((key >> 16) & 255) / 255, ((key >> 8) & 255) / 255, (key & 255) / 255];
    const { s, l } = hsl(rgb);
    if (s < 0.12 || l < 0.12 || l > 0.92) continue; // tyres, glass, chrome, lights
    // the paint is what covers the most and is the most colourful (not the grey chassis)
    const score = w * s * s;
    if (score > bestW) {
      bestW = score;
      best = rgb;
    }
  }
  return best;
}

/** A copy of the palette where every shade of the paint's hue takes the pilot's colour. */
function repaint(data: ImageData, paint: RGB, target: RGB): ImageData {
  const out = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
  const p = hsl(paint);
  for (let i = 0; i < out.data.length; i += 4) {
    const px: RGB = [out.data[i] / 255, out.data[i + 1] / 255, out.data[i + 2] / 255];
    const q = hsl(px);
    const dh = Math.min(Math.abs(q.h - p.h), 360 - Math.abs(q.h - p.h));
    if (q.s < 0.2 || dh > 14) continue;
    // keep the shading: a darker panel of the paint becomes a darker panel of the new colour
    const k = Math.min(1.5, q.l / Math.max(0.05, p.l));
    for (let c = 0; c < 3; c++) out.data[i + c] = Math.round(Math.min(1, target[c] * k) * 255);
  }
  return out;
}

async function paintedMap(id: string, body: THREE.Mesh, map: THREE.Texture, color: string): Promise<THREE.Texture | null> {
  const key = `${id}|${color}`;
  let p = paintCache.get(key);
  if (!p) {
    p = (async () => {
      const image = map.image as (CanvasImageSource & { width: number; height: number }) | undefined;
      if (!image || typeof document === "undefined") return null;
      const { canvas, ctx, data } = imagePixels(image);
      const paint = paintOf(body, map, data);
      if (!paint) return null;
      ctx.putImageData(repaint(data, paint, hexToRgb(color)), 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = map.flipY;
      tex.colorSpace = map.colorSpace;
      tex.magFilter = map.magFilter;
      tex.minFilter = map.minFilter;
      tex.generateMipmaps = map.generateMipmaps;
      tex.wrapS = map.wrapS;
      tex.wrapT = map.wrapT;
      tex.offset.copy(map.offset);
      tex.repeat.copy(map.repeat);
      tex.rotation = map.rotation;
      tex.center.copy(map.center);
      return tex;
    })();
    paintCache.set(key, p);
  }
  return p;
}

// ---------------------------------------------------------------- model

/**
 * How to read a car file. Kenney's cars share one layout (default); the
 * detailed cars come from elsewhere and say where their wheels and paint are.
 */
interface CarSpec {
  /** Names of the road wheels. */
  wheels: RegExp;
  /** Paint given by a material's colour (else: by the palette texture of the body). */
  paintMaterial?: string;
  /** Length on the board, in scene units (default: Kenney's units × SCALE). */
  length?: number;
}

const KENNEY: CarSpec = { wheels: /^wheel-(front|back)-(left|right)$/ };
const SPECS: Record<string, CarSpec> = {
  // Car Concept (Khronos glTF sample, CC-BY 4.0) and Toy Car (CC0): see CREDITS.md
  supercar: { wheels: /^Wheel(Front|Rear)[LR]$/, paintMaterial: "Paint 1 Carmine", length: 1.18 },
  retro: { wheels: /^$^/, length: 1.12 },
};

/** Which of the node's own axes points along `world` (in the car's frame). */
function localAxis(node: THREE.Object3D, world: THREE.Vector3): "x" | "y" | "z" {
  const q = node.getWorldQuaternion(new THREE.Quaternion()).invert();
  const v = world.clone().applyQuaternion(q);
  const a = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
  return (["x", "y", "z"] as const)[a.indexOf(Math.max(...a))];
}

/**
 * Builds a car from its file as a CarModel, painted `color` (unless `repaint` is
 * false). Resolves null if the file can't be loaded: the caller keeps the
 * car it already shows.
 */
export async function loadCarModel(id: string, color: string, repaint: boolean, castShadow: boolean): Promise<CarModel | null> {
  const gltf = await loadGltf(id);
  if (!gltf) return null;
  const scene = gltf.scene.clone(true);
  const spec = SPECS[id] ?? KENNEY;

  const wheels: THREE.Object3D[] = [];
  const bodies: THREE.Mesh[] = [];
  const all: THREE.Mesh[] = [];
  scene.traverse((o) => {
    // the four road wheels only (a spare wheel on the tailgate is part of the body)
    if (spec.wheels.test(o.name)) wheels.push(o);
    else if (o.name === "body")
      o.traverse((m) => {
        if ((m as THREE.Mesh).isMesh && !m.name.startsWith("wheel")) bodies.push(m as THREE.Mesh);
      });
    if ((o as THREE.Mesh).isMesh) all.push(o as THREE.Mesh);
  });
  // remember each wheel's size and axes: animations spin it around its axle
  // and squash it vertically, whatever the file's own orientation
  scene.updateMatrixWorld(true);
  if (spec !== KENNEY) {
    // these files tilt or steer their wheels: each goes on a hub aligned with
    // the car, which is what turns and squashes
    wheels.forEach((w, i) => {
      const parent = w.parent;
      if (!parent) return;
      const hub = new THREE.Group();
      hub.name = `${w.name}-hub`;
      parent.add(hub);
      hub.position.copy(w.position);
      hub.quaternion.copy(parent.getWorldQuaternion(new THREE.Quaternion()).invert());
      hub.updateMatrixWorld(true);
      hub.attach(w);
      wheels[i] = hub;
    });
    scene.updateMatrixWorld(true);
  }
  for (const w of wheels) {
    w.userData.rest = w.scale.clone();
    w.userData.axle = localAxis(w, new THREE.Vector3(1, 0, 0));
    w.userData.up = localAxis(w, new THREE.Vector3(0, 1, 0));
  }
  // the shell is the biggest mesh under "body" (or in the whole car)
  const vertices = (m: THREE.Mesh) => m.geometry.getAttribute("position")?.count ?? 0;
  const bodyMesh = (bodies.length ? bodies : all).sort((x, y) => vertices(y) - vertices(x))[0] ?? null;

  if (spec.paintMaterial) {
    // the paint is a plain colour: this car gets its own copy, in the pilot's colour
    const painted = new Map<THREE.Material, THREE.Material>();
    for (const mesh of all) {
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (m.name !== spec.paintMaterial) continue;
      if (!painted.has(m)) {
        const copy = m.clone();
        if (repaint) copy.color.set(color);
        // showroom chrome-like paint goes black on the road's light: keep it satin
        copy.metalness = Math.min(copy.metalness, 0.45);
        copy.roughness = Math.max(copy.roughness, 0.28);
        painted.set(m, copy);
      }
      mesh.material = painted.get(m)!;
    }
  } else {
    // repaint: the body's material gets its own copy of the palette
    const source = bodyMesh ? (bodyMesh.material as THREE.MeshStandardMaterial) : null;
    const material = source ? source.clone() : null;
    if (material && source?.map && repaint && bodyMesh) {
      const map = await paintedMap(id, bodyMesh, source.map, color);
      if (map) material.map = map;
    }
    if (material && spec !== KENNEY) {
      material.metalness = Math.min(material.metalness, 0.45);
      material.roughness = Math.max(material.roughness, 0.28);
    }
    if (material) for (const mesh of all) if (mesh.material === source) mesh.material = material;
  }
  for (const mesh of all) mesh.castShadow = castShadow;

  // scale to the board and stand the wheels on the ground
  const inner = new THREE.Group();
  inner.add(scene);
  if (spec.length) {
    const raw = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    inner.scale.setScalar(spec.length / Math.max(raw.z, 1e-6));
  } else inner.scale.setScalar(SCALE);
  const box = new THREE.Box3().setFromObject(inner);
  inner.position.y = -box.min.y;
  box.translate(new THREE.Vector3(0, -box.min.y, 0));
  const size = box.getSize(new THREE.Vector3());

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(inner);

  // brake lights: two small lamps flush with the back
  const brakeLights = new THREE.MeshStandardMaterial({ color: "#b3141b", emissive: "#ff1f2a", emissiveIntensity: 0.3 });
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(size.x * 0.16, size.y * 0.06, 0.012), brakeLights);
    lamp.position.set(side * size.x * 0.3, box.min.y + size.y * 0.5, box.min.z - 0.004);
    body.add(lamp);
  }

  const mounts = { roof: new THREE.Group(), rear: new THREE.Group(), front: new THREE.Group() };
  mounts.roof.position.set(0, box.max.y - 0.01, box.min.z + size.z * 0.42);
  mounts.rear.position.set(0, box.min.y + size.y * 0.42, box.min.z + 0.01);
  mounts.front.position.set(0, box.min.y + size.y * 0.28, box.max.z - 0.01);
  body.add(mounts.roof, mounts.rear, mounts.front);

  // the ring and highlights read the pilot's colour from `paint`
  const paint = new THREE.MeshStandardMaterial({ color });

  return {
    root,
    body,
    wheels: wheels as THREE.Mesh[],
    brakeLights,
    paint,
    mounts,
    exhaust: new THREE.Vector3(size.x * 0.2, box.min.y + size.y * 0.15, box.min.z),
  };
}
