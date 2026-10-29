import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CarModel } from "./models";
import { coachwork, type BodySection } from "./coachwork";

/** Sculpted shells, real wheel hubs and independently animated body, in road units. */
export function createTouringCar(id: string, color: string): CarModel {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  const suv = id.startsWith("suv"),
    van = id === "van",
    truck = id === "truck";
  const race = id === "race" || id === "race-future" || id === "kart-oodi";
  const retro = id === "retro",
    tractor = id === "tractor";
  const sport = id === "supercar" || id === "kilomax";
  const compact = id === "hatchback-sports" || id === "kart-oodi";
  const length = van
    ? 1.2
    : truck
      ? 1.18
      : compact
        ? 0.91
        : sport
          ? 1.14
          : id === "sedan" || id === "taxi" || id === "police"
            ? 1.12
            : 1.06;
  const width = suv ? 0.56 : race ? 0.57 : sport ? 0.54 : 0.49;
  const base =
    suv || tractor ? 0.21 : id === "kart-oodi" ? 0.1 : sport ? 0.145 : 0.16;
  const top = van
    ? 0.62
    : suv
      ? 0.54
      : sport
        ? 0.365
        : race
          ? 0.32
          : id === "sedan-sports"
            ? 0.405
            : compact
              ? 0.47
              : retro
                ? 0.43
                : 0.44;
  const paint = new THREE.MeshPhysicalMaterial({
    color:
      id === "taxi"
        ? "#e8b22c"
        : id === "police"
          ? "#e5edf2"
          : id === "kart-oodi"
            ? "#e4c93c"
            : color,
    roughness: 0.24,
    metalness: 0.55,
    clearcoat: 0.85,
    clearcoatRoughness: 0.2,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: "#486376",
    roughness: 0.2,
    metalness: 0.3,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: "#b7c4ce",
    roughness: 0.24,
    metalness: 0.88,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#101820",
    roughness: 0.66,
    metalness: 0.15,
  });
  const tyre = new THREE.MeshStandardMaterial({
    color: "#14171b",
    roughness: 0.93,
  });
  const brakeLights = new THREE.MeshStandardMaterial({
    color: "#b91725",
    emissive: "#ff1829",
    emissiveIntensity: 0.25,
  });
  const headlight = new THREE.MeshStandardMaterial({
    color: "#e7f7ff",
    emissive: "#c8edff",
    emissiveIntensity: 0.65,
  });
  const caliper = new THREE.MeshStandardMaterial({
    color: "#be342e",
    metalness: 0.3,
    roughness: 0.5,
  });
  const ivory = new THREE.MeshStandardMaterial({
    color: "#e9e8de",
    roughness: 0.32,
    metalness: 0.3,
  });
  const policeBlue = new THREE.MeshStandardMaterial({
    color: "#125de0",
    emissive: "#216bff",
    emissiveIntensity: 0.9,
  });
  const owned = [
    paint,
    glass,
    chrome,
    trim,
    tyre,
    brakeLights,
    headlight,
    caliper,
    ivory,
    policeBlue,
  ];
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  function part(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(matrix);
    geometry.deleteAttribute("uv");
    const list = groups.get(material) ?? [];
    list.push(geometry);
    groups.set(material, list);
  }
  function box(
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    part(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2),
      material,
      x,
      y,
      z,
    );
  }
  function tube(points: number[][], radius: number, material: THREE.Material) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    );
    part(
      new THREE.TubeGeometry(
        curve,
        Math.max(3, points.length * 3),
        radius,
        5,
        false,
      ),
      material,
    );
  }
  function panel(
    points: number[][],
    material: THREE.Material,
    outward: THREE.Vector3,
  ) {
    const vectors = points.map(
      (p) => new THREE.Vector3(...(p as [number, number, number])),
    );
    const normal = vectors[1]
      .clone()
      .sub(vectors[0])
      .cross(vectors[2].clone().sub(vectors[0]));
    if (normal.dot(outward) < 0) vectors.reverse();
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        vectors.flatMap((v) => v.toArray()),
        3,
      ),
    );
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    part(g, material);
  }
  // Continuous longitudinal sections give each body a curved shoulder and tapered nose.
  function shell(
    sections: BodySection[],
    material: THREE.Material,
    wells = false,
  ) {
    const radius = suv ? 0.126 : 0.113;
    part(
      coachwork(
        sections,
        wells
          ? {
              axles: [-length * 0.32, length * 0.32],
              radius: radius + 0.018,
              centerY: radius,
            }
          : undefined,
      ),
      material,
    );
  }
  const half = length / 2,
    w = width / 2;
  const skinWidth =
    id === "race" || id === "kart-oodi" ? w * 0.43 : tractor ? w * 0.6 : w;
  shell(
    [
      [-half - 0.004, 0.001, 0.1, base + 0.1],
      [-half, skinWidth * 0.8, 0.1, base + 0.1],
      [-half * 0.78, skinWidth, 0.09, base + 0.14],
      [0, skinWidth * 0.99, 0.09, base + 0.13],
      [half * 0.66, skinWidth * 0.98, 0.1, base + 0.1],
      [half * 0.94, skinWidth * 0.85, 0.1, base + 0.1],
      [half, skinWidth * 0.78, 0.11, base + 0.095],
      [half + 0.004, 0.001, 0.11, base + 0.095],
    ],
    paint,
    !race && !tractor,
  );
  if (!race && !tractor) {
    const back = van
      ? -0.49
      : truck
        ? -0.02
        : compact
          ? -0.33
          : suv
            ? -0.36
            : sport
              ? -0.3
              : -0.31;
    const front = van
      ? 0.39
      : truck
        ? 0.31
        : suv
          ? 0.27
          : retro
            ? 0.12
            : sport
              ? 0.17
              : 0.21;
    const roofRear = back + (van ? 0.045 : 0.1),
      roofFront = front - (van ? 0.045 : sport ? 0.16 : 0.13);
    const belt = base + 0.13,
      roofW = w * (sport ? 0.63 : 0.7),
      beltW = w * 0.83;
    panel(
      [
        [-beltW, belt, front],
        [beltW, belt, front],
        [roofW, top, roofFront],
        [-roofW, top, roofFront],
      ],
      glass,
      new THREE.Vector3(0, 1, 1),
    );
    panel(
      [
        [beltW, belt, back],
        [-beltW, belt, back],
        [-roofW, top, roofRear],
        [roofW, top, roofRear],
      ],
      glass,
      new THREE.Vector3(0, 1, -1),
    );
    for (const side of [-1, 1])
      panel(
        [
          [side * beltW, belt, back],
          [side * beltW, belt, front],
          [side * roofW, top, roofFront],
          [side * roofW, top, roofRear],
        ],
        glass,
        new THREE.Vector3(side, 0, 0),
      );
    box(
      roofW * 2 + 0.02,
      0.018,
      Math.max(0.12, roofFront - roofRear + 0.025),
      paint,
      0,
      top + 0.003,
      (roofFront + roofRear) / 2,
    );
    for (const side of [-1, 1]) {
      // Painted A/C pillars frame the glass instead of a single black blob.
      tube(
        [
          [side * beltW, belt, front],
          [side * roofW, top, roofFront],
        ],
        0.009,
        paint,
      );
      tube(
        [
          [side * beltW, belt, back],
          [side * roofW, top, roofRear],
        ],
        0.011,
        paint,
      );
      tube(
        [
          [side * w * 0.84, base + 0.125, back + 0.025],
          [side * w * 0.82, base + 0.145, (front + back) / 2],
          [side * w * 0.84, base + 0.125, front - 0.025],
        ],
        0.0045,
        chrome,
      );
      box(
        0.019,
        top - base - 0.15,
        0.025,
        paint,
        (side * (roofW + beltW)) / 2,
        (top + base + 0.13) / 2,
        (front + back) / 2,
      );
      if (van)
        for (const z of [-0.24, 0.02, 0.23])
          box(
            0.018,
            top - belt,
            0.024,
            paint,
            (side * (roofW + beltW)) / 2,
            (top + belt) / 2,
            z,
          );
      box(
        0.06,
        0.035,
        0.065,
        paint,
        side * (w + 0.02),
        belt + 0.025,
        front - 0.03,
      );
      tube(
        [
          [side * beltW, belt + 0.018, front - 0.03],
          [side * (w + 0.02), belt + 0.025, front - 0.03],
        ],
        0.006,
        trim,
      );
      box(0.055, 0.009, 0.016, chrome, side * (w + 0.002), base + 0.08, -0.1);
      // Door shutline, mirror glass and lower sill are still visible at road scale.
      tube(
        [
          [side * w * 0.995, 0.14, -0.12],
          [side * w, base + 0.075, -0.12],
          [side * w * 0.85, base + 0.125, -0.12],
        ],
        0.0025,
        trim,
      );
      box(
        0.052,
        0.024,
        0.008,
        glass,
        side * (w + 0.02),
        belt + 0.025,
        front - 0.063,
      );
      box(0.018, 0.025, length * 0.8, trim, side * w, 0.105, 0);
    }
  } else {
    if (tractor) {
      box(0.26, 0.27, 0.23, paint, 0, 0.42, -0.13);
      box(0.22, 0.15, 0.025, glass, 0, 0.45, 0.0);
      box(0.025, 0.3, 0.025, chrome, 0.13, 0.4, 0.17);
      box(0.28, 0.16, 0.4, paint, 0, 0.3, 0.19);
      box(0.3, 0.025, 0.28, paint, 0, 0.565, -0.13);
    } else {
      box(width * 0.42, 0.09, length * 0.5, paint, 0, base + 0.11, -0.05);
      if (id === "race-future")
        part(
          new THREE.SphereGeometry(0.15, 20, 12).scale(1, 0.55, 1.65),
          glass,
          0,
          base + 0.17,
          -0.04,
        );
      else {
        box(0.13, 0.08, 0.18, trim, 0, base + 0.12, -0.05);
        part(
          new THREE.SphereGeometry(0.052, 16, 10),
          ivory,
          0,
          base + 0.2,
          -0.05,
        );
        tube(
          [
            [-0.07, base + 0.12, -0.16],
            [-0.065, base + 0.26, -0.16],
            [0.065, base + 0.26, -0.16],
            [0.07, base + 0.12, -0.16],
          ],
          0.011,
          trim,
        );
      }
      if (id !== "kart-oodi")
        box(
          width * 1.13,
          0.025,
          id === "race-future" ? 0.21 : 0.14,
          trim,
          0,
          base + 0.08,
          half - 0.05,
        );
      if (id !== "kart-oodi")
        box(width * 1.1, 0.025, 0.12, paint, 0, base + 0.26, -half + 0.05);
      if (id !== "kart-oodi")
        for (const s of [-1, 1])
          box(0.018, 0.17, 0.025, trim, s * 0.14, base + 0.17, -half + 0.05);
      if (id === "kart-oodi")
        tube(
          [
            [-w, 0.13, half - 0.03],
            [-w, 0.13, half + 0.04],
            [w, 0.13, half + 0.04],
            [w, 0.13, half - 0.03],
          ],
          0.017,
          chrome,
        );
      if (id === "race")
        for (const side of [-1, 1]) {
          const pod = coachwork([
            [-0.31, 0.001, 0.12, 0.13],
            [-0.22, 0.075, 0.11, 0.24],
            [0.05, 0.08, 0.12, 0.23],
            [0.18, 0.001, 0.16, 0.18],
          ]);
          pod.translate(side * 0.18, 0, 0);
          part(pod, paint);
          for (const axle of [-length * 0.32, length * 0.32]) {
            tube(
              [
                [side * 0.06, 0.18, axle - 0.09],
                [side * w, 0.115, axle],
              ],
              0.008,
              trim,
            );
            tube(
              [
                [side * 0.06, 0.18, axle + 0.09],
                [side * w, 0.115, axle],
              ],
              0.008,
              trim,
            );
          }
          box(0.028, 0.035, 0.15, trim, side * 0.05, base + 0.12, half - 0.08);
        }
    }
  }
  if (truck) {
    box(width * 0.75, 0.018, 0.43, trim, 0, base + 0.125, -0.33);
    for (const side of [-1, 1])
      box(0.028, 0.065, 0.43, paint, side * w * 0.84, base + 0.15, -0.33);
    box(width * 0.85, 0.065, 0.025, paint, 0, base + 0.15, -half + 0.05);
  }
  if (!race && !tractor)
    for (const side of [-1, 1])
      for (const axle of [-length * 0.32, length * 0.32]) {
        const radius = suv ? 0.126 : 0.113;
        part(
          new THREE.TorusGeometry(radius + 0.016, 0.008, 5, 24, Math.PI),
          paint,
          side * w,
          radius,
          axle,
          0,
          Math.PI / 2,
        );
      }
  if (id === "kilomax") {
    box(0.038, 0.004, 0.31, ivory, -0.037, base + 0.105, 0.31);
    box(0.038, 0.004, 0.31, ivory, 0.037, base + 0.105, 0.31);
    box(0.038, 0.006, 0.24, ivory, -0.037, top + 0.013, -0.05);
    box(0.038, 0.006, 0.24, ivory, 0.037, top + 0.013, -0.05);
  }
  if (id === "police")
    for (const side of [-1, 1]) {
      box(
        0.008,
        0.065,
        length * 0.67,
        policeBlue,
        side * (w + 0.003),
        base + 0.04,
        -0.015,
      );
      box(
        0.008,
        0.014,
        length * 0.75,
        ivory,
        side * (w + 0.008),
        base + 0.083,
        -0.015,
      );
    }
  if (id === "suv-luxury")
    for (const side of [-1, 1]) {
      box(0.025, 0.025, 0.56, chrome, side * 0.16, top + 0.025, -0.07);
      box(0.024, 0.04, length * 0.7, chrome, side * w, 0.12, 0);
    }
  if (id === "kilomax" || id === "sedan-sports") {
    box(width * 0.85, 0.022, 0.095, trim, 0, base + 0.23, -half + 0.07);
    for (const s of [-1, 1])
      box(0.018, 0.12, 0.02, trim, s * 0.15, base + 0.18, -half + 0.07);
  }
  if (retro) {
    box(width * 0.9, 0.035, 0.04, chrome, 0, base - 0.025, half + 0.006);
    box(width * 0.9, 0.035, 0.04, chrome, 0, base - 0.025, -half - 0.006);
  }
  // Lamps and radiator, inset vents, rear diffuser and exhaust tips.
  box(width * 0.56, 0.045, 0.025, trim, 0, base + 0.015, half + 0.01);
  for (const s of [-1, 1]) {
    if (retro)
      part(
        new THREE.CylinderGeometry(0.034, 0.034, 0.012, 16),
        headlight,
        s * w * 0.65,
        base + 0.07,
        half + 0.012,
        Math.PI / 2,
      );
    else {
      box(
        width * 0.27,
        0.036,
        0.024,
        trim,
        s * w * 0.52,
        base + 0.075,
        half + 0.008,
      );
      box(
        width * 0.24,
        0.018,
        0.025,
        headlight,
        s * w * 0.52,
        base + 0.075,
        half + 0.019,
      );
    }
    box(
      width * 0.24,
      0.022,
      0.025,
      brakeLights,
      s * w * 0.64,
      base + 0.075,
      -half - 0.012,
    );
    box(0.06, 0.014, 0.13, trim, s * w * 0.58, base + 0.12, half * 0.46);
    part(
      new THREE.CylinderGeometry(0.017, 0.017, 0.055, 12),
      chrome,
      s * w * 0.65,
      0.11,
      -half,
      Math.PI / 2,
    );
    for (let j = 0; j < 3; j++)
      box(
        0.008,
        0.036,
        0.025,
        chrome,
        s * 0.05 + j * 0.012,
        base + 0.015,
        half + 0.025,
      );
  }
  if (id === "police" || id === "taxi") {
    box(0.2, 0.035, 0.09, trim, 0, top + 0.025, -0.05);
    if (id === "taxi") box(0.13, 0.045, 0.055, paint, 0, top + 0.055, -0.05);
    else {
      box(0.08, 0.035, 0.065, policeBlue, -0.055, top + 0.05, -0.05);
      box(0.08, 0.035, 0.065, brakeLights, 0.055, top + 0.05, -0.05);
    }
  }
  // Collapse static surfaces by material: detail without hundreds of draw calls.
  for (const [material, geometries] of groups) {
    const merged = mergeGeometries(
      geometries.map((g) => (g.index ? g.toNonIndexed() : g)),
    );
    for (const g of geometries) g.dispose();
    if (merged) {
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      body.add(mesh);
    }
  }
  const wheels: THREE.Mesh[] = [];
  for (const side of [-1, 1])
    for (const z of [-length * 0.32, length * 0.32]) {
      const radius =
        tractor && z < 0 ? 0.18 : suv ? 0.126 : race ? 0.105 : 0.113;
      const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.78, radius * 0.22, 8, 20),
        tyre,
      );
      wheel.name = `wheel-${z > 0 ? "front" : "rear"}-${side > 0 ? "right" : "left"}`;
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(side * (w - 0.005), radius, z);
      root.add(wheel);
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.66, radius * 0.66, 0.022, 20),
        chrome,
      );
      rim.rotation.x = Math.PI / 2;
      wheel.add(rim);
      const lip = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.65, 0.007, 5, 24),
        chrome,
      );
      lip.position.z = side * 0.025;
      wheel.add(lip);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.47, radius * 0.47, 0.026, 16),
        trim,
      );
      disc.rotation.x = Math.PI / 2;
      disc.position.z = side * 0.008;
      wheel.add(disc);
      for (let j = 0; j < 5; j++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.014, radius * 1.12, 0.014),
          chrome,
        );
        spoke.rotation.z = (j * Math.PI) / 5;
        spoke.position.z = side * 0.021;
        wheel.add(spoke);
      }
      const brake = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.055, 0.02),
        caliper,
      );
      brake.position.set(side * (w + 0.006), radius, z + radius * 0.35);
      body.add(brake);
      const alloy: THREE.BufferGeometry[] = [];
      for (const child of [...wheel.children])
        if (child instanceof THREE.Mesh && child.material === chrome) {
          child.updateMatrix();
          child.geometry.applyMatrix4(child.matrix);
          alloy.push(child.geometry);
          wheel.remove(child);
        }
      const mergedAlloy = mergeGeometries(alloy);
      for (const g of alloy) g.dispose();
      if (mergedAlloy) wheel.add(new THREE.Mesh(mergedAlloy, chrome));
      wheel.userData.rest = wheel.scale.clone();
      wheel.userData.axle = "z";
      wheel.userData.up = "y";
      wheels.push(wheel);
    }
  const mounts = {
    roof: new THREE.Group(),
    rear: new THREE.Group(),
    front: new THREE.Group(),
  };
  mounts.roof.position.set(0, tractor ? 0.6 : top, -0.08);
  mounts.front.position.set(0, base, half);
  mounts.rear.position.set(0, base, -half);
  body.add(...Object.values(mounts));
  const geometrySet = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) geometrySet.add(o.geometry);
  });
  root.userData.disposeModel = () => {
    for (const g of geometrySet) g.dispose();
    for (const m of owned) m.dispose();
  };
  root.userData.vehicleId = id;
  root.userData.renderRevision = 2;
  return {
    root,
    body,
    wheels,
    paint,
    brakeLights,
    mounts,
    exhaust: new THREE.Vector3(w * 0.65, 0.11, -half),
  };
}
