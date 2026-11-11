import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {boostEnvelope,smooth,type MotionStyle} from './cardAnimation';
import type {HazardType} from '@/game/types/game';

/** Short, bounded effects attached to the car frame. No timers or per-frame meshes. */
export function createCardEffects(parent:THREE.Group){
  const root=new THREE.Group();root.name='card-effects';parent.add(root);
  const steel=new THREE.MeshStandardMaterial({color:'#bac4c8',metalness:.65,roughness:.38});
  const dark=new THREE.MeshStandardMaterial({color:'#252d33',roughness:.85});
  const amber=new THREE.MeshStandardMaterial({color:'#e1a13e',roughness:.6});
  const green=new THREE.MeshBasicMaterial({color:'#71d5a1',transparent:true,opacity:0,depthWrite:false});
  const trailMaterial=new THREE.MeshBasicMaterial({color:'#8dcdea',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const mesh=(group:THREE.Group,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);group.add(o);return o;};
  const box=(w:number,h:number,d:number)=>new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.2);
  const service=new THREE.Group();service.name='repair-service';root.add(service);service.visible=false;
  const jack=new THREE.Group();service.add(jack);mesh(jack,box(.16,.025,.13),dark,0,.014,0);
  for(const side of[-1,1]){const arm=mesh(jack,box(.15,.018,.025),steel,0,.08,side*.022);arm.rotation.z=side*.65;}
  mesh(jack,box(.11,.025,.09),amber,0,.145,0);
  const wrench=new THREE.Group();service.add(wrench);mesh(wrench,box(.025,.19,.018),steel,0,.07,0);
  const jaw=new THREE.TorusGeometry(.033,.008,6,12,Math.PI*1.45);mesh(wrench,jaw,steel,0,.18,0);
  const tyre=new THREE.Group();service.add(tyre);const rubber=new THREE.TorusGeometry(.075,.025,8,18);rubber.rotateY(Math.PI/2);mesh(tyre,rubber,dark);
  const hub=new THREE.CylinderGeometry(.048,.048,.035,12);hub.rotateZ(Math.PI/2);mesh(tyre,hub,steel);
  const can=new THREE.Group();service.add(can);mesh(can,box(.105,.14,.07),amber);mesh(can,box(.065,.018,.04),dark,0,.087,0);
  const spout=mesh(can,new THREE.CylinderGeometry(.009,.009,.075,8),steel,.045,.095,0);spout.rotation.z=-.6;
  const streamMaterial=new THREE.MeshBasicMaterial({color:'#d9b35d',transparent:true,opacity:0,depthWrite:false});
  const stream=mesh(service,new THREE.CylinderGeometry(.005,.005,.14,6),streamMaterial);stream.visible=false;
  const mechanic=new THREE.Group();service.add(mechanic);
  const workwear=new THREE.MeshStandardMaterial({color:'#35566c',roughness:.9}),skin=new THREE.MeshStandardMaterial({color:'#c99572',roughness:.9});
  mesh(mechanic,box(.145,.18,.085),workwear,0,.22,.015).rotation.x=.22;
  mesh(mechanic,box(.14,.07,.13),dark,0,.105,-.015);
  for(const side of[-1,1]){mesh(mechanic,new THREE.SphereGeometry(.045,8,6),dark,side*.055,.066,.045);mesh(mechanic,box(.064,.034,.12),dark,side*.06,.022,-.035);}
  const head=mesh(mechanic,new THREE.SphereGeometry(1,10,8),skin,0,.365,.05);head.scale.set(.051,.061,.049);
  const cap=new THREE.SphereGeometry(.055,10,6,0,Math.PI*2,0,Math.PI/2);mesh(mechanic,cap,workwear,0,.407,.045).scale.y=.5;
  mesh(mechanic,box(.105,.009,.045),workwear,0,.409,.08);
  const arms=new THREE.Group();arms.position.y=.265;mechanic.add(arms);
  const segment=(a:THREE.Vector3,b:THREE.Vector3,m:THREE.Material,radius:number)=>{const g=new THREE.CylinderGeometry(radius,radius*.95,a.distanceTo(b),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());mesh(arms,g,m);};
  for(const side of[-1,1]){const shoulder=new THREE.Vector3(side*.082,0,0),elbow=new THREE.Vector3(side*.10,-.08,.09),hand=new THREE.Vector3(side*.045,-.14,.17);segment(shoulder,elbow,workwear,.023);segment(elbow,hand,skin,.017);mesh(arms,new THREE.SphereGeometry(.022,8,6),skin,...hand.toArray());}
  const ring=mesh(root,new THREE.TorusGeometry(.55,.009,6,48),green,0,.008,0);ring.rotation.x=Math.PI/2;ring.visible=false;
  const domeMaterial=new THREE.MeshBasicMaterial({color:'#88cddd',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const dome=mesh(root,new THREE.SphereGeometry(.67,20,10,0,Math.PI*2,0,Math.PI/2),domeMaterial);dome.scale.set(1,1.2,1.1);dome.visible=false;
  const arrows=new THREE.Group();root.add(arrows);arrows.visible=false;
  const arrowMaterial=new THREE.MeshBasicMaterial({color:'#e8cf7b',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const arrowShape=new THREE.Shape();arrowShape.moveTo(-.16,0);arrowShape.lineTo(0,.18);arrowShape.lineTo(.16,0);arrowShape.lineTo(.10,-.045);arrowShape.lineTo(0,.07);arrowShape.lineTo(-.10,-.045);arrowShape.closePath();
  for(let i=0;i<3;i++){const a=mesh(arrows,new THREE.ShapeGeometry(arrowShape),arrowMaterial,0,.008,.8+i*.38);a.rotation.x=Math.PI/2;}
  const trails=new THREE.Group();root.add(trails);trails.visible=false;
  for(const side of[-1,1]){const streak=mesh(trails,new THREE.PlaneGeometry(.035,1),trailMaterial,side*.29,.008,-1.05);streak.rotation.x=-Math.PI/2;}
  const debris=new THREE.Group();root.add(debris);debris.visible=false;
  const flecks=Array.from({length:10},(_,i)=>mesh(debris,box(.018+(i%3)*.007,.014,.025),i%3?steel:amber));
  let repairAt=-Infinity,repairCause:HazardType|undefined,shieldAt=-Infinity,gpsAt=-Infinity,impactAt=-Infinity;
  const target=new THREE.Vector3(),serviceStart=new THREE.Vector3();
  function repair(time:number,cause:HazardType|undefined,wheel?:THREE.Vector3){repairAt=time;repairCause=cause;if(cause==='radar'||cause==='barrage')gpsAt=time;target.copy(cause==='crevaison'&&wheel?wheel:cause==='panne'?new THREE.Vector3(-.27,.1,-.25):new THREE.Vector3(-.24,.1,.3));serviceStart.copy(target).add(new THREE.Vector3(Math.sign(target.x||1)*.26,0,-.08));serviceStart.y=0;}
  const groundRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2),up=new THREE.Vector3(0,1,0),yawRotation=new THREE.Quaternion(),tangent=new THREE.Vector3(),right=new THREE.Vector3(),normal=new THREE.Vector3(),basis=new THREE.Matrix4();
  function update(time:number,motion?:{style:MotionStyle;progress:number},roadAt?:(along:number)=>{position:THREE.Vector3;yaw:number}){
    const align=(object:THREE.Object3D,along:number,across=0)=>{
      const pose=roadAt?.(along);object.position.copy(pose?.position??new THREE.Vector3(0,0,along));const yaw=pose?.yaw??0;
      right.set(Math.cos(yaw),0,-Math.sin(yaw));object.position.addScaledVector(right,across);object.position.y+=.008;
      if(roadAt){tangent.subVectors(roadAt(along+.2).position,roadAt(along-.2).position).normalize();normal.crossVectors(right,tangent).normalize();right.crossVectors(tangent,normal).normalize();object.quaternion.setFromRotationMatrix(basis.makeBasis(right,tangent,normal));}
      else object.quaternion.copy(yawRotation.setFromAxisAngle(up,yaw)).multiply(groundRotation);
    };
    const a=(time-repairAt)/1500,servicing=a>=0&&a<1;service.visible=servicing;
    if(servicing){
      const enter=smooth(a/.2),exit=1-smooth((a-.78)/.22),envelope=enter*exit;service.scale.setScalar(Math.max(.001,envelope));service.position.copy(serviceStart);
      const fuel=repairCause==='panne',wheel=repairCause==='crevaison';jack.visible=wheel;tyre.visible=wheel;can.visible=fuel;wrench.visible=!fuel&&repairCause!=='radar'&&repairCause!=='barrage';
      const inward=-Math.sign(target.x||1);mechanic.visible=repairCause!=='radar'&&repairCause!=='barrage';mechanic.rotation.y=inward*Math.PI/2;mechanic.position.x=inward*(fuel?.035:-.015);arms.rotation.x=fuel?-.7:0;
      wrench.position.set(inward*.07,target.y+.025,.035);wrench.rotation.z=-inward*Math.PI/2+Math.sin(a*Math.PI*8)*.16;
      tyre.position.set((target.x-serviceStart.x)*smooth(a/.65),target.y+.015,target.z-serviceStart.z);tyre.rotation.x=-a*Math.PI*2;tyre.scale.setScalar(1-smooth((a-.50)/.20));
      can.position.set(-Math.sign(target.x||1)*.19,.22,0);can.rotation.z=-Math.sin(Math.PI*smooth(a))*1.05;stream.visible=fuel&&a>.28&&a<.7;stream.position.set(.066,.126,0).applyQuaternion(can.quaternion).add(can.position);stream.position.y-=.07;streamMaterial.opacity=stream.visible?.55:0;
    }
    const shield=(time-shieldAt)/1250,gps=(time-gpsAt)/1500,repairPulse=servicing?Math.sin(Math.PI*a)*.6:0;
    const protection=shield>=0&&shield<1?Math.sin(Math.PI*shield):0;
    dome.visible=protection>0;domeMaterial.opacity=protection*.12;dome.scale.setScalar(.95+smooth(shield)*.13);
    ring.visible=protection>0||servicing;green.opacity=Math.max(protection*.55,repairPulse*.5);ring.scale.setScalar(1+protection*.15);
    arrows.visible=gps>=0&&gps<1;arrowMaterial.color.set(servicing&&(repairCause==='radar'||repairCause==='barrage')?'#82cfa1':'#e8cf7b');arrowMaterial.opacity=arrows.visible?Math.sin(Math.PI*gps)*.6:0;arrows.position.z=0;if(arrows.visible)arrows.children.forEach((a,i)=>align(a,.8+i*.38+smooth(gps)*.4));
    const boost=motion&&(motion.style==='turbo'||motion.style==='sprint')?boostEnvelope(motion.progress):0;trails.visible=boost>0;trailMaterial.opacity=boost*.36;trailMaterial.color.set(motion?.style==='sprint'?'#ecd598':'#9bd7e7');trails.scale.z=1;if(trails.visible)trails.children.forEach((s,i)=>{align(s,-1.05,i===0?-.29:.29);s.scale.y=.45+boost*.9;});
    const impact=(time-impactAt)/850;debris.visible=impact>=0&&impact<1;
    if(debris.visible)for(let i=0;i<flecks.length;i++){
      const angle=i*2.399,velocity=.35+(i%3)*.12;flecks[i].position.set(Math.cos(angle)*impact*velocity,Math.max(.025,.08+impact*.4-impact*impact*.6),.32+Math.sin(angle)*impact*.32);flecks[i].rotation.set(impact*(i+2),impact*4,i);flecks[i].scale.setScalar(1-smooth((impact-.65)/.35));
    }
  }
  return {root,repair,shield(time:number){shieldAt=time;},gps(time:number){gpsAt=time;},impact(time:number){impactAt=time;},update,
    dispose(){parent.remove(root);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)materials.add(m.material as THREE.Material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
