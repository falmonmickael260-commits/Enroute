import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Stylised low-poly models built in code. Units: a car is 1 long (along +Z,
 * its forward axis), everything else is sized relative to that.
 */

const mat = (color: string, opts: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts });

const shared = {
  glass: mat("#1c2733", { roughness: 0.15, metalness: 0.3 }),
  tyre: mat("#1b1c1f", { roughness: 0.9 }),
  rim: mat("#d7dbe0", { roughness: 0.3, metalness: 0.6 }),
  chrome: mat("#e9edf2", { roughness: 0.2, metalness: 0.8 }),
  headlight: new THREE.MeshStandardMaterial({ color: "#fffbe8", emissive: "#fff3c4", emissiveIntensity: 1.2 }),
  dark: mat("#2a2d33"),
  white: mat("#f7f7f5"),
  red: mat("#e0392f"),
  orange: mat("#ff8a1f", { emissive: "#ff6a00", emissiveIntensity: 0.35 }),
  grey: mat("#8f949b", { metalness: 0.4, roughness: 0.4 }),
};

export interface CarModel {
  root: THREE.Group;
  /** Tilts for braking / damage, around the car's centre. */
  body: THREE.Group;
  wheels: THREE.Mesh[];
  brakeLights: THREE.MeshStandardMaterial;
  paint: THREE.MeshStandardMaterial;
}

export function createCar(color: string): CarModel {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const paint = mat(color, { roughness: 0.28, metalness: 0.25 });
  const lower = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.2, 1, 3, 0.07), paint);
  lower.position.y = 0.17;
  body.add(lower);

  const cabin = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.17, 0.52, 3, 0.07), paint);
  cabin.position.set(0, 0.33, -0.06);
  body.add(cabin);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(0.41, 0.12, 0.48, 2, 0.05), shared.glass);
  glass.position.set(0, 0.34, -0.06);
  body.add(glass);
  // roof panel over the glass so the car reads as a hatchback from above
  const roof = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.04, 0.4, 2, 0.02), paint);
  roof.position.set(0, 0.42, -0.08);
  body.add(roof);

  // bumpers and lights
  const front = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.06, 0.05, 2, 0.02), shared.dark);
  front.position.set(0, 0.1, 0.5);
  body.add(front);
  const rear = front.clone();
  rear.position.z = -0.5;
  body.add(rear);
  for (const x of [-0.15, 0.15]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.02), shared.headlight);
    hl.position.set(x, 0.2, 0.5);
    body.add(hl);
  }
  const brakeLights = new THREE.MeshStandardMaterial({ color: "#b3141b", emissive: "#ff1f2a", emissiveIntensity: 0.25 });
  for (const x of [-0.16, 0.16]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), brakeLights);
    tl.position.set(x, 0.21, -0.5);
    body.add(tl);
  }

  const wheels: THREE.Mesh[] = [];
  const tyreGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14);
  tyreGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.085, 10);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [-0.22, 0.31],
    [0.22, 0.31],
    [-0.22, -0.31],
    [0.22, -0.31],
  ]) {
    const wheel = new THREE.Mesh(tyreGeo, shared.tyre);
    wheel.add(new THREE.Mesh(rimGeo, shared.rim));
    wheel.position.set(x, 0.1, z);
    root.add(wheel);
    wheels.push(wheel);
  }

  return { root, body, wheels, brakeLights, paint };
}

/** Soft round shadow texture shared by every blob shadow and glow ring. */
function radialTexture(inner: string, outer: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let shadowTex: THREE.Texture | null = null;
export function createBlobShadow() {
  shadowTex ??= radialTexture("rgba(0,0,0,0.55)", "rgba(0,0,0,0)");
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.35),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.005;
  m.renderOrder = -1;
  return m;
}

/** Neon ring on the ground under a car, in the player's colour. */
export function createGlowRing(color: string) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.52, 0.64, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  ring.scale.set(1, 1.35, 1);
  return ring;
}

// ---------------------------------------------------------------- hazards

