import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CarModel } from "./models";
import { vehiclePaint } from "./vehicleFinish";
import { ROAD_CAR_IDS, type RoadCarId } from "@/game/lib/cars";

type Style = "coupe" | "sedan" | "hatch" | "suv" | "van" | "pickup" | "retro";
interface Profile { size: [number, number, number]; style: Style }
/** Measured envelopes of the old cars, including mirrors and roof equipment. */
export const ROAD_PROFILES: Record<RoadCarId, Profile> = {
  supercar: { size: [0.735586, 0.354212, 1.18], style: "coupe" },
  retro: { size: [0.545832, 0.339107, 1.12], style: "retro" },
  "sedan-sports": { size: [0.559042, 0.473028, 1.0965], style: "coupe" },
  "hatchback-sports": { size: [0.55895, 0.472975, 1.2255], style: "hatch" },
  sedan: { size: [0.644976, 0.558995, 1.0965], style: "sedan" },
  suv: { size: [0.644976, 0.55897, 1.161], style: "suv" },
  "suv-luxury": { size: [0.645008, 0.558996, 1.2255], style: "suv" },
  van: { size: [0.645039, 0.580476, 1.1825], style: "van" },
  truck: { size: [0.645031, 0.558989, 1.2685], style: "pickup" },
  taxi: { size: [0.645039, 0.644989, 1.1825], style: "sedan" },
  police: { size: [0.645059, 0.559003, 1.333008], style: "sedan" },
  kilomax: { size: [0.53, 0.4825, 1.06], style: "coupe" },
};
export const isRoadCar = (id: string): id is RoadCarId => (ROAD_CAR_IDS as readonly string[]).includes(id);

