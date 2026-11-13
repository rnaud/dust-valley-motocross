import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {finishMcmSubstep} from '../../src/physics/mcm/substep-finish.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-substep-finish-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'substep-finish-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<40000;i++){
 const forward=vec(4),up=vec(4);
 if(i%5===0){const pitch=f([Math.PI/2,-Math.PI/2,Math.PI/2-.1745,-Math.PI/2+.1745][(i>>3)%4]+(random()-.5)*.00001),yaw=f((random()-.5)*Math.PI*2);forward.splice(0,3,f(Math.cos(pitch)*Math.sin(yaw)),f(Math.sin(pitch)),f(Math.cos(pitch)*Math.cos(yaw)));}
 if(i%31===0)forward.splice(0,3,0,[0,1,-1][i%3],0);
 if(i%37===0)up.splice(0,3,0,0,0);
 cases.push({forward,up,remaining:i%4,carry:[-0,0,bitsFloat(0x38d1b716),bitsFloat(0x38d1b717),bitsFloat(0x38d1b718),f(.02),f(-.02)][Math.floor(i/4)%7],dt:f(.02),inverseDt:50});
}
const input=Buffer.alloc(4+cases.length*40);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++)[...cases[i].forward,...cases[i].up,cases[i].remaining,cases[i].carry,cases[i].dt,cases[i].inverseDt].forEach((v,j)=>input.writeFloatLE(v,4+i*40+j*4));
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*64)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const c=cases[i],r=finishMcmSubstep({...c,local:[1,0,0,0,...c.up,0,...c.forward,0,0,0,0,1]}),expected=[r.remaining>>>0,...[r.carry,r.dt,r.inverseDt,...r.forward,...r.up,r.yaw,r.pitch,r.roll,r.sinRoll,r.cosRoll,r.cosPitch].map(floatBits)],actual=Array.from({length:16},(_,j)=>results.readUInt32LE(i*64+j*4));
 const key=`remaining=${r.remaining}:consumed=${r.carry!==c.carry}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<16;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i%71===0||outcomes[key]===1)fixtures.push({input:c,carryBits:floatBits(c.carry),outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Connected original 0x4ac89e..0x4ac94b remainder scheduling, local axis extraction and full 0x43f870 angle refresh. Signed carry comparison around float32 .0001, remaining counts, reciprocal timestep and all six angle terms. Collision/proxy synchronization before this range and subsequent loop/whole-bike trajectories excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
