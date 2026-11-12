import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {queryMcmBikeInput} from '../../src/physics/mcm/bike-input.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-bike-input-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'bike-input-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<48000;i++)cases.push({ai:i%17===0?1:0,secondaryControl:i%19===0?1:0,povPresent:(i>>1)%2,povCount:[-1,0,1,4][(i>>2)%4],povValue:[0xffffffff,0xffff,0,9000,18000,35999,0xfffffffe][Math.floor(i/7)%7],engineLevel:[-0,0,f(.01),f(-.01)][Math.floor(i/11)%4],brake:[0,-0,f(.1),f(-.1)][Math.floor(i/13)%4],action:i%12,option:(i>>4)%3,presentMask:Math.floor(random()*64),responses:Array.from({length:6},()=>[0,0,0,1,-1,2][Math.floor(random()*6)])});
const input=Buffer.alloc(4+cases.length*64);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[c.ai,c.secondaryControl,c.povPresent,c.povCount,0,c.engineLevel,c.brake,c.action,c.option,c.presentMask,...c.responses];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*64+j*4));input.writeUInt32LE(c.povValue>>>0,4+i*64+16);
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*32)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const c=cases[i],r=queryMcmBikeInput(c),expected=[r.value,r.polled.length,...r.polled.map(x=>x+1),...Array(6-r.polled.length).fill(0)],actual=Array.from({length:8},(_,j)=>results.readUInt32LE(i*32+j*4));
 const key=`result=${actual[0]},polls=${actual[1]}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<8;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%71===0||outcomes[key]===1)fixtures.push({input:cases[i],engineBits:floatBits(c.engineLevel),brakeBits:floatBits(c.brake),outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Connected original bike query 0x4a4ab0, POV lookup 0x453fe0 and input aggregator 0x454f70. AI/secondary gates, active POV suppression for actions 4/5, both inactive sentinels and signed-zero engine/brake values, device availability and short-circuit poll order. Device-level responses are supplied at 0x452670 / 0x453cd0 / 0x454760 with query arguments checked. Device mapping/state acquisition and full rider update excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
