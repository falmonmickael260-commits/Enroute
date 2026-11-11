import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface CoastalHouse {
  x: number; y: number; z: number; w: number; h: number; d: number; yaw: number;
}

/** Share the actual village footprint with planting and garden placement. */
export function selectVillageHouses(houses: CoastalHouse[]) {
  const placed: CoastalHouse[] = [];
  for (const h of houses) {
    if (placed.some(other => Math.hypot(h.x - other.x, h.z - other.z) < (Math.hypot(h.w, h.d) + Math.hypot(other.w, other.d)) * 0.55)) continue;
    placed.push(h);
  }
  return placed;
}

type Instance = { matrix: THREE.Matrix4; color: THREE.Color };

/** A real two-slope roof, with front and rear gables instead of a pyramid. */
function pitchedRoof(gables = false) {
  const a = [-0.5, 0, -0.5], b = [0, 0.5, -0.5], c = [0.5, 0, -0.5];
  const d = [-0.5, 0, 0.5], e = [0, 0.5, 0.5], f = [0.5, 0, 0.5];
  const vertices = gables ? [a, b, c, d, f, e] : [a, d, b, d, e, b, b, e, c, e, f, c];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(vertices.flatMap(v => gables ? [v[0] + 0.5, v[1] * 2] : [v[2] + 0.5, v[1] * 2]), 2));
  geo.computeVertexNormals();
  return geo;
}

/** Overlapping rounded foliage, merged once and shared by all tree instances. */
export function foliageCrown() {
  const lobes = [
    [-0.27, -0.04, 0.03, 0.36], [0.25, -0.03, 0.06, 0.37],
    [-0.02, 0.13, -0.18, 0.4], [0.04, 0.1, 0.24, 0.33],
    [-0.02, 0.27, 0.02, 0.3],
  ].map(([x, y, z, radius], i) => {
    const g = new THREE.SphereGeometry(radius, 8, 5);
    g.scale(1, 0.78, 1);
    g.translate(x, y, z);
    const shade = new THREE.Color().setScalar(0.83 + i * 0.038);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let j = 0; j < colors.length; j += 3) shade.toArray(colors, j);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const crown = mergeGeometries(lobes)!;
  lobes.forEach(g => g.dispose());
  return crown;
}

export function cypressCrown() {
  return new THREE.LatheGeometry([
    new THREE.Vector2(0, -0.5), new THREE.Vector2(0.24, -0.47),
    new THREE.Vector2(0.38, -0.26), new THREE.Vector2(0.4, -0.05),
    new THREE.Vector2(0.32, 0.2), new THREE.Vector2(0.18, 0.4),
    new THREE.Vector2(0.025, 0.52),
  ], 9);
}

/** Rounded, irregular ridges replace the large seven-sided mountain cones. */
export function distantRidge() {
  const ridge = new THREE.SphereGeometry(1, 32, 20);
  const position = ridge.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const fold = 0.9 + Math.sin(x * 5.3 + z * 3.1) * 0.07 + Math.cos(z * 7.1 - x * 2) * 0.05;
    position.setXYZ(i, x * fold, y * 0.5 + (1 - y * y) * Math.sin(x * 4 + z * 5) * 0.035, z * fold);
  }
  ridge.scale(1.5, 0.75, 1.35);
  ridge.translate(0, -0.125, 0);
  ridge.computeVertexNormals();
  return ridge;
}

