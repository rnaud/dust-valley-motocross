import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateWheelContactFrame} from './wheel-contact-frame-case.mjs';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-wheel-contact-frame-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'wheel-contact-frame-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>{const q=Array.from({length:4},()=>random()-.5),l=Math.hypot(...q),[x,y,z,w]=q.map(v=>v/l);return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,...vec(30),1].map(f);};
for(let i=0;i<40000;i++){
 const c={terrain:{mode:i%6,base:Math.floor(random()*65536),bias:f(random()*20),scale:f(.01+random()*2),worldToGrid:f(.1+random()),heightScale:f(.001+random()*.01),normals:Array.from({length:4},()=>[f(random()*2-1),f(.1+random()),f(random()*2-1)])},node:{local:matrix(),world:matrix(),cacheValid:Math.floor(i/6)%2},radius:f(.1+random()*3),points:Array.from({length:10},()=>vec(20)),heights:vec(10).slice(0,2),resampleNormal:[f(random()),f(random()),3]};
 if(i%19===0)c.points[4]=[0,0,0];
 cases.push(c);
}
const input=Buffer.alloc(4+cases.length*344);input.writeUInt32LE(cases.length);
cases.forEach((c,i)=>{const t=c.terrain;const values=[t.mode,t.base,t.bias,t.scale,t.worldToGrid,t.heightScale,...t.normals.flat(),...c.node.local,...c.node.world,c.node.cacheValid,c.radius,...c.points.flat(),...c.heights,...c.resampleNormal.slice(0,2)];if(values.length!==86)throw new Error('Input layout');values.forEach((v,j)=>input.writeFloatLE(v,4+i*344+j*4));});
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*320)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++){
 const c=cases[i],expected=evaluateWheelContactFrame(c),actual=Array.from({length:80},(_,j)=>results.readUInt32LE(i*320+j*4));
 const key=`terrain=${c.terrain.mode}:cached=${c.node.cacheValid}:zeroNormal=${c.points[4].every(x=>x===0)}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<80;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i%113===0||outcomes[key]===1)fixtures.push({input:c,outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original 0x4a0130..0x4a0442 with real terrain height/normal queries, transforms, contact-axis helper, cross/normalization and front-radius offset/resample. Supplied synthetic terrain hierarchy, full 3D root transforms and scratch-normal seed. Later rear/contact-depth processing and whole-bike trajectories excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
