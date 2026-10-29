import * as THREE from "three";
import { createArtworkVehicleModel } from "../../game/components/scene/carModels";

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
    vehicleArtSources: Record<string, string>;
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
for (let i = 0; i < ids.length; i++) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#15212b");
  const image = new Image();
  image.src = window.vehicleArtSources[ids[i]];
  await image.decode();
  const model = createArtworkVehicleModel(ids[i], "#e8352b", true, image);
  scene.add(model.root);
  const camera = new THREE.PerspectiveCamera(36, 300 / 250, 0.01, 20);
  camera.position.set(0, 1.1, 5.4);
  camera.lookAt(0, 0.8, 0);
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
