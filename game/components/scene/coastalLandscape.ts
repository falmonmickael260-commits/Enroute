import * as THREE from "three";
import { treeCrown } from "./coastalNature";
import type { CoastalHouse } from "./coastalArchitecture";

type Plant = { m: THREE.Matrix4; c: THREE.Color };
type Trunk = { m: THREE.Matrix4 };
const smooth = THREE.MathUtils.smoothstep;
const hash = (x: number, z: number) => { const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;return n - Math.floor(n); };

export function groveDensity(x: number, z: number) {
  let density = 0;
  for (const [cx, cz, radius] of [[-22,-12,14],[-31,-49,16],[-16,-88,12],[-24,-124,17],[-47,-137,15]]) {
    density = Math.max(density, Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * radius ** 2)));
  }
  return density;
}

/** Nearby queries stay bounded as the number of scenery instances grows. */
class Spacing {
  private cells = new Map<string, { x: number; z: number; radius: number }[]>();
  private key(x: number, z: number) { return `${Math.floor(x / 4)}:${Math.floor(z / 4)}`; }
  free(x: number, z: number, radius: number) {
    const cx = Math.floor(x / 4), cz = Math.floor(z / 4);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      for (const other of this.cells.get(`${cx + dx}:${cz + dz}`) ?? []) {
        if (Math.hypot(x - other.x, z - other.z) < radius + other.radius) return false;
      }
    }
    return true;
  }
  add(x: number, z: number, radius: number) {
    const key = this.key(x, z), list = this.cells.get(key) ?? [];
    list.push({ x, z, radius });this.cells.set(key, list);
  }
}

/** Retain original sites, but make groves and clearings instead of uniform scatter. */
export function arrangeVegetation(pines: Plant[], trunks: Trunk[], cypress: Plant[], bushes: Plant[], houses: CoastalHouse[]) {
  const trees = new Spacing(), shrubs = new Spacing(), p = new THREE.Vector3();
  const awayFromHomes = (x: number, z: number, radius: number) => houses.every(h =>
    Math.hypot(x - h.x, z - h.z) > Math.hypot(h.w, h.d) * 0.5 + radius);
  const keptPines: Plant[] = [], keptTrunks: Trunk[] = [], keptCypress: Plant[] = [], keptBushes: Plant[] = [];
  const pairs = pines.map((pine, i) => ({ pine, trunk: trunks[i], centre: new THREE.Vector3().setFromMatrixPosition(pine.m) }));
  pairs.sort((a, b) => groveDensity(b.centre.x, b.centre.z) - groveDensity(a.centre.x, a.centre.z));
  for (const { pine, trunk, centre } of pairs) {
    if (!trunk) continue;
    const { x, z } = centre;
    if (hash(x, z) > 0.18 + groveDensity(x, z) * 0.8 || !awayFromHomes(x, z, 1.6) || !trees.free(x, z, 1.5)) continue;
    trees.add(x, z, 1.5);
    // Height changes are anchored at the ground, so trunks never float.
    const position = new THREE.Vector3(), scale = new THREE.Vector3(), q = new THREE.Quaternion();
    trunk.m.decompose(position, q, scale);
    const oldGround = position.y - scale.y / 2;
    const ground = Math.max(oldGround, foothillHeight(x, z)), factor = 0.82 + hash(z + 13, x) * 0.4;
    scale.y *= factor;position.y = ground + scale.y / 2;trunk.m.compose(position, q, scale);
    pine.m.decompose(position, q, scale);position.y = ground + (centre.y - oldGround - 0.1) * factor + 0.1;
    scale.multiply(new THREE.Vector3(0.92 + hash(x + 4, z) * 0.13, 0.85 + hash(z, x + 8) * 0.3, 0.92 + hash(z + 3, x) * 0.13));
    pine.m.compose(position, q, scale);keptPines.push(pine);keptTrunks.push(trunk);
  }
  for (const plant of cypress) {
    p.setFromMatrixPosition(plant.m);
    if (hash(p.z + 8, p.x) > 0.25 + groveDensity(p.x, p.z) * 0.65 || !awayFromHomes(p.x, p.z, 0.75) || !trees.free(p.x, p.z, 0.65)) continue;
    trees.add(p.x, p.z, 0.65);
    const scale = new THREE.Vector3(), q = new THREE.Quaternion();plant.m.decompose(p, q, scale);
    p.y += Math.max(0, foothillHeight(p.x, p.z) - (p.y - scale.y / 2));plant.m.compose(p, q, scale);
    keptCypress.push(plant);
  }
  for (const plant of bushes) {
    p.setFromMatrixPosition(plant.m);
    const nearTree = !trees.free(p.x, p.z, 2.5);
    const flowers = plant.c.r > plant.c.g * 1.2;
    if (!flowers && hash(p.x - 7, p.z) > 0.22 + groveDensity(p.x, p.z) * 0.55 + (nearTree ? 0.22 : 0)) continue;
    if (!shrubs.free(p.x, p.z, 0.42)) continue;
    shrubs.add(p.x, p.z, 0.42);
    const scale = new THREE.Vector3(), q = new THREE.Quaternion();plant.m.decompose(p, q, scale);
    p.y += Math.max(0, foothillHeight(p.x, p.z) - (p.y - scale.y * 4 / 9));plant.m.compose(p, q, scale);
    keptBushes.push(plant);
  }
  return { pines: keptPines, trunks: keptTrunks, cypress: keptCypress, bushes: keptBushes };
}