/** Mediterranean villas, drawn in batches so detail stays affordable on mobile. */
export function buildCoastalVillage(
  scene: THREE.Scene,
  houses: CoastalHouse[],
  plaster: THREE.Texture,
  tiles: THREE.Texture,
  lights: number,
  disposables: { dispose(): void }[],
) {
  const batches = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; items: Instance[] }>();
  const box = (rounded = false) => rounded ? new RoundedBoxGeometry(1, 1, 1, 2, 0.025) : new THREE.BoxGeometry(1, 1, 1);
  const register = (name: string, geometry: THREE.BufferGeometry, options: THREE.MeshStandardMaterialParameters) =>
    batches.set(name, { geometry, material: new THREE.MeshStandardMaterial({ roughness: 0.9, ...options }), items: [] });
  register("plaster", box(true), { map: plaster, bumpMap:plaster, bumpScale:.012 });
  register("roof", pitchedRoof(), { map: tiles, bumpMap:tiles, bumpScale:.014, side: THREE.DoubleSide });
  register("gables", pitchedRoof(true), { map: plaster });
  register("stone", box(true), { color: "#b8aa8d", map: plaster });
  register("eaves", box(), { color: "#e8d7b5" });
  register("timber", box(), { color: "#70513a" });
  register("shutters", box(), {});
  register("glass", box(), { color: "#2d4853", metalness:.15, roughness:.22 });
  register("litGlass", box(), { color: "#ffe4aa", emissive: "#ffb75b", emissiveIntensity: lights * 1.5 });
  register("plants", foliageCrown(), { vertexColors: true });
  register("pot", new THREE.CylinderGeometry(0.45, 0.32, 1, 8), { color: "#a15c40" });

  register("iron", box(true), { color:'#4b5659',metalness:.55,roughness:.45 });
  register("fabric", box(true), { roughness:1 });
  register("drain", new THREE.CylinderGeometry(.5,.5,1,8), {color:'#807c6e',metalness:.25,roughness:.7});
  register("porchLamp", new THREE.SphereGeometry(.5,8,6), {color:'#ffe4b0',emissive:'#ffbf72',emissiveIntensity:lights*1.7,roughness:.4});
  const placed = selectVillageHouses(houses);
  for (const [index, hs] of placed.entries()) {
    const i = index + 1;
    const wall = new THREE.Color(["#e5d7be", "#eddfc4", "#d9c5aa", "#ead3b4"][i % 4]);
    const roof = new THREE.Color(["#ad6249", "#b96d4b", "#a75b43"][i % 3]);
    const shutter = new THREE.Color(["#547367", "#627d8d", "#6d7352"][i % 3]);
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hs.yaw);
    const add = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, color: THREE.ColorRepresentation = "white", yaw = 0) => {
      const p = new THREE.Vector3(x, y, z).applyQuaternion(rotation).add(new THREE.Vector3(hs.x, hs.y, hs.z));
      batches.get(name)!.items.push({
        matrix: new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hs.yaw + yaw), new THREE.Vector3(w, h, d)),
        color: color instanceof THREE.Color ? color : new THREE.Color(color),
      });
    };
    const w = hs.w * 0.75, d = hs.d * 0.88, h = hs.h;
    const cx = -hs.w * 0.1;
    add("stone", 0, 0.02, 0, hs.w * 1.12, 0.12, hs.d * 1.12);
    add("plaster", cx, h / 2, 0, w, h, d, wall);
    add("stone", cx, 0.1, 0, w + 0.04, 0.2, d + 0.04);
    add("eaves", cx, h, 0, w + 0.16, 0.09, d + 0.18);
    add("roof", cx, h + 0.04, 0, w + 0.22, w * 0.75, d + 0.24, roof);
    add("gables", cx, h + 0.04, 0, w + 0.22, w * 0.75, d + 0.1, wall);
    // A lower attached wing breaks the old single-block silhouette.
    const wingX = hs.w * 0.35, wingH = h * 0.65;
    add("plaster", wingX, wingH / 2, -d * 0.12, hs.w * 0.3, wingH, d * 0.65, wall);
    add("roof", wingX, wingH, -d * 0.12, hs.w * 0.38, hs.w * 0.28, d * 0.76, roof);
    add("gables", wingX, wingH, -d * 0.12, hs.w * 0.38, hs.w * 0.28, d * 0.68, wall);
    add("plaster", cx - w * 0.22, h + w * 0.32, -d * 0.24, 0.2, 0.62, 0.23, wall);
    add("stone", cx - w * 0.22, h + w * 0.32 + 0.32, -d * 0.24, 0.28, 0.07, 0.3);
    // Downpipes and small exterior lamps ground the villas in a lived-in setting.
    for(const side of [-1,1])add('drain',cx+side*(w/2+.045),h*.49,-d*.45,.035,h*.96,.035);
    // Recessed dark panes sit behind projecting sills, frames and louvred shutters.
    const levels = h > 2 ? [0.65, h * 0.78] : [h * 0.63];
    for (const face of [-1, 1]) {
      for (const y of levels) for (const x of [-w * 0.25, w * 0.25]) {
        const px = cx + x, z = face * (d / 2 + 0.025);
        const bright = lights > 0 && (i + Math.round(x * 10) + Math.round(y * 10)) % 3 !== 0;
        add(bright ? "litGlass" : "glass", px, y, z, 0.26, 0.38, 0.025);
        add("eaves", px, y - 0.23, z, 0.42, 0.065, 0.13);
        for (const edge of [-1, 1]) {
          add("eaves", px + edge * 0.16, y, z, 0.045, 0.46, 0.07);
          add("shutters", px + edge * 0.27, y, z, 0.15, 0.42, 0.06, shutter);
          for (let slat = 0; slat < 4; slat++) add("timber", px + edge * 0.27, y - 0.13 + slat * 0.085, z + face * 0.035, 0.13, 0.015, 0.015, "#a6b39b");
        }
        add("eaves", px, y + 0.22, z, 0.36, 0.045, 0.07);
        add("eaves", px, y, z + face * 0.025, 0.025, 0.37, 0.025);
      }
      const z = face * (d / 2 + 0.05);
      add("timber", cx, 0.38, z, 0.3, 0.76, 0.045);
      add("eaves", cx, 0.79, z, 0.4, 0.06, 0.1);
      add('iron',cx+.25,1.02,z+face*.035,.085,.11,.08);
      add('porchLamp',cx+.25,1.01,z+face*.09,.065,.08,.065);
      if(h>2 && index%3!==1){
        const floor=h*.78-.29,front=z+face*.46;
        add('stone',cx,floor,z+face*.22,w*.77,.065,.54);
        add('iron',cx,floor+.30,front,w*.77,.026,.026);
        add('iron',cx,floor+.08,front,w*.77,.022,.022);
        for(let bar=-3;bar<=3;bar++)add('iron',cx+bar*w*.11,floor+.18,front,.018,.29,.018);
        for(const side of [-1,1]){
          add('iron',cx+side*w*.37,floor+.30,z+face*.22,.022,.026,.47);
          add('pot',cx+side*w*.28,floor+.10,front-face*.08,.15,.15,.15);
          add('plants',cx+side*w*.28,floor+.22,front-face*.08,.24,.24,.23,'#6b8150');
        }
      }
      // Small entrance canopy and pots: recognisable from the rear chase camera.
      add("roof", cx, 0.86, z + face * 0.12, 0.6, 0.2, 0.45, roof);
      for (const side of [-1, 1]) {
        add("pot", cx + side * 0.4, 0.16, z + face * 0.1, 0.24, 0.28, 0.24);
        add("plants", cx + side * 0.4, 0.36, z + face * 0.1, 0.32, 0.35, 0.32, "#687d43");
      }
    }
    if(index%3===0){
      const awning=['#c5b188','#5c7f79','#b87561'][Math.floor(index/3)%3];
      add('fabric',wingX,wingH+.09,-d*.12+hs.d*.30,hs.w*.34,.04,.40,awning);
      add('fabric',wingX,wingH+.035,-d*.12+hs.d*.30+.19,hs.w*.34,.10,.026,awning);
    }
    // Side windows make the buildings read from bends as well as straight roads.
    for (const side of [-1, 1]) for (const z of [-d * 0.23, d * 0.23]) {
      add("glass", cx + side * (w / 2 + 0.02), h * 0.63, z, 0.025, 0.35, 0.27);
      add("eaves", cx + side * (w / 2 + 0.04), h * 0.63 - 0.21, z, 0.12, 0.055, 0.4);
    }
  }
  for (const { geometry, material, items } of batches.values()) {
    disposables.push(geometry, material);
    if (!items.length) continue;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    items.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.color); });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  return placed;
}
