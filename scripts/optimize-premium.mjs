import sharp from "sharp";
import path from "node:path";
const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/optimize-premium.mjs <original-art-directory>",
  );
const jobs = [
  {
    kind: "vehicle",
    id: "supercar",
    file: "exec-71e9a616-c0aa-42cf-a113-102c9d52ce85.png",
  },
  {
    kind: "vehicle",
    id: "retro",
    file: "exec-7648f954-6ff4-464f-9053-c5b29abcd8cb.png",
  },
  {
    kind: "vehicle",
    id: "sedan-sports",
    file: "exec-a87e3eec-596f-4f74-ba74-e6781a316ee8.png",
  },
  {
    kind: "vehicle",
    id: "hatchback-sports",
    file: "exec-fa931af1-f545-4acd-bdae-a86dcb48a48c.png",
  },
  {
    kind: "vehicle",
    id: "sedan",
    file: "exec-009c7c08-2a40-4ae1-806e-f54dd0c1b932.png",
  },
  {
    kind: "vehicle",
    id: "suv",
    file: "exec-cd41dbea-921a-44c7-9be0-f13bb5fae76b.png",
  },
  {
    kind: "vehicle",
    id: "suv-luxury",
    file: "exec-32d37a25-06ea-46d6-9161-560f0360ab53.png",
  },
  {
    kind: "vehicle",
    id: "van",
    file: "exec-39cf467c-d193-44d3-8071-efb57b7dee1b.png",
  },
  {
    kind: "vehicle",
    id: "truck",
    file: "exec-5e9d5ddc-15ed-4a97-afa2-2600f3f4cb4a.png",
  },
  {
    kind: "vehicle",
    id: "race",
    file: "exec-50de7092-7b1e-4258-be67-5682fb8bf939.png",
  },
  {
    kind: "vehicle",
    id: "race-future",
    file: "exec-7bc41551-cfed-4473-b7df-3fd9912d2a2b.png",
  },
  {
    kind: "vehicle",
    id: "moto",
    file: "exec-99185fb3-b9a1-49d9-aaa5-39f99052ee13.png",
  },
  {
    kind: "vehicle",
    id: "scooter",
    file: "exec-a4df5760-cefa-4d60-bc62-5ad1981c3b6b.png",
  },
  {
    kind: "vehicle",
    id: "quad",
    file: "exec-e658e7e9-6c83-40d1-b93c-a383bdc379d2.png",
  },
  {
    kind: "vehicle",
    id: "kart-oodi",
    file: "exec-b4dd0d89-ecad-4c2c-b44b-01a077cca6d2.png",
  },
  {
    kind: "vehicle",
    id: "tractor",
    file: "exec-bc31b6b2-4201-4c92-94ae-f9752628011c.png",
  },
  {
    kind: "vehicle",
    id: "taxi",
    file: "exec-5d60e939-03c8-496d-85d6-2fafbb5c66b7.png",
  },
  {
    kind: "vehicle",
    id: "police",
    file: "exec-96fb548a-07db-4517-835c-8b33e8aac61c.png",
  },
  {
    kind: "vehicle",
    id: "kilomax",
    file: "exec-2649c605-0655-4d8b-b400-881847d27178.png",
  },
  {
    kind: "card",
    id: "collision",
    file: "exec-c4f32ae3-6701-47a2-ad02-069aa9e67c3b.png",
  },
  {
    kind: "card",
    id: "crevaison",
    file: "exec-28e28bdb-06ab-4b29-a01d-387f8fe3b2c5.png",
  },
  {
    kind: "card",
    id: "panne",
    file: "exec-ec77eec4-7e88-431c-b93d-fbd1bd777465.png",
  },
  {
    kind: "card",
    id: "radar",
    file: "exec-e5415576-9d80-4608-904d-fbdba27a2d16.png",
  },
  {
    kind: "card",
    id: "barrage",
    file: "exec-b46c8a9e-61a1-44b3-bf23-5becf3c9c038.png",
  },
  {
    kind: "card",
    id: "reparation",
    file: "exec-b9ac982d-dd00-49e2-98b9-17945c6f94dd.png",
  },
  {
    kind: "card",
    id: "roueSecours",
    file: "exec-009fd6ab-08b8-4769-aa70-24f30d73a3e2.png",
  },
  {
    kind: "card",
    id: "pleinEssence",
    file: "exec-567358f6-bdbe-45da-a020-110a1af7d295.png",
  },
  {
    kind: "card",
    id: "gps",
    file: "exec-608250d0-69f3-43ca-89ad-43306464c04f.png",
  },
  {
    kind: "card",
    id: "passageLibre",
    file: "exec-0fa3a760-84d3-4b2a-8a64-7d36996f589c.png",
  },
  {
    kind: "card",
    id: "turbo",
    file: "exec-09d8efea-640c-4159-b7f7-b2ad1ea3e649.png",
  },
  {
    kind: "card",
    id: "raccourci",
    file: "exec-aa284548-8823-4bc2-a56d-c27525d06486.png",
  },
  {
    kind: "card",
    id: "depassement",
    file: "exec-0dd86368-7fe9-47ad-8c87-1fef869b32b7.png",
  },
  {
    kind: "card",
    id: "gpsStrategique",
    file: "exec-473d1986-e311-428e-bae0-a39ebf438e10.png",
  },
  {
    kind: "card",
    id: "derniereLigneDroite",
    file: "exec-9065416e-2df9-42d5-b1cb-5364a535d0e9.png",
  },
  {
    kind: "hero",
    id: "coast",
    file: "exec-cc7ecab3-7a12-484f-9756-bf399c96b648.png",
  },
];
for (const job of jobs) {
  const dest =
    "public/images/premium/" +
    (job.kind === "hero"
      ? "coast"
      : (job.kind === "vehicle" ? "vehicles/" : "cards/") + job.id) +
    ".webp";
  await sharp(path.join(source, job.file))
    .resize({ width: job.kind === "hero" ? 1600 : 768 })
    .webp({ quality: 86 })
    .toFile(dest);
}
console.log("35 illustrations optimized");
