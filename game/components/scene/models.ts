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
  /** Mount points for equipment (roof rack, rear, front). */
  mounts: { roof: THREE.Group; rear: THREE.Group; front: THREE.Group };
  exhaust: THREE.Vector3;
}

export function createCar(color: string): CarModel {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const paint = mat(color, { roughness: 0.22, metalness: 0.35 });
  const trim = mat("#20242b", { roughness: 0.6 });

  // lower body with a lower, rounded hood
  const lower = new THREE.Mesh(new RoundedBoxGeometry(0.47, 0.19, 1, 4, 0.08), paint);
  lower.position.y = 0.17;
  body.add(lower);
  const hood = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.08, 0.34, 3, 0.04), paint);
  hood.position.set(0, 0.27, 0.29);
  hood.rotation.x = 0.1;
  body.add(hood);

  // cabin: paint pillars around dark glass
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.18, 0.54, 3, 0.07), paint);
  cabin.position.set(0, 0.33, -0.08);
  body.add(cabin);
  const glassSide = new THREE.Mesh(new RoundedBoxGeometry(0.43, 0.1, 0.44, 2, 0.04), shared.glass);
  glassSide.position.set(0, 0.35, -0.08);
  body.add(glassSide);
  const windshield = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.12, 0.04, 2, 0.02), shared.glass);
  windshield.position.set(0, 0.35, 0.19);
  windshield.rotation.x = -0.55;
  body.add(windshield);
  const roof = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.045, 0.42, 3, 0.02), paint);
  roof.position.set(0, 0.43, -0.1);
  body.add(roof);
  // racing stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.005, 0.4), mat("#ffffff", { roughness: 0.3 }));
  stripe.position.set(0, 0.455, -0.1);
  body.add(stripe);
  const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.005, 0.3), stripe.material);
  hoodStripe.position.set(0, 0.315, 0.3);
  hoodStripe.rotation.x = 0.1;
  body.add(hoodStripe);

  // spoiler
  const spoiler = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.025, 0.08, 2, 0.01), trim);
  spoiler.position.set(0, 0.47, -0.3);
  body.add(spoiler);

  // side mirrors
  for (const x of [-0.24, 0.24]) {
    const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.035, 0.05, 1, 0.01), paint);
    mirror.position.set(x, 0.33, 0.14);
    body.add(mirror);
  }

  // wheel arches
  for (const [x, z] of [[-0.225, 0.31], [0.225, 0.31], [-0.225, -0.31], [0.225, -0.31]]) {
    const arch = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.1, 0.26, 2, 0.03), trim);
    arch.position.set(x, 0.2, z);
    body.add(arch);
  }

  // bumpers, grille, plate and lights
  const front = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.07, 0.06, 2, 0.02), trim);
  front.position.set(0, 0.1, 0.5);
  body.add(front);
  const rear = front.clone();
  rear.position.z = -0.5;
  body.add(rear);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), trim);
  grille.position.set(0, 0.19, 0.505);
  body.add(grille);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.01), shared.white);
  plate.position.set(0, 0.17, -0.51);
  body.add(plate);
  for (const x of [-0.16, 0.16]) {
    const hl = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.05, 0.03, 1, 0.012), shared.headlight);
    hl.position.set(x, 0.21, 0.495);
    body.add(hl);
  }
  const brakeLights = new THREE.MeshStandardMaterial({ color: "#b3141b", emissive: "#ff1f2a", emissiveIntensity: 0.3 });
  for (const x of [-0.17, 0.17]) {
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.05, 0.03, 1, 0.012), brakeLights);
    tl.position.set(x, 0.22, -0.495);
    body.add(tl);
  }

  const wheels: THREE.Mesh[] = [];
  const tyreGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.085, 16);
  tyreGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.09, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.BoxGeometry(0.092, 0.1, 0.02);
  for (const [x, z] of [
    [-0.22, 0.31],
    [0.22, 0.31],
    [-0.22, -0.31],
    [0.22, -0.31],
  ]) {
    const wheel = new THREE.Mesh(tyreGeo, shared.tyre);
    wheel.add(new THREE.Mesh(rimGeo, shared.rim));
    // a spoke bar so the spin reads
    wheel.add(new THREE.Mesh(hubGeo, shared.dark));
    wheel.position.set(x, 0.105, z);
    root.add(wheel);
    wheels.push(wheel);
  }

  const mounts = { roof: new THREE.Group(), rear: new THREE.Group(), front: new THREE.Group() };
  mounts.roof.position.set(0, 0.46, -0.1);
  mounts.rear.position.set(0, 0.22, -0.53);
  mounts.front.position.set(0, 0.14, 0.53);
  body.add(mounts.roof, mounts.rear, mounts.front);

  return { root, body, wheels, brakeLights, paint, mounts, exhaust: new THREE.Vector3(0.12, 0.09, -0.54) };
}

// ---------------------------------------------------------------- equipment (protections)

/** Chrome bull bar: immune to collisions. */
export function createBullBar() {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 20, Math.PI), shared.chrome);
  bar.rotation.x = 0;
  bar.position.y = 0;
  g.add(bar);
  const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.4, 8), shared.chrome);
  cross.rotation.z = Math.PI / 2;
  cross.position.y = 0.07;
  g.add(cross);
  return g;
}

/** Spare wheel on the tailgate: immune to punctures. */
export function createSpareWheel() {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), shared.tyre);
  tyre.rotation.x = Math.PI / 2;
  g.add(tyre);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.065, 10), shared.rim);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  g.position.z = -0.03;
  return g;
}

/** Jerrycan strapped on a roof rack: immune to running dry. */
export function createJerrycan() {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.3), shared.dark);
  g.add(rack);
  const can = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.15, 0.07, 2, 0.015), mat("#d83a2c", { roughness: 0.4 }));
  can.position.set(0.05, 0.08, -0.03);
  g.add(can);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8), shared.dark);
  cap.position.set(0.09, 0.17, -0.03);
  g.add(cap);
  return g;
}

/** GPS antenna with a blue light: immune to speed cameras. */
export function createAntenna() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.03, 12), shared.dark);
  g.add(base);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.22, 6), shared.chrome);
  mast.position.y = 0.12;
  g.add(mast);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshStandardMaterial({ color: "#6ec8ff", emissive: "#3aa8ff", emissiveIntensity: 1.2 }));
  tip.position.y = 0.24;
  g.add(tip);
  g.position.x = -0.12;
  return g;
}

/** Orange rotating beacon: roadblocks open for you. */
export function createBeacon() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.025, 12), shared.dark);
  g.add(base);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), shared.orange.clone());
  dome.position.y = 0.012;
  g.add(dome);
  g.position.x = 0.12;
  return { root: g, light: dome.material as THREE.MeshStandardMaterial };
}

/** Additive cone for the turbo flame. */
export function createFlame() {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.34, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: "#3aa0ff", transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.z = -0.17;
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.2, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: "#e8f6ff", transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  inner.rotation.x = -Math.PI / 2;
  inner.position.z = -0.1;
  g.add(outer, inner);
  return g;
}

/** Column of light from the sky (GPS stratégique). */
export function createBeam() {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, 6, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: "#ffe28a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 3;
  return beam;
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
