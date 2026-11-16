import {tickMcmScene} from '../../src/physics/mcm/scene-tick.js';
const BASE=0x21000000;
const bits=x=>new Uint32Array(Float32Array.of(x).buffer)[0];
export function buildSceneTickCases(){
 const input=Buffer.alloc(4096*64);
 const timers=[[0,0,.016],[1,59.99,.02],[2,60,0],[3,119.9,.2],[16777216,119,61],[0,-1,-.25],[7,-0,0],[123,600,.5]];
 for(let i=0;i<4096;i++){
  const [minutes,seconds,delta]=timers[i>>9];
  const w=[i&1,(i>>1)&1,(i>>2)&1,(i>>3)&1,(i>>4)&1,(i>>5)&1,bits(minutes),bits(seconds),bits(delta),(i>>6)&1,(i>>7)&1,(i>>8)&1,bits(13.25),bits(-6.75),bits(22.5),0];
  w.forEach((v,j)=>input.writeUInt32LE(v,i*64+j*4));
 }
 return input;
}
export function compareSceneTick(input,output){
 if(input.length%64||output.length!==input.length/64*280)throw Error('Invalid scene oracle sizes');
 const differences=[];let comparedWords=0,switched=0,positioned=0,rolled=0;
 for(let i=0;i<input.length/64;i++){
  const w=Array.from({length:16},(_,j)=>input.readUInt32LE(i*64+j*4));
  const bytes=Buffer.alloc(0xa000),u32=a=>a===0x4e4fb4?BASE+0x1000:bytes.readUInt32LE(a-BASE),f32=a=>bytes.readFloatLE(a-BASE),put32=(a,v)=>bytes.writeUInt32LE(v>>>0,a-BASE),putFloat=(a,v)=>bytes.writeFloatLE(v,a-BASE);
  for(const [o,v]of [[0x1010,BASE+0x2000],[0x1614,w[0]],[0x1618,BASE+0x9000],[0x1c,BASE+0x3000],[0x302c,BASE+(w[11]?0x4000:0x5000)],[0x38,w[5]?BASE+0x7000:0],[0x40,BASE+0x4000],[0x44,BASE+0x5000],[0x54,w[1]],[0x68,w[6]],[0x6c,w[7]],[0x41cc,BASE+0x6000],[0x6618,w[3]],[0x64bc,w[4]],[0x706c,BASE+0x8000],[0x801c,w[14]],[0x4144,w[12]],[0x414c,w[13]],[0x5144,bits(-17.25)],[0x514c,bits(91.5)]])put32(BASE+o,v);
  const calls=[];
  const result=tickMcmScene(BASE,input.readFloatLE(i*64+32),{u32,f32,put32,putFloat},{
   queryInput:(...args)=>{calls.push(1,...args);return w[2];},
   cameraVirtual:(...args)=>{calls.push(2,...args);switched++;},
   selectCamera:(owner,camera)=>{calls.push(3,owner,camera);put32(owner+0x2c,camera);},
   copyCamera:(...args)=>calls.push(4,...args),
   positionEnvironment:(shape,point,a,b)=>{calls.push(5,shape,...point.map(bits),a,b);positioned++;},
   children:(self,dt)=>{calls.push(6,self,bits(dt));put32(BASE+0x1614,w[9]);put32(BASE+0x9038,w[10]);},
  });
  if(u32(BASE+0x68)!==w[6])rolled++;
  const actual=Buffer.alloc(280),words=[result,u32(BASE+0x54),u32(BASE+0x68),u32(BASE+0x6c),u32(BASE+0x302c),calls.length,...calls];
  words.forEach((v,j)=>actual.writeUInt32LE(v>>>0,j*4));
  for(let o=0;o<280;o+=4){comparedWords++;const a=actual.readUInt32LE(o),e=output.readUInt32LE(i*280+o);if(a!==e)differences.push({case:i,offset:o,actual:a,expected:e});}
 }
 return {cases:input.length/64,comparedWords,switched,positioned,rolled,differences};
}
