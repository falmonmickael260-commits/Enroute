import * as THREE from "three";
import { buildVehicleModel } from "../../game/components/scene/vehicleModels";

const ids = [
  "supercar",
  "retro",
  "sedan-sports",
  "hatchback-sports",
  "sedan",
  "suv",
  "suv-luxury",
  "van",
  "truck",
  "race",
  "race-future",
  "kart-oodi",
  "tractor",
  "taxi",
  "police",
  "kilomax",
  "moto",
  "scooter",
  "quad",
];
declare global {
  interface Window {
    vehicleGalleryResults: { id: string; triangles: number }[];
  }
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(1200, 1250);
renderer.setPixelRatio(1);
document.body.appendChild(renderer.domElement);
renderer.setScissorTest(true);
const results = [];
void (async () => {
renderer.setClearColor("#15212b", 1);
for (let i = 0; i < ids.length; i++) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#15212b");
  const model = buildVehicleModel(ids[i], "#e8352b");
  scene.add(model.root);
  model.root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model.root);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(32, 300 / 250, 0.01, 30);
  camera.position.copy(center).add(new THREE.Vector3(2.8, Math.max(1.8, size.y * 2.2), 3.8));
  camera.lookAt(center.x, center.y + 0.08, center.z);
  const ambient = new THREE.HemisphereLight("#dcecff", "#3b4655", 2.2);
  const sun = new THREE.DirectionalLight("#fff0d8", 3.1);
  sun.position.copy(center).add(new THREE.Vector3(3.5, 7, 4));
  sun.target.position.copy(center);
  scene.add(ambient, sun, sun.target);
  const col = i % 4,
    row = Math.floor(i / 4);
  renderer.setViewport(col * 300, (4 - row) * 250, 300, 250);
  renderer.setScissor(col * 300, (4 - row) * 250, 300, 250);
  renderer.render(scene, camera);
  const label = document.createElement("span");
  label.textContent = ids[i];
  label.style.cssText = `position:absolute;left:${col * 300 + 15}px;top:${row * 250 + 222}px;color:white;font:14px sans-serif`;
  document.body.appendChild(label);
  results.push({
    id: ids[i],
    triangles: renderer.info.render.triangles,
  });
  model.root.userData.disposeModel();
}
Object.assign(window, { vehicleGalleryResults: results });
})();
