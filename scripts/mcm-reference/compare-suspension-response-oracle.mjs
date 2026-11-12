import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmSuspensionResponse} from '../../src/physics/mcm/suspension-response.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-suspension-response-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'suspension-response-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<36000;i++) {
 cases.push({dt:f([.001,.01,.02,.05,.1][i%5]),height:i%6===0?0:f((i%2?1:-1)*(.01+random())),scale:f(.1+random()*2),limit:f(.1+random()),previousHeight:i%3?f(-.01-random()*2):f(random()),previousTravel:f(random()*2),direction:vec(2),normal:vec(2),axis:vec(2),previousDisplacement:vec(3),anyContact:i%5===0?1:0,state:i%7===0?2:0,point:vec(100),displacement:vec(3),velocity:vec(10),compression:f(random()),travel:f(random()),limited:i%2,translation:vec(3),cacheValid:i%2});
}
const input=Buffer.alloc(4+cases.length*144);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[c.dt,c.height,c.scale,c.limit,c.previousHeight,c.previousTravel,...c.direction,...c.normal,...c.axis,...c.previousDisplacement,c.anyContact,c.state,...c.point,...c.displacement,...c.velocity,c.compression,c.travel,c.limited,...c.translation,c.cacheValid].forEach((v,j)=>input.writeFloatLE(v,4+i*144+j*4));}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*92)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],coverage={active:0,skipped:0,limitedActive:0};
for(let i=0;i<cases.length;i++) {
 const r=updateMcmSuspensionResponse(cases[i]),expected=[...[...r.displacement,...r.velocity,r.compression,r.travel,...r.translation,...r.previousDisplacement,r.previousTravel].map(floatBits),r.limited,r.contactLimited,r.cacheValid,...[r.height,...r.point].map(floatBits),r.active],actual=Array.from({length:23},(_,j)=>results.readUInt32LE(i*92+j*4));
 coverage[r.active?'active':'skipped']++;if(r.active&&r.limited)coverage.limitedActive++;
 for(let j=0;j<23;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,coverage,totalDifferences,firstDifferences,scope:'Original caller block 0x4a72b5..0x4a73e2, including suspension geometry, component update, gating, height/point corrections and skipped-path history resets. Supplied contact direction/normal and scratch state; finite nondegenerate active inputs, isolated transform; upstream gates, terrain sampling and later force application excluded'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
