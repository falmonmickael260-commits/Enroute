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
/** Bevelled body sections: flat bonnet/deck and doors with a narrow shoulder. */
function loft(sections: Section[]) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  // Counter-clockwise from the right sill; the broad panels stay almost planar.
  const ring = [[1,.12],[1,.73],[.97,.89],[.88,.98],[.65,1],[0,1.012],[-.65,1],[-.88,.98],[-.97,.89],[-1,.73],[-1,.12],[-.9,0],[.9,0]];
  const sides = ring.length;
  sections.forEach((section,row)=>{
    ring.forEach(([x,y],j)=>{
      positions.push(x*section.width,section.bottom+y*(section.top-section.bottom),section.z);
      uv.push(j/sides,row/(sections.length-1));
      if(row<sections.length-1){const a=row*sides+j,b=row*sides+(j+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);}
    });
  });
  for(const row of [0,sections.length-1]){
    const section=sections[row],centre=positions.length/3;
    positions.push(0,(section.bottom+section.top)/2,section.z);uv.push(.5,.5);
    for(let j=0;j<sides;j++){const a=row*sides+j,b=row*sides+(j+1)%sides;indices.push(...(row===0?[centre,b,a]:[centre,a,b]));}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

/** A panel is one surface, allowing separate rear, windscreen and side glazing. */
function panel(corners: number[][]) {
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(corners.flat(),3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return g;
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
  const paint = vehiclePaint(livery);paint.name = "vehicle-paint";paint.roughness = .42;paint.clearcoat = .38;
  const trim = new THREE.MeshStandardMaterial({ color: "#1e2429", roughness: 0.76, name: "vehicle-trim" });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#263d48", metalness: 0.12, roughness: 0.20, clearcoat: 0.4, side: THREE.DoubleSide, name: "vehicle-glass" });
  const alloy = new THREE.MeshStandardMaterial({ color: "#bdc4c9", metalness: 0.7, roughness: 0.28, name: "vehicle-alloy" });
  const tyre = new THREE.MeshStandardMaterial({ color: "#151719", roughness: 0.92 });
  const disc = new THREE.MeshStandardMaterial({ color: "#596167", metalness: 0.6, roughness: 0.5 });
  const headlight = new THREE.MeshStandardMaterial({ color: "#edf5f6", emissive: "#e0f1ff", emissiveIntensity: 0.12, roughness: 0.2, name: "vehicle-headlights" });
  const brakeLights = new THREE.MeshStandardMaterial({ color: "#a91e25", emissive: "#ff2525", emissiveIntensity: 0.08, roughness: 0.3, name: "vehicle-tail-lights" });
  const roofRatio = id === "taxi" || id === "police" ? 0.84 : 0.98;
  const R = Math.min(H * 0.255, L * 0.103), tyreWidth = W * 0.115, axle = L * (style === "van" ? 0.3 : 0.315);
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0) => {const mesh = new THREE.Mesh(g, m);mesh.position.set(x, y, z);mesh.rotation.x = rx;body.add(mesh);return mesh;};
  const box = (w: number, h: number, d: number, r = 0.01) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w * 0.45, h * 0.45, d * 0.45));
  const belt = H * (style === "coupe" ? 0.64 : 0.61);
  const sections: Section[] = [];
  for (let i = 0; i <= 64; i++) {
    const u = i / 64, z = (u - 0.5) * L;
    const well = Math.max(...[-axle, axle].map(at => Math.abs(z - at) < R * 1.055 ? R + Math.sqrt((R * 1.055) ** 2 - (z - at) ** 2) : 0));
    const bottom = Math.max(H * 0.17, well);
    const taper = 0.94 + 0.06 * Math.sin(u * Math.PI);
    const top = Math.max(bottom + H * 0.018, belt - H * 0.045 * Math.pow(Math.abs(u - 0.5) * 2, 6));
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
  // Painted structure underneath individual glass panes, with visible C/A pillars.
  const cabin = [
    {z:rear*L,width:W*.355,bottom:base,top:base+H*.018},
    {z:roofRear*L,width:W*.288,bottom:base,top:peak-H*.012},
    {z:(roofRear+roofFront)*L*.5,width:W*.29,bottom:base,top:peak},
    {z:roofFront*L,width:W*.285,bottom:base,top:peak-H*.012},
    {z:front*L,width:W*.355,bottom:base,top:base+H*.015},
  ];
  // Side silhouette extruded through a trapezoidal cabin section.
  const cabinRing = (section: Section) => [
    [-W*.355,base,section.z],[W*.355,base,section.z],
    [section.width*.84,section.top-H*.035,section.z],[section.width*.79,section.top-H*.012,section.z],
    [-section.width*.79,section.top-H*.012,section.z],[-section.width*.84,section.top-H*.035,section.z],
  ];
  const cabinPositions=cabin.flatMap(section=>cabinRing(section).flat()),cabinIndices:number[]=[];
  for(let row=0;row<cabin.length-1;row++)for(let j=0;j<6;j++){
    const a=row*6+j,b=row*6+(j+1)%6;cabinIndices.push(a,b,a+6,b,b+6,a+6);
  }
  const cabinGeometry=new THREE.BufferGeometry();cabinGeometry.setAttribute('position',new THREE.Float32BufferAttribute(cabinPositions,3));
  cabinGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(cabin.flatMap(()=>[0,0,1,0,1,.8,.9,1,.1,1,0,.8]),2));
  cabinGeometry.setIndex(cabinIndices);cabinGeometry.computeVertexNormals();
  // Each panel has distinct normals; no inflated smoothing around the glazing.
  const crispCabin=cabinGeometry.toNonIndexed();crispCabin.computeVertexNormals();cabinGeometry.dispose();add(crispCabin,paint);
  const glassBase=base+H*.035,glassTop=peak-H*.043;
  // Rear screen and windscreen are inset inside wide painted pillars.
  add(panel([[-W*.299,glassBase,rear*L+L*.004],[W*.299,glassBase,rear*L+L*.004],[W*.222,glassTop,roofRear*L-L*.020],[-W*.222,glassTop,roofRear*L-L*.020]]),glass);
  add(panel([[W*.30,glassBase,front*L-L*.004],[-W*.30,glassBase,front*L-L*.004],[-W*.219,glassTop,roofFront*L+L*.020],[W*.219,glassTop,roofFront*L+L*.020]]),glass);
  // Glazing follows the side of the trapezoid. Keep a B pillar on four-door bodies.
  for(const side of [-1,1]){
    const sidePane=(z0:number,z1:number,t0:number,t1:number)=>add(panel([
      [side*W*.349,glassBase,z0*L],[side*W*.349,glassBase,z1*L],
      [side*W*.259,glassTop,t1*L],[side*W*.259,glassTop,t0*L],
    ]),glass);
    if(style==='pickup')sidePane(rear+.018,front-.035,roofRear+.012,roofFront-.025);
    else if(style==='coupe'||style==='retro')sidePane(rear+.035,front-.035,roofRear+.025,roofFront-.025);
    else {sidePane(rear+.04,-.036,roofRear+.026,-.036);sidePane(-.012,front-.035,-.012,roofFront-.025);}
    add(rod(new THREE.Vector3(side*W*.34,H*.59,L*.13),new THREE.Vector3(side*W*.435,H*.60,L*.13),W*.009),trim);
    add(box(W*.075,H*.043,L*.067),paint,side*W*.455,H*.60,L*.13);
    add(box(W*.008,H*.013,L*.07),alloy,side*W*.431,H*.5,-L*.055);
    add(box(W*.004,H*.20,L*.002),trim,side*W*.431,H*.35,-L*.12);
    if(style!=='coupe'&&style!=='retro')add(box(W*.004,H*.20,L*.002),trim,side*W*.431,H*.35,L*.10);
  }
  if (style === "pickup") {
    add(box(W*.68,H*.018,L*.32),trim,0,belt+H*.02,-L*.3);
    for (const side of [-1,1]) add(box(W*.065,H*.12,L*.36),paint,side*W*.37,belt+H*.06,-L*.3);
    add(box(W*.8,H*.1,L*.035),paint,0,belt+H*.05,-L*.465);
  }
  add(box(W*.79,H*.12,L*.025),paint,0,H*.28,-L*.485);
  add(box(W*.70,H*.045,L*.018),trim,0,H*.235,-L*.502);
  add(box(W*.79,H*.10,L*.023),paint,0,H*.27,L*.486);
  add(box(W*.43,H*.065,L*.012),trim,0,H*.32,L*.504);
  for(const side of [-1,1]) {
    if(style === 'retro') {
      const lamp=new THREE.CylinderGeometry(H*.058,H*.058,L*.012,24);lamp.rotateX(Math.PI/2);add(lamp,headlight,side*W*.28,H*.465,L*.505);
    } else add(box(W*.235,H*.045,L*.014),headlight,side*W*.275,H*.465,L*.505);
    add(box(W*.25,H*.075,L*.014),trim,side*W*.275,H*.505,-L*.501);
    add(box(W*.22,H*.043,L*.016),brakeLights,side*W*.275,H*.513,-L*.51);
    add(box(W*.055,H*.014,L*.017),headlight,side*W*.21,H*.489,-L*.511);
    add(box(W*.095,H*.013,L*.01),brakeLights,side*W*.30,H*.27,-L*.513);
    const pipe=new THREE.TorusGeometry(L*.012,L*.0025,6,16);add(pipe,alloy,side*W*.26,H*.21,-L*.505);
  }
  const plate=plateMaterial('KM-260-MX');const rearPlate=add(new THREE.PlaneGeometry(W*.27,H*.062),plate,0,H*.34,-L*.509);rearPlate.rotation.y=Math.PI;
  // Subtle tailgate seam and badge; rear face remains readable from the game camera.
  add(box(W*.55,H*.004,L*.003),trim,0,(belt-H*.055),-L*.505);
  add(box(W*.035,H*.016,L*.004),alloy,0,H*.485,-L*.505);
  if(style==='retro') {add(box(W*.78,H*.028,L*.02),alloy,0,H*.30,-L*.505);add(box(W*.78,H*.028,L*.02),alloy,0,H*.30,L*.505);}
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
