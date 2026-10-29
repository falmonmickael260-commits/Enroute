import * as THREE from "three";

export type BodySection = readonly [
  z: number,
  halfWidth: number,
  bottom: number,
  top: number,
];

/** Continuous body skin. Winding is outward; single-sided paint must face the camera. */
export function coachwork(
  sections: readonly BodySection[],
  wheelWells?: { axles: number[]; radius: number; centerY: number },
) {
  const positions: number[] = [],
    indices: number[] = [];
  const around = 32,
    subdivisions = 5;
  function interpolate(segment: number, column: number, t: number) {
    const a = sections[segment],
      b = sections[segment + 1];
    const previous = sections[Math.max(0, segment - 1)],
      next = sections[Math.min(sections.length - 1, segment + 2)];
    const dz = b[0] - a[0];
    const ma = (b[column] - previous[column]) / (b[0] - previous[0]);
    const mb = (next[column] - a[column]) / (next[0] - a[0]);
    return (
      (2 * t * t * t - 3 * t * t + 1) * a[column] +
      (t * t * t - 2 * t * t + t) * ma * dz +
      (-2 * t * t * t + 3 * t * t) * b[column] +
      (t * t * t - t * t) * mb * dz
    );
  }
  const rings = (sections.length - 1) * subdivisions + 1;
  for (let ring = 0; ring < rings; ring++) {
    const segment = Math.min(
      sections.length - 2,
      Math.floor(ring / subdivisions),
    );
    const t = (ring - segment * subdivisions) / subdivisions;
    const z = THREE.MathUtils.lerp(
      sections[segment][0],
      sections[segment + 1][0],
      t,
    );
    const width = Math.max(0.0001, interpolate(segment, 1, t));
    let bottom = interpolate(segment, 2, t);
    const top = Math.max(bottom + 0.001, interpolate(segment, 3, t));
    if (wheelWells)
      for (const axle of wheelWells.axles) {
        const dz = z - axle,
          r = wheelWells.radius;
        if (Math.abs(dz) < r)
          bottom = Math.max(
            bottom,
            Math.min(
              top - 0.015,
              wheelWells.centerY + Math.sqrt(r * r - dz * dz),
            ),
          );
      }
    for (let j = 0; j <= around; j++) {
      const angle = (j / around) * Math.PI * 2,
        c = Math.cos(angle),
        s = Math.sin(angle);
      positions.push(
        Math.sign(c) * Math.pow(Math.abs(c), 0.56) * width,
        (bottom + top) / 2 +
          (Math.sign(s) * Math.pow(Math.abs(s), 0.65) * (top - bottom)) / 2,
        z,
      );
    }
  }
  for (let i = 0; i < rings - 1; i++)
    for (let j = 0; j < around; j++) {
      const a = i * (around + 1) + j,
        b = a + around + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Weld the lighting normal across the duplicated longitudinal seam.
  const normal = geometry.getAttribute("normal");
  const blended = new THREE.Vector3();
  for (let i = 0; i < rings; i++) {
    const first = i * (around + 1),
      last = first + around;
    blended
      .fromBufferAttribute(normal, first)
      .add(new THREE.Vector3().fromBufferAttribute(normal, last))
      .normalize();
    normal.setXYZ(first, blended.x, blended.y, blended.z);
    normal.setXYZ(last, blended.x, blended.y, blended.z);
  }
  geometry.userData.coachwork = true;
  return geometry;
}
