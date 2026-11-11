import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export interface SpectatorSpot { x: number; y: number; z: number; yaw: number }
interface Spectator extends SpectatorSpot {
  height: number; width: number; phase: number; pose: number; hat: boolean; skirt: boolean; flag: boolean;
}
interface Roadside {
  start: number; finish: number;
  at: (distance: number) => { point: THREE.Vector3; right: THREE.Vector3 };
  ground: (x: number, z: number) => number;
  allowed: (x: number, z: number, distance: number) => boolean;
}
function random(seed: number) { return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; }; }

/** Staggered groups on the inland side, behind the existing wall. */
export function placeSpectators(road: Roadside): SpectatorSpot[] {
  const r=random(84931), spots: SpectatorSpot[]=[];
  const zones=[{at:road.start+4,length:16,columns:24,rows:3},{at:road.finish-3,length:16,columns:24,rows:3},
    ...[.16,.32,.50,.68,.84].map(u=>({at:road.start+(road.finish-road.start)*u,length:5.5,columns:8,rows:2}))];
  for(const zone of zones)for(let row=0;row<zone.rows;row++)for(let column=0;column<zone.columns;column++){
    const distance=zone.at-zone.length/2+(column+.5+(row%2)*.35)*zone.length/zone.columns+(r()-.5)*.1;
    const {point,right}=road.at(distance),offset=3.98+row*.66+(r()-.5)*.12;
    const x=point.x-right.x*offset,z=point.z-right.z*offset,y=road.ground(x,z);
    if(!road.allowed(x,z,distance)||!Number.isFinite(y))continue;
    // Avoid steep banks and leave breathing room between neighbouring groups.
    if(Math.abs(road.ground(x+.18,z)-road.ground(x-.18,z))>.22||Math.abs(road.ground(x,z+.18)-road.ground(x,z-.18))>.22)continue;
    if(spots.some(p=>Math.hypot(p.x-x,p.z-z)<.48))continue;
    spots.push({x,y,z,yaw:Math.atan2(right.x,right.z)+(r()-.5)*.25});
  }
  return spots;
}

function merged(parts: THREE.BufferGeometry[]) {
  const plain=parts.map(g=>g.index?g.toNonIndexed():g),out=mergeGeometries(plain)!;
  new Set([...parts,...plain]).forEach(g=>g.dispose());return out;
}
function ellipsoid(x:number,y:number,z:number,sx:number,sy:number,sz:number) {
  const g=new THREE.SphereGeometry(1,8,6);g.scale(sx,sy,sz);g.translate(x,y,z);return g;
}
function trouserLeg(x:number,z:number) {
  const g=new THREE.CylinderGeometry(.048,.039,.23,10);g.translate(x,.175,z);return g;
}
function rounded(w:number,h:number,d:number,x:number,y:number,z:number) {
  const g=new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.2);g.translate(x,y,z);return g;
}