interface Section { z: number; width: number; bottom: number; top: number }
/** Smooth longitudinal panels, with proper wheel openings in the lower silhouette. */
function loft(sections: Section[], cabin = false) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  const sides = 24;
  sections.forEach((s, row) => {
    for (let j = 0; j < sides; j++) {
      const a = j / sides * Math.PI * 2, c = Math.cos(a), n = Math.sin(a);
      const x = Math.sign(c) * Math.pow(Math.abs(c), cabin ? 0.65 : 0.45) * s.width;
      const y = cabin ? s.bottom + Math.pow(Math.max(0, n), 0.8) * (s.top - s.bottom) : (s.bottom + s.top) / 2 + Math.sign(n) * Math.pow(Math.abs(n), 0.7) * (s.top - s.bottom) / 2;
      positions.push(x, y, s.z);uv.push(j / sides, row / (sections.length - 1));
      if (row < sections.length - 1) {
        const p = row * sides + j, next = row * sides + (j + 1) % sides;
        indices.push(p, next, p + sides, next, next + sides, p + sides);
      }
    }
  });
  for (const [row, front] of [[0, false], [sections.length - 1, true]] as const) {
    const s = sections[row], centre = positions.length / 3;
    positions.push(0, (s.bottom + s.top) / 2, s.z);uv.push(0.5, 0.5);
    for (let j = 0; j < sides; j++) {
      const a = row * sides + j, b = row * sides + (j + 1) % sides;
      indices.push(...(front ? [centre, a, b] : [centre, b, a]));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Painted roof follows the curved glazing surface instead of sitting on a box. */
function roofSkin(sections: Section[], lift: number) {
  const points:number[]=[],uv:number[]=[],indices:number[]=[],n=12;
  sections.forEach((s,row)=>{for(let i=0;i<=n;i++){
    const a=Math.PI/4+i/n*Math.PI/2,c=Math.cos(a);
    points.push(Math.sign(c)*Math.pow(Math.abs(c),.65)*s.width,s.bottom+Math.pow(Math.sin(a),.8)*(s.top-s.bottom)+lift,s.z);
    uv.push(i/n,row/(sections.length-1));
    if(row<sections.length-1&&i<n){const p=row*(n+1)+i;indices.push(p,p+1,p+n+1,p+1,p+n+2,p+n+1)}
  }});
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(points,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const g = new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());return g;
}

/** Static body details share one draw call per material; wheels stay independent. */
function batchBody(body: THREE.Group) {
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of [...body.children]) {
    const m = child as THREE.Mesh;if (!m.isMesh || Array.isArray(m.material)) continue;
    const group = batches.get(m.material) ?? [];group.push(m);batches.set(m.material, group);
  }
  for (const [material, meshes] of batches) {
    const parts = meshes.map(mesh => {mesh.updateMatrix();const g = mesh.geometry.clone().applyMatrix4(mesh.matrix);const plain = g.index ? g.toNonIndexed() : g;if (plain !== g) g.dispose();return plain;});
    const merged = mergeGeometries(parts)!;parts.forEach(g => g.dispose());
    const originals = new Set(meshes.map(m => m.geometry));meshes.forEach(m => body.remove(m));originals.forEach(g => g.dispose());
    const m = new THREE.Mesh(merged, material);m.name = material.name;m.castShadow = m.receiveShadow = true;body.add(m);
  }
}

function plateMaterial(label: string) {
  const material = new THREE.MeshStandardMaterial({ color: "#f1f0e6", roughness: 0.6 });
  if (typeof document === "undefined") return material;
  const c = document.createElement("canvas");c.width = 256;c.height = 64;const g = c.getContext("2d")!;
  g.fillStyle = "#f5f2df";g.fillRect(0, 0, 256, 64);g.fillStyle = "#295d94";g.fillRect(0, 0, 24, 64);
  g.fillStyle = "#172127";g.font = "bold 34px Arial";g.textAlign = "center";g.textBaseline = "middle";g.fillText(label, 140, 35);
  const texture = new THREE.CanvasTexture(c);texture.colorSpace = THREE.SRGBColorSpace;material.map = texture;return material;
}

function wheel(radius: number, width: number, materials: { tyre: THREE.Material; alloy: THREE.Material; disc: THREE.Material }) {
  const rubber: THREE.BufferGeometry[] = [];
  const centre = new THREE.CylinderGeometry(radius * 0.86, radius * 0.86, width - radius * 0.36, 40);centre.rotateZ(Math.PI / 2);rubber.push(centre);
  for (const side of [-1, 1]) {
    const edge = new THREE.TorusGeometry(radius * 0.82, radius * 0.18, 8, 40);edge.rotateY(Math.PI / 2);edge.translate(side * (width / 2 - radius * 0.18), 0, 0);rubber.push(edge);
  }
  const combine = (parts: THREE.BufferGeometry[]) => {
    const flat = parts.map(g => g.index ? g.toNonIndexed() : g);const geometry = mergeGeometries(flat)!;
    new Set([...parts, ...flat]).forEach(g => g.dispose());return geometry;
  };
  const result = new THREE.Mesh(combine(rubber), materials.tyre);
  const metal: THREE.BufferGeometry[] = [], brakes: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.001);
    const rim = new THREE.TorusGeometry(radius * 0.61, radius * 0.035, 6, 32);rim.rotateY(Math.PI / 2);rim.translate(x, 0, 0);metal.push(rim);
    const hub = new THREE.CylinderGeometry(radius * 0.12, radius * 0.12, 0.006, 16);hub.rotateZ(Math.PI / 2);hub.translate(x, 0, 0);metal.push(hub);
    const disc = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.003, 28);disc.rotateZ(Math.PI / 2);disc.translate(x - side * 0.003, 0, 0);brakes.push(disc);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const spoke = new THREE.BoxGeometry(0.006, radius * 0.08, radius * 0.58);
      spoke.rotateX(a - Math.PI / 2);spoke.translate(x + side * 0.001, Math.cos(a) * radius * 0.32, Math.sin(a) * radius * 0.32);metal.push(spoke);
    }
  }
  result.add(new THREE.Mesh(combine(metal), materials.alloy), new THREE.Mesh(combine(brakes), materials.disc));
  result.userData.rest = new THREE.Vector3(1, 1, 1);result.userData.axle = "x";result.userData.up = "y";
  return result;
}

