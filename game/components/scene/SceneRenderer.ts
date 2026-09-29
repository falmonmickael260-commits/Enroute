import * as THREE from "three";
import type { HazardType } from "@/game/types/game";
import { ScenePath, type RoadSample } from "./scenePath";
import {
  createBadge,
  createBarrier,
  createBlobShadow,
  createCar,
  createGlowRing,
  createLimitPlate,
  createNails,
  createPuff,
  createRadar,
  createTriangle,
  drawFuel,
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
  active: boolean;
}

export interface CarScreenPos {
  x: number;
  y: number;
  /** Car size in image pixels, for labels. */
  size: number;
}

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

interface Particle {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  vel: THREE.Vector3;
  grow: number;
  baseOpacity: number;
}

interface Prop {
  kind: HazardType;
  root: THREE.Group;
  born: number;
  /** Set when the hazard was cleared: the prop plays its exit then goes. */
  leaving: number | null;
  update: (prop: Prop, now: number, car: CarEntity) => boolean | void;
}

interface CarEntity {
  id: string;
  frame: THREE.Group;
  model: CarModel;
  ring: THREE.Mesh;
  km: number;
  fromKm: number;
  toKm: number;
  moveStart: number;
  moveDur: number;
  lateral: number;
  lateralTarget: number;
  props: Map<HazardType, Prop>;
  lastPuff: number;
  pose: RoadSample;
}

