import * as THREE from "three";

/** Eroded ridge silhouette instead of a seven-sided cone. */
export function ridgeGeometry() {
  const geometry=new THREE.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI/2);
  const points=geometry.getAttribute("position");
  for(let i=0;i<points.count;i++) {
    const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
    const shoulder=1+.12*Math.sin(Math.atan2(z,x)*3)*(1-y);
    points.setXYZ(i,x*shoulder,y*(.9+.1*Math.sin(x*7+z*9))-.5,z*shoulder);
  }
  geometry.computeVertexNormals();return geometry;
}

/** Small, locally generated textures: no image downloads and no per-frame canvas work. */
export function landscapeTexture(
  kind: "ground" | "plaster" | "tiles" | "window",
) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  let seed = 72391;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.fillStyle =
    kind === "ground"
      ? "#d2d0c4"
      : kind === "tiles"
        ? "#c2a593"
        : kind === "window"
          ? "#bfc5ba"
          : "#ece9df";
  ctx.fillRect(0, 0, 256, 256);
  if (kind === "ground" || kind === "plaster") {
    const grain = ctx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < grain.data.length; i += 4) {
      const noise = (random() - 0.5) * (kind === "ground" ? 48 : 16);
      for (let c = 0; c < 3; c++) grain.data[i + c] += noise;
    }
    ctx.putImageData(grain, 0, 0);
    if (kind === "ground")
      for (let i = 0; i < 500; i++) {
        const x = random() * 256,
          y = random() * 256,
          s = 0.5 + random() * 3;
        ctx.fillStyle = random() > 0.5 ? "#ffffff24" : "#363c3024";
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.55, random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
  } else if (kind === "tiles") {
    for (let row = -1; row < 9; row++)
      for (let col = -1; col < 9; col++) {
        const x = col * 32 + (row % 2) * 16,
          y = row * 32;
        const gradient = ctx.createLinearGradient(x, y, x + 32, y);
        gradient.addColorStop(0, "#3a241a55");
        gradient.addColorStop(0.4, "#ffffff28");
        gradient.addColorStop(1, "#533b2b44");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, 32, 32);
        ctx.strokeStyle = "#3d2e2450";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + 31);
        ctx.quadraticCurveTo(x + 16, y + 39, x + 32, y + 31);
        ctx.stroke();
      }
  } else {
    ctx.fillStyle = "#273735";
    ctx.fillRect(36, 8, 184, 240);
    ctx.fillStyle = "#cfcab5";
    ctx.fillRect(47, 16, 162, 222);
    ctx.fillStyle = "#293c48";
    ctx.fillRect(57, 26, 142, 200);
    const glass = ctx.createLinearGradient(57, 26, 190, 220);
    glass.addColorStop(0, "#acc0bd");
    glass.addColorStop(0.45, "#354b58");
    glass.addColorStop(1, "#1c2b35");
    ctx.fillStyle = glass;
    ctx.fillRect(57, 26, 142, 200);
    ctx.fillStyle = "#d2cbb8";
    ctx.fillRect(123, 24, 8, 203);
    ctx.fillRect(55, 116, 146, 7);
    for (const x of [1, 221]) {
      ctx.fillStyle = "#596b57";
      ctx.fillRect(x, 10, 34, 232);
      for (let y = 18; y < 240; y += 13) {
        ctx.fillStyle = "#243c3266";
        ctx.fillRect(x + 3, y, 28, 3);
      }
    }
    ctx.fillStyle = "#eee9db";
    ctx.fillRect(30, 240, 198, 11);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  if (kind === "ground") texture.repeat.set(60, 100);
  return texture;
}

/** Rounded, irregular crowns replace primitive cones and flat polygon discs. */
export function crownGeometry(kind: "cypress" | "pine" | "bush") {
  const geometry =
    kind === "cypress"
      ? new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.025, -0.5),
            new THREE.Vector2(0.16, -0.4),
            new THREE.Vector2(0.26, -0.2),
            new THREE.Vector2(0.28, 0),
            new THREE.Vector2(0.23, 0.24),
            new THREE.Vector2(0.13, 0.43),
            new THREE.Vector2(0, 0.5),
          ],
          12,
        )
      : new THREE.SphereGeometry(0.6, 14, 10);
  const p = geometry.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const ripple =
      1 + 0.09 * Math.sin(x * 17 + z * 9) * Math.cos(y * 13 - z * 7);
    p.setXYZ(i, x * ripple, y * (kind === "pine" ? 0.85 : 1), z * ripple);
  }
  geometry.computeVertexNormals();
  return geometry;
}
