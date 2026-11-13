import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateResetContactFinish} from './reset-contact-finish-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-reset-contact-finish-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const dllPath=process.env.MCM_D3DRM || '/Applications/Wine Stable.app/Contents/Resources/wine/lib/wine/i386-windows/d3drm.dll';
const d3drmSha256=hash(fs.readFileSync(dllPath));if(d3drmSha256!=='7edb1ed218aececbb44f4d92d5b0880f0ff1777dc525e555140f987015d8be1a')throw new Error('Unrecognized D3DRM reference');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'reset-contact-finish-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const f=Math.fround,vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>{const q=Array.from({length:4},()=>random()-.5),l=Math.hypot(...q),[x,y,z,w]=q.map(v=>v/l);return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,...vec(30),1].map(f);};
const cases=[];
for(let i=0;i<16384;i++){
 const words=Array.from({length:1042},()=>floatBits((random()-.5)*10000));
 words[0x68c/4]=floatBits(.01+random()*500);words[0x8cc/4]=floatBits(random()*20);
 words[0x814/4]=Math.floor(random()*4294967296)>>>0;
 words[914+0x20/4]=floatBits(random()*12000);words[914+0x50/4]=floatBits((random()-.5)*4000);
 const c={mask:15|((i%4)<<4),randomValue:[0,32767,Math.floor(random()*32768)][Math.floor(i/64)%3],words,nodes:Array.from({length:4},()=>({local:matrix(),world:matrix(),cacheValid:random()<.5?0:1})),parents:[-1,...[1,2,3].map(j=>Math.floor(random()*(j+1))-1)],bodyIndex:Math.floor(i/64)%4,componentIndex:Math.floor(i/256)%4,pose:{position:vec(20),forward:vec(2),up:vec(2)},componentAxis:vec(2),componentAngle:f(random()*2)};
 if(i%5===0)c.pose.forward=[0,f(i%2?1:-1),0];if(i%11===0)c.pose.forward=[0,0,0];
 words[0x5d8/4]=floatBits(.1+random()*6);words[0x5dc/4]=floatBits(.1+random()*3);
 c.frontIndex=Math.floor(i/4)%4;c.rearIndex=Math.floor(i/16)%4;c.terrain={mode:Math.floor(i/1024)%6,base:Math.floor(random()*65536),bias:f(random()*20),scale:f(.01+random()*2),worldToGrid:f(.05),heightScale:f(.001+random()*.01),normals:Array.from({length:4},()=>[0,1,0])};c.points=Array.from({length:10},()=>vec(10));c.heights=vec(5).slice(0,2);c.contactScratch={resampleNormal:vec(3),rearResampleNormal:vec(3),probeNormals:[vec(3),vec(3)],refinedNormals:[vec(3),vec(3)]};words[818+0x44/4]=floatBits(.1+random()*3);words[842+0x44/4]=floatBits(.1+random()*3);c.referenceIndex=Math.floor(i/7)%4;cases.push(c);
}
const input=Buffer.alloc(4+cases.length*5064);input.writeUInt32LE(cases.length);cases.forEach((c,i)=>[c.mask,c.randomValue,...c.words,...[...c.nodes.flatMap(n=>[...n.local,...n.world,n.cacheValid]),...c.parents,c.bodyIndex,c.componentIndex,...c.pose.position,...c.pose.forward,...c.pose.up,...c.componentAxis,c.componentAngle,c.terrain.mode,c.terrain.base,c.terrain.bias,c.terrain.scale,c.terrain.worldToGrid,c.terrain.heightScale,...c.terrain.normals.flat(),c.frontIndex,c.rearIndex,...c.points.flat(),...c.heights,...c.contactScratch.resampleNormal,...c.contactScratch.rearResampleNormal,...c.contactScratch.probeNormals.flat(),...c.contactScratch.refinedNormals.flat(),c.referenceIndex].map(floatBits)].forEach((v,j)=>input.writeUInt32LE(v,4+i*5064+j*4)));fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDLLOVERRIDES:'d3drm=b',WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
if(hash(fs.readFileSync(join(output,'results.bin.d3drm.dll')))!==d3drmSha256)throw new Error('Loaded D3DRM hash mismatch');
const results=fs.readFileSync(join(output,'results.bin'));
if(results.length!==cases.length*4832)throw new Error('Incomplete oracle results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={},fixtureKeys=new Set();
for(let i=0;i<cases.length;i++){
 const expected=evaluateResetContactFinish(cases[i]),actual=Array.from({length:1208},(_,j)=>results.readUInt32LE(i*4832+j*4));
 const rearHigher=actual[1206]===floatBits(Math.fround(-.01));
 const key=`rearHigher=${rearHigher}:terrain=${cases[i].terrain.mode}:mask=${cases[i].mask}:body=${cases[i].bodyIndex}:component=${cases[i].componentIndex}:vertical=${cases[i].pose.forward[0]===0&&cases[i].pose.forward[2]===0}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<1208;j++)if(expected[j]!==actual[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j]});}
 const keys=[`reference=${cases[i].referenceIndex}`,`support=${rearHigher}:terrain=${cases[i].terrain.mode}`,`wheels=${cases[i].frontIndex},${cases[i].rearIndex}`,`mask=${cases[i].mask}`,`body=${cases[i].bodyIndex}:component=${cases[i].componentIndex}:vertical=${cases[i].pose.forward[0]===0&&cases[i].pose.forward[2]===0}`];
 if(keys.some(k=>!fixtureKeys.has(k))||i%131===0)fixtures.push({input:cases[i],outputBits:actual});keys.forEach(k=>fixtureKeys.add(k));
}
const report={schemaVersion:1,d3drmSha256,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original continuous 0x49f8f0..0x49fe3a: full reset/pose/terrain alignment, real orientation extraction, complete wheel-contact query, second support correction and final wheel/reference-position reads with pinned Wine 11 D3DRM. Finite synthetic state/terrain and four-node graphs; only CRT rand and initial uninitialized normal scratch supplied. Later collision-proxy/game-object synchronization and whole-bike trajectories excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
