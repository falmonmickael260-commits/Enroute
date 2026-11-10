import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Item = { m: THREE.Matrix4; c?: THREE.Color };
type Disposable = { dispose(): void };

function merge(parts: THREE.BufferGeometry[]) {
  // Every part is non-indexed, with matching attributes, for reliable batching.
  const plain = parts.map(p => p.index ? p.toNonIndexed() : p);
  const geometry = mergeGeometries(plain)!;
  new Set([...parts, ...plain]).forEach(p => p.dispose());
  return geometry;
}

function tinted(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation) {
  const c = new THREE.Color(color);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) c.toArray(colors, i);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function branch(a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const direction = b.clone().sub(a);
  const geo = new THREE.CylinderGeometry(radius * 0.5, radius, direction.length(), 6);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  geo.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
  const position = geo.attributes.position as THREE.BufferAttribute;
  const axis = b.clone().sub(a), lengthSq = axis.lengthSq();
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const u = THREE.MathUtils.clamp(v.clone().sub(a).dot(axis) / lengthSq, 0, 1);
    const centreY = a.y + axis.y * u;
    position.setY(i, centreY + (v.y - centreY) * 0.08);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Bent trunk and visible forks, normalised to the existing trunk anchors. */
export function branchingTrunk() {
  const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const geometry = merge([
    branch(p(0, -0.5, 0), p(0.45, 0.15, 0.1), 0.7),
    branch(p(0.45, 0.12, 0.1), p(-3.2, 0.67, 1.5), 0.42),
    branch(p(0.45, 0.08, 0.1), p(3.6, 0.65, -1.6), 0.42),
    branch(p(0.2, -0.05, 0), p(0.3, 0.72, 3.3), 0.34),
  ]);
  return geometry;
}

/** Full, asymmetric crowns instead of flattened umbrella discs. */
export function treeCrown(olive = false) {
  const parts: THREE.BufferGeometry[] = [];
  const lobes = olive ? 13 : 11;
  for (let i = 0; i < lobes; i++) {
    const angle = i * 2.39996;
    const ring = i < 7 ? 0.34 : 0.2;
    const radius = 0.22 + (Math.sin(i * 5.8) + 1) * 0.055;
    const leaf = new THREE.SphereGeometry(radius, 7, 5);
    const p = leaf.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
      const fold = 1 + 0.12 * Math.sin(x * 34 + z * 21 + i);
      p.setXYZ(j, x * fold, y * (olive ? 1.05 : 0.9), z * fold);
    }
    leaf.translate(Math.cos(angle) * ring, 0.08 + (i >= 7 ? 0.25 : Math.sin(i * 2) * 0.09), Math.sin(angle) * ring);
    leaf.computeVertexNormals();
    parts.push(tinted(leaf, olive ? ["#c1c6a2", "#dce1bd", "#aab995"][i % 3] : ["#9cac69", "#c0cb85", "#889b5e"][i % 3]));
  }
  return merge(parts);
}

export function layeredCypress() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const radius = 0.32 * Math.sin((i + 1) / 9 * Math.PI) + 0.045;
    const leaf = new THREE.SphereGeometry(1, 7, 5);
    leaf.scale(radius, 0.19, radius * 0.87);
    leaf.translate(Math.sin(i * 2) * 0.045, -0.37 + i * 0.12, Math.cos(i * 3) * 0.035);
    parts.push(tinted(leaf, i % 2 ? "#d0dbad" : "#9daf82"));
  }
  return merge(parts);
}

export function sculptedRock() {
  const rock = new THREE.IcosahedronGeometry(0.62, 1);
  const p = rock.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const rough = 0.9 + Math.sin(x * 12 + z * 9) * 0.12;
    p.setXYZ(i, x * rough, Math.max(-0.25, y * 0.78), z * rough);
  }
  rock.computeVertexNormals();
  return rock;
}

function grassClump() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    const h = 0.5 + (i % 3) * 0.16;
    const leaf = new THREE.BufferGeometry();
    leaf.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.06, -0.5, 0, 0.06, -0.5, 0,
      Math.cos(a) * 0.2, h - 0.5, Math.sin(a) * 0.2,
    ], 3));
    leaf.computeVertexNormals();
    parts.push(leaf);
  }
  return merge(parts);
}

function flowerHeads() {
  const petals: THREE.BufferGeometry[] = [];
  for (let flower = 0; flower < 3; flower++) {
    const x = Math.sin(flower * 2.4) * 0.25, z = Math.cos(flower * 2.4) * 0.25;
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 2 / 5;
      const petal = new THREE.SphereGeometry(0.11, 5, 3);
      petal.scale(1, 0.35, 0.65);
      petal.rotateY(-a);
      petal.translate(x + Math.cos(a) * 0.08, 0.2 + flower * 0.07, z + Math.sin(a) * 0.08);
      petals.push(petal);
    }
  }
  return merge(petals);
}

/** Convert the existing coloured verge balls into actual grasses and flowers. */
export function buildWildPlants(scene: THREE.Scene, samples: Item[], disposables: Disposable[]) {
  const draw = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[]) => {
    disposables.push(geometry, material);
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    items.forEach((item, i) => { mesh.setMatrixAt(i, item.m); if (item.c) mesh.setColorAt(i, item.c); });
    mesh.receiveShadow = true;
    scene.add(mesh);
  };
  const hsl = { h: 0, s: 0, l: 0 };
  const flowers = samples.filter(item => { item.c?.getHSL(hsl); return hsl.h < 0.2 || hsl.h > 0.4 || hsl.s < 0.1; });
  // Grass blades remain green even underneath purple or yellow flowers.
  draw(grassClump(), new THREE.MeshStandardMaterial({ color: "#73824b", side: THREE.DoubleSide, roughness: 1 }), samples.map(({ m }) => ({ m })));
  draw(flowerHeads(), new THREE.MeshStandardMaterial({ roughness: 0.9 }), flowers);
}
