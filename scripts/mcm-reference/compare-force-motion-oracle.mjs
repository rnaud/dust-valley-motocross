import fs from 'node:fs';
import {mcmAxisAngleMatrix} from '../../src/physics/mcm/axis-angle.js';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmForceMotion} from '../../src/physics/mcm/force-motion-step.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-force-motion-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'force-motion-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<36000;i++) {
 const matrix=i%3?mcmAxisAngleMatrix(vec(2),f((random()-.5)*6)):[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 cases.push({totalForce:vec(1000),force2ac:i%11?vec(1000):[0,0,0],force2b8:i%13?vec(1000):[0,0,0],arm3c0:vec(4),arm3fc:vec(4),matrix,control:[f(.9),f(-.9),1,-1,0,f((random()-.5)*4)][i%6],counter:i%7?i:0xffffffff,force354:vec(2000),field4dc:f((random()-.5)*2.5),velocity:vec(5),ai:(i>>1)%2,component44:f((random()-.5)*2),inertia:vec(.1).map(Math.abs),inertiaAlternate:vec(.2).map(Math.abs),dt:f([.001,.01,.02,.05,.1][i%5]),state844:i%2,opposingWorld:vec(3000),pivot:vec(5),contact:(i>>1)%2,both:(i>>2)%2,rear:(i>>3)%2,front:(i>>4)%2,mask:3,
 field4d8:f([0,.035,.036,-.035][(i>>5)%4]),field560:f([0,1.99,2,10][(i>>7)%4]),controller170:i%3,controller140:Math.floor(i/3)%2,field894:f(i%5?.97:.99),field6ac:f((random()-.5)*.1),field590:f([-.0001,-.1,-.5999,-.6,-5.3][i%5]),field594:f([-.0001,-.1,-.5999,-.6,-5.3][Math.floor(i/5)%5]),field6a4:f(i%7?10:21),field5d8:2,field4f4:3.5,inverseMass:f(.01+random()),position:vec(1000),linearVelocity:vec(100),frozen:i%17===0?1:0,
 field738:f(i%3?10:7),fieldcc:f(i%5?.1:0),fieldc8:f(i%7?.1:.25),axis584:vec(1),direction4ec:vec(1),field90:f(i%3?.001:.1),field44:f(i%3?.5:.9),field54:f(i%5?random()*10:0),field5dc:f(10+random()*500),field68:f((random()-.5)*2),field4f0:f([0,.005,-.005,.1,-.1,.5,-.5][i%7]),field8cc:f(.01+random()),field6d8:f([0,.01,-.01,.5,-.5][i%5]),field6dc:f((random()-.5)*.1),field6e0:i%7-2});
}
const input=Buffer.alloc(4+cases.length*400);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[...c.totalForce,...c.force2ac,...c.force2b8,...c.arm3c0,...c.arm3fc,...c.matrix,c.control].forEach((v,j)=>input.writeFloatLE(v,4+i*400+j*4));[...c.force354,c.field4dc,...c.velocity,c.ai,0,c.component44,...c.inertia,...c.inertiaAlternate,c.dt,c.state844,...c.opposingWorld,...c.pivot,c.contact,c.both,c.rear,c.front,c.mask,c.field4d8,c.field560,c.controller170,c.controller140,c.field894,c.field6ac,c.field590,c.field594,c.field6a4,c.field5d8,c.field4f4].forEach((v,j)=>input.writeFloatLE(v,4+i*400+132+j*4));input.writeUInt32LE(c.counter,4+i*400+128);
 [c.inverseMass,...c.position,...c.linearVelocity,c.frozen,c.field738,c.fieldcc,c.fieldc8,...c.axis584,...c.direction4ec,c.field90,c.field44,c.field54,c.field5dc,c.field68,c.field4f0,c.field8cc,c.field6d8,c.field6dc].forEach((v,j)=>input.writeFloatLE(v,4+i*400+292+j*4));input.writeInt32LE(c.field6e0,4+i*400+396);}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*240)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const {angular:r,linear:l}=updateMcmForceMotion(cases[i]),expected=[...[...r.totalForce,...r.totalTorque,...r.velocity,...r.acceleration,...r.opposing,...r.opposingLocal].map(floatBits),r.counter,...r.previousPivot.map(floatBits),...r.matrix.map(floatBits),floatBits(r.field6ac),r.mask,...[...l.position,...l.velocity,l.speed,...l.acceleration,...l.deltaVelocity,...l.scratch540,l.field6d8,l.field6dc].map(floatBits),l.field6e0>>>0,floatBits(l.rotation)],actual=Array.from({length:60},(_,j)=>results.readUInt32LE(i*240+j*4));
 for(let j=0;j<60;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Connected original 0x4aa77d..0x4ab49e: force and torque assembly through angular/contact correction and linear integration, including shared scratch, inertia, flags and steering decay state. Root transform, supplied assembled forces and geometry; upstream force construction and downstream rotation application excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
