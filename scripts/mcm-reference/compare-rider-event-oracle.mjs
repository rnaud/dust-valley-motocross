import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {startMcmRiderEvent} from '../../src/physics/mcm/rider-event.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-rider-event-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'rider-event-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<32000;i++) {
 const records=Array.from({length:8},(_,k)=>Array.from({length:3},(_,g)=>Array.from({length:g===0?(Math.floor(i/9)+k)%6:1+(Math.floor(i/9)+k+g)%5},(_,j)=>10000*k+100*g+j+1)));
 cases.push({kind:i%9-1,defaultKind:(i>>4)%8,records,velocity:vec(100),randomValues:Array.from({length:3},(_,j)=>i%3===0?[0,1,8192,16384,24576,32766,32767][(i+j)%7]:Math.floor(random()*32768))});
}
const input=Buffer.alloc(4+cases.length*620);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[c.kind,c.defaultKind,...c.velocity,...c.randomValues,0,0,0];
 for(const groups of c.records)for(const group of groups)values.push(group.length,...group,...Array(5-group.length).fill(0));
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*620+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*40)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const r=startMcmRiderEvent(cases[i]),expected=[r.kind,...r.selected,r.active13c,r.active16c,...r.previousVelocity.map(floatBits),r.randomCalls],actual=Array.from({length:10},(_,j)=>results.readUInt32LE(i*40+j*4));
 const key=`kind=${actual[0]},draws=${actual[9]}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<10;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original rider-controller event selection 0x40fa10..0x40fbac: default event, three table selections, flags and previous velocity. Supplied valid event records (kinds 0..7, first group 0..5 entries, other groups 1..5 entries) and CRT draws; RNG implementation and subsequent rider motion excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
