import * as THREE from "three";

/** Satin automotive paint: keeps player colours visible in every ambiance. */
export function vehiclePaint(color: THREE.ColorRepresentation) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.22,
    roughness: 0.32,
    clearcoat: 0.65,
    clearcoatRoughness: 0.24,
  });
}

/** Copy all glTF maps and livery before adding a restrained lacquer layer. */
export function lacquer(source: THREE.MeshStandardMaterial) {
  const finish = new THREE.MeshPhysicalMaterial();
  // Copy the common Standard properties without Physical.copy expecting a
  // Physical source. Never mutate a cached glTF material shared by players.
  THREE.MeshStandardMaterial.prototype.copy.call(finish, source);
  finish.metalness = Math.min(source.metalness, 0.3);
  finish.roughness = THREE.MathUtils.clamp(source.roughness, 0.3, 0.55);
  finish.clearcoat = 0.55;
  finish.clearcoatRoughness = 0.26;
  return finish;
}
