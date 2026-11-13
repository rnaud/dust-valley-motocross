import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateResetPose} from './reset-pose-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-reset-pose-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'reset-pose-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const f=Math.fround,vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>{const q=Array.from({length:4},()=>random()-.5),l=Math.hypot(...q),[x,y,z,w]=q.map(v=>v/l);return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,...vec(30),1].map(f);};
const cases=[];
for(let i=0;i<8192;i++){
 const words=Array.from({length:1042},()=>floatBits((random()-.5)*10000));
 words[0x68c/4]=floatBits(.01+random()*500);words[0x8cc/4]=floatBits(random()*20);
 words[0x814/4]=Math.floor(random()*4294967296)>>>0;
 words[914+0x20/4]=floatBits(random()*12000);words[914+0x50/4]=floatBits((random()-.5)*4000);
 const c={mask:i%64,randomValue:[0,32767,Math.floor(random()*32768)][Math.floor(i/64)%3],words,nodes:Array.from({length:4},()=>({local:matrix(),world:matrix(),cacheValid:random()<.5?0:1})),parents:[-1,...[1,2,3].map(j=>Math.floor(random()*(j+1))-1)],bodyIndex:Math.floor(i/64)%4,componentIndex:Math.floor(i/256)%4,pose:{position:vec(20),forward:vec(2),up:vec(2)},componentAxis:vec(2),componentAngle:f(random()*2)};
 if(i%5===0)c.pose.forward=[0,f(i%2?1:-1),0];if(i%11===0)c.pose.forward=[0,0,0];
 cases.push(c);
}
const input=Buffer.alloc(4+cases.length*4780);input.writeUInt32LE(cases.length);cases.forEach((c,i)=>[c.mask,c.randomValue,...c.words,...[...c.nodes.flatMap(n=>[...n.local,...n.world,n.cacheValid]),...c.parents,c.bodyIndex,c.componentIndex,...c.pose.position,...c.pose.forward,...c.pose.up,...c.componentAxis,c.componentAngle].map(floatBits)].forEach((v,j)=>input.writeUInt32LE(v,4+i*4780+j*4)));fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));
if(results.length!==cases.length*4704)throw new Error('Incomplete oracle results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={},fixtureKeys=new Set();
for(let i=0;i<cases.length;i++){
 const expected=evaluateResetPose(cases[i]),actual=Array.from({length:1176},(_,j)=>results.readUInt32LE(i*4704+j*4));
 const key=`mask=${cases[i].mask}:body=${cases[i].bodyIndex}:component=${cases[i].componentIndex}:vertical=${cases[i].pose.forward[0]===0&&cases[i].pose.forward[2]===0}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<1176;j++)if(expected[j]!==actual[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j]});}
 const keys=[`mask=${cases[i].mask}`,`body=${cases[i].bodyIndex}:component=${cases[i].componentIndex}:vertical=${cases[i].pose.forward[0]===0&&cases[i].pose.forward[2]===0}`];
 if(keys.some(k=>!fixtureKeys.has(k))||i%131===0)fixtures.push({input:cases[i],outputBits:actual});keys.forEach(k=>fixtureKeys.add(k));
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original continuous 0x49f8f0..0x49fa3c: complete bike reset, vertical-forward fallback, body/component local orientation and zero-angle component handoff. Four-node transform graphs, all optional reset components, finite nonzero component axes; only CRT rand supplied. Later terrain alignment and whole-bike trajectories excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
