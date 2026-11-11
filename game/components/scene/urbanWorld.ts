import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createRoadsideCrowd, type SpectatorSpot } from "./roadsideCrowd";

interface CityRoad {
  total: number;
  at: (distance: number) => { point: THREE.Vector3; right: THREE.Vector3; forward: THREE.Vector3 };
  nearest: (x: number, z: number) => { dist: number; y: number };
}
interface Batch { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; colors: THREE.Color[] }
const UP = new THREE.Vector3(0, 1, 0);

/** An instanced city built around the exact same road used by the coastal map. */
export function createUrbanWorld(scene: THREE.Scene, road: CityRoad, lighting: number) {
  let seed = 74392;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const root = new THREE.Group(); root.name = "grand-boulevard"; scene.add(root);
  const batches = new Map<string, Batch>(), textures: THREE.Texture[] = [];
  const box = new THREE.BoxGeometry(1, 1, 1), round = new RoundedBoxGeometry(1, 1, 1, 2, .055);
  const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 10), ball = new THREE.SphereGeometry(1, 10, 7);
  const poolGeometry = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const poolMaterial = new THREE.MeshBasicMaterial({ color: "#ffd893", transparent: true, opacity: .10 * lighting, depthWrite: false });
  const roofGeometry = new THREE.CylinderGeometry(.68, 1, .85, 4, 1).rotateY(Math.PI / 4);
  const cone = new THREE.ConeGeometry(1, 1, 16);
  const stone = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .88 });
  const metal = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .52, metalness: .55 });
  const glass = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .25, metalness: .3 });
  const litGlass = new THREE.MeshStandardMaterial({ color: "#dfbd83", emissive: "#ffd492", emissiveIntensity: lighting * .65, roughness: .38 });
  const lamp = new THREE.MeshStandardMaterial({ color: "#fff0c7", emissive: "#ffd79b", emissiveIntensity: .2 + lighting * 1.8 });
  const leaf = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1 });
  const matrix = new THREE.Matrix4(), local = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), quaternion = new THREE.Quaternion();
  function put(key: string, geometry: THREE.BufferGeometry, material: THREE.Material, base: THREE.Matrix4, x: number, y: number, z: number, sx: number, sy: number, sz: number, color = "#ffffff", yaw = 0) {
    let batch = batches.get(key);
    if (!batch) { batch = { geometry, material, matrices: [], colors: [] }; batches.set(key, batch); }
    local.compose(position.set(x, y, z), quaternion.setFromAxisAngle(UP, yaw), scale.set(sx, sy, sz));
    batch.matrices.push(matrix.multiplyMatrices(base, local).clone()); batch.colors.push(new THREE.Color(color));
  }
  function baseAt(distance: number, offset: number, faceRoad = false) {
    const { point, right, forward } = road.at(distance);
    const yaw = faceRoad ? Math.atan2(-Math.sign(offset) * right.x, -Math.sign(offset) * right.z) : Math.atan2(forward.x, forward.z);
    return new THREE.Matrix4().compose(point.clone().addScaledVector(right, offset), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(1, 1, 1));
  }
  // Continuous grey city ground, with the same road grade, including the raised section.
  const groundGeo = new THREE.PlaneGeometry(150, 240, 60, 96); groundGeo.rotateX(-Math.PI / 2); groundGeo.translate(0, 0, -60);
  const vertices = groundGeo.attributes.position;
  for (let i = 0; i < vertices.count; i++) vertices.setY(i, road.nearest(vertices.getX(i), vertices.getZ(i)).y - .16);
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ color: "#99948a", roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat); ground.receiveShadow = true; root.add(ground);

  // Tile courses follow the curve and slope, rather than straight blocks across corners.
  for (let d = .25; d < road.total; d += .5) for (const side of [-1, 1]) {
    const base = baseAt(d, side * 2.9);
    put("pavement", box, stone, base, 0, .035, 0, 1.5, .15, .51, (Math.round(d * 2) % 4) ? "#c2beb4" : "#b9b6ad");
    put("curb", round, stone, base, -side * .70, .075, 0, .14, .22, .50, "#dedbd2");
    if (Math.round(d * 2) % 4 === 0) put("paving-seam", box, stone, base, 0, .115, 0, 1.2, .008, .012, "#aaa69e");
  }

  function signTexture(label: string, background: string) {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = "#e4d4ae"; ctx.lineWidth = 3; ctx.strokeRect(7, 7, 498, 82);
    ctx.fillStyle = "#fff3d5"; ctx.font = "600 38px Georgia"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, 256, 49);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; textures.push(texture); return texture;
  }
  const shops = ["CAFÉ DES ARTS", "BOULANGERIE", "LIBRAIRIE", "FLEURISTE", "LE PETIT BISTRO", "REVANCHE GAME"];
  const shopMaterials = shops.map((s, i) => new THREE.MeshStandardMaterial({ map: signTexture(s, ["#264c45", "#674235", "#293f56"][i % 3]), roughness: .7, emissive: "#9b8052", emissiveIntensity: lighting * .13 }));
  const shopGeometry = new THREE.PlaneGeometry(1, 1);
  const facades = ["#e1d3b9", "#cabfae", "#d9c3a3", "#c5c8bf", "#d5ab92", "#b9b4ac", "#e3d9c8"];
  const occupied: { x: number; z: number; radius: number }[] = [];
  let buildingCount = 0;
  // Frontages stand outside the pedestrian pavement; all four corners are checked on bends.
  for (let d = 2; d < road.total - 2; d += 7.2) for (const side of [-1, 1]) {
    const width = 5.1 + random() * 1.25, depth = 3.1 + random() * .8;
    const base = baseAt(d, side * (5.7 + depth / 2), true), center = new THREE.Vector3().setFromMatrixPosition(base);
    const corners = [-1, 1].flatMap(x => [-1, 1].map(z => new THREE.Vector3(x * (width / 2 + .15), 0, z * (depth / 2 + .2)).applyMatrix4(base)));
    if (corners.some(p => road.nearest(p.x, p.z).dist < 4.6) || occupied.some(p => Math.hypot(p.x - center.x, p.z - center.z) < p.radius + width * .46)) continue;
    occupied.push({ x: center.x, z: center.z, radius: width * .46 }); buildingCount++;
    const floors = 3 + Math.floor(random() * 3), height = 1.35 + floors * .90, color = facades[buildingCount % facades.length], front = depth / 2;
    put("facades", round, stone, base, 0, height / 2 - .12, 0, width, height + .24, depth, color);
    put("foundation", round, stone, base, 0, .12, 0, width + .08, .5, depth + .08, "#a99f8b");
    // Chamfered horizontal cornices, vertical corner stones and mansard/slate roofs.
    for (const y of [.36, 1.32, height - .10, height + .08]) put("cornices", round, stone, base, 0, y, 0, width + .20, .12, depth + .22, "#ece0ca");
    for (const x of [-width / 2 + .14, width / 2 - .14]) {
      put("corner-pillars", box, stone, base, x, height / 2, front + .035, .21, height, .10, "#eee2ce");
      for (let y = .45; y < height; y += .25) put("corner-joints", box, stone, base, x, y, front + .09, .22, .016, .014, "#b8ad99");
    }
    put("roofs", roofGeometry, metal, base, 0, height + .52, 0, width / Math.SQRT2, 1, depth / Math.SQRT2, "#56616b");
    put("roof-ridge", round, metal, base, 0, height + .97, 0, width * .66, .10, .10, "#424b54");
    put("chimneys", round, stone, base, width * .31, height + .90, -.35, .30, .75, .35, "#ab8975");
    const columns = Math.max(3, Math.floor(width / 1.1));
    for (let floor = 0; floor < floors; floor++) for (let col = 0; col < columns; col++) {
      const x = -width / 2 + .65 + col * (width - 1.3) / (columns - 1), y = 1.82 + floor * .90;
      put("window-surrounds", round, stone, base, x, y, front + .065, .70, .72, .12, "#e9ddc7");
      const lit = lighting > .25 && random() < .38;
      put(lit ? "lit-windows" : "windows", box, lit ? litGlass : glass, base, x, y, front + .135, .50, .57, .018, lit ? "#ffffff" : ["#385360", "#506573", "#6b8086"][col % 3]);
      put("window-mullions", box, stone, base, x, y, front + .15, .025, .59, .024, "#c4beb0");
      put("window-sills", round, stone, base, x, y - .34, front + .18, .77, .07, .24, "#e2d8c3");
      if (floor === 0 || floor === floors - 1) {
        put("balcony-slabs", round, stone, base, x, y - .39, front + .33, .86, .065, .54, "#c9c2b2");
        // Rail across the front, with rounded posts and spaced iron balusters.
        put("balcony-top", round, metal, base, x, y - .05, front + .57, .90, .035, .035, "#344349");
        for (let n = -2; n <= 2; n++) put("balcony-balusters", cylinder, metal, base, x + n * .18, y - .22, front + .57, .022, .32, .022, "#344349");
      }
    }
    // Side windows keep the corners detailed as the rear camera follows bends.
    for (const side of [-1, 1]) {
      const sideBase = base.clone().multiply(new THREE.Matrix4().makeTranslation(side * width / 2, 0, 0)).multiply(new THREE.Matrix4().makeRotationY(side * Math.PI / 2));
      for (let floor = 0; floor < floors; floor++) for (const x of [-depth * .24, depth * .24]) {
        const y = 1.82 + floor * .90;
        put("side-window-surrounds", round, stone, sideBase, x, y, .04, .66, .72, .12, "#e4d8c3");
        put("side-windows", box, glass, sideBase, x, y, .11, .46, .57, .018, "#4a626d");
        put("side-sills", round, stone, sideBase, x, y - .34, .17, .72, .06, .22, "#dbd1bd");
      }
    }
    // Deep shop windows, a door with a brass handle, and a cloth canopy.
    const shop = buildingCount % shops.length;
    put("shop-frames", round, metal, base, 0, .79, front + .09, width - .65, 1.04, .16, "#30483f");
    for (const x of [-width * .28, width * .28]) {
      put("shop-glass", box, glass, base, x, .76, front + .19, width * .31, .85, .025, "#718c91");
      put("window-reflections", box, glass, base, x - .16, .82, front + .21, .10, .61, .009, "#a1b8b6");
    }
    put("shop-doors", round, metal, base, 0, .68, front + .20, .62, 1.05, .06, "#253e37");
    put("door-glass", box, glass, base, 0, .79, front + .24, .45, .70, .014, "#536e71");
    put("door-handles", cylinder, metal, base, .22, .65, front + .29, .025, .17, .025, "#b59b62");
    put(`shop-sign-${shop}`, shopGeometry, shopMaterials[shop], base, 0, 1.38, front + .18, width - .65, .36, 1);
    // Canopy has a sloping fabric roof and a scalloped valance, never a solid cube.
    for (let stripe = 0; stripe < 10; stripe++) {
      const x = (stripe - 4.5) * (width - .65) / 10;
      const fabric = new THREE.Matrix4().makeTranslation(x, 1.10, front + .54).multiply(new THREE.Matrix4().makeRotationX(.20));
      put("awning-fabric", box, stone, base.clone().multiply(fabric), 0, 0, 0, (width - .65) / 10, .035, .76, stripe % 2 ? "#e5d9bd" : ["#3e6455", "#914f42", "#415b70"][shop % 3]);
      put("awning-scallops", ball, stone, base, x, .98, front + .91, (width - .65) / 20, .07, .025, stripe % 2 ? "#e5d9bd" : ["#3e6455", "#914f42", "#415b70"][shop % 3]);
    }
    // Slate dormers introduce a roof silhouette above the cornice.
    for (const x of [-width * .27, width * .27]) {
      put("dormers", round, stone, base, x, height + .48, front * .73, .56, .53, .48, "#d2c8b6");
      put("dormer-glass", box, glass, base, x, height + .49, front * .73 + .25, .34, .34, .025, "#3c535e");
      put("dormer-caps", round, metal, base, x, height + .78, front * .73, .68, .10, .61, "#424d58");
    }
  }

  const crowdSpots: SpectatorSpot[] = [];
  for (let d = 5; d < road.total - 3; d += 5.8) for (const side of [-1, 1]) {
    const base = baseAt(d, side * 3.25), tint = random();
    // Slim bollards line the pavement without narrowing the drivable road.
    put("bollards", cylinder, metal, base, -side * .84, .35, 0, .07, .52, .07, "#38494a");
    put("bollard-caps", ball, metal, base, -side * .84, .63, 0, .045, .045, .045, "#b7b5a5");
    if (Math.floor(d / 5.8) % 2 === 0) {
      put("tree-planters", round, stone, base, 0, .24, 0, .68, .28, .68, "#a3a293");
      put("soil", box, stone, base, 0, .39, 0, .55, .03, .55, "#514a3e");
      put("tree-trunks", cylinder, stone, base, 0, 1.08, 0, .12, 1.45, .12, "#6f6550");
      for (const [x, y, z, r] of [[-.19, 1.95, 0, .48], [.21, 2.10, .08, .52], [0, 2.44, -.05, .45], [0, 1.98, -.25, .40]])
        put("foliage", ball, leaf, base, x, y, z, r, r * 1.08, r, ["#607b50", "#71865b", "#516e48"][Math.floor(tint * 3)]);
    } else {
      put("lampposts", cylinder, metal, base, 0, 1.92, 0, .065, 3.6, .065, "#3e4c4c");
      put("lamp-bases", cylinder, metal, base, 0, .28, 0, .16, .35, .16, "#3e4c4c");
      put("lamp-arms", round, metal, base, -side * .30, 3.70, 0, .66, .055, .055, "#3e4c4c");
      put("lamp-heads", round, metal, base, -side * .59, 3.66, 0, .34, .09, .23, "#374749");
      put("lamp-lenses", round, lamp, base, -side * .59, 3.60, 0, .27, .025, .16);
      // Pavement light pools avoid dozens of expensive point lights on mobile.
      if (lighting > .25) put("lamp-pools", poolGeometry, poolMaterial, base, -side * .35, .119, 0, .85, 1, 1.55);
    }
    const bench = baseAt(d + 1.45, side * 3.18);
    for (let slat = 0; slat < 3; slat++) put("bench-slats", round, stone, bench, (slat - 1) * .11, .41, 0, .09, .05, .85, "#977451");
    put("bench-back", round, stone, bench, side * .17, .64, 0, .055, .32, .90, "#977451");
    for (const z of [-.30, .30]) put("bench-legs", cylinder, metal, bench, 0, .26, z, .07, .30, .07, "#354548");
    const person = new THREE.Vector3(-side * .25, .12, .8).applyMatrix4(base);
    if (Math.floor(d) % 3 !== 0) crowdSpots.push({ x: person.x, y: person.y, z: person.z, yaw: Math.atan2(-side * road.at(d).right.x, -side * road.at(d).right.z) });
  }

  // Zebra crossings remain paint only: card distances and movement never stop here.
  for (const fraction of [.27, .57, .80]) {
    const distance = road.total * fraction;
    for (let stripe = -4; stripe <= 4; stripe++) put("crosswalks", box, stone, baseAt(distance, 0), stripe * .42, .057, 0, .22, .012, .85, "#e7e5d9");
  }

  // Café furniture and bus shelters in the wider setback, well outside the tarmac.
  for (let d = 20; d < road.total - 8; d += 32) {
    const base = baseAt(d, -4.55, true);
    for (const x of [-.75, .75]) {
      put("cafe-tops", cylinder, stone, base, x, .66, 0, .56, .055, .56, "#e6dfce");
      put("cafe-stems", cylinder, metal, base, x, .40, 0, .06, .49, .06, "#354747");
      for (const z of [-.45, .45]) {
        put("cafe-seats", round, stone, base, x, .36, z, .27, .055, .27, "#7e5d46");
        for (const dx of [-.09, .09]) for (const dz of [-.09, .09]) put("cafe-legs", cylinder, metal, base, x + dx, .24, z + dz, .022, .24, .022, "#455b52");
        put("cafe-backs", round, metal, base, x, .54, z * 1.18, .29, .30, .025, "#455b52");
      }
    }
    put("parasol-poles", cylinder, metal, base, 0, 1.26, 0, .035, 2.3, .035, "#b7a68a");
    put("parasols", cone, stone, base, 0, 2.34, 0, 1.35, .40, 1.35, "#e5d7b8");
    const shelter = baseAt(d + 14, 4.65);
    for (const x of [-.7, .7]) put("bus-posts", cylinder, metal, shelter, x, .95, 0, .055, 1.8, .055, "#334d4b");
    put("bus-roofs", round, metal, shelter, 0, 1.9, 0, 1.7, .10, .85, "#3b5552");
    put("bus-back", box, glass, shelter, 0, 1.0, .27, 1.45, 1.4, .035, "#809c98");
    put("bus-seats", round, stone, shelter, 0, .45, 0, 1.2, .07, .32, "#ae9070");
    put("bus-marker", round, lamp, shelter, 1.05, 1.55, 0, .33, .44, .07);
  }
  // Low skyline beyond the street fronts. Deterministic placement keeps the road clear.
  for (let z = 25; z > -165; z -= 13) for (const x of [-28, -19, 22, 33]) {
    if (road.nearest(x, z).dist < 13) continue;
    const y = road.nearest(x, z).y, height = 4 + random() * 6;
    const base = new THREE.Matrix4().makeTranslation(x, y, z);
    put("skyline", round, stone, base, 0, height / 2, 0, 7, height, 6, "#9eaaa8");
    put("skyline-roofs", roofGeometry, metal, base, 0, height + .42, 0, 7 / Math.SQRT2, 1, 6 / Math.SQRT2, "#717e80");
    put("skyline-cornices", round, stone, base, 0, height, 0, 7.2, .16, 6.2, "#bbc1b7");
    for (let floor = 1; floor < height - .5; floor += .9) for (const face of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const facade = base.clone().multiply(new THREE.Matrix4().makeRotationY(face));
      for (const column of [-2.2, -1.1, 0, 1.1, 2.2]) put("skyline-windows", box, glass, facade, column, floor, face === 0 || face === Math.PI ? 3.02 : 3.52, .40, .54, .025, "#647b80");
    }
  }
  const meshes: THREE.InstancedMesh[] = [];
  for (const [name, batch] of batches) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length); mesh.name = `city-${name}`;
    batch.matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, batch.colors[i]); });
    mesh.castShadow = name === "facades" || name === "foliage" || name === "roofs"; mesh.receiveShadow = true;
    mesh.computeBoundingSphere(); root.add(mesh); meshes.push(mesh);
  }
  const crowd = createRoadsideCrowd(scene, crowdSpots);
  // Owned geometries/materials are unique resources, even when shared across batches.
  return { buildingCount, update(time: number, cars: readonly { position: { x: number; z: number } }[]) { crowd.update(time, cars); },
    dispose() {
      crowd.dispose(); scene.remove(root);
      const geometries = new Set<THREE.BufferGeometry>([box, round, cylinder, ball, cone, groundGeo, shopGeometry, poolGeometry, roofGeometry]);
      const materials = new Set<THREE.Material>([stone, metal, glass, litGlass, lamp, leaf, groundMat, poolMaterial, ...shopMaterials]);
      for (const mesh of meshes) { geometries.add(mesh.geometry); materials.add(mesh.material as THREE.Material); mesh.dispose(); }
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    } };
}
