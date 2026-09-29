import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { DefenseType, HazardType } from "@/game/types/game";
import { ScenePath, type RoadSample } from "./scenePath";
import {
  createAntenna,
  createBadge,
  createBarrier,
  createBeacon,
  createBeam,
  createBlobShadow,
  createBullBar,
  createCar,
  createFlame,
  createGlowRing,
  createJerrycan,
  createLimitPlate,
  createNails,
  createPuff,
  createRadar,
  createSpareWheel,
  createTriangle,
  drawFuel,
  drawTyre,
  drawWarning,
  type CarModel,
} from "./models";

/**
 * Draws the 3D pieces over an illustrated scene.
 *
 * The painting is treated as a ground plane seen from `pitchDeg` above: an
 * orthographic camera tilted by that angle maps a ground point
 * (x, 0, y / sin θ) exactly onto image pixel (x, y). Perspective (far things
 * smaller) comes from the road's traced width, which scales each car.
 */

export interface ScenePlayer {
  id: string;
  color: string;
  km: number;
  hazard: HazardType | null;
  limited: boolean;
  shields: DefenseType[];
  active: boolean;
}

export interface CarScreenPos {
  x: number;
  y: number;
  /** Car size in image pixels, for labels. */
  size: number;
  active: boolean;
}

/** What the next move looks like, from the card that caused it. */
export type MoveStyle = "drive" | "fast" | "turbo" | "shortcut" | "overtake" | "sprint";

export type SceneCue =
  | { kind: "move"; style: MoveStyle }
  | { kind: "repair" }
  | { kind: "shield" }
  | { kind: "gps" };

/** Car length relative to the road's half-width at that point. */
const CAR_SIZE = 0.95;
const LANES: Record<number, number[]> = { 1: [0], 2: [-0.42, 0.42], 3: [-0.56, 0, 0.56], 4: [-0.62, -0.2, 0.22, 0.64] };

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const pulse = (t: number) => Math.sin(clamp01(t) * Math.PI);

interface Particle {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  vel: THREE.Vector3;
  grow: number;
  baseOpacity: number;
  gravity: number;
}

interface Prop {
  kind: HazardType;
  /** Rides with the car (badges, plates, effects on the car itself). */
  root: THREE.Group;
  /** Stays where it was put on the road (radar pole). */
  world: THREE.Group | null;
  born: number;
  /** Set when the hazard was cleared: the prop plays its exit then goes. */
  leaving: number | null;
  update: (prop: Prop, now: number, car: CarEntity) => boolean | void;
}

interface Equipment {
  root: THREE.Group;
  born: number;
  light?: THREE.MeshStandardMaterial;
}

interface CarEntity {
  id: string;
  frame: THREE.Group;
  model: CarModel;
  ring: THREE.Mesh;
  flame: THREE.Group;
  beam: THREE.Mesh;
  km: number;
  fromKm: number;
  toKm: number;
  moveStart: number;
  moveDur: number;
  style: MoveStyle;
  pendingStyle: MoveStyle | null;
  lateral: number;
  lateralTarget: number;
  props: Map<HazardType, Prop>;
  equipment: Map<DefenseType, Equipment>;
  lastPuff: number;
  bubbleAt: number;
  beamAt: number;
  active: boolean;
  pose: RoadSample;
}

