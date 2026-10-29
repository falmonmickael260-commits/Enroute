import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(1200, 1250);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room).texture;
room.dispose();
pmrem.dispose();
renderer.setScissorTest(true);
const results = [];
for (let i = 0; i < ids.length; i++) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#15212b");
  scene.environment = environment;
  scene.environmentIntensity = 1.5;
  scene.environmentIntensity = 0.5;
  scene.add(new THREE.HemisphereLight("#e4f2ff", "#736a58", 0.85));
  const sun = new THREE.DirectionalLight("#ffe5c1", 2.3);
  sun.position.set(-2, 4, 3);
  scene.add(sun);
  const model = buildVehicleModel(ids[i], "#b92332");
  scene.add(model.root);
  const camera = new THREE.PerspectiveCamera(35, 300 / 250, 0.01, 20);
  camera.position.set(1.35, 0.9, 1.7);
  camera.lookAt(0, 0.24, 0);
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
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
  });
}
Object.assign(window, { vehicleGalleryResults: results });