export function createRoadVehicle(id: RoadCarId, color: string, repaint = true): CarModel {
  const profile = ROAD_PROFILES[id], [W, H, L] = profile.size, style = profile.style;
  const root = new THREE.Group(), body = new THREE.Group();root.name = `vehicle-${id}`;root.add(body);
  const livery = !repaint && id === "taxi" ? "#f2c32c" : !repaint && id === "police" ? "#e5e9eb" : color;
  const paint = vehiclePaint(livery);paint.name = "vehicle-paint";
  const trim = new THREE.MeshStandardMaterial({ color: "#1e2429", roughness: 0.76, name: "vehicle-trim" });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#263d48", metalness: 0.12, roughness: 0.16, clearcoat: 0.6, name: "vehicle-glass" });
  const alloy = new THREE.MeshStandardMaterial({ color: "#bdc4c9", metalness: 0.7, roughness: 0.28, name: "vehicle-alloy" });
  const tyre = new THREE.MeshStandardMaterial({ color: "#151719", roughness: 0.92 });
  const disc = new THREE.MeshStandardMaterial({ color: "#596167", metalness: 0.6, roughness: 0.5 });
  const headlight = new THREE.MeshStandardMaterial({ color: "#edf5f6", emissive: "#e0f1ff", emissiveIntensity: 0.8, roughness: 0.2, name: "vehicle-headlights" });
  const brakeLights = new THREE.MeshStandardMaterial({ color: "#a91e25", emissive: "#ff2525", emissiveIntensity: 0.3, roughness: 0.3, name: "vehicle-tail-lights" });
  const roofRatio = id === "taxi" || id === "police" ? 0.84 : 0.98;
  const R = Math.min(H * 0.27, L * 0.108), tyreWidth = W * 0.105, axle = L * (style === "van" ? 0.3 : 0.315);
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0) => {const mesh = new THREE.Mesh(g, m);mesh.position.set(x, y, z);mesh.rotation.x = rx;body.add(mesh);return mesh;};
  const box = (w: number, h: number, d: number, r = 0.01) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w * 0.45, h * 0.45, d * 0.45));
  const belt = H * (style === "coupe" ? 0.49 : 0.53);
  const sections: Section[] = [];
  for (let i = 0; i <= 64; i++) {
    const u = i / 64, z = (u - 0.5) * L;
    const well = Math.max(...[-axle, axle].map(at => Math.abs(z - at) < R * 1.1 ? R + Math.sqrt((R * 1.1) ** 2 - (z - at) ** 2) : 0));
    const bottom = Math.max(H * 0.17, well);
    const taper = 0.76 + 0.24 * Math.pow(Math.sin(u * Math.PI), 0.35);
    const top = Math.max(bottom + H * 0.045, belt - H * 0.035 * Math.pow(Math.abs(u - 0.5) * 2, 4));
    sections.push({ z, width: W * 0.43 * taper, bottom, top });
  }
  add(loft(sections), paint);
  add(box(W * 0.66, H * 0.06, L * 0.78), trim, 0, H * 0.18, 0);

  const long = style === "suv" || style === "van" || style === "hatch";
  const rear = style === "pickup" ? -0.08 : long ? -0.41 : -0.31;
  const front = style === "van" ? 0.4 : 0.25;
  const roofRear = style === "pickup" ? -0.015 : long ? -0.3 : -0.17;
  const roofFront = style === "van" ? 0.26 : style === "retro" ? 0.1 : 0.07;
  const base = belt - H * 0.025, peak = H * roofRatio;
  const cabin = [
    {z:rear*L,width:W*.32,bottom:base,top:base+H*.025},
    {z:(rear*.45+roofRear*.55)*L,width:W*.34,bottom:base,top:base+(peak-base)*.78},
    {z:roofRear*L,width:W*.33,bottom:base,top:peak-H*.012},
    {z:(roofRear+roofFront)*L*.5,width:W*.33,bottom:base,top:peak},
    {z:roofFront*L,width:W*.32,bottom:base,top:peak-H*.012},
    {z:(roofFront*.45+front*.55)*L,width:W*.35,bottom:base,top:base+(peak-base)*.5},
    {z:front*L,width:W*.36,bottom:base,top:base+H*.01},
  ];
  add(loft(cabin, true), style === "van" ? paint : glass);
  add(roofSkin(cabin.slice(2,5),H*.003),paint);
  // Slender pillars and real panel gaps replace the old blocks of flat glass.
  for (const side of [-1, 1]) {
    for (const [z, end] of [[roofRear * L, rear * L], [roofFront * L, front * L]]) {
      add(rod(new THREE.Vector3(side * W * 0.35, base, end), new THREE.Vector3(side * W * 0.26, base + (peak - base) * 0.76, z), W * 0.012), paint);
    }
    if (style !== "coupe") add(rod(new THREE.Vector3(side * W * .35, base, -L*.025),new THREE.Vector3(side * W * .26,base+(peak-base)*.76,-L*.025),W*.012),trim);
    add(rod(new THREE.Vector3(side*W*.34,H*.58,L*.13),new THREE.Vector3(side*W*.43,H*.61,L*.13),W*.013),trim);
    add(box(W*.09,H*.065,L*.08),paint,side*W*.455,H*.61,L*.13);
    add(box(W*.016,H*.025,L*.095),alloy,side*W*.424,H*.47,-L*.045);
    add(box(W*.009,H*.21,L*.003),trim,side*W*.424,H*.32,-L*.12);
    if (style === "van") add(box(W*.012,H*.23,L*.22),glass,side*W*.345,H*.73,L*.15);
  }
  if (style === "van") {
    const windshield = new THREE.PlaneGeometry(W*.58,H*.31);
    add(windshield,glass,0,H*.72,L*.345,-0.43);
  }
  if (style === "pickup") {
    add(box(W*.68,H*.018,L*.32),trim,0,belt+H*.02,-L*.3);
    for (const side of [-1,1]) add(box(W*.065,H*.12,L*.36),paint,side*W*.37,belt+H*.06,-L*.3);
    add(box(W*.8,H*.1,L*.035),paint,0,belt+H*.05,-L*.465);
  }
  add(box(W*.65,H*.115,L*.025),trim,0,H*.29,-L*.485);
  add(box(W*.65,H*.1,L*.022),trim,0,H*.26,L*.486);
  add(box(W*.46,H*.08,L*.008),trim,0,H*.37,L*.496);
  for(const side of [-1,1]) {
    if(style === "retro") {
      const lamp=new THREE.CylinderGeometry(H*.075,H*.075,L*.012,24);lamp.rotateX(Math.PI/2);add(lamp,headlight,side*W*.28,H*.43,L*.492);
    } else add(box(W*.22,H*.06,L*.014),headlight,side*W*.22,H*.43,L*.505);
    add(box(W*.20,H*.055,L*.008),brakeLights,side*W*.22,H*.43,-L*.505);
    add(box(W*.12,H*.018,L*.008),brakeLights,side*W*.24,H*.37,-L*.505);
    const pipe=new THREE.TorusGeometry(L*.015,L*.003,6,16);add(pipe,alloy,side*W*.25,H*.21,-L*.495);
  }
  for (let i=-2;i<=2;i++) add(box(W*.013,H*.09,L*.06),trim,i*W*.09,H*.2,-L*.46);
  const plate=plateMaterial("KILOMAX");const rearPlate=add(new THREE.PlaneGeometry(W*.28,H*.085),plate,0,H*.34,-L*.501);rearPlate.rotation.y=Math.PI;
  if (style === "retro") {add(box(W*.65,H*.045,L*.025),alloy,0,H*.3,-L*.486);add(box(W*.65,H*.045,L*.025),alloy,0,H*.3,L*.486);}
  if(id === "taxi") {
    add(box(W*.38,H*.09,L*.13),headlight,0,H*.945,-L*.03);
    const taxiPlate=plateMaterial("TAXI");add(new THREE.PlaneGeometry(W*.34,H*.075),taxiPlate,0,H*.945,L*.036);
  }
  if(id === "police") {
    add(box(W*.6,H*.025,L*.12),trim,0,H*.9,-L*.03);
    const red=new THREE.MeshStandardMaterial({color:'#d12b32',emissive:'#eb1e29',emissiveIntensity:.5}),blue=new THREE.MeshStandardMaterial({color:'#237bd6',emissive:'#168dff',emissiveIntensity:.5});
    add(box(W*.27,H*.08,L*.1),red,-W*.16,H*.945,-L*.03);add(box(W*.27,H*.08,L*.1),blue,W*.16,H*.945,-L*.03);
    for(const side of [-1,1])add(box(W*.015,H*.12,L*.36),trim,side*W*.426,H*.42,-L*.03);
  }
  batchBody(body);
  const wheels: THREE.Mesh[]=[];
  for(const z of [axle,-axle])for(const side of [-1,1]) {
    const w=wheel(R,tyreWidth,{tyre,alloy,disc});w.position.set(side*(W*.43-tyreWidth/2),R,z);w.name=`${z>0?'front':'rear'}-${side<0?'left':'right'}`;root.add(w);wheels.push(w);
  }
  const mounts={roof:new THREE.Group(),rear:new THREE.Group(),front:new THREE.Group()};
  mounts.roof.position.set(0,peak+H*.02,-L*.06);mounts.rear.position.set(0,H*.43,-L*.49);mounts.front.position.set(0,H*.28,L*.49);body.add(mounts.roof,mounts.rear,mounts.front);
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
  root.scale.set(W/size.x,H/size.y,L/size.z);root.position.y=-bounds.min.y*root.scale.y;
  root.traverse(o=>{if((o as THREE.Mesh).isMesh)o.castShadow=true;});
  const indicatorPaint = !repaint && (id === "taxi" || id === "police") ? new THREE.MeshStandardMaterial({ color }) : paint;
  return{root,body,wheels,brakeLights,paint:indicatorPaint,mounts,exhaust:new THREE.Vector3(W*.25,H*.21,-L*.495)};
}
