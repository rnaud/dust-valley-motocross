import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmStateZeroControl} from '../../src/physics/mcm/state-zero-control.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-state-zero-control-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'state-zero-control-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<40000;i++) {
 const speed=f(.1+random()*100),dot=f([.54,.55,.56,.7,.98,.985,.99][Math.floor(i/7)%7]);
 const n=i%2?vec(2):[0,0,1],length=Math.hypot(...n);for(let j=0;j<3;j++)n[j]/=length;
 const tangent=[n[2],0,-n[0]],tl=Math.hypot(...tangent);for(let j=0;j<3;j++)tangent[j]/=tl;
 const velocity=n.map(v=>f(v*speed)),forward=n.map((v,j)=>f(v*dot+tangent[j]*Math.sqrt(1-dot*dot)));
 cases.push({limitedFirst:i%19===0?1:0,limitedSecond:i%23===0?1:0,field4bc:i%11?1:0,dt:f([.001,.01,.02,.05,.1][i%5]),control:f(random()*2-1),field6f4:f(random()*2-1),field820:i%2,field730:f([.1,.49,.5,.51,.9][Math.floor(i/3)%5]),field710:(i>>2)%2,field594:f([-1,-2,-2.1,-5][Math.floor(i/5)%4]),fieldc68:i%3?0:8,field5e4:f(random()),field6fc:(i>>3)%2,engineLevel:f(random()),velocity,speed,forward,scratch540:vec(5),scratch54c:vec(5),controlVector:vec(5),angularVelocity:vec(10)});
}
const input=Buffer.alloc(4+cases.length*132);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[c.limitedFirst,c.limitedSecond,c.field4bc,c.dt,c.control,c.field6f4,c.field820,c.field730,c.field710,c.field594,c.fieldc68,c.field5e4,c.field6fc,c.engineLevel,...c.velocity,c.speed,...c.forward,...c.scratch540,...c.scratch54c,...c.controlVector,...c.angularVelocity].forEach((v,j)=>input.writeFloatLE(v,4+i*132+j*4));}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*64)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const r=updateMcmStateZeroControl(cases[i]),expected=[...r.controlVector,...r.scratch540,...r.scratch54c,...r.velocity,r.speed,...r.angularVelocity].map(floatBits),actual=Array.from({length:16},(_,j)=>results.readUInt32LE(i*64+j*4));
 for(let j=0;j<16;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original state-zero control block 0x4abb30..0x4abef9, including limited/activation gates, control-vector construction, brake/throttle modifiers, direction-based velocity deflection and angular damping. Positive speed, supplied forward axis; later orientation/timer branches and full bike update excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
