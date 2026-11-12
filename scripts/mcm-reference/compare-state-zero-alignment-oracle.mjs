import fs from 'node:fs';
import {mcmAxisAngleMatrix} from '../../src/physics/mcm/axis-angle.js';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmStateZeroAlignment} from '../../src/physics/mcm/state-zero-alignment.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-state-zero-alignment-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'state-zero-alignment-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<40000;i++) {
 cases.push({matrix:mcmAxisAngleMatrix(vec(2),f(random()*6)),pivot:vec(3),angularVelocity:vec(10),scratch540:vec(3),axis624:vec(3),local420:vec(3),mask:i%4,both:(i>>2)%2,field90:f([0,.000099,.0001,.000101,.000999,.001,.001001][Math.floor(i/5)%7]),rotation:f([0,.0001,-.0001,.01,-.01][Math.floor(i/7)%5]),angle74:f((random()-.5)*.1),normal2e8:[f(random()-.5),1,f(random()-.5)],component44:f((random()-.5)*3),field6b0:f((random()-.5)*2),field6a8:f(random()),field6ac:f(random()),field6d8:f([0,-.1,.1][Math.floor(i/11)%3]),field54:i%3?0:f(.5),field4c:f(random()*3),field83c:f([.01,.05,.2,.7][Math.floor(i/13)%4]),field4f0:f((random()-.5)*2),field4d8:f((random()-.5)*2),field840:f(.1+random()*3),field48:f(random()*100),dt:f([.001,.01,.02,.05][i%4]),contact:(i>>3)%2,normal45c:i%17?vec(2):[0,0,0],cacheValid:(i>>4)%2});
}
const input=Buffer.alloc(4+cases.length*228);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[...c.matrix,...c.pivot,...c.angularVelocity,...c.scratch540,...c.axis624,...c.local420,c.mask,c.both,c.field90,c.rotation,c.angle74,...c.normal2e8,c.component44,c.field6b0,c.field6a8,c.field6ac,c.field6d8,c.field54,c.field4c,c.field83c,c.field4f0,c.field4d8,c.field840,c.field48,c.dt,c.contact,...c.normal45c,c.cacheValid].forEach((v,j)=>input.writeFloatLE(v,4+i*228+j*4));}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*128)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const r=updateMcmStateZeroAlignment(cases[i]),expected=[...[...r.matrix,...r.angularVelocity,...r.scratch540,...r.axis624,...r.local420,r.field6b0,r.field6a8,r.field6ac].map(floatBits),r.cacheValid],actual=Array.from({length:32},(_,j)=>results.readUInt32LE(i*128+j*4));
 for(let j=0;j<32;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original alternate state-zero alignment 0x4ac1f7..0x4ac5c5: mask gates, contact-axis rotation, angular damping, target correction floor/clamp, rate limit and second pivot rotation. Root transforms, supplied axes and state; following contact/event helper and whole-bike update excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
