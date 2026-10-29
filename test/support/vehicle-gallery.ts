import * as THREE from "three";
import { loadCarModel } from "../../game/components/scene/carModels";

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
    vehicleGalleryResults: { id: string; triangles: number; artwork: boolean }[];
  }
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(1200, 1250);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
renderer.setScissorTest(true);
const results = [];
void (async () => {
for (let i = 0; i < ids.length; i++) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#b9c7ce");
  scene.add(new THREE.HemisphereLight("#f8fbff", "#58636c", 2.2));
  const key = new THREE.DirectionalLight("#fff1d8", 3.2);
  key.position.set(-3, 7, 4);
  key.castShadow = true;
  scene.add(key);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 3.8),
    new THREE.MeshStandardMaterial({ color: "#27333a", roughness: 0.88 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);
  const model = await loadCarModel(ids[i], "#e8352b", true, true);
  if (!model) throw new Error(`Impossible de charger le modèle ${ids[i]}`);
  scene.add(model.root);
  model.root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  const camera = new THREE.PerspectiveCamera(34, 300 / 250, 0.01, 20);
  camera.position.set(2.7, 2.3, 3.5);
  camera.lookAt(0, 0.35, 0);
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
    artwork: model.root.userData.artwork === true,
  });
  model.root.userData.disposeModel?.();
}
Object.assign(window, { vehicleGalleryResults: results });
})();
