import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

interface WinterRoad {
  total: number;
  at(distance: number): { point: THREE.Vector3; right: THREE.Vector3; forward: THREE.Vector3 };
  nearest(x: number, z: number): { dist: number; y: number };
}
interface Batch { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; colors: THREE.Color[] }

/** Shared scenery; snowfall follows the camera, independently of the card animations. */
export function createChristmasWorld(scene: THREE.Scene, road: WinterRoad, lighting: number) {
  const root = new THREE.Group(); root.name = "village-noel"; scene.add(root);
  let seed = 25122026;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const batches = new Map<string, Batch>();
  const box = new THREE.BoxGeometry(1, 1, 1), rounded = new RoundedBoxGeometry(1, 1, 1, 2, .06);
  const sphere = new THREE.SphereGeometry(1, 12, 8), cone = new THREE.ConeGeometry(1, 1, 16);
  const pole = new THREE.CylinderGeometry(.5, .5, 1, 12);
  const snow = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .96 });
  const wood = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .85 });
  const green = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .92 });
  const metal = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .36, metalness: .5 });
  const warm = new THREE.MeshStandardMaterial({ color: "#ffdda1", emissive: "#ffb75d", emissiveIntensity: .55 + lighting * 1.1, roughness: .4 });
  const lights = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
  const local = new THREE.Matrix4(), matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), scale = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function put(key: string, geo: THREE.BufferGeometry, material: THREE.Material, base: THREE.Matrix4, x: number, y: number, z: number, sx: number, sy: number, sz: number, color = "#ffffff", rotation = 0) {
    let batch = batches.get(key);
    if (!batch) { batch = { geometry: geo, material, matrices: [], colors: [] }; batches.set(key, batch); }
    local.compose(v.set(x, y, z), q.setFromAxisAngle(up, rotation), scale.set(sx, sy, sz));
    batch.matrices.push(matrix.multiplyMatrices(base, local).clone()); batch.colors.push(new THREE.Color(color));
  }
  function baseAt(distance: number, offset: number, facingRoad = false) {
    const { point, right, forward } = road.at(distance);
    return new THREE.Matrix4().compose(point.clone().addScaledVector(right, offset), new THREE.Quaternion().setFromAxisAngle(up, facingRoad ? Math.atan2(-Math.sign(offset) * right.x, -Math.sign(offset) * right.z) : Math.atan2(forward.x, forward.z)), new THREE.Vector3(1, 1, 1));
  }
  // Snow-covered rolling terrain follows the original road elevation.
  const groundGeo = new THREE.PlaneGeometry(160, 250, 64, 100); groundGeo.rotateX(-Math.PI / 2); groundGeo.translate(0, 0, -60);
  const p = groundGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), near = road.nearest(x, z);
    const rise = THREE.MathUtils.smoothstep(near.dist, 3, 20) * (1.6 + Math.sin(x * .11 + z * .035) * 1.0);
    p.setY(i, near.y - .17 + rise);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, snow); ground.receiveShadow = true; root.add(ground);
  const identity = new THREE.Matrix4();
  // Rounded snowbanks stay outside the original asphalt edge.
  for (let d = 0; d < road.total; d += 1.2) for (const side of [-1, 1]) {
    put("snowbanks", sphere, snow, baseAt(d, side * 2.70), 0, .02, 0, .46, .24 + random() * .12, .78, "#edf4f6");
  }
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? .43 : 1; if (!i) starShape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius); else starShape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); }
  starShape.closePath();
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: .12, bevelEnabled: true, bevelSize: .025, bevelThickness: .02, bevelSegments: 1, steps: 1 }); starGeo.translate(0, 0, -.06);
  function tree(base: THREE.Matrix4, height: number, decorated: boolean) {
    put("tree-trunks", pole, wood, base, 0, .5, 0, .18, 1, .18, "#645747");
    for (let tier = 0; tier < 4; tier++) {
      const radius = height * (.28 - tier * .047), y = height * (.28 + tier * .18), tierHeight = height * .39;
      put("fir-branches", cone, green, base, 0, y, 0, radius, tierHeight, radius, tier % 2 ? "#274d43" : "#345d50");
      put("fir-snow", cone, snow, base, 0, y + tierHeight * .11, 0, radius * .85, tierHeight * .83, radius * .85, "#eff5f5");
    }
    if (decorated) {
      for (let n = 0; n < 42; n++) {
        const t = n / 42, angle = t * Math.PI * 10, radius = height * .27 * (1 - t) + .03, y = height * (.15 + .70 * t);
        put("tree-lights", sphere, lights, base, Math.cos(angle) * radius, y, Math.sin(angle) * radius, .035, .035, .035, n % 3 ? "#ffe3a0" : "#f57365");
        if (n % 3 === 0) put("baubles", sphere, metal, base, Math.cos(angle + .35) * radius, y - .06, Math.sin(angle + .35) * radius, .067, .067, .067, n % 2 ? "#c44c3d" : "#d7ae59");
      }
      put("tree-stars", starGeo, warm, base, 0, height * 1.04, 0, .23, .23, .23);
    }
  }
  // Trees are kept back from the road; outer clusters give the village depth.
  for (let d = 2; d < road.total; d += 4.1) for (const side of [-1, 1]) {
    const offset = side * (4.0 + random() * 1.1), height = 2.6 + random() * 1.5;
    tree(baseAt(d, offset), height, Math.floor(d) % 3 === 0);
    if (Math.floor(d) % 2 === 0) tree(baseAt(d + 1.3, side * (12 + random() * 5)), 3.3 + random() * 2, false);
  }
  const gableShape = new THREE.Shape(); gableShape.moveTo(-.5, 0); gableShape.lineTo(.5, 0); gableShape.lineTo(0, 1); gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 1, bevelEnabled: false, steps: 1 }); gableGeo.translate(0, 0, -.5);
  const cabins: { x: number; z: number; radius: number }[] = [];
  let cabinCount = 0;
  for (let d = 7; d < road.total - 4; d += 10.5) for (const side of [-1, 1]) {
    const base = baseAt(d, side * 8, true), center = new THREE.Vector3().setFromMatrixPosition(base), w = 3.8 + random(), depth = 3.1, h = 2.05, rise = 1.25;
    const corners = [-1, 1].flatMap(x => [-1, 1].map(z => new THREE.Vector3(x * (w / 2 + .45), 0, z * (depth / 2 + .45)).applyMatrix4(base)));
    if (corners.some(c => road.nearest(c.x, c.z).dist < 5.2) || cabins.some(c => Math.hypot(center.x - c.x, center.z - c.z) < c.radius + w * .55)) continue;
    cabins.push({ x: center.x, z: center.z, radius: w * .55 }); cabinCount++;
    put("chalet-bodies", rounded, wood, base, 0, h / 2 - .10, 0, w, h + .20, depth, cabinCount % 2 ? "#79513c" : "#91674c");
    put("gable-wood", gableGeo, wood, base, 0, h, 0, w, rise, depth, "#835d43");
    for (let y = .15; y < h; y += .18) put("timber-courses", rounded, wood, base, 0, y, depth / 2 + .015, w + .03, .032, .05, "#b1845d");
    for (const x of [-w / 2 + .1, w / 2 - .1]) put("timber-uprights", rounded, wood, base, x, h / 2, depth / 2 + .06, .13, h, .15, "#4f3c30");
    // Two separate pitched roof planes, with thick soft-edged snow caps.
    const angle = Math.atan2(rise, w / 2), length = Math.hypot(w / 2, rise) + .35;
    for (const slope of [-1, 1]) {
      const roofBase = base.clone().multiply(new THREE.Matrix4().makeTranslation(slope * w / 4, h + rise / 2, 0)).multiply(new THREE.Matrix4().makeRotationZ(-slope * angle));
      put("roof-timber", rounded, wood, roofBase, 0, 0, 0, length, .16, depth + .65, "#513e35");
      put("roof-snow", rounded, snow, roofBase, 0, .13, 0, length + .04, .18, depth + .72, "#f3f6f4");
    }
    const front = depth / 2;
    for (const x of [-w * .30, w * .30]) {
      put("window-trim", rounded, wood, base, x, 1.15, front + .08, .82, .86, .12, "#d3b48b");
      put("warm-windows", box, warm, base, x, 1.15, front + .15, .63, .68, .02);
      put("window-crosses", box, wood, base, x, 1.15, front + .18, .035, .70, .03, "#745139");
      put("window-bars", box, wood, base, x, 1.15, front + .18, .65, .035, .03, "#745139");
      for (const shutter of [-1, 1]) put("shutters", rounded, wood, base, x + shutter * .51, 1.15, front + .10, .22, .77, .08, cabinCount % 2 ? "#587566" : "#953f37");
      put("sill-snow", rounded, snow, base, x, .72, front + .16, .98, .11, .25);
    }
    put("doors", rounded, wood, base, 0, .64, front + .05, .65, 1.25, .11, "#445c50");
    put("door-glass", box, warm, base, 0, .91, front + .12, .33, .34, .02);
    put("handles", sphere, metal, base, .21, .56, front + .14, .035, .035, .035, "#e0b963");
    put("attic-window", rounded, warm, base, 0, h + .40, front + .04, .43, .47, .04);
    put("chimneys", rounded, wood, base, w * .30, h + rise - .08, -.45, .38, .95, .42, "#8c7566");
    put("chimney-snow", rounded, snow, base, w * .30, h + rise + .42, -.45, .51, .13, .53);
    for (let n = 0; n < 16; n++) {
      const x = (n / 15 - .5) * (w + .35), y = h + rise - Math.abs(x) * Math.tan(angle) - .08;
      put("roof-fairy-lights", sphere, lights, base, x, y, front + .38, .043, .043, .043, n % 3 === 0 ? "#f47f67" : "#ffe5ab");
    }
    for (let n = 0; n < 5; n++) put("wreaths", sphere, green, base, Math.cos(n * Math.PI * 2 / 5) * .16, .84 + Math.sin(n * Math.PI * 2 / 5) * .16, front + .17, .09, .09, .05, "#315b48");
  }
  // Christmas squares: large decorated trees, gifts and snowmen beside the tarmac.
  for (const fraction of [.13, .43, .76]) {
    const d = road.total * fraction, base = baseAt(d, -5.6, true);
    tree(base, 5.5, true);
    for (let n = 0; n < 5; n++) {
      const x = (n - 2) * .38, z = .55 + (n % 2) * .35, size = .27 + random() * .16;
      put("gifts", rounded, wood, base, x, size / 2, z, size, size, size, n % 2 ? "#b84a43" : "#366951");
      put("gift-ribbons", box, metal, base, x, size / 2, z + size / 2 + .004, size * .15, size, .012, "#e4c77a");
      put("gift-ribbon-tops", box, metal, base, x, size + .008, z, size * .15, .012, size, "#e4c77a");
    }
    const snowman = baseAt(d + 4, 3.8, true);
    put("snowmen", sphere, snow, snowman, 0, .34, 0, .38, .39, .36);
    put("snowmen", sphere, snow, snowman, 0, .82, 0, .28, .29, .27);
    put("snowmen", sphere, snow, snowman, 0, 1.18, 0, .21, .22, .20);
    put("snowman-hats", pole, metal, snowman, 0, 1.43, 0, .35, .22, .35, "#34414a");
    put("hat-brims", pole, metal, snowman, 0, 1.33, 0, .54, .045, .54, "#34414a");
    put("scarves", rounded, wood, snowman, 0, 1.0, 0, .49, .10, .47, "#b64640");
    put("scarf-tails", rounded, wood, snowman, .13, .84, .27, .10, .32, .045, "#b64640");
    for (const x of [-.07, .07]) put("eyes", sphere, metal, snowman, x, 1.23, .182, .022, .022, .022, "#29363d");
    const noseBase = snowman.clone().multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    put("carrots", cone, wood, noseBase, 0, .28, -1.16, .04, .18, .04, "#d48c48");
  }
  // Lit garlands are suspended above the cars, not across the driving surface.
  for (const fraction of [.30, .64]) {
    const base = baseAt(road.total * fraction, 0);
    for (const side of [-1, 1]) {
      put("festive-posts", pole, wood, base, side * 2.85, 2.75, 0, .12, 5.5, .12, "#745744");
      put("post-snow", sphere, snow, base, side * 2.85, 5.52, 0, .11, .07, .11);
    }
    for (let n = 0; n <= 32; n++) {
      const x = -2.85 + n / 32 * 5.7, y = 5.5 - Math.sin(n / 32 * Math.PI) * .6;
      put("garlands", sphere, green, base, x, y, 0, .13, .10, .13, "#2f5845");
      if (n % 2 === 0) put("garland-lights", sphere, lights, base, x, y - .12, -.03, .045, .045, .045, n % 4 ? "#f48d72" : "#ffe1a0");
    }
    put("suspended-stars", starGeo, warm, base, 0, 4.52, 0, .26, .26, .26);
  }
  // Snowy hills beyond the village use smooth, overlapping profiles.
  for (let z = 15; z > -170; z -= 18) for (const side of [-1, 1]) {
    const x = side * (26 + random() * 8), y = road.nearest(x, z).y;
    if (road.nearest(x, z).dist < 16) continue;
    put("snow-hills", sphere, snow, identity, x, y - 1, z, 12, 3 + random() * 5, 15, "#d8e5ec");
  }
  const meshes: THREE.InstancedMesh[] = [];
  for (const [name, batch] of batches) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length); mesh.name = `christmas-${name}`;
    batch.matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, batch.colors[i]); });
    mesh.castShadow = ["chalet-bodies", "roof-snow", "fir-branches"].includes(name); mesh.receiveShadow = true; mesh.computeBoundingSphere(); root.add(mesh); meshes.push(mesh);
  }
  const count = 1000, positions = new Float32Array(count * 3), seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { seeds[i * 4] = random() * 48 - 24; seeds[i * 4 + 1] = random() * 22; seeds[i * 4 + 2] = random() * 48 - 24; seeds[i * 4 + 3] = .65 + random() * .65; }
  const flakeCanvas = document.createElement("canvas"); flakeCanvas.width = flakeCanvas.height = 32;
  const ctx = flakeCanvas.getContext("2d")!, gradient = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  gradient.addColorStop(0, "rgba(255,255,255,1)"); gradient.addColorStop(.45, "rgba(255,255,255,.8)"); gradient.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 32, 32);
  const flakeTexture = new THREE.CanvasTexture(flakeCanvas), flakesGeo = new THREE.BufferGeometry();
  flakesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const flakesMat = new THREE.PointsMaterial({ color: "#f6fcff", map: flakeTexture, transparent: true, opacity: .82, size: .20, sizeAttenuation: true, depthWrite: false });
  const flakes = new THREE.Points(flakesGeo, flakesMat); flakes.name = "falling-snow"; flakes.frustumCulled = false; root.add(flakes);
  const wrap = (value: number, period: number) => ((value % period) + period) % period;
  return { cabinCount,
    update(time: number, camera: THREE.Camera) {
      // The same absolute time produces the same fall: no frame-rate-dependent drift.
      for (let i = 0; i < count; i++) {
        const k = i * 4, j = i * 3, speed = seeds[k + 3];
        positions[j] = camera.position.x + wrap(seeds[k] + time * .25 + Math.sin(time * .6 + i) * .30 - camera.position.x + 24, 48) - 24;
        positions[j + 1] = camera.position.y + wrap(seeds[k + 1] - time * speed - camera.position.y + 7, 22) - 7;
        positions[j + 2] = camera.position.z + wrap(seeds[k + 2] - camera.position.z + 24, 48) - 24;
      }
      flakesGeo.attributes.position.needsUpdate = true;
    },
    dispose() {
      scene.remove(root); const geometries = new Set<THREE.BufferGeometry>([box, rounded, sphere, cone, pole, groundGeo, starGeo, gableGeo, flakesGeo]);
      const materials = new Set<THREE.Material>([snow, wood, green, metal, warm, lights, flakesMat]);
      meshes.forEach(m => { geometries.add(m.geometry); materials.add(m.material as THREE.Material); m.dispose(); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); flakeTexture.dispose();
    } };
}