export class SceneRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private readonly path: ScenePath;
  private readonly sinP: number;
  private readonly cars = new Map<string, CarEntity>();
  private readonly particles: Particle[] = [];
  private target = 1000;
  private raf = 0;
  private last = 0;
  private disposed = false;
  private fireworksUntil = 0;
  private lastFirework = 0;
  onFrame: ((positions: Map<string, CarScreenPos>) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, path: ScenePath, quality = 1) {
    this.path = path;
    const { width, height, pitchDeg } = path.def;
    const pitch = (pitchDeg * Math.PI) / 180;
    this.sinP = Math.sin(pitch);
    const cosP = Math.cos(pitch);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.setQuality(quality);

    // Screen x = world x; screen y (down) = z·sinθ − y·cosθ.
    this.camera = new THREE.OrthographicCamera(0, width, 0, -height, 1, 40000);
    this.camera.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch);
    this.camera.position.set(0, this.sinP * 20000, cosP * 20000);
    this.camera.updateMatrixWorld();

    // soft studio reflections make the paint look glossy for next to no cost
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight("#f4f8ff", "#6f8a52", 1.1));
    const sun = new THREE.DirectionalLight("#fff0d6", 2.4);
    sun.position.set(-0.8, 1.6, 0.6);
    this.scene.add(sun);

    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  /** Drawing-buffer size relative to the image's own pixels. */
  setQuality(q: number) {
    const { width, height } = this.path.def;
    this.renderer.setSize(Math.round(width * q), Math.round(height * q), false);
  }

  private ground(x: number, y: number, h = 0) {
    return new THREE.Vector3(x, h, y / this.sinP);
  }

  private carSize(p: { s: number }) {
    return p.s * CAR_SIZE;
  }

  /** Pose of a car frame at `km` with a lateral lane offset (in car lengths). */
  private place(car: CarEntity, km: number, extraLateral = 0) {
    const p = this.path.atKm(km, this.target);
    const size = this.carSize(p);
    // ground direction of travel: undo the vertical squash of the painting
    const gx = p.tx;
    const gz = p.ty / this.sinP;
    const gl = Math.hypot(gx, gz) || 1;
    const nx = -gz / gl;
    const nz = gx / gl;
    const lat = (car.lateral + extraLateral) * size;
    const pos = this.ground(p.x, p.y);
    pos.x += nx * lat;
    pos.z += nz * lat;
    car.frame.position.copy(pos);
    car.frame.rotation.y = Math.atan2(gx, gz);
    car.frame.scale.setScalar(size);
    car.frame.updateMatrixWorld(true);
    car.pose = p;
  }

  /** A card was just played for this car: shapes the animation that follows. */
  cue(playerId: string, cue: SceneCue, now = performance.now()) {
    const car = this.cars.get(playerId);
    if (!car) return;
    if (cue.kind === "move") car.pendingStyle = cue.style;
    else if (cue.kind === "repair") this.burst(car.model.root, "#8dffbe", 16, 0.7);
    else if (cue.kind === "shield") car.bubbleAt = now;
    else if (cue.kind === "gps") car.beamAt = now;
  }

  /** Back to the start grid (new game). */
  reset() {
    for (const car of this.cars.values()) {
      this.scene.remove(car.frame);
      for (const prop of car.props.values()) if (prop.world) this.scene.remove(prop.world);
    }
    this.cars.clear();
    this.fireworksUntil = 0;
  }

  /** Fireworks over the finish line. */
  celebrate(now = performance.now()) {
    this.fireworksUntil = now + 4200;
  }

  update(players: ScenePlayer[], target: number, now = performance.now()) {
    this.target = target;
    const seen = new Set<string>();

    // lanes: cars within 3% of the race share the road side by side
    const sorted = [...players].sort((a, b) => a.km - b.km);
    const clusters: ScenePlayer[][] = [];
    for (const p of sorted) {
      const c = clusters[clusters.length - 1];
      if (c && Math.abs(c[c.length - 1].km - p.km) <= target * 0.03) c.push(p);
      else clusters.push([p]);
    }
    const lane = new Map<string, number>();
    for (const c of clusters) c.forEach((p, i) => lane.set(p.id, LANES[c.length]?.[i] ?? 0));

    for (const p of players) {
      seen.add(p.id);
      let car = this.cars.get(p.id);
      if (!car) {
        car = this.createCarEntity(p);
        car.lateral = car.lateralTarget = lane.get(p.id) ?? 0;
        this.cars.set(p.id, car);
        this.place(car, p.km);
      }
      car.lateralTarget = lane.get(p.id) ?? 0;
      if (p.km !== car.toKm) {
        const dist = Math.abs(p.km - car.km);
        car.fromKm = car.km;
        car.toKm = p.km;
        car.moveStart = now;
        car.style = car.pendingStyle ?? (dist >= target * 0.15 ? "fast" : "drive");
        car.pendingStyle = null;
        const base = Math.min(2600, 950 + (dist / Math.max(1, target)) * 5200);
        car.moveDur = car.style === "turbo" ? base * 0.8 : car.style === "overtake" ? Math.max(1900, base) : car.style === "sprint" ? base * 1.15 : base;
      }
      car.active = p.active;
      this.syncHazards(car, p, now);
      this.syncEquipment(car, p.shields, now);
    }

    for (const [id, car] of this.cars) {
      if (!seen.has(id)) {
        this.scene.remove(car.frame);
        for (const prop of car.props.values()) if (prop.world) this.scene.remove(prop.world);
        this.cars.delete(id);
      }
    }
  }

  private createCarEntity(p: ScenePlayer): CarEntity {
    const frame = new THREE.Group();
    const model = createCar(p.color);
    const ring = createGlowRing(p.color);
    const flame = createFlame();
    flame.position.copy(model.exhaust);
    flame.visible = false;
    model.body.add(flame);
    const beam = createBeam();
    frame.add(createBlobShadow(), ring, model.root, beam);
    this.scene.add(frame);
    return {
      id: p.id,
      frame,
      model,
      ring,
      flame,
      beam,
      km: p.km,
      fromKm: p.km,
      toKm: p.km,
      moveStart: 0,
      moveDur: 1,
      style: "drive",
      pendingStyle: null,
      lateral: 0,
      lateralTarget: 0,
      props: new Map(),
      equipment: new Map(),
      lastPuff: 0,
      bubbleAt: -1e9,
      beamAt: -1e9,
      active: p.active,
      pose: this.path.atKm(p.km, this.target),
    };
  }

  // ------------------------------------------------------------ protections

  private syncEquipment(car: CarEntity, shields: DefenseType[], now: number) {
    for (const d of shields) {
      if (car.equipment.has(d)) continue;
      const { mounts } = car.model;
      let item: Equipment;
      if (d === "reparation") {
        const root = createBullBar();
        mounts.front.add(root);
        item = { root, born: now };
      } else if (d === "roueSecours") {
        const root = createSpareWheel();
        mounts.rear.add(root);
        item = { root, born: now };
      } else if (d === "pleinEssence") {
        const root = createJerrycan();
        mounts.roof.add(root);
        item = { root, born: now };
      } else if (d === "gps") {
        const root = createAntenna();
        mounts.roof.add(root);
        item = { root, born: now };
      } else {
        const { root, light } = createBeacon();
        mounts.roof.add(root);
        item = { root, born: now, light };
      }
      car.equipment.set(d, item);
    }
    // a fresh game starts without equipment
    for (const [d, item] of car.equipment) {
      if (!shields.includes(d)) {
        item.root.removeFromParent();
        car.equipment.delete(d);
      }
    }
  }

  // ------------------------------------------------------------ hazards

  private syncHazards(car: CarEntity, p: ScenePlayer, now: number) {
    const wanted = new Set<HazardType>();
    if (p.hazard) wanted.add(p.hazard);
    if (p.limited) wanted.add("radar");
    for (const [kind, prop] of car.props) {
      if (!wanted.has(kind) && prop.leaving === null) prop.leaving = now;
    }
    for (const kind of wanted) {
      const existing = car.props.get(kind);
      if (existing && existing.leaving === null) continue;
      if (existing) this.removeProp(car, existing);
      const prop = this.createProp(kind, now, car);
      car.frame.add(prop.root);
      if (prop.world) this.scene.add(prop.world);
      car.props.set(kind, prop);
    }
  }

  private removeProp(car: CarEntity, prop: Prop) {
    car.frame.remove(prop.root);
    if (prop.world) this.scene.remove(prop.world);
    car.props.delete(prop.kind);
  }

  /** +1 or -1: the car's side (local x) that faces the middle of the picture. */
  private sideTowardCentre(car: CarEntity) {
    const yaw = car.frame.rotation.y;
    const worldDx = Math.cos(yaw); // where local +x points, horizontally
    const towardCentre = this.path.def.width / 2 - car.frame.position.x;
    return Math.sign(worldDx * towardCentre) || 1;
  }

  private createProp(kind: HazardType, now: number, car: CarEntity): Prop {
    const root = new THREE.Group();
    const side = this.sideTowardCentre(car);
    const prop: Prop = { kind, root, world: null, born: now, leaving: null, update: () => {} };

    if (kind === "barrage") {
      const { root: barrier, beacon } = createBarrier();
      barrier.position.set(0, 0, 1.0);
      barrier.scale.setScalar(1.35);
      root.add(barrier);
      prop.update = (pr, t) => {
        const a = clamp01((t - pr.born) / 700);
        const fall = 1 - easeOutBack(a);
        barrier.position.y = Math.max(0, fall) * 2.2;
        barrier.rotation.z = (1 - a) * 0.25 * Math.sin(a * 12);
        beacon.emissiveIntensity = 0.3 + (Math.sin(t / 110) > 0 ? 1.8 : 0);
        if (a === 1 && t - pr.born < 760) this.burst(barrier, "#e8dcc4", 7, 0.5);
        if (pr.leaving !== null) {
          const b = clamp01((t - pr.leaving) / 650);
          barrier.position.y = easeInOut(b) * 1.6;
          barrier.scale.setScalar(1.35 * (1 - easeInOut(b)) + 0.001);
          if (b < 0.2) this.burst(barrier, "#9dffc4", 2, 0.5);
          return b >= 1;
        }
      };
    } else if (kind === "radar") {
      // the pole stays at the roadside where the car was flashed
      const world = new THREE.Group();
      world.position.copy(car.frame.position);
      world.rotation.copy(car.frame.rotation);
      world.scale.copy(car.frame.scale);
      const { root: radar, flash } = createRadar();
      radar.position.set(1.05 * side, 0, 0.35);
      radar.scale.setScalar(1.7);
      world.add(radar);
      const flashSprite = createPuff("#ffffff", 0);
      flashSprite.position.set(1.05 * side, 1.22, 0.55);
      world.add(flashSprite);
      prop.world = world;
      const plate = createLimitPlate();
      plate.position.set(0.62 * side, 0.75, 0);
      root.add(plate);
      prop.update = (pr, t) => {
        const a = clamp01((t - pr.born) / 600);
        radar.scale.set(1.7, 1.7 * easeOutBack(a), 1.7);
        const f = clamp01((t - pr.born - 650) / 350);
        const strobe = f > 0 && f < 1 ? Math.sin(f * Math.PI) : 0;
        flash.intensity = strobe * 6;
        (flashSprite.material as THREE.SpriteMaterial).opacity = strobe;
        flashSprite.scale.setScalar(0.4 + strobe * 3.2);
        const pa = clamp01((t - pr.born - 750) / 450);
        plate.scale.setScalar(0.46 * easeOutBack(pa) + 0.025 * Math.sin(t / 240));
        if (pr.leaving !== null) {
          const b = clamp01((t - pr.leaving) / 600);
          radar.scale.set(1.7, 1.7 * (1 - easeInOut(b)) + 0.001, 1.7);
          plate.scale.setScalar(0.46 * (1 - easeInOut(b)) + 0.001);
          return b >= 1;
        }
      };
    } else if (kind === "crevaison") {
      const nails = createNails();
      nails.position.set(0, 0, 0.62);
      root.add(nails);
      const badge = createBadge(drawTyre, "#e0392f");
      badge.position.set(0.62 * side, 0.75, 0);
      root.add(badge);
      prop.update = (pr, t, c) => {
        const a = clamp01((t - pr.born) / 500);
        nails.scale.setScalar(1.5 * easeOutBack(a) + 0.001);
        badge.scale.setScalar(0.44 * easeOutBack(clamp01((t - pr.born - 700) / 400)) + 0.025 * Math.sin(t / 180));
        let k = easeInOut(clamp01((t - pr.born - 250) / 450));
        if (pr.leaving !== null) {
          const b = clamp01((t - pr.leaving) / 700);
          k = 1 - easeInOut(b);
          nails.scale.setScalar(1.5 * (1 - b) + 0.001);
          badge.scale.setScalar(0.44 * (1 - b) + 0.001);
          if (b >= 1) {
            c.model.body.rotation.z = 0;
            c.model.body.position.y = 0;
            c.model.wheels[0].scale.set(1, 1, 1);
            return true;
          }
        }
        c.model.body.rotation.z = -0.2 * k;
        c.model.body.position.y = -0.03 * k;
        c.model.wheels[0].scale.set(1, 1 - 0.55 * k, 1 - 0.1 * k);
        if (t - pr.born > 250 && t - pr.born < 700 && t - c.lastPuff > 60) {
          c.lastPuff = t;
          this.emit(c.model.root, new THREE.Vector3(-0.25, 0.1, 0.31), "#ffffff", 0.9, 700, 1.2);
        }
      };
    } else if (kind === "collision") {
      const tri = createTriangle();
      tri.position.set(0.1, 0, -1.05);
      tri.scale.setScalar(2);
      root.add(tri);
      const badge = createBadge(drawWarning);
      badge.position.set(0.62 * side, 0.75, 0);
      root.add(badge);
      prop.update = (pr, t, c) => {
        const a = clamp01((t - pr.born) / 650);
        let k = easeOutBack(a);
        tri.scale.setScalar(2 * easeOutBack(clamp01((t - pr.born - 500) / 400)) + 0.001);
        badge.scale.setScalar(0.42 * easeOutBack(clamp01((t - pr.born - 300) / 400)) + 0.03 * Math.sin(t / 160));
        if (t - c.lastPuff > 110 && pr.leaving === null) {
          c.lastPuff = t;
          this.emit(c.model.root, new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.35, 0.35), "#55565c", 0.8, 1500, 1.6);
        }
        if (t - pr.born < 90) this.burst(c.model.root, "#ffd27a", 6, 0.6);
        if (pr.leaving !== null) {
          const b = clamp01((t - pr.leaving) / 700);
          k = 1 - easeInOut(b);
          tri.scale.setScalar(2 * (1 - b) + 0.001);
          badge.scale.setScalar(0.42 * (1 - b) + 0.001);
          if (b >= 1) {
            c.model.body.rotation.set(0, 0, 0);
            c.model.root.rotation.y = 0;
            return true;
          }
        }
        c.model.root.rotation.y = 0.5 * k;
        c.model.body.rotation.z = 0.06 * k;
      };
    } else if (kind === "panne") {
      const badge = createBadge(drawFuel, "#f08a1c");
      badge.position.set(0.62 * side, 0.75, 0);
      root.add(badge);
      prop.update = (pr, t, c) => {
        const a = clamp01((t - pr.born) / 900);
        // engine sputters: three jolts, then silence
        const jolt = a < 1 ? Math.max(0, Math.sin(a * Math.PI * 6)) * (1 - a) : 0;
        c.model.body.rotation.x = -0.05 * jolt;
        if (a < 1 && Math.sin(a * Math.PI * 6) > 0.95) this.emit(c.model.root, new THREE.Vector3(0, 0.12, -0.55), "#2b2b2e", 0.8, 700, 0.5);
        const blink = Math.sin(t / 220) > 0 ? 1 : 0.55;
        badge.scale.setScalar((0.44 * easeOutBack(clamp01((t - pr.born - 600) / 400)) + 0.001) * blink);
        if (pr.leaving !== null) {
          const b = clamp01((t - pr.leaving) / 600);
          (badge.material as THREE.SpriteMaterial).color.set("#4cd07d");
          badge.scale.setScalar(0.44 * (1 + b * 0.6) * (1 - b) + 0.001);
          return b >= 1;
        }
      };
    }
    return prop;
  }

  // ------------------------------------------------------------ particles

  private spawn(world: THREE.Vector3, color: string, opacity: number, life: number, size: number, vel: THREE.Vector3, grow: number, gravity = 0) {
    const sprite = createPuff(color, opacity);
    sprite.position.copy(world);
    sprite.scale.setScalar(size);
    this.scene.add(sprite);
    this.particles.push({ sprite, age: 0, life, vel, grow, baseOpacity: opacity, gravity });
  }

  private emit(parent: THREE.Object3D, local: THREE.Vector3, color: string, opacity: number, life: number, size: number) {
    const scale = parent.getWorldScale(new THREE.Vector3()).x;
    this.spawn(
      parent.localToWorld(local.clone()),
      color,
      opacity,
      life,
      size * scale * 0.3,
      new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.55, (Math.random() - 0.5) * 0.2).multiplyScalar(scale),
      size * scale * 0.9,
    );
  }

  private burst(parent: THREE.Object3D, color: string, count: number, size: number) {
    const scale = parent.getWorldScale(new THREE.Vector3()).x;
    const origin = parent.getWorldPosition(new THREE.Vector3());
    origin.y += 0.1 * scale;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(
        origin,
        color,
        0.9,
        650,
        size * scale * 0.25,
        new THREE.Vector3(Math.cos(a), 0.4 + Math.random() * 0.6, Math.sin(a)).multiplyScalar(scale * 1.4),
        size * scale * 0.35,
      );
    }
  }

  private firework(t: number) {
    const f = this.path.finish;
    // sized for the zoomed-in finish shot, whatever the perspective there
    const size = Math.max(f.s, 42);
    const base = this.ground(f.x + (Math.random() - 0.5) * size * 4, f.y + (Math.random() - 0.5) * size * 1.2);
    base.y = size * (2.2 + Math.random() * 1.8);
    const colors = ["#ffd23f", "#ff5d73", "#4fc3ff", "#7dff9b", "#ffffff", "#c38bff"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const up = Math.random() * 0.8 - 0.2;
      this.spawn(
        base,
        color,
        1,
        900 + Math.random() * 300,
        size * 0.18,
        new THREE.Vector3(Math.cos(a), up, Math.sin(a)).multiplyScalar(size * (1.8 + Math.random())),
        size * 0.05,
        size * 1.6,
      );
    }
    this.lastFirework = t;
  }

  // ------------------------------------------------------------ frame loop

  private loop(t: number) {
    if (this.disposed) return;
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000);
    this.last = t;
    const positions = new Map<string, CarScreenPos>();

    for (const car of this.cars.values()) {
      const prevKm = car.km;
      const m = car.model;
      let swerve = 0;
      let flameOn = false;
      if (car.km !== car.toKm) {
        const a = clamp01((t - car.moveStart) / car.moveDur);
        const eased = car.style === "turbo" ? 1 - Math.pow(1 - a, 3) : easeInOut(a);
        car.km = car.fromKm + (car.toKm - car.fromKm) * eased;
        if (a >= 1) car.km = car.toKm;
        // squat when launching, nose dive when braking
        const accel = a < 0.25 ? Math.sin((a / 0.25) * Math.PI) : 0;
        const brake = a > 0.72 ? Math.sin(((a - 0.72) / 0.28) * Math.PI) : 0;
        const launch = car.style === "turbo" || car.style === "sprint" ? 2 : car.style === "fast" ? 1.4 : 1;
        m.body.rotation.x = -0.06 * accel * launch + 0.07 * brake;
        m.brakeLights.emissiveIntensity = 0.3 + brake * 2.4;

        const behind = new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.05, -0.55);
        if (car.style === "turbo") {
          flameOn = a < 0.85;
          if (t - car.lastPuff > 40 && a < 0.9) {
            car.lastPuff = t;
            this.emit(m.root, behind, Math.random() < 0.5 ? "#63b8ff" : "#cfe9ff", 0.8, 700, 0.9);
          }
        } else if (car.style === "shortcut") {
          m.body.position.y = Math.abs(Math.sin(a * Math.PI * 7)) * 0.05 * (1 - a);
          m.body.rotation.z = Math.sin(a * Math.PI * 9) * 0.05 * (1 - a);
          if (t - car.lastPuff > 45 && a < 0.9) {
            car.lastPuff = t;
            this.emit(m.root, behind, "#b88a55", 0.75, 1000, 1.3);
          }
        } else if (car.style === "sprint") {
          if (t - car.lastPuff > 50 && a < 0.95) {
            car.lastPuff = t;
            this.emit(m.root, behind, Math.random() < 0.5 ? "#ffd23f" : "#fff3b0", 0.95, 800, 0.7);
          }
          if (a >= 1) this.burst(m.root, "#ffd23f", 24, 0.9);
        } else {
          if (car.style === "overtake") swerve = Math.sin(a * Math.PI) * 0.95 * Math.sign(0.001 - car.lateral || 1);
          const gap = car.style === "fast" || car.style === "overtake" ? 45 : 70;
          if (t - car.lastPuff > gap && a > 0.05 && a < 0.9) {
            car.lastPuff = t;
            this.emit(m.root, behind, "#e9dcc2", 0.55, 900, car.style === "fast" ? 1 : 0.7);
          }
        }
      } else if (!car.props.size) {
        m.body.rotation.x *= 0.85;
        m.body.rotation.z *= 0.85;
        m.brakeLights.emissiveIntensity = 0.3;
      }
      car.flame.visible = flameOn;
      if (flameOn) car.flame.scale.set(1, 1, 0.8 + Math.random() * 0.5);

      car.lateral += (car.lateralTarget - car.lateral) * Math.min(1, dt * 5);
      this.place(car, car.km, swerve);
      m.body.rotation.y = swerve * 0.35;
      // wheels spin with the distance covered
      const spin = ((car.km - prevKm) / Math.max(1, this.target)) * 900;
      for (const w of m.wheels) w.rotation.x += spin;
      // idle engine shimmer
      if (!car.props.size && car.km === car.toKm) m.body.position.y = Math.sin(t / 90 + car.id.length) * 0.004;

      // the driver's ring breathes; the others stay dim
      const ringMat = car.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = car.active ? 0.7 + 0.25 * Math.sin(t / 260) : 0.28;
      const rs = car.active ? 1 + 0.05 * Math.sin(t / 260) : 1;
      car.ring.scale.set(rs, rs * 1.35, 1);

      // protection just installed: green bubble and sparkles
      const bubble = clamp01((t - car.bubbleAt) / 1100);
      if (bubble < 1) {
        const k = pulse(bubble);
        ringMat.color.set("#5dffa0");
        car.ring.scale.set(1 + k * 0.9, (1 + k * 0.9) * 1.35, 1);
        ringMat.opacity = 0.95 * (1 - bubble) + 0.3;
        if (bubble < 0.08) this.burst(m.root, "#8dffbe", 3, 0.6);
      } else ringMat.color.set((m.paint.color as THREE.Color).getStyle());
      for (const item of car.equipment.values()) {
        const e = clamp01((t - item.born) / 650);
        item.root.position.y = (1 - easeOutBack(e)) * 1.2;
        if (item.light) item.light.emissiveIntensity = 0.4 + (Math.sin(t / 130) > 0.2 ? 1.6 : 0);
      }

      // GPS stratégique: a column of light from the sky
      const beamT = clamp01((t - car.beamAt) / 1500);
      const beamMat = car.beam.material as THREE.MeshBasicMaterial;
      beamMat.opacity = beamT < 1 ? pulse(beamT) * 0.55 : 0;
      car.beam.visible = beamT < 1;
      if (beamT < 1 && t - car.lastPuff > 70) {
        car.lastPuff = t;
        this.emit(m.root, new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.2, (Math.random() - 0.5) * 0.5), "#ffe28a", 0.9, 800, 0.5);
      }

      for (const prop of car.props.values()) {
        if (prop.update(prop, t, car)) this.removeProp(car, prop);
      }
      positions.set(car.id, { x: car.pose.x, y: car.pose.y, size: this.carSize(car.pose), active: car.active });
    }

    if (t < this.fireworksUntil && t - this.lastFirework > 220) this.firework(t);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt * 1000;
      const k = p.age / p.life;
      if (k >= 1) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.sprite.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(0.96);
      p.vel.y -= p.gravity * dt;
      p.sprite.scale.setScalar(p.sprite.scale.x + p.grow * dt);
      p.sprite.material.opacity = p.baseOpacity * (1 - k);
    }

    this.renderer.render(this.scene, this.camera);
    this.onFrame?.(positions);
    this.raf = requestAnimationFrame(this.loop);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const material = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((x) => x.dispose());
      else material?.dispose();
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
