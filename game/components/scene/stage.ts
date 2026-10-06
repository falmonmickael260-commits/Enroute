import type * as THREE from "three";

/** Where a car sits: world position, heading (yaw) and scale of its frame. */
export interface Placement {
  position: THREE.Vector3;
  yaw: number;
  scale: number;
}

/** Screen position of a car for its HTML label, in the stage's own units. */
export interface ScreenPoint {
  x: number;
  y: number;
  /** Apparent car size, used to scale the label. */
  size: number;
}

/** What the camera should look at (stages without their own camera ignore it). */
export type Shot =
  | { kind: "pack" }
  | { kind: "overview" }
  | { kind: "follow"; id: string }
  /** On one car; `hazard` picks the cinematic angle for the attack it takes. */
  | { kind: "car"; id: string; hazard?: string }
  | { kind: "finish"; winnerId?: string }
  /** Opening flyover: over the sea, along the coast, down to the grid. */
  | { kind: "intro" };

export interface StageCar {
  id: string;
  km: number;
  position: THREE.Vector3;
  yaw: number;
  /** How it is driving right now (turbo, overtake…), when it moves. */
  style?: string;
}

/**
 * A setting for the 3D pieces: builds its environment, owns the camera and
 * decides where a given km lies. SceneRenderer does the rest (cars, hazards,
 * effects), so the same pieces work on a painted scene or a full 3D world.
 */
export interface Stage {
  readonly camera: THREE.Camera;
  /** Real shadows from the sun instead of the soft blob under each car. */
  readonly castShadows: boolean;
  init(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void;
  resize(width: number, height: number, bottomInset: number): void;
  /**
   * Pose of a car at `km`. `lateral` shifts it across the road and `along`
   * along the road (negative = further back), both in car lengths.
   */
  place(km: number, target: number, lateral: number, along?: number): Placement;
  finish(target: number): Placement;
  /** Which side (±1 along the car's local x) faces the middle of the view. */
  sideTowardView(position: THREE.Vector3, yaw: number): number;
  project(position: THREE.Vector3, scale: number): ScreenPoint;
  setShot(shot: Shot): void;
  frame(dt: number, t: number, cars: StageCar[], target: number): void;
  dispose(): void;
}
