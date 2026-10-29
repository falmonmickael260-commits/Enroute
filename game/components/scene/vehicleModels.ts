import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createMoto, createScooter, createQuad, type CarModel } from "./models";
import { createTouringCar } from "./premiumCars";

/** Shared by the real race renderer and its visual integration checks. */
export function buildVehicleModel(id: string, color: string): CarModel {
  const factory =
    id === "moto"
      ? createMoto
      : id === "scooter"
        ? createScooter
        : id === "quad"
          ? createQuad
          : null;
  if (!factory) return createTouringCar(id, color);
  const model = factory(color);
  const originalPaint = model.paint;
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.48,
    roughness: 0.24,
    clearcoat: 0.9,
    clearcoatRoughness: 0.2,
  });
  const copies = new Map<THREE.Material, THREE.Material>([
    [originalPaint, paint],
  ]);
  const oldGeometries = new Set<THREE.BufferGeometry>();
  model.root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    oldGeometries.add(o.geometry);
    const copy = (material: THREE.Material) => {
      if (!copies.has(material)) copies.set(material, material.clone());
      return copies.get(material)!;
    };
    o.material = Array.isArray(o.material)
      ? o.material.map(copy)
      : copy(o.material);
  });
  model.paint = paint;
  model.brakeLights = copies.get(
    model.brakeLights,
  ) as THREE.MeshStandardMaterial;
  const alloy = new THREE.MeshStandardMaterial({
    color: "#aab7c3",
    metalness: 0.85,
    roughness: 0.24,
  });
  for (const [i, wheel] of model.wheels.entries()) {
    const radius = id === "scooter" ? 0.085 : id === "quad" ? 0.11 : 0.12;
    const width = id === "quad" ? 0.1 : id === "scooter" ? 0.06 : 0.07;
    const tyre = new THREE.TorusGeometry(radius * 0.78, radius * 0.22, 10, 28);
    tyre.rotateY(Math.PI / 2);
    tyre.scale(width / (radius * 0.44), 1, 1);
    wheel.geometry = tyre;
    wheel.clear();
    const pieces: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const lip = new THREE.TorusGeometry(radius * 0.63, 0.006, 5, 24);
      lip.rotateY(Math.PI / 2);
      lip.translate(side * (width / 2 + 0.003), 0, 0);
      pieces.push(lip);
      for (let spoke = 0; spoke < 6; spoke++) {
        const geo = new THREE.BoxGeometry(0.01, radius * 1.08, 0.011);
        geo.rotateX((spoke * Math.PI) / 6);
        geo.translate(side * (width / 2 + 0.003), 0, 0);
        pieces.push(geo);
      }
    }
    const merged = mergeGeometries(pieces);
    pieces.forEach((g) => g.dispose());
    if (merged) wheel.add(new THREE.Mesh(merged, alloy));
    wheel.name = `wheel-${i}`;
    wheel.userData.rest = wheel.scale.clone();
    wheel.userData.axle = "x";
    wheel.userData.up = "y";
  }
  // Rider, fork, fairing and frame keep their poses, but share static draw calls.
  model.root.updateMatrixWorld(true);
  const inverse = model.body.matrixWorld.clone().invert();
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const remove: THREE.Object3D[] = [];
  model.body.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const g = o.geometry
      .clone()
      .applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    g.deleteAttribute("uv");
    const list = batches.get(o.material) ?? [];
    list.push(g.index ? g.toNonIndexed() : g);
    if (g.index) g.dispose();
    batches.set(o.material, list);
    remove.push(o);
  });
  remove.forEach((o) => o.removeFromParent());
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    if (merged) model.body.add(new THREE.Mesh(merged, material));
  }
  oldGeometries.forEach((g) => g.dispose());
  originalPaint.dispose();
  const geometries = new Set<THREE.BufferGeometry>();
  model.root.traverse((o) => {
    if (o instanceof THREE.Mesh) geometries.add(o.geometry);
  });
  model.root.userData.disposeModel = () => {
    geometries.forEach((g) => g.dispose());
    copies.forEach((m) => m.dispose());
    alloy.dispose();
  };
  model.root.userData.vehicleId = id;
  model.root.userData.renderRevision = 2;
  model.root.userData.renderSource = "mesh-3d";
  return model;
}