function terrainGrid(width: number, depth: number, nx: number, nz: number, cx: number, cz: number, height: (x: number, z: number) => number, tint: (x: number, z: number, y: number) => THREE.Color) {
  const geometry = new THREE.PlaneGeometry(width, depth, nx, nz);geometry.rotateX(-Math.PI / 2);geometry.translate(cx, 0, cz);
  const p = geometry.attributes.position as THREE.BufferAttribute, colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = height(x, z);p.setY(i, y);tint(x, z, y).toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));geometry.computeVertexNormals();return geometry;
}

/** A continuous range has valleys and ridges, not repeated giant rounded cones. */
export function mountainRange() {
  return terrainGrid(380, 174, 100, 58, 0, -258, (x, z) => {
    const t = (-z - 171) / 174, fade = smooth(t, 0, 0.15) * (1 - smooth(t, 0.85, 1)) * (1 - smooth(Math.abs(x), 165, 190));
    const first = Math.exp(-Math.pow((z + 223) / 31, 2)) * (18 + 13 * Math.sin(x * 0.025 + 0.7) ** 2 + Math.sin(x * 0.067) * 4);
    const second = Math.exp(-Math.pow((z + 290) / 42, 2)) * (23 + 12 * Math.sin(x * 0.022 - 1) ** 2);
    return -5 + fade * (Math.max(first, second) + Math.sin(x * 0.16 + z * 0.11) * 1.2);
  }, (x, z, y) => new THREE.Color().setHSL(0.55 + (-z - 171) / 174 * 0.025, 0.12, 0.38 + (-z - 171) / 174 * 0.12 + y * 0.0015 + Math.sin(x * 0.03) * 0.015));
}

export function foothillHeight(x: number, z: number) {
  const u = (x + 133) / 110, v = (z + 185) / 230;
  const fade = smooth(u, 0, 0.17) * (1 - smooth(u, 0.68, 1)) * smooth(v, 0, 0.12) * (1 - smooth(v, 0.88, 1));
  return -4 + fade * (29 + Math.sin(z * 0.045) * 5 + Math.sin(x * 0.085 + z * 0.026) * 4);
}

export function inlandFoothills() {
  return terrainGrid(110, 230, 48, 90, -78, -70, foothillHeight,
    (x, z, y) => new THREE.Color().setHSL(0.245 + Math.sin(z * 0.03) * 0.012, 0.22, 0.31 + y * 0.0018 + Math.sin(x * 0.1) * 0.025));
}

/** Small paths and planted edges connect the visible houses to their setting. */
export function buildVillageGardens(scene: THREE.Scene, homes: CoastalHouse[], ground: (x: number, z: number) => number, clear: (x: number, z: number) => boolean, disposables: { dispose(): void }[]) {
  const stones: THREE.Matrix4[] = [], hedges: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
  for (const home of homes) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), home.yaw);
    const at = (x: number, z: number) => new THREE.Vector3(x, 0, z).applyQuaternion(q).add(new THREE.Vector3(home.x, 0, home.z));
    for (let i = 0; i < 7; i++) {
      const p = at(-home.w * 0.1 + Math.sin(i * 0.7) * 0.06, home.d * 0.44 + 0.25 + i * 0.26);
      if (!clear(p.x, p.z)) continue;
      p.y = ground(p.x, p.z) + 0.025;stones.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(0.2, 0.03, 0.14)));
    }
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const p = at(side * (home.w / 2 + 0.3), -home.d * 0.22 + i * 0.45);
      if (!clear(p.x, p.z)) continue;
      p.y = ground(p.x, p.z) + 0.14;
      hedges.push({ matrix: new THREE.Matrix4().compose(p, q, new THREE.Vector3(0.52, 0.5, 0.52)), color: new THREE.Color("#8a9c63") });
    }
  }
  const stoneGeo = new THREE.SphereGeometry(1, 9, 5), stoneMat = new THREE.MeshStandardMaterial({ color: "#d2c5a8", roughness: 0.95 });
  const foliage = treeCrown(true).translate(0, -0.1, 0), leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  disposables.push(stoneGeo, stoneMat, foliage, leafMat);
  if (stones.length) { const m = new THREE.InstancedMesh(stoneGeo, stoneMat, stones.length);stones.forEach((p, i) => m.setMatrixAt(i, p));m.receiveShadow = true;scene.add(m); }
  if (hedges.length) { const m = new THREE.InstancedMesh(foliage, leafMat, hedges.length);hedges.forEach((p, i) => {m.setMatrixAt(i, p.matrix);m.setColorAt(i, p.color)});m.castShadow = m.receiveShadow = true;scene.add(m); }
}
