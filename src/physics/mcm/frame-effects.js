import {floatBits} from './math.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {transformMcmPoint} from './position-transform.js';
import {rotateMcmWorldVector} from './collision-impulse.js';
import {queryMcmTerrainSegment} from './terrain-segment.js';
import {traverseMcmTerrainSegment} from './terrain-segment-traversal.js';
import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround,signed=x=>floatBits(x)|0;
const move=(emitter,point)=>{emitter.previousPosition=[...emitter.position];emitter.position=[...point];};
const emit=(emitter,point,intensity)=>{move(emitter,point);emitter.intensity=intensity;};

// Original 0x4ac95a..0x4acfd8. Emitter objects are memory views supplied by the
// state adapter; the terrain query executes the recovered traversal directly.
export function updateMcmFrameEffects(c){
 const b=c.bike,e=c.frameEffects;b.field8c0=0;
 if(!b.fieldc90||!e.enabled)return;
 if(!b.fieldca8){
  if(!Array.isArray(e.targets))throw new Error('Unmapped frame-effects target list');
  for(const target of e.targets)if(target.type===2)b.fieldca8=target.address;
 }
 const [dust,spray,exhaust]=e.emitters,p=e.inputs;
 const color=value=>{dust.color=value;exhaust.color=value;};
 if(!e.occlusion){if(b.fieldca4){color(0xffffff);b.fieldca4=0;}}
 else{
  if(b.fieldcac===b.fieldcb0||e.selectedPlayer){
   const start=[...p.rearPoint];start[1]=f(add(start[1],1.5));
   const target=e.resolveTarget(b.fieldca8),point=[0,0,0];
   const result=queryMcmTerrainSegment(c.terrain,start,target,point,0,traverseMcmTerrainSegment);
   e.queryTrace?.push({start:[...start],target:[...target],result,point:[...point]});
   if(result!==b.fieldca4){color(result?0x808080:0xffffff);b.fieldca4=result;}
  }
  b.fieldcb0=(b.fieldcb0+1)|0;if(b.fieldcb0>5)b.fieldcb0=0;
 }
 move(exhaust,transformMcmPoint(resolveMcmWorldMatrix(c.bodyNode),[0,2.5,-2.75]));
 const level=c.engine.state,rising=+(level>b.fieldcb8),falling=!(level>=b.fieldcb8);
 if(!b.fieldcc0&&!b.field844&&signed(b.field6a4)<0x41b00000){
  if(rising&&!b.fieldcbc){exhaust.started=1;exhaust.duration=exhaust.period;exhaust.active=1;}
  else if(falling){exhaust.duration=f(.0001);exhaust.started=1;exhaust.stopping=1;}
 }
 b.fieldcc0=b.field844;b.fieldcbc=rising;b.fieldcb8=level;
 if(b.field4bc||signed(b.field560)<0x3e4ccccd||(!e.settingsDisabled&&e.eventState===3)){
  dust.active=0;spray.active=0;
 }else{
  dust.active=1;
  if(p.rearContact){
   if(signed(p.traction)<0x3f733333){
    spray.active=1;move(spray,p.rearPoint);
    b.normal=[f(mul(floatBits(p.turnAngle)>0x80000000?1:-1,p.rearPerpendicular)),0,-p.rearAlignment];
    b.offset=rotateMcmWorldVector(resolveMcmWorldMatrix(c.bodyNode),b.normal);b.offset[1]=f(mul(p.tractionLoss,3));
    b.offset=b.offset.map((x,i)=>{const value=f(mul(mul(x,p.inverseDt),p.rearDelta)),cap=i===1?18:15;return signed(value)>=signed(cap)?cap:value;});
    spray.velocity=[...b.offset];
   }else spray.active=0;
   const intensity=mul(p.tractionLoss,20);emit(dust,p.rearPoint,intensity>1?f(intensity):1);
  }else if(p.frontContact){spray.active=+(signed(p.frontPerpendicular)>0x3e4ccccd);emit(dust,p.frontPoint,0);}
  else if(p.control1c){emit(dust,p.chassisFront,0);spray.active=0;}
  else if(p.control30){emit(dust,p.chassisRear,0);spray.active=0;}
 }
 if(b.fieldcb4){b.fieldcb4=0;dust.active=0;spray.active=0;exhaust.previousPosition=[...exhaust.position];exhaust.active=0;}
}
