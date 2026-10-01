import * as THREE from "three";
import type { Placement, ScreenPoint, Shot, Stage, StageCar } from "./stage";

/**
 * A small Mediterranean coast built in 3D: a winding road with red and white
 * kerbs runs along cliffs above a turquoise sea, over a stone viaduct and
 * past a village of cream houses with terracotta roofs, cypresses and pines,
 * with mountains in the haze. Units: 1 = one car length.
 *
 * The camera is a racing-game director: it sits behind the pack looking down
 * the road, chases a car while it drives, swings round a car that gets hit,
 * and circles the finish line at the end.
 */

// ---------------------------------------------------------------- the road

const ROAD_POINTS: [number, number, number][] = [
  [0, 0, 26],
  [0, 0, 12], // start line
  [4, 0, 2],
  [8, 0, -9],
  [5, 0, -21],
  [-2, 0, -31],
  [-4, 0.2, -43],
  [1, 0.8, -55],
  [9, 1.6, -65], // viaduct over the cove
  [13, 1.8, -77],
  [12, 1.4, -90],
  [6, 0.8, -102],
  [2, 0.6, -114],
  [5, 0.6, -126], // finish line
  [11, 0.6, -134],
  [17, 0.6, -140],
];
const START_INDEX = 1;
const FINISH_INDEX = 13;
const HALF_WIDTH = 1.35;
const SEA_LEVEL = -1.4;

/** Where the cliffs meet the sea, as x for a given z (the sea is on the right). */
function coastX(z: number) {
  const cove = Math.exp(-Math.pow((z + 76) / 16, 2)); // the inlet under the viaduct
  return 12.5 + 2.6 * Math.sin(z / 13) + 1.4 * Math.sin(z / 5.3) - cove * 9;
}

// deterministic randomness so the scenery is the same for everyone
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise2(x: number, z: number) {
  return (
    Math.sin(x * 0.21 + z * 0.13) * 0.5 +
    Math.sin(x * 0.07 - z * 0.11 + 1.7) * 0.8 +
    Math.sin(x * 0.53 + z * 0.41 + 0.3) * 0.18
  );
}

class Road {
  readonly pts: THREE.Vector3[] = [];
  readonly len: number[] = [];
  readonly startLen: number;
  readonly finishLen: number;

  constructor() {
    const curve = new THREE.CatmullRomCurve3(ROAD_POINTS.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.5);
    const n = (ROAD_POINTS.length - 1) * 60;
    let startLen = 0;
    let finishLen = 0;
    for (let i = 0; i <= n; i++) {
      const p = curve.getPoint(i / n);
      const prev = this.pts[this.pts.length - 1];
      this.len.push(prev ? this.len[this.len.length - 1] + prev.distanceTo(p) : 0);
      this.pts.push(p);
      if (i === START_INDEX * 60) startLen = this.len[i];
      if (i === FINISH_INDEX * 60) finishLen = this.len[i];
    }
    this.startLen = startLen;
    this.finishLen = finishLen;
  }

  get total() {
    return this.len[this.len.length - 1];
  }

  /** Point, forward and right vectors at a length along the road. */
  at(l: number) {
    const L = this.len;
    const clamped = Math.max(0, Math.min(L[L.length - 1], l));
    let lo = 1;
    let hi = L.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (L[mid] < clamped) lo = mid + 1;
      else hi = mid;
    }
    const a = this.pts[lo - 1];
    const b = this.pts[lo];
    const t = (clamped - L[lo - 1]) / (L[lo] - L[lo - 1] || 1);
    const point = a.clone().lerp(b, t);
    const forward = b.clone().sub(a).setY(0).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    return { point, forward, right };
  }

  kmToLen(km: number, target: number) {
    return this.startLen + (this.finishLen - this.startLen) * (target > 0 ? km / target : 0);
  }

  /** Horizontal distance from (x, z) to the road and the road height there. */
  nearest(x: number, z: number) {
    let best = Infinity;
    let y = 0;
    for (let i = 0; i < this.pts.length; i += 3) {
      const p = this.pts[i];
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < best) {
        best = d;
        y = p.y;
      }
    }
    return { dist: Math.sqrt(best), y };
  }
}

