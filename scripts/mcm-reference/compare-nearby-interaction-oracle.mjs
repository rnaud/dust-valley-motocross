import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {nextMcmBike,evaluateMcmNearbyInteraction} from '../../src/physics/mcm/nearby-bike.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-nearby-interaction-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'nearby-interaction-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<32000;i++){
 const playerCount=i%5,otherCount=Math.floor(i/5)%6;
 const bikes=Array.from({length:8},(_,k)=>({position:Array.from({length:3},()=>f((random()-.5)*[1,100,1e10][i%3])),disabled:random()<.25?1:0}));
 // Repeated positions exercise ties, including selection after a rounded best.
 if(i%3===0)bikes[2].position=[...bikes[1].position];
 const ids=()=>Array.from({length:7},()=>random()<.1?-1:Math.floor(random()*8));
 cases.push({disabled:i%13===0?1:0,playerCount,otherCount,othersPresent:i%7!==0,cursor:Math.floor(random()*(playerCount+otherCount+1)),bikes,players:ids(),others:ids(),heading:f((random()-.5)*Math.PI*8),previousAngle:f((random()-.5)*10)});
}
// Directed float32 neighbors around the gate and each wrap boundary.
for(const center of [.698,-.698,Math.PI,-Math.PI,2*Math.PI,-2*Math.PI]){
 const bits=floatBits(f(center));
 for(let delta=-4;delta<=4;delta++)for(const x of [0,1,-1]){
  const bikes=Array.from({length:8},()=>({position:[0,0,0],disabled:0}));bikes[1].position=[x,0,1];
  cases.push({disabled:0,playerCount:1,otherCount:1,othersPresent:true,cursor:0,bikes,players:[0,-1,-1,-1,-1,-1,-1],others:[1,-1,-1,-1,-1,-1,-1],heading:bitsFloat((bits+delta)>>>0),previousAngle:7});
 }
}
const input=Buffer.alloc(4+cases.length*212);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[c.disabled,c.playerCount,c.otherCount,+c.othersPresent,c.cursor,...c.bikes.flatMap(b=>[...b.position,b.disabled]),...c.players,...c.others,c.heading,c.previousAngle];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*212+j*4));
}
export function expected(c){
 const world={...c,player:c.bikes[0],players:c.players.map(i=>c.bikes[i]??null),others:c.othersPresent?c.others.map(i=>c.bikes[i]??null):null};
 const r=nextMcmBike(world,c.cursor),interaction=evaluateMcmNearbyInteraction(world,c.bikes[0],c.heading,c.previousAngle);
 return [c.bikes.indexOf(r.bike)+1,r.cursor,c.bikes.indexOf(interaction.bike)+1,floatBits(interaction.angle),+interaction.accepted];
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*20)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const c=cases[i],want=expected(c),actual=Array.from({length:5},(_,j)=>results.readUInt32LE(i*20+j*4));
 const key=`selected=${actual[2]},accepted=${actual[4]}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<5;j++)if(actual[j]!==want[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:want[j],input:c});}
 if(i>=32000||i%71===0||outcomes[key]===1)fixtures.push({input:c,outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Connected original 0x459e90 iterator and 0x4a16d0..0x4a1847 selection, atan2 angle, single wrap and acceptance gate. The accepted path is marked and exits before orientation, state changes or animation. Finite float32 positions and headings; no full rider-update claim.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
