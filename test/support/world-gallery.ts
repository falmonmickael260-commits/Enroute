import { SceneRenderer } from "../../game/components/scene/SceneRenderer";
import { WorldStage } from "../../game/components/scene/WorldStage";

declare global {
  interface Window {
    worldGalleryReady?: boolean;
    moveGalleryCars?: () => void;
    finishWorldGallery?: () => void;
  }
}

const canvas = document.createElement("canvas");
canvas.width = 1280;
canvas.height = 900;
canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
document.body.appendChild(canvas);
const renderer = new SceneRenderer(canvas, new WorldStage("jour"));
renderer.resize(1280, 900, 1, 0);

const players = [
  { id: "one", color: "#e8352b", car: "supercar", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: true },
  { id: "two", color: "#1f86ea", car: "sedan-sports", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: false },
];
renderer.update(players, 1000);
renderer.setShot({ kind: "pack" });
window.moveGalleryCars = () => {
  renderer.cue("one", { kind: "move", style: "fast" });
  renderer.update(players.map((p, i) => ({ ...p, km: i === 0 ? 180 : 50 })), 1000);
};
window.finishWorldGallery = () => renderer.dispose();
setTimeout(() => { window.worldGalleryReady = true; }, 3000);