/** Shared geometry and instancing keep a dense crowd to a fixed number of draws. */
export function createRoadsideCrowd(scene: THREE.Scene, spots: SpectatorSpot[]) {
  const r=random(3004), people:Spectator[]=spots.map(p=>({...p,height:r()<.16?.74+r()*.1:.94+r()*.18,width:.9+r()*.23,phase:r()*Math.PI*2,pose:Math.floor(r()*4),hat:r()<.27,skirt:r()<.18,flag:r()<.19}));
  const count=people.length,meshes:THREE.InstancedMesh[]=[];
  const material=()=>new THREE.MeshStandardMaterial({roughness:.86});
  const mesh=(name:string,geometry:THREE.BufferGeometry,n=count): THREE.InstancedMesh => {
    const m=new THREE.InstancedMesh(geometry,material(),n);m.name=`spectators-${name}`;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled=false;m.castShadow=false;m.receiveShadow=true;scene.add(m);meshes.push(m);return m;
  };
  const profile=[new THREE.Vector2(.078,0),new THREE.Vector2(.105,.04),new THREE.Vector2(.116,.18),new THREE.Vector2(.09,.225),new THREE.Vector2(.06,.235)];
  const shirtGeometry=new THREE.LatheGeometry(profile,12);shirtGeometry.scale(1,1,.67);shirtGeometry.translate(0,.335,0);
  const shadowGeo=new THREE.CircleGeometry(.15,12);shadowGeo.rotateX(-Math.PI/2);shadowGeo.scale(1,1,.65);shadowGeo.translate(0,.004,0);
  const shadows=mesh('contact-shadows',shadowGeo);const shadowMaterial=new THREE.MeshBasicMaterial({color:'#242c20',transparent:true,opacity:.14,depthWrite:false});
  (shadows.material as THREE.Material).dispose();shadows.material=shadowMaterial;
  const torso=mesh('shirts',shirtGeometry);
  const legs=mesh('trousers',merged([trouserLeg(-.06,0),trouserLeg(.06,.013),ellipsoid(0,.32,0,.108,.055,.075)]));
  const skirtGeometry=new THREE.CylinderGeometry(.085,.145,.19,12);skirtGeometry.scale(1,1,.72);skirtGeometry.translate(0,.275,0);const skirts=mesh('skirts',skirtGeometry);
  const shoes=mesh('shoes',merged([ellipsoid(-.06,.029,.025,.047,.025,.075),ellipsoid(.06,.029,.038,.047,.025,.075)]));
  const head=mesh('skin',merged([ellipsoid(0,.668,.005,.054,.067,.052),ellipsoid(-.055,.665,0,.009,.016,.013),ellipsoid(.055,.665,0,.009,.016,.013),ellipsoid(0,.658,.055,.010,.014,.011),rounded(.055,.065,.05,0,.579,0)]));
  const hairGeometry=new THREE.SphereGeometry(1,12,7,0,Math.PI*2,0,Math.PI*.42);hairGeometry.scale(.059,.073,.057);hairGeometry.translate(0,.674,0);const hair=mesh('hair',hairGeometry);
  const faces=mesh('faces',merged([ellipsoid(-.021,.68,.054,.004,.004,.003),ellipsoid(.021,.68,.054,.004,.004,.003),rounded(.017,.003,.003,0,.643,.055)]));
  const capGeo=new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2);capGeo.scale(.063,.035,.059);capGeo.translate(0,.733,-.003);
  const hats=mesh('caps',merged([capGeo,ellipsoid(0,.735,.055,.057,.006,.052)]));
  const sleeve=mesh('sleeves',new THREE.SphereGeometry(1,8,6),count*2);
  const forearm=mesh('forearms',new THREE.SphereGeometry(1,8,6),count*2);
  const hands=mesh('hands',new THREE.SphereGeometry(1,8,6),count*2);
  const phones=mesh('phones',rounded(.042,.077,.012,0,0,0));
  const poleGeo=new THREE.CylinderGeometry(.005,.005,.44,6);poleGeo.translate(0,.20,0);const poles=mesh('flagpoles',poleGeo);
  const flagGeo=new THREE.PlaneGeometry(.22,.135,4,2);flagGeo.translate(.11,.32,0);const flags=mesh('flags',flagGeo);
  (flags.material as THREE.MeshStandardMaterial).side=THREE.DoubleSide;
  const shirts=['#d84a3e','#3579ad','#e9b54e','#448576','#e9e6dc','#b56d90','#675a8e','#c88148','#2b4459'];
  const skin=['#e9bc98','#c58d65','#9e6747','#704730','#f2ceb0'];
  const pants=['#283c53','#59646b','#a18a6d','#34373b','#e5dbbf'];
  const hairs=['#2d231e','#5e4230','#a57b40','#292629','#b8b1a7'];
  const pick=(colors:string[])=>new THREE.Color(colors[Math.floor(r()*colors.length)]);
  people.forEach((p,i)=>{
    const shirt=pick(shirts),tone=pick(skin),trouser=pick(pants);torso.setColorAt(i,shirt);legs.setColorAt(i,trouser);skirts.setColorAt(i,trouser);
    shoes.setColorAt(i,new THREE.Color(r()<.4?'#e6e2d8':'#303239'));head.setColorAt(i,tone);hair.setColorAt(i,pick(hairs));faces.setColorAt(i,new THREE.Color('#322a27'));
    hats.setColorAt(i,pick(shirts));phones.setColorAt(i,new THREE.Color('#242c32'));poles.setColorAt(i,new THREE.Color('#d3bfa0'));flags.setColorAt(i,pick(shirts));
    for(let side=0;side<2;side++){sleeve.setColorAt(i*2+side,shirt);forearm.setColorAt(i*2+side,tone);hands.setColorAt(i*2+side,tone);}
  });
  const root=new THREE.Matrix4(),local=new THREE.Matrix4(),result=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),scale=new THREE.Vector3();
  const a=new THREE.Vector3(),b=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),delta=new THREE.Vector3(),hidden=new THREE.Matrix4().makeScale(0,0,0);
  const set=(m:THREE.InstancedMesh,i:number,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{local.compose(v.set(x,y,z),q.identity(),scale.set(sx,sy,sz));m.setMatrixAt(i,result.multiplyMatrices(root,local));};
  const limb=(m:THREE.InstancedMesh,i:number,from:THREE.Vector3,to:THREE.Vector3,radius:number)=>{
    delta.subVectors(to,from);const length=delta.length();local.compose(v.copy(from).add(to).multiplyScalar(.5),q.setFromUnitVectors(up,delta.normalize()),scale.set(radius,length*.58,radius));m.setMatrixAt(i,result.multiplyMatrices(root,local));
  };
  function update(time:number){
    people.forEach((p,i)=>{
      const sway=Math.sin(time*1.3+p.phase)*.035,cheer=p.pose===0?Math.max(0,Math.sin(time*3+p.phase))*.023:0;
      local.compose(v.set(p.x,p.y,p.z),q.setFromEuler(e.set(0,p.yaw,0)),scale.set(p.height*p.width,p.height,p.height));shadows.setMatrixAt(i,local);
      root.compose(v.set(p.x,p.y+cheer,p.z),q.setFromEuler(e.set(0,p.yaw,sway)),scale.set(p.height*p.width,p.height,p.height));
      for(const m of [torso,legs,shoes,head,hair,faces])m.setMatrixAt(i,root);
      if(p.skirt)skirts.setMatrixAt(i,root);else skirts.setMatrixAt(i,hidden);
      if(p.hat)hats.setMatrixAt(i,root);else hats.setMatrixAt(i,hidden);
      for(let side=0;side<2;side++){
        const sign=side===0?-1:1,n=i*2+side,beat=Math.sin(time*(p.pose===1?4.2:2.3)+p.phase+side*.35);
        a.set(sign*.112,.53,0);
        if(p.pose===0)b.set(sign*.18,.66,.02);
        else if(p.pose===1)b.set(sign*.13,.46,.11);
        else if(p.pose===2)b.set(sign*.15,.52,.12);
        else b.set(sign*.15,.40,.015);
        if(p.flag&&side===1)b.set(.18,.65,.04);
        limb(sleeve,n,a,b,.037);a.copy(b);
        if(p.pose===0)b.set(sign*(.17+beat*.035),.79+beat*.025,.055);
        else if(p.pose===1)b.set(sign*(.032+beat*.018),.51,.205);
        else if(p.pose===2)b.set(sign*.047,.641,.165);
        else b.set(sign*.16,.29,.05);
        if(p.flag&&side===1)b.set(.18,.77+beat*.025,.09);
        limb(forearm,n,a,b,.024);set(hands,n,b.x,b.y,b.z,.026,.031,.022);
        if(side===1){
          if(p.flag){local.compose(v.copy(b),q.setFromEuler(e.set(0,Math.sin(time*3+p.phase)*.4,.12+beat*.12)),scale.set(1,1,1));result.multiplyMatrices(root,local);poles.setMatrixAt(i,result);flags.setMatrixAt(i,result);}
          else {poles.setMatrixAt(i,hidden);flags.setMatrixAt(i,hidden);}
        }
      }
      if(p.pose===2&&!p.flag)set(phones,i,0,.65,.19);else phones.setMatrixAt(i,hidden);
    });
    const cloth=flagGeo.attributes.position as THREE.BufferAttribute;
    for(let i=0;i<cloth.count;i++){const x=cloth.getX(i);cloth.setZ(i,Math.sin(time*4+x*17)*(x/.22)*.015);}cloth.needsUpdate=true;
    for(const m of meshes)m.instanceMatrix.needsUpdate=true;
  }
  update(0);
  return {count,meshes,update,dispose(){for(const m of meshes){scene.remove(m);m.geometry.dispose();(m.material as THREE.Material).dispose();m.dispose();}}};
}
