import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmPostEventState} from '../../src/physics/mcm/post-event-state.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-post-event-state-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'post-event-state-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>[...vec(3),0,...vec(3),0,...vec(3),0,...vec(100),1];
for(let i=0;i<40000;i++)cases.push({local:matrix(),world:matrix(),parentLocal:matrix(),parentWorld:matrix(),angularVelocity:vec(10),speed:f([0,.99999,1,1.00001,-1][i%5]),both:(i>>1)%2,cache:(i>>2)%2,parented:(i>>3)%2,parentCache:(i>>4)%2,field714:(i>>5)%2,fieldbfc:i%7===0?1:0,field870:(i>>6)%2,timer:f([-.02,-.0001,-0,0,.0001,.02][Math.floor(i/7)%6]),awardBase:f((random()-.25)*20),score:f(random()*10000),dt:f([.001,.02,.04][i%3]),frontHeight:f(random()*10),rearHeight:f(random()*10),suppressAward:(i>>7)%2});
const input=Buffer.alloc(4+cases.length*340);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[...c.local,...c.world,...c.parentLocal,...c.parentWorld,...c.angularVelocity,c.speed,c.both,c.cache,c.parented,c.parentCache,c.field714,c.fieldbfc,c.field870,c.timer,c.awardBase,c.score,c.dt,c.frontHeight,c.rearHeight,c.suppressAward,123,456,789];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*340+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*200)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const c=cases[i],parent={local:[...c.parentLocal],world:[...c.parentWorld],cacheValid:c.parentCache},node={local:[...c.local],world:[...c.world],cacheValid:c.cache,parent:c.parented?parent:null};
 const r=updateMcmPostEventState({...c,node}),expected=[...[...r.position,...r.angularVelocity,...r.worldAngularVelocity].map(floatBits),r.field714,r.field870,...[r.timer,r.score,r.frontHeight,r.rearHeight,r.lastDt,...node.world,...parent.world].map(floatBits),node.cacheValid,parent.cacheValid],actual=Array.from({length:50},(_,j)=>results.readUInt32LE(i*200+j*4));
 for(let j=0;j<50;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%71===0)fixtures.push({input:cases[i],timerBits:floatBits(c.timer),outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original common post-event section 0x4ac6cd..0x4ac7c4, including world angular velocity, delayed-award helper 0x4b1a40, suspension output and dt. Real scoring arithmetic with optional UI observers absent; finite supplied state, root/parented transforms and cache combinations. Later object/collision callbacks, no-event rider update and full-step sequencing excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
