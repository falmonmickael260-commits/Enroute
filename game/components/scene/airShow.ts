import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** A tow-plane accompanies the race, in the open band below the mobile scoreboard.
 * It follows the view without changing the driving camera or hiding the cars. */
export function createAirShow(scene: THREE.Scene) {
  const root=new THREE.Group();root.name='revanche-game-airshow';root.renderOrder=40;scene.add(root);
  const plane=new THREE.Group();plane.position.set(3.35,.08,0);root.add(plane);
  const paint=new THREE.MeshStandardMaterial({color:'#f1eee3',roughness:.36,metalness:.18,emissive:'#b6bbc2',emissiveIntensity:.16,depthTest:false,fog:false});
  const navy=new THREE.MeshStandardMaterial({color:'#193d58',roughness:.4,metalness:.2,depthTest:false,fog:false});
  const red=new THREE.MeshStandardMaterial({color:'#ce483e',roughness:.42,depthTest:false,fog:false});
  const glass=new THREE.MeshPhysicalMaterial({color:'#568da4',roughness:.16,metalness:.3,clearcoat:.7,depthTest:false,fog:false});
  const dark=new THREE.MeshStandardMaterial({color:'#26313a',roughness:.7,depthTest:false,fog:false});
  const add=(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,parent=plane)=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.renderOrder=41;parent.add(mesh);return mesh;};
  const fuselage=new THREE.SphereGeometry(1,24,12);fuselage.scale(1.25,.25,.27);add(fuselage,paint,0,0,0);
  const tail=new THREE.ConeGeometry(.21,1.35,16);tail.rotateZ(Math.PI/2);add(tail,paint,-1.15,.045,0);
  const stripe=new THREE.SphereGeometry(1,24,10);stripe.scale(1.22,.045,.274);add(stripe,navy,0,-.045,0);
  const cockpit=new RoundedBoxGeometry(.71,.30,.43,3,.11);add(cockpit,glass,.22,.23,0);
  const wing=new RoundedBoxGeometry(.62,.055,3.6,2,.025);add(wing,paint,.18,.38,0);
  for(const side of [-1,1]){
    add(new RoundedBoxGeometry(.65,.06,.24,2,.025),red,.18,.38,side*1.67);

    const strut=new THREE.CylinderGeometry(.017,.017,1.13,8);strut.rotateX(side*.72);add(strut,navy,.02,-.02,side*.55);
    const gear=new THREE.CylinderGeometry(.023,.023,.42,8);gear.rotateX(side*.5);add(gear,dark,.46,-.34,side*.22);
    const tyre=new THREE.CylinderGeometry(.10,.10,.075,12);tyre.rotateX(Math.PI/2);add(tyre,dark,.47,-.51,side*.32);
  }
  add(new RoundedBoxGeometry(.40,.035,1.22,2,.015),paint,-1.42,.12,0);
  plane.rotation.set(.1,.16,0);
  const fin=new THREE.Shape();fin.moveTo(-.44,0);fin.lineTo(-.28,.55);fin.quadraticCurveTo(-.10,.66,.04,.4);fin.lineTo(.24,0);fin.closePath();
  const finGeo=new THREE.ExtrudeGeometry(fin,{depth:.055,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:2,steps:1});add(finGeo,red,-1.39,.12,-.028);
  const hub=new THREE.SphereGeometry(.11,12,8);add(hub,navy,1.25,0,0);
  const prop=new THREE.Group();prop.position.set(1.31,0,0);plane.add(prop);
  const discGeometry=new THREE.CircleGeometry(.59,32);discGeometry.rotateY(Math.PI/2);
  add(discGeometry,new THREE.MeshBasicMaterial({color:'#87959e',transparent:true,opacity:.11,depthTest:false,depthWrite:false,fog:false,side:THREE.DoubleSide}),1.31,0,0);
  for(let i=0;i<3;i++){const blade=new THREE.Mesh(new RoundedBoxGeometry(.035,.65,.08,2,.02),dark);blade.position.y=.27;const rotor=new THREE.Group();rotor.rotation.x=i*Math.PI*2/3;rotor.add(blade);prop.add(rotor);}
  // Restrained navigation lights remain visible at dusk/night.
  add(new THREE.SphereGeometry(.035,8,6),new THREE.MeshBasicMaterial({color:'#f74a3a',depthTest:false,fog:false}),.18,.39,1.8);
  add(new THREE.SphereGeometry(.035,8,6),new THREE.MeshBasicMaterial({color:'#6be0b3',depthTest:false,fog:false}),.18,.39,-1.8);
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#faf4df';ctx.fillRect(0,0,2048,256);ctx.fillStyle='#173c55';ctx.fillRect(0,0,2048,16);ctx.fillRect(0,240,2048,16);
  ctx.fillStyle='#cf4c3e';ctx.fillRect(20,24,15,208);ctx.fillRect(2013,24,15,208);
  ctx.fillStyle='#173c55';ctx.font='900 184px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('REVANCHE GAME',1024,137,1880);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const bannerGeometry=new THREE.PlaneGeometry(6.4,.95,32,4);bannerGeometry.translate(-2.35,-.03,0);
  const cloth=new THREE.Mesh(bannerGeometry,new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,depthTest:false,depthWrite:false,fog:false,toneMapped:false}));cloth.renderOrder=42;root.add(cloth);
  const cableGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.85,0,0),new THREE.Vector3(1.55,.12,0)]);
  const cable=new THREE.Line(cableGeo,new THREE.LineBasicMaterial({color:'#b2b9b4',depthTest:false,fog:false}));cable.renderOrder=41;root.add(cable);
  // Draw this escort layer last. Clearing only depth preserves the world image,
  // while allowing the plane's own surfaces to occlude one another correctly.
  const depthReset=new THREE.Mesh(new THREE.PlaneGeometry(.001,.001),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,transparent:true}));
  depthReset.onBeforeRender=renderer=>renderer.clearDepth();root.add(depthReset);
  root.traverse(o=>{
    o.frustumCulled=false;if((o as THREE.Group).isGroup)o.renderOrder=40;
    if((o as THREE.Mesh).isMesh&&o!==cloth)o.renderOrder=41;
    const object=o as THREE.Mesh;if(!object.material)return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      material.transparent=true;material.depthTest=o!==cloth&&o!==cable&&o!==depthReset;
      material.depthWrite=material.depthTest&&material.opacity>=.99;
    }
  });depthReset.renderOrder=39;
  const target=new THREE.Vector3(),direction=new THREE.Vector3(),forward=new THREE.Vector3(),left=new THREE.Vector3(),right=new THREE.Vector3(),base=bannerGeometry.attributes.position.array.slice();let ready=false;
  function update(seconds:number,camera:THREE.Camera){
    camera.updateMatrixWorld();const drift=Math.sin(seconds*.13)*.06,x=-.28+drift,y=.595+Math.sin(seconds*.23)*.018;
    target.set(x,y,.5).unproject(camera);direction.copy(target).sub(camera.position);camera.getWorldDirection(forward);const depth=Math.max(.001,direction.dot(forward));target.copy(camera.position).addScaledVector(direction,42/depth);
    root.position.copy(target);root.quaternion.copy(camera.quaternion);root.rotateZ(Math.sin(seconds*.37)*.018);
    left.set(-.59,y,.5).unproject(camera);right.set(.59,y,.5).unproject(camera);
    const width=left.distanceTo(right)*42/depth;
    root.scale.setScalar(width/11);prop.rotation.x=seconds*38;plane.rotation.x=.1+Math.sin(seconds*.85)*.06;plane.rotation.y=.16+Math.sin(seconds*.45)*.08;plane.rotation.z=Math.cos(seconds*.5)*.025;
    const position=bannerGeometry.attributes.position as THREE.BufferAttribute;
    for(let i=0;i<position.count;i++){
      const px=base[i*3],py=base[i*3+1],u=(.85-px)/6.4;
      position.setXYZ(i,px,py+Math.sin(seconds*3.3-u*8)*.035*u,Math.sin(seconds*4-u*10+py)*.095*u);
    }position.needsUpdate=true;root.updateMatrixWorld(true);ready=true;
  }
  return {root,banner:cloth,update,get ready(){return ready;},dispose(){scene.remove(root);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material])materials.add(mat);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();}};
}