// ---------------------------------------------------------------- textures

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const asphaltTexture = () =>
  canvasTexture(128, 256, (g) => {
    g.fillStyle = "#4b4f56";
    g.fillRect(0, 0, 128, 256);
    const r = rng(7);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${0.04 + r() * 0.05})`;
      g.fillRect(r() * 128, r() * 256, 1.5, 1.5);
    }
    g.fillStyle = "#f4f4ef";
    g.fillRect(4, 0, 4, 256);
    g.fillRect(120, 0, 4, 256);
    g.fillStyle = "#fff6d8";
    g.fillRect(62, 0, 4, 120);
  });

const kerbTexture = () =>
  canvasTexture(16, 64, (g) => {
    g.fillStyle = "#f4f2ec";
    g.fillRect(0, 0, 16, 64);
    g.fillStyle = "#df3b30";
    g.fillRect(0, 0, 16, 32);
  });

function signTexture(text: string, finish = false) {
  return canvasTexture(
    256,
    128,
    (g) => {
      if (finish) {
        for (let x = 0; x < 16; x++)
          for (let y = 0; y < 8; y++) {
            g.fillStyle = (x + y) % 2 ? "#111" : "#fff";
            g.fillRect(x * 16, y * 16, 16, 16);
          }
        g.fillStyle = "#fff";
        g.fillRect(48, 24, 160, 80);
        g.fillStyle = "#111";
      } else {
        g.fillStyle = "#1f3f7a";
        g.fillRect(0, 0, 256, 128);
        g.strokeStyle = "#f2f5fa";
        g.lineWidth = 12;
        g.strokeRect(6, 6, 244, 116);
        g.fillStyle = "#fff";
      }
      g.font = "bold 76px Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, 128, 68);
    },
    false,
  );
}

const skyTexture = () =>
  canvasTexture(
    2,
    256,
    (g) => {
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, "#2f86dc");
      grad.addColorStop(0.55, "#8cc6ee");
      grad.addColorStop(1, "#dceff8");
      g.fillStyle = grad;
      g.fillRect(0, 0, 2, 256);
    },
    false,
  );

// ---------------------------------------------------------------- geometry helpers

/** A strip following the road between two lateral offsets, at a height above it. */
function ribbon(road: Road, from: number, to: number, lift: number, vScale: number, fromLen = 0, toLen = road.total) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  let row = 0;
  for (let i = 0; i < road.pts.length; i += 2) {
    const l = road.len[i];
    if (l < fromLen || l > toLen) continue;
    const { point, right } = road.at(l);
    for (const [k, u] of [
      [from, 0],
      [to, 1],
    ]) {
      positions.push(point.x + right.x * k, point.y + lift, point.z + right.z * k);
      uvs.push(u, l / vScale);
    }
    if (row > 0) {
      const a = (row - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    row++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, items: { m: THREE.Matrix4; c?: THREE.Color }[], shadows = true) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  items.forEach((it, i) => {
    mesh.setMatrixAt(i, it.m);
    if (it.c) mesh.setColorAt(i, it.c);
  });
  mesh.count = items.length;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

const mat4 = (x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
    new THREE.Vector3(sx, sy, sz),
  );

// ---------------------------------------------------------------- the stage

export class WorldStage implements Stage {
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.3, 700);
  readonly castShadows = true;
  private readonly road = new Road();
  private sun = new THREE.DirectionalLight("#ffe7c4", 2.3);
  private width = 1;
  private height = 1;
  private virtualHeight = 1;
  private shot: Shot = { kind: "pack" };
  private camPos = new THREE.Vector3(0, 6, 36);
  private camLook = new THREE.Vector3(0, 0, 0);
  private placed = false;
  private readonly disposables: { dispose: () => void }[] = [];
  private finishTarget = 1000;
  private signs: THREE.Group | null = null;
  private scene: THREE.Scene | null = null;

  init(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.scene = scene;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const sky = skyTexture();
    scene.background = sky;
    scene.fog = new THREE.Fog("#cfe6f2", 70, 320);
    this.disposables.push(sky);

    // the studio reflections are for the cars' paint; keep them off the landscape
    scene.environmentIntensity = 0.35;
    renderer.toneMappingExposure = 0.95;
    scene.add(new THREE.HemisphereLight("#dcecff", "#6f7a45", 0.85));
    this.sun.position.set(-30, 45, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -28;
    sc.right = 28;
    sc.top = 28;
    sc.bottom = -28;
    sc.near = 1;
    sc.far = 140;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);

    this.buildTerrain(scene);
    this.buildSea(scene);
    this.buildRoad(scene);
    this.buildViaduct(scene);
    this.buildScenery(scene);
    this.buildMountainsAndClouds(scene);
    this.buildStartAndFinish(scene);
  }

  // ------------------------------------------------------------ world building

  private terrainHeight(x: number, z: number) {
    const { dist, y: roadY } = this.road.nearest(x, z);
    // hills rise inland (to the left), cliffs drop into the sea on the right
    const inland = Math.max(0, -x - 4) * 0.32 + Math.max(0, noise2(x, z)) * 2.2 + 0.3;
    const flat = THREE.MathUtils.smoothstep(dist, HALF_WIDTH + 1.2, HALF_WIDTH + 7);
    let h = THREE.MathUtils.lerp(roadY - 0.05, roadY + inland, flat);
    const toSea = x - coastX(z);
    if (toSea > -1.5) {
      const drop = THREE.MathUtils.smoothstep(toSea, -1.5, 1.5);
      h = THREE.MathUtils.lerp(h, SEA_LEVEL - 2.5, drop);
    }
    return h;
  }

  private buildTerrain(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(150, 250, 110, 190);
    geo.rotateX(-Math.PI / 2);
    geo.translate(-5, 0, -60);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const grass = new THREE.Color("#7eab47");
    const olive = new THREE.Color("#a3a257");
    const rock = new THREE.Color("#d2c3a1");
    const sand = new THREE.Color("#ecdcae");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.terrainHeight(x, z);
      pos.setY(i, h);
      const n = noise2(x * 2.3, z * 2.3);
      c.copy(grass).lerp(olive, 0.35 + 0.35 * n);
      const toSea = x - coastX(z);
      if (toSea > -2.2) c.lerp(rock, THREE.MathUtils.smoothstep(toSea, -2.2, -0.2));
      if (h < SEA_LEVEL + 0.35 && toSea > -1) c.copy(sand);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }));
    mesh.receiveShadow = true;
    scene.add(mesh);
    this.disposables.push(geo, mesh.material as THREE.Material);
  }

  private buildSea(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(400, 400);
    geo.rotateX(-Math.PI / 2);
    const sea = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#16a2c9", roughness: 0.12, metalness: 0.25 }));
    sea.position.set(120, SEA_LEVEL, -80);
    sea.receiveShadow = true;
    scene.add(sea);
    // lighter shallows along the shore
    const shallow = new THREE.Mesh(
      ribbonCoast(),
      new THREE.MeshStandardMaterial({ color: "#5fd4d8", roughness: 0.2, transparent: true, opacity: 0.8 }),
    );
    shallow.position.y = SEA_LEVEL + 0.02;
    scene.add(shallow);
    this.disposables.push(geo, sea.material as THREE.Material, shallow.geometry, shallow.material as THREE.Material);
  }

  private buildRoad(scene: THREE.Scene) {
    const asphalt = asphaltTexture();
    const kerb = kerbTexture();
    const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.85 });
    const kerbMat = new THREE.MeshStandardMaterial({ map: kerb, roughness: 0.6 });
    const shoulderMat = new THREE.MeshStandardMaterial({ color: "#d9c79c", roughness: 1 });
    const parts: [THREE.BufferGeometry, THREE.Material][] = [
      [ribbon(this.road, -HALF_WIDTH, HALF_WIDTH, 0.03, 8), roadMat],
      [ribbon(this.road, HALF_WIDTH, HALF_WIDTH + 0.28, 0.05, 1.6), kerbMat],
      [ribbon(this.road, -HALF_WIDTH - 0.28, -HALF_WIDTH, 0.05, 1.6), kerbMat],
      [ribbon(this.road, HALF_WIDTH + 0.28, HALF_WIDTH + 1.1, 0.02, 4), shoulderMat],
      [ribbon(this.road, -HALF_WIDTH - 1.1, -HALF_WIDTH - 0.28, 0.02, 4), shoulderMat],
    ];
    for (const [geo, material] of parts) {
      const mesh = new THREE.Mesh(geo, material);
      mesh.receiveShadow = true;
      scene.add(mesh);
      this.disposables.push(geo);
    }
    this.disposables.push(asphalt, kerb, roadMat, kerbMat, shoulderMat);

    // guard rail on the sea side
    const railGeo = railBand(this.road, HALF_WIDTH + 0.95, 0.32, 0.5);
    const rail = new THREE.Mesh(railGeo, new THREE.MeshStandardMaterial({ color: "#c9ced6", metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }));
    rail.castShadow = true;
    scene.add(rail);
    const posts: { m: THREE.Matrix4 }[] = [];
    for (let l = 2; l < this.road.total; l += 2.2) {
      const { point, right } = this.road.at(l);
      posts.push({ m: mat4(point.x + right.x * (HALF_WIDTH + 0.95), point.y + 0.25, point.z + right.z * (HALF_WIDTH + 0.95), 0.08, 0.5, 0.08) });
    }
    const postMesh = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#8d939b", metalness: 0.5, roughness: 0.4 }), posts);
    scene.add(postMesh);
    this.disposables.push(railGeo, rail.material as THREE.Material, postMesh.geometry, postMesh.material as THREE.Material);

    // low stone wall on the hill side
    const walls: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const r = rng(11);
    for (let l = 4; l < this.road.total; l += 1.6) {
      if (Math.sin(l / 9) < 0.1) continue;
      const { point, right, forward } = this.road.at(l);
      const k = -(HALF_WIDTH + 1.35);
      walls.push({
        m: mat4(point.x + right.x * k, point.y + 0.25, point.z + right.z * k, 0.35, 0.5, 1.7, Math.atan2(forward.x, forward.z)),
        c: new THREE.Color().setHSL(0.1, 0.25, 0.7 + r() * 0.08),
      });
    }
    const wallMesh = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95 }), walls);
    scene.add(wallMesh);
    this.disposables.push(wallMesh.geometry, wallMesh.material as THREE.Material);
  }

  private buildViaduct(scene: THREE.Scene) {
    const stone = new THREE.MeshStandardMaterial({ color: "#d8c7a4", roughness: 0.9 });
    const piers: { m: THREE.Matrix4 }[] = [];
    const arches: { m: THREE.Matrix4 }[] = [];
    const deck: { m: THREE.Matrix4 }[] = [];
    const step = 5;
    for (let l = 0; l < this.road.total; l += step) {
      const { point, forward } = this.road.at(l);
      const ground = this.terrainHeight(point.x, point.z);
      if (ground > point.y - 1.2) continue;
      const bottom = Math.max(SEA_LEVEL - 1, ground);
      const h = point.y - bottom;
      const yaw = Math.atan2(forward.x, forward.z);
      piers.push({ m: mat4(point.x, bottom + h / 2 - 0.3, point.z, 3.4, h, 1.1, yaw) });
      const mid = this.road.at(l + step / 2);
      arches.push({
        m: new THREE.Matrix4().compose(
          new THREE.Vector3(mid.point.x, point.y - 0.55, mid.point.z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(mid.forward.x, mid.forward.z) + Math.PI / 2, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      });
      deck.push({ m: mat4(mid.point.x, point.y - 0.25, mid.point.z, 3.6, 0.5, step + 0.2, Math.atan2(mid.forward.x, mid.forward.z)) });
    }
    const archGeo = new THREE.TorusGeometry(step / 2 - 0.4, 0.35, 6, 14, Math.PI);
    archGeo.rotateZ(Math.PI);
    archGeo.scale(1, 1.3, 5.5);
    const meshes = [
      instanced(new THREE.BoxGeometry(1, 1, 1), stone, piers),
      instanced(archGeo, stone, arches),
      instanced(new THREE.BoxGeometry(1, 1, 1), stone, deck),
    ];
    meshes.forEach((m) => scene.add(m));
    this.disposables.push(stone, ...meshes.map((m) => m.geometry));
  }

  private buildScenery(scene: THREE.Scene) {
    const r = rng(20260929);
    const cypress: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const pines: { m: THREE.Matrix4 }[] = [];
    const trunks: { m: THREE.Matrix4 }[] = [];
    const bushes: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const walls: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const roofs: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const boats: { m: THREE.Matrix4 }[] = [];

    const free = (x: number, z: number, margin: number) => {
      if (x > coastX(z) - 1.2) return false;
      return this.road.nearest(x, z).dist > HALF_WIDTH + margin;
    };

    // villages on the hillside, like the picture
    const villages = [
      { x: -14, z: -30, n: 16, spread: 9 },
      { x: -12, z: -62, n: 14, spread: 8 },
      { x: -6, z: -120, n: 12, spread: 8 },
      { x: 20, z: -140, n: 6, spread: 5 },
      { x: -10, z: 4, n: 7, spread: 6 },
    ];
    for (const v of villages) {
      for (let i = 0; i < v.n * 3 && walls.length < 70; i++) {
        const x = v.x + (r() - 0.5) * 2 * v.spread;
        const z = v.z + (r() - 0.5) * 2 * v.spread;
        if (!free(x, z, 3.2)) continue;
        const y = this.terrainHeight(x, z);
        const w = 1.6 + r() * 1.4;
        const d = 1.4 + r() * 1.2;
        const h = 1.3 + (r() < 0.4 ? 1.1 : 0) + r() * 0.4;
        const yaw = r() * Math.PI;
        walls.push({ m: mat4(x, y + h / 2, z, w, h, d, yaw), c: new THREE.Color().setHSL(0.09 + r() * 0.03, 0.45 + r() * 0.2, 0.8 + r() * 0.08) });
        roofs.push({ m: mat4(x, y + h + 0.42, z, w * 0.78, 0.85, d * 0.78, yaw + Math.PI / 4), c: new THREE.Color().setHSL(0.04 + r() * 0.02, 0.6, 0.45 + r() * 0.1) });
        if (r() < 0.5) bushes.push({ m: mat4(x + w * 0.7, y + 0.35, z + 0.4, 0.7, 0.6, 0.7), c: new THREE.Color("#d9468f") });
      }
    }

    // cypresses, umbrella pines and olive bushes everywhere else
    for (let i = 0; i < 1600; i++) {
      const x = -60 + r() * 90;
      const z = 30 - r() * 200;
      if (!free(x, z, 2.2)) continue;
      const y = this.terrainHeight(x, z);
      // tall trees stay clear of the road and of the camera behind the start,
      // so they never hide the cars
      const roadGap = this.road.nearest(x, z).dist;
      const behindStart = z > 8 && Math.abs(x) < 22;
      const tallOk = roadGap > 6.5 && !behindStart;
      let kind = r();
      if (!tallOk && kind < 0.55) kind = 0.6 + r() * 0.3;
      if (kind < 0.36) {
        const h = 2.2 + r() * 1.8;
        cypress.push({ m: mat4(x, y + h / 2, z, 0.55 + r() * 0.2, h, 0.55 + r() * 0.2), c: new THREE.Color().setHSL(0.31, 0.5, 0.13 + r() * 0.06) });
      } else if (kind < 0.55) {
        const h = 2 + r() * 1.2;
        trunks.push({ m: mat4(x, y + h / 2, z, 0.14, h, 0.14) });
        pines.push({ m: mat4(x, y + h + 0.1, z, 1.9 + r() * 0.8, 0.8, 1.9 + r() * 0.8, r() * 3) });
      } else if (kind < 0.9) {
        const s = behindStart ? 0.4 + r() * 0.3 : 0.5 + r() * 0.7;
        bushes.push({ m: mat4(x, y + s * 0.4, z, s * 1.2, s * 0.9, s * 1.2), c: new THREE.Color().setHSL(0.24 + r() * 0.06, 0.45, 0.24 + r() * 0.1) });
      }
    }

    // sailboats
    for (let i = 0; i < 9; i++) {
      const z = 10 - r() * 170;
      const x = coastX(z) + 8 + r() * 30;
      boats.push({ m: mat4(x, SEA_LEVEL, z, 1, 1, 1, r() * 6) });
    }

    const add = (geo: THREE.BufferGeometry, material: THREE.Material, items: { m: THREE.Matrix4; c?: THREE.Color }[], shadows = true) => {
      const mesh = instanced(geo, material, items, shadows);
      scene.add(mesh);
      this.disposables.push(geo, material);
    };
    add(new THREE.ConeGeometry(0.5, 1, 7), new THREE.MeshStandardMaterial({ roughness: 0.9 }), cypress);
    add(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshStandardMaterial({ color: "#6b4a2e", roughness: 1 }), trunks);
    add(new THREE.SphereGeometry(0.6, 9, 6), new THREE.MeshStandardMaterial({ color: "#2f6a2c", roughness: 0.9, flatShading: true }), pines);
    add(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), bushes);
    add(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85 }), walls);
    add(new THREE.ConeGeometry(0.72, 1, 4), new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), roofs);

    // boat = hull + sail
    const hull = new THREE.BoxGeometry(0.6, 0.25, 1.8);
    const sail = new THREE.ConeGeometry(0.55, 2, 3);
    sail.translate(0, 1.2, 0);
    add(hull, new THREE.MeshStandardMaterial({ color: "#ffffff" }), boats, false);
    add(sail, new THREE.MeshStandardMaterial({ color: "#fbfbf6", flatShading: true }), boats, false);
  }

  private buildMountainsAndClouds(scene: THREE.Scene) {
    const r = rng(3);
    const mountains: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    for (let i = 0; i < 16; i++) {
      const z = -200 - r() * 80;
      const x = -130 + i * 16 + (r() - 0.5) * 10;
      const h = 30 + r() * 38;
      mountains.push({ m: mat4(x, h / 2 - 4, z, 22 + r() * 18, h, 22 + r() * 18, r() * 3), c: new THREE.Color().setHSL(0.58, 0.18, 0.55 + r() * 0.08) });
    }
    // closer hills behind the village on the left
    for (let i = 0; i < 8; i++) {
      const z = 10 - i * 26;
      const h = 12 + r() * 14;
      mountains.push({ m: mat4(-58 - r() * 10, h / 2 - 2, z, 26, h, 26, r() * 3), c: new THREE.Color().setHSL(0.26, 0.3, 0.38 + r() * 0.06) });
    }
    const mGeo = new THREE.ConeGeometry(1, 1, 7);
    const mMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
    const mMesh = instanced(mGeo, mMat, mountains, false);
    scene.add(mMesh);

    const cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, emissive: "#ffffff", emissiveIntensity: 0.35, fog: false });
    const puffs: { m: THREE.Matrix4 }[] = [];
    for (let i = 0; i < 9; i++) {
      const cx = -120 + r() * 260;
      const cz = -230 - r() * 60;
      const cy = 60 + r() * 30;
      for (let k = 0; k < 5; k++) {
        const s = 6 + r() * 7;
        puffs.push({ m: mat4(cx + (k - 2) * 7 + r() * 3, cy + r() * 3, cz + r() * 4, s * 1.4, s, s) });
      }
    }
    const cloudMesh = instanced(new THREE.SphereGeometry(1, 10, 7), cloudMat, puffs, false);
    scene.add(cloudMesh);
    this.disposables.push(mGeo, mMat, cloudMesh.geometry, cloudMat);
  }

  private buildStartAndFinish(scene: THREE.Scene) {
    // chequered start line
    const chk = canvasTexture(64, 16, (g) => {
      for (let x = 0; x < 8; x++)
        for (let y = 0; y < 2; y++) {
          g.fillStyle = (x + y) % 2 ? "#111" : "#fff";
          g.fillRect(x * 8, y * 8, 8, 8);
        }
    });
    const start = this.road.at(this.road.startLen);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(HALF_WIDTH * 2, 0.5), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.7 }));
    line.rotation.set(-Math.PI / 2, 0, Math.atan2(start.forward.x, start.forward.z));
    line.position.copy(start.point).setY(start.point.y + 0.05);
    line.receiveShadow = true;
    scene.add(line);
    this.disposables.push(chk, line.geometry, line.material as THREE.Material);
    this.signs = new THREE.Group();
    scene.add(this.signs);
    this.buildSigns(1000);
  }

  /** Km boards along the road and the finish arch, for the race distance. */
  private buildSigns(target: number) {
    if (!this.signs) return;
    this.finishTarget = target;
    this.signs.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const material = m.material as THREE.MeshStandardMaterial | undefined;
      material?.map?.dispose();
      material?.dispose();
    });
    this.signs.clear();
    const post = new THREE.MeshStandardMaterial({ color: "#a7adb6", metalness: 0.5, roughness: 0.4 });
    for (let i = 0; i < 5; i++) {
      const km = Math.round((target * i) / 5);
      const { point, right, forward } = this.road.at(this.road.kmToLen(km, target));
      const k = -(HALF_WIDTH + 1.9);
      const g = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.08), new THREE.MeshStandardMaterial({ map: signTexture(String(km)) }));
      board.position.y = 1.9;
      board.castShadow = true;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6), post);
      pole.position.y = 0.95;
      g.add(board, pole);
      g.position.set(point.x + right.x * k, point.y, point.z + right.z * k);
      g.rotation.y = Math.atan2(forward.x, forward.z) + Math.PI;
      this.signs.add(g);
    }
    // finish arch
    const { point, right, forward } = this.road.at(this.road.finishLen);
    const arch = new THREE.Group();
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 8), post);
      pole.position.set(side * (HALF_WIDTH + 0.6), 2.1, 0);
      pole.castShadow = true;
      arch.add(pole);
    }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(HALF_WIDTH * 2 + 1.4, 1.1, 0.1), new THREE.MeshStandardMaterial({ map: signTexture(String(target), true) }));
    banner.position.y = 3.9;
    banner.castShadow = true;
    arch.add(banner);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF_WIDTH * 2, 0.6),
      new THREE.MeshStandardMaterial({ map: signTexture("", true), roughness: 0.7 }),
    );
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.06;
    arch.add(line);
    arch.position.copy(point);
    arch.rotation.y = Math.atan2(forward.x, forward.z) + Math.PI;
    void right;
    this.signs.add(arch);
  }

  // ------------------------------------------------------------ Stage API

  resize(width: number, height: number, bottomInset: number) {
    this.width = width;
    this.height = height;
    // keep the action centred in the part of the screen above the hand
    const virtualH = height + bottomInset;
    this.virtualHeight = virtualH;
    this.camera.aspect = width / virtualH;
    this.camera.fov = width / Math.max(1, height - bottomInset) < 0.8 ? 52 : 42;
    this.camera.setViewOffset(width, virtualH, 0, bottomInset, width, height);
    this.camera.updateProjectionMatrix();
  }

  place(km: number, target: number, lateral: number, along = 0): Placement {
    if (target !== this.finishTarget) this.buildSigns(target);
    // une longueur de voiture vaut 1 unité du monde : on recule le long de la route
    const { point, forward, right } = this.road.at(this.road.kmToLen(km, target) + along);
    const position = point.clone().addScaledVector(right, lateral * 1.0);
    position.y += 0.04;
    return { position, yaw: Math.atan2(forward.x, forward.z), scale: 1 };
  }

  finish(target: number): Placement {
    return this.place(target, target, 0);
  }

  sideTowardView(position: THREE.Vector3, yaw: number) {
    // the side of the car facing the camera's line of sight
    const localX = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const toCam = this.camPos.clone().sub(position).setY(0);
    return Math.sign(localX.dot(toCam)) || 1;
  }

  project(position: THREE.Vector3): ScreenPoint {
    const v = position.clone().project(this.camera);
    const dist = this.camera.position.distanceTo(position);
    const perUnit = this.virtualHeight / (2 * Math.max(1, dist) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height, size: v.z < 1 ? perUnit : 0 };
  }

  setShot(shot: Shot) {
    this.shot = shot;
  }

  frame(dt: number, _t: number, cars: StageCar[], target: number) {
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    const byId = new Map(cars.map((c) => [c.id, c]));
    const shot = this.shot;
    let stiffness = 2.2;

    if (shot.kind === "follow" && byId.has(shot.id)) {
      // chase cam: behind and above the car, looking down the road ahead
      const car = byId.get(shot.id)!;
      const fwd = new THREE.Vector3(Math.sin(car.yaw), 0, Math.cos(car.yaw));
      wantPos.copy(car.position).addScaledVector(fwd, -10).add(new THREE.Vector3(0, 5.2, 0));
      wantLook.copy(car.position).addScaledVector(fwd, 12);
      wantLook.y = wantPos.y - 22 * Math.tan(THREE.MathUtils.degToRad(17));
      stiffness = 4;
    } else if (shot.kind === "car" && byId.has(shot.id)) {
      // three-quarter view on a car something happens to
      const car = byId.get(shot.id)!;
      const fwd = new THREE.Vector3(Math.sin(car.yaw), 0, Math.cos(car.yaw));
      const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const lean = this.road.at(this.road.kmToLen(car.km, target)).point.x > 4 ? -1 : 1;
      wantPos.copy(car.position).addScaledVector(fwd, 6.5).addScaledVector(side, 6.5 * lean).add(new THREE.Vector3(0, 5.5, 0));
      wantLook.copy(car.position).setY(car.position.y + 0.4);
      stiffness = 3;
    } else if (shot.kind === "overview") {
      // the whole road from start to finish, seen from high above the coast
      const a = this.road.at(this.road.startLen).point;
      const b = this.road.at(this.road.finishLen).point;
      // a little closer to the start: the cars begin there and the finish reads far off
      const centre = a.clone().lerp(b, 0.44);
      const length = a.distanceTo(b) + 60;
      const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const visible = Math.max(1, this.height - (this.virtualHeight - this.height));
      const hHalf = Math.atan(Math.tan(vHalf) * (this.width / visible));
      const pitch = THREE.MathUtils.degToRad(62);
      const dist = Math.max((length * Math.sin(pitch)) / 2 / Math.tan(vHalf), 22 / Math.tan(hHalf));
      wantPos.set(centre.x + 4, centre.y + Math.sin(pitch) * dist, centre.z + Math.cos(pitch) * dist);
      wantLook.copy(centre);
      stiffness = 2.4;
    } else if (shot.kind === "finish") {
      const f = this.road.at(this.road.finishLen);
      const a = performance.now() / 4200;
      wantPos.set(f.point.x + Math.sin(a) * 11, f.point.y + 5.5, f.point.z + Math.cos(a) * 11);
      wantLook.copy(f.point).setY(f.point.y + 1.2);
      stiffness = 2;
    } else {
      // pack shot: behind the last car, looking down the road past the leader
      const kms = cars.map((c) => c.km);
      const rear = kms.length ? Math.min(...kms) : 0;
      const front = kms.length ? Math.max(...kms) : 0;
      const rearLen = this.road.kmToLen(rear, target);
      const frontLen = this.road.kmToLen(front, target);
      const spread = frontLen - rearLen;
      // cars in the lower third, centred, the road running on towards the horizon
      const mid = this.road.at((rearLen + frontLen) / 2);
      const back = 11 + spread * 0.55;
      const height = 5.5 + spread * 0.22;
      wantPos.copy(mid.point).addScaledVector(mid.forward, -back).add(new THREE.Vector3(0, height, 0));
      const run = back + 24;
      wantLook.copy(mid.point).addScaledVector(mid.forward, 24);
      wantLook.y = wantPos.y - run * Math.tan(THREE.MathUtils.degToRad(16));
      // idle drift keeps the world alive
      wantPos.x += Math.sin(performance.now() / 5200) * 0.8;
    }

    const k = this.placed ? 1 - Math.exp(-dt * stiffness) : 1;
    this.placed = true;
    this.camPos.lerp(wantPos, k);
    this.camLook.lerp(wantLook, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // shadows follow what we look at
    this.sun.position.copy(this.camLook).add(new THREE.Vector3(-26, 40, 18));
    this.sun.target.position.copy(this.camLook);
    this.sun.target.updateMatrixWorld();
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    if (this.signs) {
      this.signs.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
    }
    void this.scene;
  }
}

/** Band of shallow water hugging the coast. */
function ribbonCoast() {
  const positions: number[] = [];
  const index: number[] = [];
  let row = 0;
  for (let z = 40; z >= -220; z -= 2) {
    const x = coastX(z);
    positions.push(x - 1, 0, z, x + 5, 0, z);
    if (row > 0) {
      const a = (row - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    row++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Vertical metal band standing on the road edge (guard rail). */
function railBand(road: Road, offset: number, bottom: number, top: number) {
  const positions: number[] = [];
  const index: number[] = [];
  let row = 0;
  for (let i = 0; i < road.pts.length; i += 2) {
    const { point, right } = road.at(road.len[i]);
    const x = point.x + right.x * offset;
    const z = point.z + right.z * offset;
    positions.push(x, point.y + bottom, z, x, point.y + top, z);
    if (row > 0) {
      const a = (row - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    row++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}
