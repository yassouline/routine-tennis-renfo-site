import * as T from './assets/three.core.js';

const PI = Math.PI;
const V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
const X=V(1,0,0), Y=V(0,1,0);
const clamp = (x,a=0,b=1) => Math.max(a, Math.min(b,x));
const ease = t => (1-Math.cos(clamp(t)*PI))/2;
const qAxis = (axis,a) => new T.Quaternion().setFromAxisAngle(axis,a);
const lerp = (a,b,t) => a+(b-a)*t;
export const motions = {
  march: { duration: 2.6, phases: ['Genou gauche · bras droit', 'Repose le pied', 'Genou droit · bras gauche', 'Repose le pied'], muscles:['quads','hipflexors','calves'], view:'three' },
  hipcar: { duration: 8, phases: ['Talon derrière, genoux côte à côte', 'Recule légèrement la cuisse', 'Ouvre le genou sur le côté', 'Garde le genou · fais pivoter la hanche', 'Ramène le genou devant', 'Redescends et repose le pied'], muscles:['glutes','hipflexors'], view:'three' },
  pelvis: { duration: 5, phases: ['Bascule doucement le bassin', 'Reviens au milieu', 'Bascule dans l’autre sens', 'Reviens au milieu'], muscles:['abs','glutes'], view:'side' },
  hinge: { duration: 5, phases: ['Recule les hanches · dos long', 'Pousse dans les pieds et redresse-toi'], muscles:['glutes','hamstrings'], view:'side' },
  squat: { duration: 4.8, phases: ['Fléchis les hanches et les genoux', 'Pousse dans les pieds et remonte'], muscles:['quads','glutes'], view:'three' },
  neck: { duration: 10, phases: ['Oui : menton vers la poitrine', 'Remonte et regarde devant', 'Non : tourne à droite', 'Tourne à gauche'], muscles:['neck'], view:'head' },
  arms: { duration: 4, phases: ['Petits cercles vers l’avant', 'Continue sans hausser les épaules'], muscles:['shoulders','back'], view:'three' },
  ankles: { duration: 4, phases: ['Décolle les talons', 'Redescends lentement'], muscles:['calves'], view:'side' },
  knees: { duration: 3.2, phases: ['Monte le genou gauche', 'Repose doucement', 'Monte le genou droit', 'Repose doucement'], muscles:['hipflexors','abs'], view:'three' },
  shuffle: { duration: 5, phases: ['Pas vers la gauche', 'Rapproche l’autre pied sans croiser', 'Pas vers la droite', 'Rapproche l’autre pied sans croiser'], muscles:['quads','glutes','calves'], view:'front' },
  swing: { duration: 7, phases: ['Prépare le coup droit', 'Tourne avec les appuis · accompagne', 'Prépare le revers à deux mains', 'Tourne avec les appuis · accompagne'], muscles:['shoulders','abs','glutes'], view:'three' }
};

export function phaseAt(type, progress) {
  const breaks = type === 'hipcar' ? [0,.14,.28,.46,.63,.82,1] : motions[type].phases.map((_,i,a)=>i/a.length).concat(1);
  const index = Math.min(breaks.length-2,breaks.findIndex((v,i)=>i>0&&progress<v)-1);
  return Math.max(0,index);
}

