import * as THREE from "three";
import { ScenePath } from "./scenePath";
import type { Placement, ScreenPoint, Stage } from "./stage";

/** Car length relative to the road's half-width at that point. */
const CAR_SIZE = 0.95;

/**
 * An illustrated picture used as the ground: an orthographic camera tilted to
 * the painting's angle maps a ground point (x, 0, y / sin θ) exactly onto
 * image pixel (x, y); the traced road width gives each car its perspective
 * scale. The camera never moves here (the page zooms the whole picture).
 */
export class PictureStage implements Stage {
  readonly camera: THREE.OrthographicCamera;
  readonly castShadows = false;
  private readonly sinP: number;

  constructor(private readonly path: ScenePath) {
    const { width, height, pitchDeg } = path.def;
    const pitch = (pitchDeg * Math.PI) / 180;
    this.sinP = Math.sin(pitch);
    this.camera = new THREE.OrthographicCamera(0, width, 0, -height, 1, 40000);
    this.camera.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch);
    this.camera.position.set(0, this.sinP * 20000, Math.cos(pitch) * 20000);
    this.camera.updateMatrixWorld();
  }

  init(_renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    scene.add(new THREE.HemisphereLight("#f4f8ff", "#6f8a52", 1.1));
    const sun = new THREE.DirectionalLight("#fff0d6", 2.4);
    sun.position.set(-0.8, 1.6, 0.6);
    scene.add(sun);
  }

  resize() {}

  place(km: number, target: number, lateral: number): Placement {
    const p = this.path.atKm(km, target);
    const size = p.s * CAR_SIZE;
    // ground direction of travel: undo the vertical squash of the painting
    const gx = p.tx;
    const gz = p.ty / this.sinP;
    const gl = Math.hypot(gx, gz) || 1;
    const position = new THREE.Vector3(p.x + (-gz / gl) * lateral * size, 0, p.y / this.sinP + (gx / gl) * lateral * size);
    return { position, yaw: Math.atan2(gx, gz), scale: size };
  }

  finish(target: number): Placement {
    return this.place(target, target, 0);
  }

  sideTowardView(position: THREE.Vector3, yaw: number) {
    return Math.sign(Math.cos(yaw) * (this.path.def.width / 2 - position.x)) || 1;
  }

  project(position: THREE.Vector3, scale: number): ScreenPoint {
    return { x: position.x, y: position.z * this.sinP, size: scale };
  }

  setShot() {}

  frame() {}

  dispose() {}
}
