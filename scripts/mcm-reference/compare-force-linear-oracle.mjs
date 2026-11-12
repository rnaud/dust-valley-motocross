import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmForceLinear} from '../../src/physics/mcm/force-linear-step.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-force-linear-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'force-linear-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<40000;i++) {
 cases.push({totalForce:vec(5000),inverseMass:f(.01+random()),dt:f([.001,.01,.02,.05,.1][i%5]),position:vec(1000),velocity:vec(100),frozen:i%17===0?1:0,both:i%2,contact:(i>>1)%2,
 field738:f(i%3?10:7),fieldcc:f(i%5?.1:0),fieldc8:f(i%7?.1:.25),axis584:vec(1),direction4ec:vec(1),scratch540:vec(5),field90:f(i%3?.001:.1),field44:f(i%3?.5:.9),field54:f(i%5?random()*10:0),field5dc:f(10+random()*500),field68:f((random()-.5)*2),inertiaY:f(random()),field4f0:f([0,.005,-.005,.1,-.1,.5,-.5][i%7]),field8cc:f(.01+random()),field6d8:f([0,.01,-.01,.5,-.5][i%5]),field6dc:f((random()-.5)*.1),field6e0:i%7-2});
}
const input=Buffer.alloc(4+cases.length*148);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[...c.totalForce,c.inverseMass,c.dt,...c.position,...c.velocity,c.frozen,c.both,c.contact,c.field738,c.fieldcc,c.fieldc8,...c.axis584,...c.direction4ec,...c.scratch540,c.field90,c.field44,c.field54,c.field5dc,c.field68,c.inertiaY,c.field4f0,c.field8cc,c.field6d8,c.field6dc].forEach((v,j)=>input.writeFloatLE(v,4+i*148+j*4));input.writeInt32LE(c.field6e0,4+i*148+144);}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*80)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const r=updateMcmForceLinear(cases[i]),expected=[...[...r.position,...r.velocity,r.speed,...r.acceleration,...r.deltaVelocity,...r.scratch540,r.field6d8,r.field6dc].map(floatBits),r.field6e0>>>0,floatBits(r.rotation)],actual=Array.from({length:20},(_,j)=>results.readUInt32LE(i*80+j*4));
 for(let j=0;j<20;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original 0x4aaf02..0x4ab49e: force-to-acceleration and delta velocity, steering fallback and decay state, selected rotation, velocity/speed/position integration and freeze gate. Supplied upstream forces and geometry; later rotation application and whole-bike update excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
