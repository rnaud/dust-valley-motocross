import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {applyMcmPairedCollisionImpulse} from '../../src/physics/mcm/collision-pair-impulse.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-collision-pair-impulse-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'collision-pair-impulse-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>{const q=Array.from({length:4},()=>random()-.5),l=Math.hypot(...q),[x,y,z,w]=q.map(v=>v/l);return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,...vec(10),1].map(f);};
const body=()=>({transform:{local:matrix(),world:matrix(),cacheValid:random()<.5?0:1},inverseMass:f(.001+random()),contactVelocity:vec(50),lever:vec(5),inverseInertia:Array.from({length:3},()=>f(random()+.01)),angularVelocity:vec(5),velocity:vec(20)});
for(let i=0;i<40000;i++){
 const n=vec(2),length=Math.hypot(...n),a=body(),b=body();
 if(i%17===0)b.contactVelocity=[...a.contactVelocity];
 cases.push({a,b,restitution:f(random()),normal:n.map(x=>f(x/length)),impulse:f(random()*10),updateB:i%3!==0});
}
const input=Buffer.alloc(4+cases.length*416);input.writeUInt32LE(cases.length);
const encode=b=>[...b.transform.local,...b.transform.world,b.transform.cacheValid,b.inverseMass,...b.contactVelocity,...b.lever,...b.inverseInertia,...b.angularVelocity,...b.velocity];
cases.forEach((c,i)=>[...encode(c.a),...encode(c.b),c.restitution,...c.normal,c.impulse,+c.updateB].forEach((v,j)=>input.writeFloatLE(v,4+i*416+j*4)));
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*188)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++){
 const c=cases[i],r=structuredClone(c);applyMcmPairedCollisionImpulse(r);
 const expected=[...[...r.a.angularVelocity,...r.a.velocity,...r.b.angularVelocity,...r.b.velocity,r.impulse].map(floatBits),...r.a.transform.world.map(floatBits),r.a.transform.cacheValid,...r.b.transform.world.map(floatBits),r.b.transform.cacheValid],actual=Array.from({length:47},(_,j)=>results.readUInt32LE(i*188+j*4));
 const key=`updateB=${c.updateB}:cacheA=${c.a.transform.cacheValid}:cacheB=${c.b.transform.cacheValid}:impulseSign=${Math.sign(r.impulse)}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<47;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i%71===0||outcomes[key]===1)fixtures.push({input:c,outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original paired-body collision impulse 0x45b6b0 with real transform resolution and vector helpers. Cached/uncached root transforms, full 3D rotations, finite relative motion including zero, positive inverse mass/inertia, and null/non-null second velocity output. Both linear/angular velocities, impulse and both transform caches checked; whole-bike callback integration excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
