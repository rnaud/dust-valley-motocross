// Deterministic wrapper inputs: one recorded live query, plane cases and seeded finite segments.
import fs from 'node:fs';
const [reportPath,outputPrefix]=process.argv.slice(2);
if(!reportPath||!outputPrefix)throw new Error('Usage: node generate-terrain-segments.mjs capture-report.json output-prefix');
const cases=[];
function put(name,scale,min,max,shift,a,b,result=1,option=0){
 const bytes=Buffer.alloc(72);bytes.writeFloatLE(scale);bytes.writeInt32LE(min,4);bytes.writeInt32LE(max,8);bytes.writeUInt32LE(shift,12);
 [...a,...b,71,-83,97,3.125,-4.75,6.5].forEach((v,i)=>bytes.writeFloatLE(v,16+i*4));bytes.writeUInt32LE(result,64);bytes.writeUInt32LE(option,68);
 cases.push({name,hex:bytes.toString('hex')});
}
const r=JSON.parse(fs.readFileSync(reportPath));
const vector=h=>Array.from({length:3},(_,i)=>Buffer.from(h,'hex').readFloatLE(i*4));
const root=Buffer.from(r.terrain.rootHex,'hex');
put('captured-query',Buffer.from(r.terrain.scaleHex,'hex').readFloatLE(),root.readInt32LE(0x14),root.readInt32LE(0x18),root.readUInt32LE(0x24),vector(r.terrain.startHex),vector(r.environment.targetHex),0);
for(let axis=0;axis<3;axis++)for(const reverse of [false,true])for(const side of [-100,0,1,24,48,49,100]){
 const a=[12,12,12],b=[36,36,36];a[axis]=side;b[axis]=48-side;
 put('plane-'+[axis,reverse,side].join('-'),.01171875,0,4096,8,...(reverse?[b,a]:[a,b]));
}
for(const z of [0,-0])put('zero-'+Object.is(z,-0),1/256,0,4096,8,[z,z,z],[z,z,z]);
let seed=78423;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<2000;i++){
 const scale=[.01171875,.007,1/256,.01][i%4],shift=[8,12,16][i%3],extent=(16<<(shift-8))*scale*256;
 const p=()=>[(rand()*2-.5)*extent,(rand()*2-.5)*256*scale,(rand()*2-.5)*extent];
 put('random-'+i,scale,-200,65516,shift,p(),p(),i%2,i);
}
fs.writeFileSync(outputPrefix+'-input.bin',Buffer.concat(cases.map(c=>Buffer.from(c.hex,'hex'))));
fs.writeFileSync(outputPrefix+'-cases.json',JSON.stringify(cases));
