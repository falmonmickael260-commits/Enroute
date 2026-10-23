# KILOMAX — vehicle models

All `.glb` files in this folder come from **Car Kit 3.1** by **Kenney**
(https://kenney.nl/assets/car-kit), released under **CC0 1.0 Universal**
(https://creativecommons.org/publicdomain/zero/1.0/). From the pack's
License.txt: "You can use this content for personal, educational, and
commercial purposes." Attribution is not required; it is given here for
provenance.

Files used: sedan, sedan-sports, hatchback-sports, suv, suv-luxury, van,
truck, taxi, police, race, race-future, kart-oodi, tractor.

Retrieved from the copy in https://github.com/Jolomolokolo/Trackenomics
(`models/cars`); licence text as distributed in
https://github.com/series-ai/jam-ready-assets (`kenney-car-kit/3D/vehicles-racing/License.txt`).

Processing is technical only (gltf-transform: dedup, prune, quantize, texture
embedded) to make each file ~65 KB. In game, the body is repainted in the
pilot's colour (game/components/scene/carModels.ts). The thumbnails in
`public/images/cars/` are renders of these models.

The "KILOMAX" car is the game's own procedural model (game/components/scene/models.ts).

## Detailed cars — `supercar.glb`, `retro.glb`

From the Khronos Group glTF Sample Assets
(https://github.com/KhronosGroup/glTF-Sample-Assets):

- `supercar.glb` — **"Car Concept"** by **Eric Chadwick** (Darmstadt Graphics
  Group GmbH), 2024, licensed **CC BY 4.0**
  (https://creativecommons.org/licenses/by/4.0/). Started from a public-domain
  (CC0) model by **Unity Fan** on Sketchfab. Changes for KILOMAX: Khronos and
  3D Commerce logos removed (licence plate, tyre sidewalls — logos are not
  covered by the licence), interior and hidden parts removed, glass made
  opaque, material variants and advanced material effects dropped, meshes
  simplified, textures resized to 512 px WebP; the paint takes the pilot's
  colour in game.
- `retro.glb` — **"Toy Car"**, licensed **CC0 1.0**. Changes: display cloth
  and cameras removed, glass made opaque, meshes simplified, textures resized
  to 512 px WebP; the paint takes the pilot's colour in game.
