import { PictureStage } from "../../game/components/scene/PictureStage";
import { ScenePath } from "../../game/components/scene/scenePath";
import { SceneRenderer } from "../../game/components/scene/SceneRenderer";
import coast from "../../game/components/scene/scenes/kilomax-coast.json";

declare global {
  interface Window {
    coastalPreviewReady?: boolean;
    coastalPositions?: Record<string, { x: number; y: number }>;
    playCoastalMove?: () => void;
    showUtilityCars?: () => void;
    stopCoastalPreview?: () => void;
  }
}

const def = coast;
document.body.style.cssText = "margin:0;background:#0b1721;overflow:hidden";
const board = document.createElement("div");
board.style.cssText = `position:relative;width:${def.width}px;height:${def.height}px;overflow:hidden`;
document.body.appendChild(board);
const image = document.createElement("img");
image.src = def.image;
image.alt = "";
image.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover";
board.appendChild(image);
const canvas = document.createElement("canvas");
canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
board.appendChild(canvas);
const renderer = new SceneRenderer(canvas, new PictureStage(new ScenePath(def)));
renderer.resize(def.width, def.height, 1);
renderer.onFrame = (positions) => {
  window.coastalPositions = Object.fromEntries([...positions].map(([id, p]) => [id, { x: p.x, y: p.y }]));
};
const players = [
  { id: "one", color: "#e8352b", car: "supercar", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: true },
  { id: "two", color: "#1f86ea", car: "retro", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: false },
  { id: "three", color: "#2fae55", car: "suv", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: false },
  { id: "four", color: "#ffc21a", car: "race", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: false },
];
renderer.update(players, 1000);
window.playCoastalMove = () => {
  renderer.cue("one", { kind: "move", style: "fast" });
  renderer.update(players.map((player, i) => ({ ...player, km: i === 0 ? 200 : 0 })), 1000);
};
window.showUtilityCars = () => {
  renderer.reset();
  renderer.update([
    { id: "sedan", color: "#e8352b", car: "sedan", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: true },
    { id: "van", color: "#1f86ea", car: "van", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: false },
    { id: "pickup", color: "#2fae55", car: "truck", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: false },
    { id: "compact", color: "#ffc21a", car: "hatchback-sports", repaint: true, km: 0, hazard: null, limited: false, shields: [], active: false },
  ], 1000);
};
window.stopCoastalPreview = () => renderer.dispose();
image.addEventListener("load", () => setTimeout(() => { window.coastalPreviewReady = true; }, 1000), { once: true });