// Frames are defined in world space: +Y up, +Z forwards, +X the man's left.
// Each limb keeps its measured segment lengths. Feet in contact stay on the floor.
export function createMotionRig(model) {
  model.updateMatrixWorld(true);
  const names = ['root','pelvis','spine_01','spine_02','spine_03','neck_01','Head',
    ...['l','r'].flatMap(s=>['thigh','calf','foot','ball','clavicle','upperarm','lowerarm','hand'].map(n=>`${n}_${s}`))];
  const bones=Object.fromEntries(names.map(n=>[n,model.getObjectByName(n)]));
  for (const [n,b] of Object.entries(bones)) if (!b) throw new Error(`Missing joint: ${n}`);
  const rest={};
  model.traverse(o=> { rest[o.uuid]={object:o,p:o.position.clone(),q:o.quaternion.clone()}; });
  const world={};
  for(const [n,b] of Object.entries(bones)) world[n]={p:b.getWorldPosition(V()),q:b.getWorldQuaternion(new T.Quaternion())};
  const length=(a,b)=>world[a].p.distanceTo(world[b].p);
  const legs={}; const arms={};
  for(const s of ['l','r']) {
    legs[s]=[length(`thigh_${s}`,`calf_${s}`),length(`calf_${s}`,`foot_${s}`)];
    arms[s]=[length(`upperarm_${s}`,`lowerarm_${s}`),length(`lowerarm_${s}`,`hand_${s}`)];
  }
  const position=n=>bones[n].getWorldPosition(V());
  function worldQ(name,q) {
    const b=bones[name];
    b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
    b.updateWorldMatrix(false,true);
  }
  function rotate(name,axis,angle) {
    worldQ(name,qAxis(axis,angle).multiply(bones[name].getWorldQuaternion(new T.Quaternion())));
  }
  function frame(direction,normal) {
    const y=direction.clone().normalize();
    const x=normal.clone().addScaledVector(y,-normal.dot(y)).normalize();
    const z=V().crossVectors(x,y).normalize();
    x.crossVectors(y,z).normalize();
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  }
  function twoBone(a,b,c,target,pole,lengths) {
    const start=position(a), delta=target.clone().sub(start);
    const distance=clamp(delta.length(),Math.abs(lengths[0]-lengths[1])+.001,lengths[0]+lengths[1]-.0001);
    const dir=delta.normalize();
    const outward=pole.clone().sub(start).addScaledVector(dir,-pole.clone().sub(start).dot(dir)).normalize();
    const along=(lengths[0]**2-lengths[1]**2+distance**2)/(2*distance);
    const off=Math.sqrt(Math.max(0,lengths[0]**2-along**2));
    const middle=start.clone().addScaledVector(dir,along).addScaledVector(outward,off);
    const actualTarget=start.clone().addScaledVector(dir,distance);
    const upper=middle.clone().sub(start),lower=actualTarget.clone().sub(middle);
    const normal=V().crossVectors(upper,lower).normalize();
    worldQ(a,frame(upper,normal)); worldQ(b,frame(lower,normal));
    return position(c);
  }
  function leg(s,target,pivot=0,pitch=0,pole=V(target.x,.55,.75)) {
    twoBone(`thigh_${s}`,`calf_${s}`,`foot_${s}`,target,pole,legs[s]);
    worldQ(`foot_${s}`,qAxis(Y,pivot).multiply(qAxis(X,pitch)).multiply(world[`foot_${s}`].q));
  }
  function arm(s,target,pole) {
    twoBone(`upperarm_${s}`,`lowerarm_${s}`,`hand_${s}`,target,pole,arms[s]);
    // Relax the fingers instead of leaving the reference model's hands rigidly splayed.
    for (const finger of ['index','middle','ring','pinky']) for(const digit of ['01','02','03']) {
      const b=model.getObjectByName(`${finger}_${digit}_${s}`);
      if(b) b.rotateX(.20);
    }
  }
  function car(s,p,small) {
    const sign=s==='l'?1:-1;
    const high=small?55:80;
    const rad=high*PI/180;
    const upSide=V(sign*Math.sin(rad),-Math.cos(rad),0), upFront=V(0,-Math.cos(rad),Math.sin(rad));
    const entries=[
      [0,V(0,-1,0),V(0,0,-1),.112],
      [.14,V(0,-1,0),V(0,0,-1),PI/2],
      [.28,V(0,-.985,-.174),V(0,.174,-.985),PI/2],
      [.46,upSide,V(0,0,-1),PI/2],
      [.63,upSide,V(-sign*Math.cos(rad),-Math.sin(rad),0),PI/2],
      [.82,upFront,V(0,-Math.sin(rad),-Math.cos(rad)),PI/2],
      [.94,V(0,-1,0),V(0,0,-1),PI/2],
      [1,V(0,-1,0),V(0,0,-1),.112]
    ];
    let i=entries.findIndex((v,j)=>j>0&&p<=v[0])-1; i=Math.max(0,i);
    const a=entries[i],b=entries[i+1],f=ease((p-a[0])/(b[0]-a[0]));
    const qa=frame(a[1],V().crossVectors(a[1],a[2]));
    const qb=frame(b[1],V().crossVectors(b[1],b[2]));
    const q=qa.slerp(qb,f);
    worldQ(`thigh_${s}`,q);
    worldQ(`calf_${s}`,q.clone().multiply(qAxis(X,lerp(a[3],b[3],f))));
    const lifted=Math.min(1,p/.14,(1-p)/.06);
    worldQ(`foot_${s}`,qAxis(X,.35*clamp(lifted)).multiply(world[`foot_${s}`].q));
  }

  function apply(type,progress,{side='l',small=true}={}) {
    const p=((progress%1)+1)%1;
    for(const r of Object.values(rest)) {r.object.position.copy(r.p);r.object.quaternion.copy(r.q);}
    model.updateMatrixWorld(true);
    let hip=world.pelvis.p.clone().add(V(0,-.025,0));
    let pitch=0,yaw=0,pelvicTilt=0;
    const feet={l:V(.145,.086,-.088),r:V(-.145,.086,-.088)};
    const pivots={l:0,r:0},footPitch={l:0,r:0};
    let hands={l:V(.27,1.01,-.01),r:V(-.27,1.01,-.01)};
    let poles={l:V(.4,1.2,-.1),r:V(-.4,1.2,-.1)};
    let support=null;
    const wave=(1-Math.cos(2*PI*p))/2;
    if(type==='march'||type==='knees') {
      const liftL=Math.sin(PI*clamp(p*2)),liftR=Math.sin(PI*clamp((p-.5)*2));
      const height=type==='knees'?.34:.14;
      feet.l.y+=height*liftL; feet.l.z+=height*.60*liftL;
      feet.r.y+=height*liftR; feet.r.z+=height*.60*liftR;
      hip.x+=.028*(liftR-liftL);
      // Opposite arm swings forward with a bent elbow, the other one slightly back.
      const swing=type==='knees'?1:.8;
      hands.l=V(.22,1.0+.13*liftR*swing,.05+.24*liftR*swing-.12*liftL*swing);
      hands.r=V(-.22,1.0+.13*liftL*swing,.05+.24*liftL*swing-.12*liftR*swing);
      poles={l:V(.30,1.12,-.30),r:V(-.30,1.12,-.30)};
    } else if(type==='hipcar') {
      const sign=side==='l'?1:-1;
      hip.y+=.025;
      hip.x-=sign*.025;
      // Ankle under the active hip at start/end; the other foot remains planted.
      feet[side].x=world[`thigh_${side}`].p.x+hip.x;
      const other=side==='l'?'r':'l';
      support=-sign;
      hands[other]=V(-sign*.49,1.045,.06);
      poles[other]=V(-sign*.42,1.10,-.12);
      hands[side]=V(sign*.24,1.02,.025);
    } else if(type==='pelvis') {
      pelvicTilt=.085*Math.sin(2*PI*p); pitch=-pelvicTilt*.80;
      hands={l:V(.205,1.035,.015),r:V(-.205,1.035,.015)};
      poles={l:V(.39,1.10,-.13),r:V(-.39,1.10,-.13)};
    } else if(type==='hinge') {
      hip.y-=.07*wave;hip.z-=.18*wave;pitch=.48*wave;
      hands={l:V(.17,1.04-.17*wave,.055+.03*wave),r:V(-.17,1.04-.17*wave,.055+.03*wave)};
      poles={l:V(.32,1.0,-.12),r:V(-.32,1.0,-.12)};
    } else if(type==='squat') {
      hip.y-=.18*wave;hip.z-=.105*wave;pitch=.20*wave;
      feet.l.x=.21;feet.r.x=-.21;pivots.l=.10;pivots.r=-.10;
      hands={l:V(.19,1.10-.12*wave,.15+.20*wave),r:V(-.19,1.10-.12*wave,.15+.20*wave)};
      poles={l:V(.33,.97,.17),r:V(-.33,.97,.17)};
    } else if(type==='arms') {
      // Near-straight arms: the hand traces a small circle around the shoulder.
      hands={l:V(.66,1.35+.09*Math.cos(2*PI*p),-.045+.09*Math.sin(2*PI*p)),r:V(-.66,1.35+.09*Math.cos(2*PI*p),-.045+.09*Math.sin(2*PI*p))};
      poles={l:V(.48,1.15,.05),r:V(-.48,1.15,.05)};
    } else if(type==='ankles') {
      const angle=.42*wave;
      for(const s of ['l','r']) {
        const toe=world[`ball_${s}`].p.clone();toe.x=feet[s].x;
        feet[s]=world[`foot_${s}`].p.clone().sub(world[`ball_${s}`].p).applyAxisAngle(X,angle).add(toe);
        footPitch[s]=angle;
      }
      hip.y+=feet.l.y-.086;
      hands={l:V(.205,1.035+feet.l.y-.086,.015),r:V(-.205,1.035+feet.r.y-.086,.015)};
    } else if(type==='shuffle') {
      // Four contacts, not a sliding body: one foot lifts while the other stays fixed.
      const k=Math.floor(p*4),f=ease(p*4-k),lift=.045*Math.sin(PI*(p*4-k));
      const positions=[[.20,-.20],[.50,-.20],[.50,.10],[.50,-.20],[.20,-.20]];
      feet.l.x=lerp(positions[k][0],positions[k+1][0],f);
      feet.r.x=lerp(positions[k][1],positions[k+1][1],f);
      feet[k===0||k===3?'l':'r'].y+=lift;
      hip.x=(feet.l.x+feet.r.x)/2-.15;feet.l.x-=.15;feet.r.x-=.15;
      hip.y-=.055;pitch=.07;
      hands={l:V(hip.x+.24,1.12,.21),r:V(hip.x-.24,1.12,.21)};
      poles={l:V(hip.x+.35,1.06,.03),r:V(hip.x-.35,1.06,.03)};
    } else if(type==='swing') {
      const curve=[-.60,-.60,.62,.62,.60,.60,-.62,-.62,-.60];
      const f=p*8,i=Math.floor(f);yaw=lerp(curve[i],curve[i+1],ease(f-i));
      hip.y-=.035;pitch=.055;
      feet.l.x=.23;feet.r.x=-.23;pivots.l=yaw*.58;pivots.r=yaw*.58;
      // The heels turn with the hips; the lumbar spine is not used as a fixed pivot.
      const local=(x,y,z)=>V(x,y,z).applyAxisAngle(Y,yaw).add(V(0,0,-.02));
      const follow=(1-Math.cos(4*PI*p))/2;
      hands.r=local(lerp(.20,-.16,follow),lerp(1.13,1.38,follow),lerp(.43,.35,follow));
      const twoHands=Math.sin(PI*clamp((p-.45)/.55))**2;
      hands.l=local(-.27,1.15,.30).lerp(hands.r.clone().add(V(-.08,-.04,.02)),twoHands);
      poles={l:local(-.38,1.04,.14),r:local(.38,1.04,.18)};
    }
    bones.pelvis.position.copy(bones.pelvis.parent.worldToLocal(hip.clone()));
    model.updateMatrixWorld(true);
    if(yaw) rotate('pelvis',Y,yaw);
    if(pelvicTilt) rotate('pelvis',X,pelvicTilt);
    if(pitch) rotate('spine_01',X,pitch);
    // A small upper-back contribution follows the whole-body tennis turn.
    if(type==='swing') rotate('spine_03',Y,yaw*.12);
    if(type==='neck') {
      // First half: two slow nods. Second half: one slow turn to each side.
      if(p<.5) rotate('neck_01',X,.42*(1-Math.cos(4*PI*p))/2), rotate('Head',X,.22*(1-Math.cos(4*PI*p))/2);
      else { const turn=Math.sin(2*PI*(p-.5)*2); rotate('neck_01',Y,-.55*turn); rotate('Head',Y,-.35*turn); }
    }
    // Calm breathing and a level gaze make the figure look alive without changing the exercise.
    rotate('spine_03',X,-.018*Math.sin(2*PI*p*(motions[type].duration>8?3:1)));
    if(pitch) rotate('neck_01',X,-pitch*.45);
    for(const s of ['l','r']) {
      if(type==='hipcar'&&s===side) car(s,p,small);
      else leg(s,feet[s],pivots[s],footPitch[s],V(feet[s].x,.5,.65));
      arm(s,hands[s],poles[s]);
    }
    model.updateMatrixWorld(true);
    return {phase:phaseAt(type,p),support,position,bones,feet,hip};
  }
  return { apply,position,bones,world,lengths:{legs,arms} };
}
