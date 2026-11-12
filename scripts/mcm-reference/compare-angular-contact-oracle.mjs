import fs from 'node:fs';
import {mcmAxisAngleMatrix} from '../../src/physics/mcm/axis-angle.js';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmAngularWithContact} from '../../src/physics/mcm/angular-step.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-angular-contact-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'angular-contact-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=scale=>Array.from({length:3},()=>f((random()-.5)*scale));
for(let i=0;i<32000;i++) {
 const matrix=i%3?mcmAxisAngleMatrix(vec(2),f((random()-.5)*6)):Array.from({length:16},(_,j)=>j%5===0?1:0);
 for(const j of [12,13,14])matrix[j]=f((random()-.5)*1000);
 cases.push({matrix,velocity:i%7?vec(10):[0,0,0],opposingWorld:vec(3000),pivot:vec(4),torque:vec(1000),inertia:[...vec(.1),...vec(.2)].map(Math.abs),state:i%2,contact:Math.floor(i/2)%2,both:Math.floor(i/4)%2,rear:Math.floor(i/8)%2,front:Math.floor(i/16)%2,mask:3,
 field4d8:f([0,.035,.036,-.035][Math.floor(i/32)%4]),field560:f([0,1.99,2,10][Math.floor(i/128)%4]),controller170:i%3,controller140:Math.floor(i/3)%2,component44:f(random()-.5),field894:f(i%5?.97:.99),field6ac:f((random()-.5)*.1),
 field590:f([-.0001,-.1,-.5999,-.6,-5.3][i%5]),field594:f([-.0001,-.1,-.5999,-.6,-5.3][Math.floor(i/5)%5]),field6a4:f(i%7?10:21),field5d8:f(2),field4f4:f(3.5),dt:f([.01,.02,.05][i%3])});
}
const input=Buffer.alloc(4+cases.length*212);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[...c.matrix,...c.pivot,...c.torque,...c.inertia,c.state,c.contact,c.both,c.rear,c.front,c.mask,c.field4d8,c.field560,c.controller170,c.controller140,c.component44,c.field894,c.field6ac,c.field590,c.field594,c.field6a4,c.field5d8,c.field4f4,c.dt,...c.velocity,...c.opposingWorld].forEach((v,j)=>input.writeFloatLE(v,4+i*212+j*4));}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*120)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const r=updateMcmAngularWithContact(cases[i]),expected=[...[...r.matrix,...r.velocity,...r.acceleration,...r.opposing,...r.opposingLocal,r.field6ac].map(floatBits),r.mask],actual=Array.from({length:30},(_,j)=>results.readUInt32LE(i*120+j*4));
 for(let j=0;j<30;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Connected original contact correction, inertia, damping and angular integration; supplied torque, flags and geometric scalars, root transform; contact detection excluded'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
