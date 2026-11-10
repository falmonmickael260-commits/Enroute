import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y); return s;
}

function plate(w: number, h: number, d: number, r: number) {
  const g = new THREE.ExtrudeGeometry(roundedShape(w, h, r), { depth: d, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -d / 2); return g;
}

function face(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 10), p = g.attributes.position;
  const uv: number[] = [];
  for (let i = 0; i < p.count; i++) uv.push(p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); return g;
}

function texture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  draw(canvas.getContext("2d")!);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
}

function panelTexture(value: string, kind: "distance" | "finish" | "start") {
  const w = kind === "distance" ? 512 : kind === "finish" ? 1024 : 768;
  const h = kind === "distance" ? 256 : 208;
  return texture(w, h, g => {
    g.fillStyle = kind === "distance" ? "#173f68" : "#152631"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#f2f1df"; g.lineWidth = 8; g.beginPath();g.roundRect(10, 10, w - 20, h - 20, 20);g.stroke();
    if (kind !== "distance") {
      const size = 16;
      for (let x = 0; x < w / size; x++) for (let y = 0; y < 2; y++) {
        g.fillStyle = (x + y) % 2 ? "#e6eadf" : "#17232a";
        g.fillRect(x * size, y * size + h - 48, size, size);
      }
    }
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#f8f6e8";
    g.font = "bold 24px Arial, sans-serif";
    g.fillText(kind === "distance" ? "PARCOURS" : kind === "finish" ? "ARRIVÉE" : "KILOMAX", w / 2, kind === "distance" ? 42 : 35);
    g.font = `bold ${kind === "distance" ? value.length > 3 ? 138 : 154 : 88}px Arial, sans-serif`;
    g.fillText(value, w / 2, kind === "distance" ? 126 : 112);
    if (kind === "distance") { g.font = "bold 32px Arial, sans-serif";g.fillText("km", w / 2, 217); }
  });
}

function metal() { return new THREE.MeshStandardMaterial({ color: "#b2bcc0", roughness: 0.46, metalness: 0.65 }); }
function enamel(map: THREE.Texture, lights: number) {
  return new THREE.MeshStandardMaterial({ map, emissive: "white", emissiveMap: map, emissiveIntensity: 0.04 + lights * 0.2, roughness: 0.55, metalness: 0.04, side: THREE.DoubleSide });
}
function mesh(group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z);m.castShadow = true;group.add(m);return m;
}

export function createDistanceSign(km: number, lights: number) {
  const g = new THREE.Group(), steel = metal();g.name = `distance-sign-${km}`;
  mesh(g, plate(1.6, 0.8, 0.08, 0.12), steel, 0, 1.9, 0);
  mesh(g, face(1.51, 0.71, 0.09), enamel(panelTexture(String(km), "distance"), lights), 0, 1.9, 0.045).castShadow = false;
  mesh(g, new THREE.CylinderGeometry(0.045, 0.045, 1.94, 16), steel, 0, 0.97, -0.12);
  mesh(g, new THREE.CylinderGeometry(0.13, 0.15, 0.055, 16), steel, 0, 0.028, -0.12);
  for (const y of [1.72, 2.08]) mesh(g, new RoundedBoxGeometry(0.65, 0.045, 0.06, 1, 0.012), steel, 0, y, -0.068);
  const bolt = new THREE.SphereGeometry(0.018, 8, 5);
  for (const x of [-0.66, 0.66]) for (const y of [1.65, 2.15]) mesh(g, bolt, steel, x, y, 0.055);
  return g;
}

export function createFinishBanner(width: number, target: number, lights: number) {
  const g = new THREE.Group();
  mesh(g, plate(width, 1.1, 0.12, 0.16), metal(), 0, 0, 0);
  const paint = enamel(panelTexture(`${target} km`, "finish"), lights);
  mesh(g, face(width - 0.1, 1, 0.12), paint, 0, 0, 0.065).castShadow = false;
  return g;
}

export function decorateStartGantry(group: THREE.Group, span: number) {
  const decor = new THREE.Group();group.add(decor);
  const steel = metal(), dark = new THREE.MeshStandardMaterial({ color: "#303c43", roughness: 0.52, metalness: 0.35 });
  for (const side of [-1, 1]) {
    mesh(decor, new THREE.CylinderGeometry(0.15, 0.18, 0.08, 16), steel, side * span, 0.04, 0);
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.95, 10), steel);
    brace.position.set(side * (span - 0.25), 3.46, 0);brace.rotation.z = side * 0.55;decor.add(brace);
  }
  const label = new THREE.Group();
  mesh(label, plate(1.5, 0.43, 0.07, 0.08), steel, 0, 0, 0);
  mesh(label, face(1.44, 0.37, 0.06), enamel(panelTexture("DÉPART", "start"), 0), 0, 0, 0.04);
  label.position.set(0, 4.13, -0.02);label.rotation.y = Math.PI;decor.add(label);
  const ring = new THREE.TorusGeometry(0.154, 0.014, 6, 20);
  const hood = new THREE.CylinderGeometry(0.164, 0.164, 0.1, 20, 1, true);hood.rotateX(Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    mesh(decor, ring, steel, (i - 2) * 0.4, 3.55, -0.105);
    mesh(decor, hood, dark, (i - 2) * 0.4, 3.55, -0.055);
  }
  return decor;
}

export function createChevronParts(lights: number) {
  const map = texture(256, 192, g => {
    g.fillStyle = "#ae3029";g.fillRect(0, 0, 256, 192);
    g.strokeStyle = "#f8f5e8";g.lineWidth = 7;g.beginPath();g.roundRect(7, 7, 242, 178, 24);g.stroke();
    g.fillStyle = "#fffdf0";
    for (const x of [30, 130]) {g.beginPath();g.moveTo(x, 35);g.lineTo(x + 25, 35);g.lineTo(x + 80, 96);g.lineTo(x + 25, 157);g.lineTo(x, 157);g.lineTo(x + 54, 96);g.closePath();g.fill();}
  });
  const front = face(0.92, 0.92, 0.12);front.translate(0, 0, 0.045);
  const frame = metal();frame.side = THREE.DoubleSide;frame.name = "chevron-frame";
  const paint = enamel(map, lights);paint.name = "chevron-face";
  return [{ geometry: plate(1, 1, 0.08, 0.14), material: frame }, { geometry: front, material: paint }];
}

/** Sign groups own their materials/textures, including shared bolts and poles. */
export function disposeSignGroup(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  group.traverse(o => {
    const m = o as THREE.Mesh;if (!m.isMesh) return;
    geometries.add(m.geometry);
    for (const material of Array.isArray(m.material) ? m.material : [m.material]) {
      materials.add(material);const painted = material as THREE.MeshStandardMaterial;
      if (painted.map) textures.add(painted.map);if (painted.emissiveMap) textures.add(painted.emissiveMap);
    }
  });
  geometries.forEach(g => g.dispose());materials.forEach(m => m.dispose());textures.forEach(t => t.dispose());
}

export function checkerLineTexture() {
  return texture(256, 32, g => {
    for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 ? "#14232a" : "#fbf8ee";g.fillRect(x * 16, y * 16, 16, 16);
    }
  });
}
