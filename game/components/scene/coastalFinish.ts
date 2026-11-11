import * as THREE from "three";

export function finishTexture(kind:'gravel'|'stone'|'cloud'|'grain') {
  const c=document.createElement('canvas');c.width=256;c.height=kind==='cloud'?128:256;const g=c.getContext('2d')!;
  let seed=193;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  if(kind==='cloud'){
    for(let i=0;i<28;i++){
      const x=30+random()*195,y=42+random()*43,r=18+random()*28;
      const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'rgba(255,255,255,.23)');grad.addColorStop(.5,'rgba(255,255,255,.14)');grad.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);
    }
  }else{
    g.fillStyle=kind==='gravel'?'#ddd5c3':kind==='stone'?'#eee5d3':'#a8a8a8';g.fillRect(0,0,256,256);
    for(let i=0;i<6000;i++){
      const value=random(),x=random()*256,y=random()*256;
      g.fillStyle=value>.5?`rgba(255,255,245,${random()*.2})`:`rgba(45,43,38,${random()*.13})`;
      const size=kind==='gravel'?.5+random()*2.4:.5+random();g.fillRect(x,y,size,size*.7);
    }
    if(kind==='stone')for(let row=0;row<4;row++)for(let column=-1;column<4;column++){
      const x=column*85+(row%2)*42,y=row*64;g.strokeStyle='rgba(104,91,70,.24)';g.lineWidth=2;g.strokeRect(x+2,y+2,81,60);
      g.strokeStyle='rgba(255,255,245,.5)';g.lineWidth=1;g.strokeRect(x+4,y+4,77,56);
    }
  }
  const map=new THREE.CanvasTexture(c);map.colorSpace=kind==='grain'?THREE.NoColorSpace:THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=kind==='cloud'?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;map.anisotropy=4;return map;
}

export interface SailingBoat {x:number;z:number;phase:number;radius:number;speed:number}
/** Subtle V wakes stay attached to the existing sailing trajectory. */
export function createBoatWakes(scene:THREE.Scene,boats:SailingBoat[],level:number){
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(const side of [-1,1])for(let i=0;i<=18;i++){
    const u=i/18,z=.35+u*2.8,width=.07+u*.44;
    for(const edge of [0,1]){positions.push(side*(width+edge*(.025+u*.07)),0,z);uvs.push(edge,u);}
    if(i>0){const a=positions.length/3-4;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=256;const g=canvas.getContext('2d')!;
  const fade=g.createLinearGradient(0,0,0,256);fade.addColorStop(0,'#222222');fade.addColorStop(.2,'#eeeeee');fade.addColorStop(.7,'#777777');fade.addColorStop(1,'black');g.fillStyle=fade;g.fillRect(0,0,64,256);
  const map=new THREE.CanvasTexture(canvas);
  const material=new THREE.MeshBasicMaterial({color:'#c8f5ec',alphaMap:map,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.InstancedMesh(geo,material,boats.length);mesh.name='sailboat-wakes';mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),scale=new THREE.Vector3(1,1,1);
  function update(t:number){boats.forEach((b,i)=>{const a=b.phase+t*b.speed,sign=Math.sign(b.speed)||1;p.set(b.x+Math.cos(a)*b.radius-b.radius,level+.065,b.z+Math.sin(a)*b.radius);q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,Math.atan2(Math.sin(a)*sign,-Math.cos(a)*sign));m.compose(p,q,scale);mesh.setMatrixAt(i,m);});mesh.instanceMatrix.needsUpdate=true;material.opacity=.22+Math.sin(t*.8)*.025;}
  update(0);return {mesh,update,dispose(){scene.remove(mesh);geo.dispose();material.dispose();map.dispose();mesh.dispose();}};
}
