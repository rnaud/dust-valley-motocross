import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateTrickFrameRider} from './trick-frame-rider-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-trick-frame-rider-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'trick-frame-rider-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>[...vec(3),0,...vec(3),0,...vec(3),0,...vec(100),1];
const holds=[24,15,17,10,25,15,22,10,15,10,11,13,20,22,24,14];
for(let i=0;i<20000;i++){
 const animation=i%16;
 cases.push({nodes:Array.from({length:3},(_,k)=>({local:matrix(),world:matrix(),cacheValid:(i>>(k+2))%2})),position:vec(100),targetParent:1+i%2,bodyParent:(i>>1)%2,forward:vec(5),up:vec(5),componentIndex:(i>>5)%8,local:(i>>8)%2,positionEnabled:(i>>9)%2,frameCount:32,delta:f([0,.001,.02,.1,.5][Math.floor(i/3)%5]),elapsed:f(.7),animation,initialFrame:[0,holds[animation],holds[animation]+1,holds[animation]+2,holds[animation]+3,31][Math.floor(i/16)%6],ai:Math.floor(i/7)%2,secondaryControl:Math.floor(i/11)%2,holdTime:f([0,-0,.001,.02,.3,-.1][Math.floor(i/13)%6]),riderParent:Math.floor(i/17)%2,childMask:Math.floor(i/19)%4,fps:[1,10,30,60][Math.floor(i/23)%4],loop:Math.floor(i/29)%2,stoppedMask:Math.floor(i/31)%4,blendingMask:Math.floor(i/37)%4,buttons:Math.floor(i/41)%256,remainder:f([0,.01,.03][Math.floor(i/43)%3]),blendTime:f([0,.05,.2][Math.floor(i/47)%3]),blendDuration:f(.1)});
}
cases.forEach(c=>c.holdTimeBits=floatBits(c.holdTime));
const input=Buffer.alloc(4+cases.length*532);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[...c.nodes.flatMap(n=>[...n.local,...n.world]),...c.nodes.map(n=>n.cacheValid),0,0,...c.position,c.targetParent,c.bodyParent,...c.forward,...c.up,c.componentIndex,c.local,c.positionEnabled,c.frameCount,c.delta,c.elapsed,c.animation,c.initialFrame,c.ai,c.secondaryControl,c.holdTime,c.riderParent,c.childMask,c.fps,c.loop,c.stoppedMask,c.blendingMask,c.buttons,c.remainder,c.blendTime,c.blendDuration];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*532+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
fs.writeFileSync(join(output,'case-inputs.json'),JSON.stringify(cases));
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*4304)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const expected=evaluateTrickFrameRider(cases[i]),actual=Array.from({length:1076},(_,j)=>results.readUInt32LE(i*4304+j*4));
 for(let j=0;j<1076;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 const c=cases[i],key=`animation=${c.animation}:ai=${c.ai}:secondary=${c.secondaryControl}:loop=${c.loop}:queries=${actual[266]}:frameUnchanged=${actual[201]===c.initialFrame}:stopped=${actual[198]}`;outcomes[key]=(outcomes[key]||0)+1;
 if(i%71===0||i<320)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original 0x4af710 nonnegative trick branch through return, four retained calls per case. Original bike input gate and aggregator execute with supplied device responses. Includes per-trick hold windows, AI hold countdown, rider-before-bike animation advancement, stop/loop behavior, transition blending, source-record mutations and six transform nodes. Finite synthetic records for tricks 0..15; nearby and recovery branches, continuous physics-frame integration and whole-bike trajectories remain excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