export class SceneRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private readonly path: ScenePath;
  private readonly sinP: number;
  private readonly cosP: number;
  private readonly cars = new Map<string, CarEntity>();
  private readonly particles: Particle[] = [];
  private target = 1000;
  private raf = 0;
  private last = 0;
  private disposed = false;
  onFrame: ((positions: Map<string, CarScreenPos>) => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    path: ScenePath,
    quality = 1,
  ) {
    this.path = path;
    const { width, height, pitchDeg } = path.def;
    const pitch = (pitchDeg * Math.PI) / 180;
    this.sinP = Math.sin(pitch);
    this.cosP = Math.cos(pitch);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.setQuality(quality);

    // Screen x = world x; screen y (down) = z·sinθ − y·cosθ.
    this.camera = new THREE.OrthographicCamera(0, width, 0, -height, 1, 40000);
    this.camera.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch);
    const dir = new THREE.Vector3(0, -this.sinP, -this.cosP);
    this.camera.position.copy(dir.multiplyScalar(-20000));
    this.camera.updateMatrixWorld();

    this.scene.add(new THREE.HemisphereLight("#f4f8ff", "#6f8a52", 1.9));
    const sun = new THREE.DirectionalLight("#fff0d6", 2.2);
    sun.position.set(-0.8, 1.6, 0.6);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight("#bcd7ff", 0.6);
    fill.position.set(1, 0.6, -1);
    this.scene.add(fill);

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
  private place(car: CarEntity, km: number) {
    const p = this.path.atKm(km, this.target);
    const size = this.carSize(p);
    // ground direction of travel: undo the vertical squash of the painting
    const gx = p.tx;
    const gz = p.ty / this.sinP;
    const gl = Math.hypot(gx, gz) || 1;
    const nx = -gz / gl;
    const nz = gx / gl;
    const lat = car.lateral * size;
    const pos = this.ground(p.x, p.y);
    pos.x += nx * lat;
    pos.z += nz * lat;
    car.frame.position.copy(pos);
    car.frame.rotation.y = Math.atan2(gx, gz);
    car.frame.scale.setScalar(size);
    car.frame.updateMatrixWorld(true);
    car.pose = p;
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
        car.km = car.fromKm = car.toKm = p.km;
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
        car.moveDur = Math.min(2600, 950 + (dist / Math.max(1, target)) * 5200);
      }
      (car.ring.material as THREE.MeshBasicMaterial).opacity = p.active ? 0.95 : 0.35;
      this.syncHazards(car, p, now);
    }

    for (const [id, car] of this.cars) {
      if (!seen.has(id)) {
        this.scene.remove(car.frame);
        this.cars.delete(id);
      }
    }
  }

  /** Whether any car is still driving to its new position. */
  get busy() {
    for (const car of this.cars.values()) if (car.km !== car.toKm) return true;
    return false;
  }

  carScreen(id: string): CarScreenPos | null {
    const car = this.cars.get(id);
    if (!car) return null;
    return { x: car.pose.x, y: car.pose.y, size: this.carSize(car.pose) };
  }

  private createCarEntity(p: ScenePlayer): CarEntity {
    const frame = new THREE.Group();
    const model = createCar(p.color);
    const ring = createGlowRing(p.color);
    frame.add(createBlobShadow(), ring, model.root);
    this.scene.add(frame);
    return {
      id: p.id,
      frame,
      model,
      ring,
      km: p.km,
      fromKm: p.km,
      toKm: p.km,
      moveStart: 0,
      moveDur: 1,
      lateral: 0,
      lateralTarget: 0,
      props: new Map(),
      lastPuff: 0,
      pose: this.path.atKm(p.km, this.target),
    };
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
      if (existing) {
        car.frame.remove(existing.root);
        car.props.delete(kind);
      }
      const prop = this.createProp(kind, now);
      car.frame.add(prop.root);
      car.props.set(kind, prop);
    }
  }

  private createProp(kind: HazardType, now: number): Prop {
    const root = new THREE.Group();
    const prop: Prop = { kind, root, born: now, leaving: null, update: () => {} };

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
        beacon.emissiveIntensity = 0.3 + (Math.sin(t / 110) > 0 ? 1.6 : 0);
        if (a === 1 && t - pr.born < 760) this.burst(barrier, "#e8dcc4", 7, 0.5);
        if (pr.leaving !== null) {
          const b = clamp01((t - pr.leaving) / 650);
          barrier.position.y = easeInOut(b) * 1.6;
          barrier.scale.setScalar(1.35 * (1 - easeInOut(b)) + 0.001);
          return b >= 1;
        }
      };
    } else if (kind === "radar") {
      const { root: radar, flash } = createRadar();
      radar.position.set(1.15, 0, 0.35);
      radar.scale.setScalar(1.7);
      root.add(radar);
      const plate = createLimitPlate();
      plate.position.set(0, 0.95, 0);
      root.add(plate);
      const flashSprite = createPuff("#ffffff", 0);
      flashSprite.position.set(1.15, 1.22, 0.55);
      root.add(flashSprite);
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
      prop.update = (pr, t, car) => {
        const a = clamp01((t - pr.born) / 500);
        nails.scale.setScalar(1.5 * easeOutBack(a) + 0.001);
        const tilt = easeInOut(clamp01((t - pr.born - 250) / 450));
        let k = tilt;
        if (pr.leaving !== null) {
          const b = clamp01((t - pr.leaving) / 700);
          k = 1 - easeInOut(b);
          nails.scale.setScalar(1.5 * (1 - b) + 0.001);
          if (b >= 1) {
            car.model.body.rotation.z = 0;
            car.model.wheels[0].scale.set(1, 1, 1);
            return true;
          }
        }
        car.model.body.rotation.z = -0.2 * k;
        car.model.body.position.y = -0.03 * k;
        car.model.wheels[0].scale.set(1, 1 - 0.55 * k, 1 - 0.1 * k);
        if (t - pr.born > 250 && t - pr.born < 700 && t - car.lastPuff > 60) {
          car.lastPuff = t;
          this.emit(car.model.root, new THREE.Vector3(-0.25, 0.1, 0.31), "#ffffff", 0.9, 700, 1.2);
        }
      };
    } else if (kind === "collision") {
      const tri = createTriangle();
      tri.position.set(0.1, 0, -1.05);
      tri.scale.setScalar(2);
      root.add(tri);
      const badge = createBadge(drawWarning);
      badge.position.set(0, 1.0, 0);
      root.add(badge);
      prop.update = (pr, t, car) => {
        const a = clamp01((t - pr.born) / 650);
        let k = easeOutBack(a);
        tri.scale.setScalar(2 * easeOutBack(clamp01((t - pr.born - 500) / 400)) + 0.001);
        badge.scale.setScalar(0.42 * easeOutBack(clamp01((t - pr.born - 300) / 400)) + 0.03 * Math.sin(t / 160));
        if (t - car.lastPuff > 110 && pr.leaving === null) {
          car.lastPuff = t;
          this.emit(car.model.root, new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.35, 0.35), "#55565c", 0.8, 1500, 1.6);
        }
        if (a < 1 && t - pr.born < 120) this.burst(car.model.root, "#ffd27a", 10, 0.6);
        if (pr.leaving !== null) {
          const b = clamp01((t - pr.leaving) / 700);
          k = 1 - easeInOut(b);
          tri.scale.setScalar(2 * (1 - b) + 0.001);
          badge.scale.setScalar(0.42 * (1 - b) + 0.001);
          if (b < 0.3) this.burst(car.model.root, "#ffe9a8", 2, 0.4);
          if (b >= 1) {
            car.model.body.rotation.set(0, 0, 0);
            car.model.root.rotation.y = 0;
            return true;
          }
        }
        car.model.root.rotation.y = 0.5 * k;
        car.model.body.rotation.z = 0.06 * k;
      };
    } else if (kind === "panne") {
      const badge = createBadge(drawFuel, "#f08a1c");
      badge.position.set(0, 1.0, 0);
      root.add(badge);
      prop.update = (pr, t, car) => {
        const a = clamp01((t - pr.born) / 900);
        // engine sputters: three jolts, then silence
        const jolt = a < 1 ? Math.max(0, Math.sin(a * Math.PI * 6)) * (1 - a) : 0;
        car.model.body.rotation.x = -0.05 * jolt;
        if (a < 1 && Math.sin(a * Math.PI * 6) > 0.95) this.emit(car.model.root, new THREE.Vector3(0, 0.12, -0.55), "#2b2b2e", 0.8, 700, 0.5);
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

  private emit(parent: THREE.Object3D, local: THREE.Vector3, color: string, opacity: number, life: number, size: number) {
    const sprite = createPuff(color, opacity);
    const world = parent.localToWorld(local.clone());
    sprite.position.copy(world);
    const scale = parent.getWorldScale(new THREE.Vector3()).x;
    sprite.scale.setScalar(size * scale * 0.3);
    this.scene.add(sprite);
    this.particles.push({
      sprite,
      age: 0,
      life,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.55, (Math.random() - 0.5) * 0.2).multiplyScalar(scale),
      grow: size * scale * 0.9,
      baseOpacity: opacity,
    });
  }

  private burst(parent: THREE.Object3D, color: string, count: number, size: number) {
    const scale = parent.getWorldScale(new THREE.Vector3()).x;
    for (let i = 0; i < count; i++) {
      const sprite = createPuff(color, 0.85);
      sprite.position.copy(parent.getWorldPosition(new THREE.Vector3()));
      sprite.position.y += 0.1 * scale;
      sprite.scale.setScalar(size * scale * 0.25);
      this.scene.add(sprite);
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        sprite,
        age: 0,
        life: 600,
        vel: new THREE.Vector3(Math.cos(a), 0.4 + Math.random() * 0.5, Math.sin(a)).multiplyScalar(scale * 1.4),
        grow: size * scale * 0.4,
        baseOpacity: 0.85,
      });
    }
  }

  // ------------------------------------------------------------ frame loop

  private loop(t: number) {
    if (this.disposed) return;
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000);
    this.last = t;
    const positions = new Map<string, CarScreenPos>();

    for (const car of this.cars.values()) {
      const prevKm = car.km;
      if (car.km !== car.toKm) {
        const a = clamp01((t - car.moveStart) / car.moveDur);
        car.km = car.fromKm + (car.toKm - car.fromKm) * easeInOut(a);
        if (a >= 1) car.km = car.toKm;
        // squat when launching, nose dive when braking
        const accel = a < 0.25 ? Math.sin((a / 0.25) * Math.PI) : 0;
        const brake = a > 0.72 ? Math.sin(((a - 0.72) / 0.28) * Math.PI) : 0;
        car.model.body.rotation.x = -0.06 * accel + 0.07 * brake;
        car.model.brakeLights.emissiveIntensity = 0.25 + brake * 2.2;
        if (t - car.lastPuff > 70 && a > 0.05 && a < 0.9) {
          car.lastPuff = t;
          this.emit(car.model.root, new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.05, -0.55), "#e9dcc2", 0.55, 900, 0.7);
        }
      } else if (!car.props.size) {
        car.model.body.rotation.x *= 0.85;
        car.model.brakeLights.emissiveIntensity = 0.25;
      }
      car.lateral += (car.lateralTarget - car.lateral) * Math.min(1, dt * 5);
      this.place(car, car.km);
      // wheels spin with the distance covered
      const spin = (car.km - prevKm) * 0.9;
      for (const w of car.model.wheels) w.rotation.x += spin;
      // idle engine shimmer
      car.model.body.position.y = car.props.size ? car.model.body.position.y : Math.sin(t / 90 + car.id.length) * 0.004;

      for (const [kind, prop] of car.props) {
        const done = prop.update(prop, t, car);
        if (done) {
          car.frame.remove(prop.root);
          car.props.delete(kind);
        }
      }
      positions.set(car.id, { x: car.pose.x, y: car.pose.y, size: this.carSize(car.pose) });
    }

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
      const s = p.sprite.scale.x + p.grow * dt;
      p.sprite.scale.setScalar(s);
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
    this.renderer.dispose();
  }
}