/** Red and white road barrier with two cones and a flashing beacon. */
export function createBarrier() {
  const g = new THREE.Group();
  const stripeTex = (() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 16;
    const x = c.getContext("2d")!;
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? "#f5f5f2" : "#e2362c";
      x.beginPath();
      x.moveTo(i * 16, 0);
      x.lineTo(i * 16 + 16, 0);
      x.lineTo(i * 16 + 8, 16);
      x.lineTo(i * 16 - 8, 16);
      x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const board = new THREE.Mesh(
    new RoundedBoxGeometry(1.05, 0.16, 0.05, 2, 0.02),
    new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.5 }),
  );
  board.position.y = 0.36;
  g.add(board);
  for (const x of [-0.45, 0.45]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.04), shared.white);
    leg.position.set(x, 0.18, 0);
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.3), shared.dark);
    foot.position.set(x, 0.015, 0);
    g.add(foot);
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), shared.orange.clone());
  beacon.position.set(-0.45, 0.48, 0);
  g.add(beacon);
  for (const x of [-0.7, 0.7]) g.add(createCone(x, 0.05));
  return { root: g, beacon: beacon.material as THREE.MeshStandardMaterial };
}

export function createCone(x = 0, z = 0) {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 12), mat("#ff6b1a"));
  cone.position.y = 0.13;
  g.add(cone);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.035, 12), shared.white);
  band.position.y = 0.14;
  g.add(band);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.16), mat("#ff6b1a"));
  base.position.y = 0.01;
  g.add(base);
  g.position.set(x, 0, z);
  return g;
}

/** Speed camera on a pole with a "50" sign. */
export function createRadar() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.7, 8), shared.grey);
  pole.position.y = 0.35;
  g.add(pole);
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.14, 0.2, 2, 0.02), mat("#f2f2ee"));
  box.position.set(0, 0.72, 0);
  g.add(box);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), shared.glass);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.72, 0.11);
  g.add(lens);
  const flash = new THREE.PointLight("#ffffff", 0, 3);
  flash.position.set(0, 0.72, 0.2);
  g.add(flash);
  return { root: g, flash };
}

/** Round "50" speed-limit plate, as a sprite that always faces the camera. */
export function createLimitPlate() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.beginPath();
  x.arc(64, 64, 60, 0, Math.PI * 2);
  x.fill();
  x.lineWidth = 16;
  x.strokeStyle = "#e0392f";
  x.stroke();
  x.fillStyle = "#15171b";
  x.font = "bold 58px Arial, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("50", 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(0.34, 0.34, 1);
  return sprite;
}

/** Icon sprite (warning, fuel…) drawn on a round badge. */
export function createBadge(draw: (x: CanvasRenderingContext2D) => void, bg = "#e0392f") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = bg;
  x.beginPath();
  x.arc(64, 64, 58, 0, Math.PI * 2);
  x.fill();
  x.lineWidth = 8;
  x.strokeStyle = "#ffffff";
  x.stroke();
  draw(x);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(0.3, 0.3, 1);
  return sprite;
}

export const drawFuel = (x: CanvasRenderingContext2D) => {
  x.fillStyle = "#fff";
  x.fillRect(40, 38, 36, 54);
  x.fillRect(80, 50, 10, 34);
  x.fillStyle = "#e0392f";
  x.fillRect(46, 44, 24, 14);
};
export const drawWarning = (x: CanvasRenderingContext2D) => {
  x.fillStyle = "#fff";
  x.font = "bold 80px Arial, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("!", 64, 70);
};
export const drawWrench = (x: CanvasRenderingContext2D) => {
  x.strokeStyle = "#fff";
  x.lineWidth = 14;
  x.lineCap = "round";
  x.beginPath();
  x.moveTo(42, 88);
  x.lineTo(82, 46);
  x.stroke();
  x.beginPath();
  x.arc(84, 44, 14, 0, Math.PI * 2);
  x.stroke();
};

/** Row of nails / spike strip lying across the road. */
export function createNails() {
  const g = new THREE.Group();
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.07), shared.dark);
  strip.position.y = 0.01;
  g.add(strip);
  for (let i = 0; i < 9; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 6), shared.chrome);
    spike.position.set(-0.36 + i * 0.09, 0.05, 0);
    g.add(spike);
  }
  return g;
}

/** Folding warning triangle. */
export function createTriangle() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.09, 0);
  shape.lineTo(0.09, 0);
  shape.lineTo(0, 0.16);
  shape.closePath();
  const tri = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat("#e0392f", { side: THREE.DoubleSide, emissive: "#ff2a1a", emissiveIntensity: 0.2 }));
  const g = new THREE.Group();
  g.add(tri);
  return g;
}

let puffTex: THREE.Texture | null = null;
/** A soft round particle used for smoke, dust and sparkles. */
export function createPuff(color: string, opacity = 0.7) {
  puffTex ??= radialTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)");
  return new THREE.Sprite(
    new THREE.SpriteMaterial({ map: puffTex, color, transparent: true, opacity, depthWrite: false }),
  );
}
