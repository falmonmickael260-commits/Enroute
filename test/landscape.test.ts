import test from "node:test";
import assert from "node:assert/strict";
import { crownGeometry,ridgeGeometry } from "../game/components/scene/landscapeDetails";

for(const kind of ["cypress","pine","bush","ridge"] as const) test(`${kind}: finite scenery mesh within the instancing budget`,()=>{
  const geometry=kind==="ridge"?ridgeGeometry():crownGeometry(kind);
  const position=geometry.getAttribute("position"),normal=geometry.getAttribute("normal");
  assert.ok(position.count<1000);assert.equal(position.count,normal.count);
  assert.ok(Array.from(position.array).every(Number.isFinite));assert.ok(Array.from(normal.array).every(Number.isFinite));
  geometry.dispose();
});
