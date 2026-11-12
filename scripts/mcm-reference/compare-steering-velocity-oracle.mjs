import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmSteeringVelocity} from '../../src/physics/mcm/steering-velocity.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-steering-velocity-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'steering-velocity-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let outOfDomainTrigCases=0;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const unit=()=>{const v=Array.from({length:3},()=>random()-.5),n=Math.hypot(...v);return v.map(x=>f(x/n));};
for(let i=0;i<32000;i++) {
 const nominal=f(i%17===0?0:i%19===0?.005:.1+random()*150),velocity=unit().map(x=>f(x*nominal));
 const [x,y,z]=velocity,speed=f(Math.sqrt(f((z*z+x*x)+y*y))),direction=unit();
 const c={a:i%7?direction:unit(),direction,velocity,temporary:[f(random()),f(random()),f(random())],angle:i%13===0?0:f((i%2?-1:1)*(.05+random()*.9)),field5d8:f(2+random()*3),field560:speed,field564:speed,dt:f([.001,.01,.02,.05,.1][i%5]),field620:i%2};
 if(nominal===0)c.velocity=[0,0,0];
 const radius=c.angle===0?0:f((c.field5d8/Math.sin(c.angle))*((c.a[1]*direction[1]+c.a[0]*direction[0])+c.a[2]*direction[2]));
 if(radius!==0){
  const scale=((speed*speed)/-radius)*c.dt,t=c.velocity.map((v,j)=>f(v+f(direction[j]*scale))),n=f(Math.sqrt(f((t[0]*t[0]+t[1]*t[1])+t[2]*t[2])));
  if(n>=f(.01)){const ratio=((t[1]*c.velocity[1]+t[0]*c.velocity[0])+c.velocity[2]*t[2])/(speed*n);if(!(ratio>=-1&&ratio<=1)){outOfDomainTrigCases++;c.outOfDomain=true;}}
 }
 cases.push(c);
}
const input=Buffer.alloc(4+cases.length*72);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[...c.a,...c.direction,...c.velocity,...c.temporary,c.angle,c.field5d8,c.field560,c.field564,c.dt,c.field620].forEach((v,j)=>input.writeFloatLE(v,4+i*72+j*4));}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*32)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const r=updateMcmSteeringVelocity(cases[i]),expected=[...r.velocity,...r.temporary,r.radius,r.turnAngle].map(floatBits),actual=Array.from({length:8},(_,j)=>results.readUInt32LE(i*32+j*4));
 for(let j=0;j<8;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0||cases[i].outOfDomain)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),importsSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle-imports.h'))),crtInitialization:[0x4c5230,0x4c24e0],loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,outOfDomainTrigCases,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original steering velocity correction: general finite direction vectors, zero/low/positive speed, positive wheelbase/dt, and zero/nonzero angles; including inverse-cosine domain errors with KERNEL32 imports bound and original CRT heap/thread state initialized; game entry point not invoked'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
