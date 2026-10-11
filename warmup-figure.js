import * as T from 'three';
import { GLTFLoader } from './assets/GLTFLoader.js';
import { createMotionRig, motions } from './warmup-motion.js?v=20261011e';

let renderer, scene, camera, rig, model, rail, trace, kneeDot;
let mounted=null, type='march', side='l', key='', elapsed=0, last=0;
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches, slow=false, small=false, view='three', failure='';
const coloredMeshes=[];
const $=id=>document.getElementById(id);
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const region=(p,c,r)=> {
  const d=((p.x-c[0])/r[0])**2+((p.y-c[1])/r[1])**2+((p.z-c[2])/r[2])**2;
  return Math.max(0,Math.min(1,(1.1-d)*2.8));
};
// Anatomical areas are tinted on the skinned mesh itself, so the colour deforms
// with the body. No floating red shapes and no claim to measure muscle activation.
const areas={
  quads: [[.13,.76,.005,.095,.19,.10]],
  hamstrings:[[.13,.76,-.105,.09,.19,.075]],
  glutes:[[.105,.94,-.13,.12,.12,.095]],
  hipflexors:[[.125,.86,.08,.065,.085,.05]],
  calves:[[.116,.31,-.13,.07,.165,.085]],
  shoulders:[[.215,1.438,-.05,.105,.09,.11]],
  abs:[[0,1.155,.092,.14,.15,.055]],
  back:[[0,1.29,-.115,.18,.18,.065]],
  neck:[[0,1.5,-.06,.095,.1,.075]]
};
// Outfit: skin, T-shirt, shorts and shoes, chosen from the bones that move each vertex,
// so the character reads as a person rather than a grey mannequin.
const outfit={skin:new T.Color('#c9977a'),shirt:new T.Color('#2b5268'),shorts:new T.Color('#232a33'),shoe:new T.Color('#eef2f3')};
function outfitPart(name,p) {
  const along=(a,b)=>{const A=model.getObjectByName(a).getWorldPosition(V()),B=model.getObjectByName(b).getWorldPosition(V()),d=B.clone().sub(A);return p.clone().sub(A).dot(d)/d.lengthSq();};
  const s=name.slice(-1);
  if(/^(Head|neck)/.test(name))return 'skin';
  if(/^(spine|clavicle)/.test(name))return 'shirt';
  if(/^(pelvis|root)/.test(name))return p.y>1.02?'shirt':'shorts';
  if(/^upperarm/.test(name))return along(`upperarm_${s}`,`lowerarm_${s}`)<.42?'shirt':'skin';
  if(/^thigh/.test(name))return along(`thigh_${s}`,`calf_${s}`)<.5?'shorts':'skin';
  if(/^calf/.test(name))return p.y<.13?'shoe':'skin';
  if(/^(foot|ball)/.test(name))return 'shoe';
  return 'skin';
}
function prepareColor(mesh) {
  const pos=mesh.geometry.attributes.position,skinIndex=mesh.geometry.attributes.skinIndex,skinWeight=mesh.geometry.attributes.skinWeight;
  const weights={};
  for(const name of Object.keys(areas)) weights[name]=[new Float32Array(pos.count),new Float32Array(pos.count)];
  const base=new Float32Array(pos.count*3);
  const p=V();
  for(let i=0;i<pos.count;i++) {
    p.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);
    for(const [name,list] of Object.entries(areas)) for(let j=0;j<2;j++) {
      const sign=j===0?1:-1;
      weights[name][j][i]=Math.max(...list.map(a=>region(p,[a[0]*sign,a[1],a[2]],a.slice(3))));
    }
    let part='skin';
    if(skinIndex&&mesh.skeleton) {
      const score={};
      for(let k=0;k<4;k++){const w=skinWeight.getComponent(i,k);if(!w)continue;const bone=mesh.skeleton.bones[skinIndex.getComponent(i,k)];const c=outfitPart(bone.name,p);score[c]=(score[c]||0)+w;}
      part=Object.entries(score).sort((x,y)=>y[1]-x[1])[0]?.[0]||'skin';
    }
    outfit[part].toArray(base,i*3);
  }
  mesh.geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(pos.count*3),3));
  coloredMeshes.push({mesh,weights,base});
}
function colorAreas() {
  const red=new T.Color('#e5383b'),out=new T.Color();
  for(const {mesh,weights,base} of coloredMeshes) {
    const attr=mesh.geometry.attributes.color;
    for(let i=0;i<attr.count;i++) {
      let value=0;
      for(const name of motions[type].muscles) {
        const sides=type==='hipcar'&&name==='hipflexors'?[side==='l'?0:1]:[0,1];
        for(const j of sides) value=Math.max(value,weights[name][j][i]);
      }
      out.fromArray(base,i*3).lerp(red,value*.82);attr.setXYZ(i,out.r,out.g,out.b);
    }
    attr.needsUpdate=true;
  }
}
function cylinder(group,a,b,r,material) {
  const delta=b.clone().sub(a),mesh=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),20),material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());
  mesh.castShadow=true;group.add(mesh);
}
function supportRail() {
  const group=new T.Group(),mat=new T.MeshStandardMaterial({color:'#556b76',roughness:.55});
  cylinder(group,V(0,1.035,-.28),V(0,1.035,.31),.022,mat);
  for(const z of [-.25,.27]) {
    cylinder(group,V(0,.035,z),V(0,1.035,z),.018,mat);
    cylinder(group,V(-.11,.024,z),V(.11,.024,z),.024,mat);
  }
  return group;
}
function updateTrace() {
  if(!rig)return;
  if(trace){scene.remove(trace);trace.geometry.dispose();trace.material.dispose();trace=null;}
  if(type!=='hipcar'){kneeDot.visible=false;return;}
  const points=[];
  for(let i=0;i<=96;i++) {rig.apply('hipcar',i/96===1?.99999:i/96,{side,small});points.push(rig.position(`calf_${side}`));}
  trace=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:'#208b8d',dashSize:.025,gapSize:.018,transparent:true,opacity:.65}));
  trace.computeLineDistances();scene.add(trace);kneeDot.visible=true;
}
function fit() {
  if(!mounted||!renderer||!camera)return;
  const width=mounted.clientWidth,height=mounted.clientHeight;
  if(!width||!height)return;
  renderer.setSize(width,height,false);
  const half=.98;
  camera.left=-half*width/height;camera.right=half*width/height;camera.top=half;camera.bottom=-half;
  const sign=type==='hipcar'&&side==='r'?-1:1;
  const positions={three:[sign*3,1.55,4.7],front:[0,1.15,5],side:[sign*5,1.3,.25],head:[3.2,1.75,3.8]};
  if(view==='head'){const h=.5;camera.left=-h*width/height;camera.right=h*width/height;camera.top=h;camera.bottom=-h;}
  camera.position.fromArray(positions[view]);camera.lookAt(0,view==='head'?1.36:.9,0);camera.updateProjectionMatrix();
}
function syncControls() {
  if($('motionPause')){$('motionPause').textContent=paused?'▶ Lire':'Ⅱ Pause';$('motionPause').setAttribute('aria-pressed',String(paused));}
  if($('motionSlow')){$('motionSlow').textContent=slow?'Vitesse × 0,5':'Ralenti';$('motionSlow').setAttribute('aria-pressed',String(slow));}
  if($('motionView'))$('motionView').textContent=`Vue : ${{three:'¾',front:'face',side:'profil',head:'zoom'}[view]}`;
  if($('motionAmplitude')){$('motionAmplitude').textContent=small?'Petit cercle':'Cercle plus ample';$('motionAmplitude').setAttribute('aria-pressed',String(!small));}
}
function mount() {
  const target=$('warmupFigure');
  if(!target){mounted=null;return;}
  const nextType=target.dataset.motion,nextSide=target.dataset.side||'l';
  const nextKey=`${nextType}-${nextSide}`;
  if(!motions[nextType])return;
  if(nextKey!==key){key=nextKey;type=nextType;side=nextSide;elapsed=0;small=false;view=motions[type].view;if(rig){colorAreas();updateTrace();}}
  mounted=target;
  if(failure){target.textContent=failure;return;}
  if(renderer)target.replaceChildren(renderer.domElement);
  const bind=(id,fn)=>{const b=$(id);if(b)b.onclick=fn;};
  bind('motionPause',()=>{paused=!paused;syncControls();});
  bind('motionSlow',()=>{slow=!slow;syncControls();});
  bind('motionView',()=>{view={three:'front',front:'side',side:type==='neck'?'head':'three',head:'three'}[view];fit();syncControls();draw();});
  bind('motionAmplitude',()=>{small=!small;elapsed=0;updateTrace();syncControls();draw();});
  if($('motionRange'))$('motionRange').oninput=e=>{paused=true;elapsed=Number(e.target.value)/1000*motions[type].duration;syncControls();draw();};
  syncControls();fit();draw();
}
function draw() {
  if(!rig||!mounted?.isConnected)return;
  const progress=Math.min(.999999,(elapsed%motions[type].duration)/motions[type].duration);
  const pose=rig.apply(type,progress,{side,small});
  rail.visible=type==='hipcar';rail.position.x=(pose.support||1)*.49;
  if(kneeDot.visible)kneeDot.position.copy(rig.position(`calf_${side}`));
  if($('motionPhase'))$('motionPhase').textContent=`${pose.phase+1}. ${motions[type].phases[pose.phase]}`;
  if($('motionRange')&&document.activeElement!==$('motionRange'))$('motionRange').value=String(Math.round(progress*1000));
  if($('motionRange'))$('motionRange').setAttribute('aria-valuetext',motions[type].phases[pose.phase]);
  renderer.render(scene,camera);
}
async function init() {
  try {
    renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
    renderer.domElement.setAttribute('aria-hidden','true');
    scene=new T.Scene();
    const sky=document.createElement('canvas');sky.width=2;sky.height=256;const g=sky.getContext('2d'),grad=g.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#f6f9fa');grad.addColorStop(.62,'#e4ecef');grad.addColorStop(1,'#d3dee2');g.fillStyle=grad;g.fillRect(0,0,2,256);
    scene.background=new T.CanvasTexture(sky);scene.background.colorSpace=T.SRGBColorSpace;
    scene.add(new T.HemisphereLight('#ffffff','#9fb1ba',1.7));
    const keyLight=new T.DirectionalLight('#fff6eb',3.5);keyLight.position.set(-3,5,4);keyLight.castShadow=true;
    keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-2;keyLight.shadow.camera.right=2;keyLight.shadow.camera.top=2;keyLight.shadow.camera.bottom=-2;keyLight.shadow.normalBias=.018;keyLight.shadow.bias=-.0001;scene.add(keyLight);
    const fill=new T.DirectionalLight('#c8e4ff',1.4);fill.position.set(3,3,-3);scene.add(fill);
    const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#dbe4e7',roughness:1}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;scene.add(floor);
    const circle=new T.Mesh(new T.RingGeometry(.82,.825,96),new T.MeshBasicMaterial({color:'#bacbd1',side:T.DoubleSide}));circle.rotation.x=-Math.PI/2;circle.position.y=.001;scene.add(circle);
    camera=new T.OrthographicCamera(-1,1,1,-1,.1,50);
    rail=supportRail();scene.add(rail);
    kneeDot=new T.Mesh(new T.SphereGeometry(.014,16,12),new T.MeshBasicMaterial({color:'#14797c'}));scene.add(kneeDot);
    const gltf=await new GLTFLoader().loadAsync(new URL('./assets/warmup-man.glb',import.meta.url).href);
    model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;
      if(/eyes|eyebrows/i.test(o.name)){o.material=new T.MeshStandardMaterial({color:'#344b58',roughness:.7});return;}
      prepareColor(o);
      o.material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.62,metalness:0});
    });
    rig=createMotionRig(model);
    mount();colorAreas();updateTrace();draw();
    let lastDraw=0;
    function loop(now) {
      requestAnimationFrame(loop);
      const delta=last?Math.min(.1,(now-last)/1000):0;last=now;
      if(!mounted?.isConnected||document.hidden)return;
      if(!paused)elapsed+=delta*(slow?.5:1);
      if(now-lastDraw>32){draw();lastDraw=now;}
    }
    requestAnimationFrame(loop);
  } catch(error) {
    console.error('Warmup demonstration could not load',error);
    failure='Le visuel n’a pas pu se charger. Recharge la page pour réessayer.';
    if(mounted)mounted.textContent=failure;
  }
}
window.WarmupFigure={mount,unmount:()=>{mounted=null;}};
window.addEventListener('resize',fit);
mount();init();
