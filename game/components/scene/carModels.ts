import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CarModel } from "./models";

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
  if (id !== "kilomax") void loadGltf(id);
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
 * Builds a Kenney car as a CarModel, painted `color` (unless `repaint` is
 * false). Resolves null if the file can't be loaded: the caller keeps the
 * car it already shows.
 */
export async function loadCarModel(id: string, color: string, repaint: boolean, castShadow: boolean): Promise<CarModel | null> {
  const gltf = await loadGltf(id);
  if (!gltf) return null;
  const scene = gltf.scene.clone(true);

  const wheels: THREE.Object3D[] = [];
  const bodies: THREE.Mesh[] = [];
  scene.traverse((o) => {
    // the four road wheels only (a spare wheel on the tailgate is part of the body)
    if (/^wheel-(front|back)-(left|right)$/.test(o.name)) wheels.push(o);
    else if (o.name === "body")
      o.traverse((m) => {
        if ((m as THREE.Mesh).isMesh && !m.name.startsWith("wheel")) bodies.push(m as THREE.Mesh);
      });
  });
  // the shell is the biggest mesh under "body"
  const vertices = (m: THREE.Mesh) => m.geometry.getAttribute("position")?.count ?? 0;
  const bodyMesh = bodies.sort((x, y) => vertices(y) - vertices(x))[0] ?? null;

  // repaint: one material for the whole car, with its own copy of the palette
  const source = bodyMesh ? (bodyMesh.material as THREE.MeshStandardMaterial) : null;
  const material = source ? source.clone() : null;
  if (material && source?.map && repaint && bodyMesh) {
    const map = await paintedMap(id, bodyMesh, source.map, color);
    if (map) material.map = map;
  }
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (material) mesh.material = material;
    mesh.castShadow = castShadow;
  });

  // scale to the board and stand the wheels on the ground
  const inner = new THREE.Group();
  inner.add(scene);
  inner.scale.setScalar(SCALE);
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
