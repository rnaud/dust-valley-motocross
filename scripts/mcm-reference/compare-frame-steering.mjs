import fs from 'node:fs';import {resolve,join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';import {evaluateFrameSteering} from './frame-steering-case.mjs';
const [exeArg,outArg,mode]=process.argv.slice(2);if(!outArg||mode&&mode!=='--replay')throw new Error('Usage: compare-frame-steering.mjs mcm.exe output-directory [--replay]');
const exe=resolve(exeArg),out=resolve(outArg),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(hash(exe)!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw new Error('Unrecognized original');
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});if(r.error||r.status)throw new Error(`${cmd}: ${r.error||r.stderr||r.status}`);};
if(mode!=='--replay'){
 fs.mkdirSync(out,{recursive:false});let seed=0x817fa304;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const cases=Array.from({length:6000},(_,i)=>{
  const pose=i%4===0?9:1,limit=i%7===0?0:random()*1.4,angle=i%9===0?0:(random()-.5)*2,previousSpeed=i%8===0?0:random()*100,divisor=i%13===0?0:random()*80+.001,steer=[-1,-.5,-0,0,.5,1][i%6];
  const iterations=[1,2,10,-3][i%4],dt=[.001,.02,.1][i%3],carry=[0,.00005,.0001,.01,-.01][i%5],delta=[0,-0,.001,.02,.1][Math.floor(i/5)%5];
  const speed=[25,25.00001,30,100,1000][Math.floor(i/25)%5],rear=[30,30.00001,40,100][Math.floor(i/125)%4],current=[.4,.40001,.5,1][Math.floor(i/500)%4],old=[0,.3,.5,1][Math.floor(i/2000)%4];
  const words=[pose,...[limit,angle,previousSpeed,divisor,steer].map(floatBits),iterations>>>0,...[dt,carry,delta,speed,rear,current,old].map(floatBits)];return words;
 });
 const encoded=Buffer.alloc(4+cases.length*56);encoded.writeUInt32LE(cases.length);cases.forEach((c,i)=>c.forEach((v,j)=>encoded.writeUInt32LE(v,4+i*56+j*4)));fs.writeFileSync(join(out,'cases.bin'),encoded);fs.writeFileSync(join(out,'cases.json'),JSON.stringify(cases));
 run('i686-w64-mingw32-gcc',['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',join(dirname(fileURLToPath(import.meta.url)),'frame-steering-oracle.c'),'-o',join(out,'oracle.exe')]);
 run('/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine',[join(out,'oracle.exe'),exe,join(out,'cases.bin'),join(out,'results.bin')],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'}});
}
const cases=JSON.parse(fs.readFileSync(join(out,'cases.json'))),native=fs.readFileSync(join(out,'results.bin'));if(native.length!==cases.length*20)throw new Error('Output size');
let mismatchCount=0;const mismatches=[],coverage={directLimit:0,reducedLimit:0,deadzone:0,nonzeroRate:0,burst:0,cappedBurst:0,zeroDelta:0,carryIncluded:0};
const fixtures=cases.map((input,i)=>{const actual=evaluateFrameSteering(input),outputBits=Array.from({length:5},(_,j)=>native.readUInt32LE(i*20+j*4));for(let j=0;j<5;j++)if(actual[j]!==outputBits[j]){mismatchCount++;if(mismatches.length<20)mismatches.push({case:i,word:j,actual:actual[j],expected:outputBits[j]});}
 coverage[input[0]===9?'directLimit':'reducedLimit']++;coverage[bitsFloat(outputBits[1])===0?'deadzone':'nonzeroRate']++;if(bitsFloat(outputBits[2])!==0)coverage.burst++;if(bitsFloat(outputBits[2])===10000)coverage.cappedBurst++;if(!(input[9]&0x7fffffff))coverage.zeroDelta++;if((input[8]|0)>0x38d1b717)coverage.carryIncluded++;
 return {input,outputBits};});
for(const [path,count] of Object.entries(coverage))if(!count)throw new Error(`Missing ${path}`);
const report={scope:'Isolated original steering and longitudinal input-rate routine 0x4a57c0..0x4a5993; initialized routine inputs, not continuous-frame evidence',cases:cases.length,coverage,mismatchCount,mismatches,architecture:process.arch,node:process.version,exeSha256:hash(exe),inputSha256:hash(join(out,'cases.bin')),outputSha256:hash(join(out,'results.bin'))};
fs.writeFileSync(join(out,`report-${process.arch}.json`),JSON.stringify(report,null,2)+'\n');if(mode!=='--replay'&&!mismatchCount)fs.writeFileSync(join(out,'fixtures.json'),JSON.stringify({source:report,fixtures}));console.log(JSON.stringify(report,null,2));if(mismatchCount)process.exitCode=1;
