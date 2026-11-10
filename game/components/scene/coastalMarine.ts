import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface BoatPart { geometry: THREE.BufferGeometry; material: THREE.Material; hull?: boolean }

function boatHull(deck: boolean) {
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
  const rows = 28, sides = deck ? 1 : 16;
  for (let i = 0; i <= rows; i++) {
    const u = i / rows, width = 0.018 + Math.pow(Math.sin(u * Math.PI), 0.65) * 0.32;
    const depth = 0.025 + Math.pow(Math.sin(u * Math.PI), 0.6) * 0.23;
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI;
      vertices.push(width * Math.cos(a) * (deck ? 0.96 : 1), deck ? 0.145 : 0.14 - Math.sin(a) * depth, -0.92 + u * 1.94);
      uvs.push(j / sides, u);
      if (i < rows && j < sides) {
        const p = i * (sides + 1) + j;
        if (deck) indices.push(p, p + 1, p + sides + 1, p + 1, p + sides + 2, p + sides + 1);
        else indices.push(p, p + sides + 1, p + 1, p + 1, p + sides + 1, p + sides + 2);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}

/** A billowing triangular sheet, with shared vertices instead of a solid cone. */
function clothSail(height: number, reach: number) {
  const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
  const rows = 12, vertex = new Map<string, number>();
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= rows - i; j++) {
    const p = i / rows, q = j / rows;
    vertex.set(`${i}:${j}`, vertices.length / 3);
    const belly = 0.25 * Math.sin(Math.PI * p) * Math.sin(Math.PI * q) * Math.sin(Math.PI * (p + q));
    vertices.push(belly, 0.3 + p * height, 0.04 + q * reach - p * 0.04);
    uv.push(q, p);
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < rows - i; j++) {
    const a = vertex.get(`${i}:${j}`)!, b = vertex.get(`${i + 1}:${j}`)!, c = vertex.get(`${i}:${j + 1}`)!;
    indices.push(a, b, c);
    if (i + j < rows - 1) indices.push(b, vertex.get(`${i + 1}:${j + 1}`)!, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}

function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const direction = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(radius, radius, direction.length(), 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
  return g;
}

export function createSailboatParts(): BoatPart[] {
  const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const spars = [rod(p(0, 0.14, 0), p(0, 2.15, 0), 0.014), rod(p(0, 0.3, 0), p(0, 0.3, 0.84), 0.011)];
  const rigging = [rod(p(0, 2.1, 0), p(0, 0.15, 0.98), 0.0035), rod(p(0, 2.1, 0), p(0, 0.15, -0.85), 0.0035)];
  const sails = [clothSail(1.8, 0.79), clothSail(1.4, -0.64)];
  const merged = (geometries: THREE.BufferGeometry[]) => {
    const g = mergeGeometries(geometries)!; geometries.forEach(part => part.dispose()); return g;
  };
  const cabin = new RoundedBoxGeometry(0.29, 0.18, 0.43, 3, 0.055); cabin.translate(0, 0.23, -0.27);
  const windows = new RoundedBoxGeometry(0.298, 0.07, 0.27, 2, 0.025); windows.translate(0, 0.245, -0.25);
  const parts: BoatPart[] = [
    { geometry: boatHull(false), material: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.34, metalness: 0.08, side: THREE.DoubleSide, name: "boat-hull" }), hull: true },
    { geometry: boatHull(true), material: new THREE.MeshStandardMaterial({ color: "#e6d4b1", roughness: 0.82, side: THREE.DoubleSide }) },
    { geometry: cabin, material: new THREE.MeshStandardMaterial({ color: "#f4efe4", roughness: 0.55 }) },
    { geometry: windows, material: new THREE.MeshStandardMaterial({ color: "#284653", roughness: 0.22, metalness: 0.1 }) },
    { geometry: merged(spars), material: new THREE.MeshStandardMaterial({ color: "#b7b9b4", roughness: 0.35, metalness: 0.5 }) },
    { geometry: merged(rigging), material: new THREE.MeshStandardMaterial({ color: "#a6ada7", roughness: 0.8 }) },
    { geometry: merged(sails), material: new THREE.MeshStandardMaterial({ color: "#fff8e8", roughness: 0.95, side: THREE.DoubleSide, name: "boat-sails" }) },
  ];
  // The existing circular sailing animation travels towards local -Z.
  parts.forEach(part => part.geometry.rotateY(Math.PI));
  return parts;
}

function seaNormals() {
  const size = 128, data = new Uint8Array(size * size * 4), n = new THREE.Vector3();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const dx = 0.28 * Math.cos(u * 2 + v) + 0.13 * Math.cos(u * 5 - v * 3);
    const dz = 0.14 * Math.cos(u * 2 + v) - 0.08 * Math.cos(u * 5 - v * 3);
    n.set(-dx, -dz, 1).normalize(); const i = (y * size + x) * 4;
    data[i] = (n.x * 0.5 + 0.5) * 255; data[i + 1] = (n.y * 0.5 + 0.5) * 255; data[i + 2] = (n.z * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(90, 90); texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

export function createSeaMaterial(color: string, ripple: THREE.Texture, glint: THREE.Texture, glintColor: string, glintStrength: number) {
  const normalMap = seaNormals(), time = { value: 0 };
  const material = new THREE.MeshPhysicalMaterial({
    color, map: ripple, normalMap, normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.25, metalness: 0.08, clearcoat: 0.6, clearcoatRoughness: 0.2, ior: 1.333,
    emissive: glintColor, emissiveMap: glint, emissiveIntensity: glintStrength * 0.12,
    polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.uSeaTime = time;
    shader.vertexShader = `uniform float uSeaTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
      float phaseA = position.x * 0.45 + position.z * 0.31 + uSeaTime * 0.65;
      float phaseB = position.x * -0.28 + position.z * 0.61 - uSeaTime * 0.48;
      objectNormal = normalize(vec3(-0.01575 * cos(phaseA) + 0.0042 * cos(phaseB), 1.0, -0.01085 * cos(phaseA) - 0.00915 * cos(phaseB)));
    `).replace("#include <begin_vertex>", `#include <begin_vertex>
      transformed.y += 0.035 * sin(phaseA) + 0.015 * sin(phaseB);
    `);
  };
  material.customProgramCacheKey = () => "kilomax-coastal-water-v1";
  return { material, normalMap, update(seconds: number) { time.value = seconds; normalMap.offset.set(seconds * 0.008, -seconds * 0.005); } };
}
