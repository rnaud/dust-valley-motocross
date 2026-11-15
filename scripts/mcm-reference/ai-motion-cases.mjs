import {advanceMcmAiMotion} from '../../src/physics/mcm/ai-motion.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
export function motionWords(w){
 const sibling={cacheValid:w[53]},child={cacheValid:w[52],nextSibling:sibling},root={local:Array.from(w.slice(19,35),float),world:Array.from(w.slice(35,51),float),cacheValid:w[51],firstChild:child};
 const r=advanceMcmAiMotion({airborne:!!w[0],speed:float(w[1]),turnScale:float(w[2]),difference:float(w[3]),dt:float(w[4]),pitchAngle:float(w[5]),throttle:float(w[6]),oldSpeed:float(w[7]),heading:float(w[8]),velocity:Array.from(w.slice(9,12),float),forward:Array.from(w.slice(12,15),float),up:Array.from(w.slice(15,18),float),fieldb6c:w[18]},root);
 return [...r.velocity.map(bits),...Array.from(r.forward,bits),...Array.from(r.up,bits),bits(r.speed),bits(r.oldSpeed),bits(r.difference),bits(r.heading),r.fieldb6c,...root.local.map(bits),...root.world.map(bits),root.cacheValid,child.cacheValid,sibling.cacheValid];
}
export function generateAiMotionCases(){
const count=4096,input=Buffer.alloc(count*216),expected=Buffer.alloc(count*196);let seed=0x4703c2;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};for(let c=0;c<count;c++){const w=new Uint32Array(54);w[0]=c%3===0?1:0;w[1]=bits((random()%20000-1000)/100);w[2]=bits((random()%10000-1000)/1000);w[3]=bits((random()%60000-30000)/10000);w[4]=bits([0,.02,.001,.5][c%4]);w[5]=bits((random()%30000-10000)/10000);w[6]=c%2?bits(1):0;w[7]=bits(random()%10000/100);w[8]=bits(random()%60000/10000);for(let i=9;i<18;i++)w[i]=bits((random()%20000-10000)/(i<12?100:10000));w[18]=random();for(let i=19;i<51;i++)w[i]=bits((random()%20000-10000)/1000);w[51]=random()%2;w[52]=random()%2;w[53]=random()%2;w.forEach((v,i)=>input.writeUInt32LE(v,c*216+i*4));motionWords(w).forEach((v,i)=>expected.writeUInt32LE(v,c*196+i*4));}return {input,expected};
}
