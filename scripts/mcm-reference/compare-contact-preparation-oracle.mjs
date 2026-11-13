import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateContactPreparation,encodeContactPreparation} from './contact-preparation-case.mjs';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-contact-preparation-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'contact-preparation-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const table=JSON.parse(fs.readFileSync(new URL('../../src/physics/mcm/preview-engine.json',import.meta.url)));
for(let i=0;i<40000;i++){
 const dt=f(.001+random()*.04);
 cases.push({dt,inverseDt:f(1/dt),analog:i%3===0?-1:f([0,.05,.19,.2,.5,1,1.2][Math.floor(i/3)%7]),state844:Math.floor(i/7)%3,brake:f([0,.1,.5,.9,1][i%5]),aiThrottle:Math.floor(i/5)%3-1,aiBrake:Math.floor(i/11)%3-1,mass:f(100+random()*100),inverseMass:f(.01+random()*.01),alternateMass:f(50+random()*50),alternateInverseMass:f(.02+random()*.01),field684:f(random()*10),field694:f(random()*10),rider13c:Math.floor(i/2)%2,rider140:Math.floor(i/4)%2,speed:f([0,.0009999,.001,.0010001,random()*100][i%5]),previousSpeed:f(random()*100),velocity:Array.from({length:3},()=>f((random()-.5)*50)),previousY:f((random()-.5)*50),accelerationFilter:{value:f((random()-.5)*10),duration:f(.001+random()*.2)},filteredAcceleration:f(random()*10),engine:{...table,shiftTimer:i%4===0?0:f([dt*.5,dt,dt*2][i%3]),released:i%2,state:f(random()),rpmDemand:f(random()*10000),previousRpmDemand:f(random()*10000),shiftThreshold:f(6900+random()*200),gear:i%5,analogFilter:{value:f(random()),duration:f(.001+random()*.2)},topGearLimitDisabled:Math.floor(i/8)%2,randomValue:Math.floor(random()*32768)},input:{ai:i%13===0,secondaryControl:i%17===0,povPresent:false,povCount:0,povValue:0xffffffff,presentMask:1,brakeResponses:[i%2,0,0,0,0,0],throttleResponses:[Math.floor(i/2)%2,0,0,0,0,0]}});
}
const matrix=()=>{const q=Array.from({length:4},()=>random()-.5),l=Math.hypot(...q),[x,y,z,w]=q.map(v=>v/l);return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,...Array.from({length:3},()=>f((random()-.5)*100)),1].map(f);};
cases.forEach((c,i)=>{
 const front=i%6;
 c.preparation={nodes:Array.from({length:6},()=>({local:matrix(),world:matrix(),cacheValid:+(random()<.5)})),parents:[-1,0,i%4?0:1,1,2,Math.floor(i/4)%5],front,rear:Math.floor(i/6)%7===6?front:Math.floor(i/6)%6,positionNode:Math.floor(i/42)%6,restLocal:matrix(),frontLimited:i%2,rearLimited:Math.floor(i/2)%2,position:[7,8,9],scratch:Array.from({length:7},()=>Array.from({length:3},()=>f((random()-.5)*100)))};
});
const input=Buffer.alloc(4+cases.length*1244);input.writeUInt32LE(cases.length);
cases.forEach((c,i)=>{const values=encodeContactPreparation(c);if(values.length!==311)throw new Error('Input layout');values.forEach((v,j)=>input.writeFloatLE(v,4+i*1244+j*4));});
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*1028)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++){
 const c=cases[i],expected=evaluateContactPreparation(c),actual=Array.from({length:257},(_,j)=>results.readUInt32LE(i*1028+j*4));
 const p=c.preparation;
 const ancestor=(a,b)=>{while(b>=0){if(a===b)return true;b=p.parents[b];}return false;};
 const relationship=p.front===p.rear?'alias':ancestor(p.front,p.rear)?'front-parent':ancestor(p.rear,p.front)?'rear-parent':'separate';
 const key=`relationship=${relationship}:position=${p.positionNode}:frontCached=${p.nodes[p.front].cacheValid}:rearCached=${p.nodes[p.rear].cacheValid}:shift=${actual[6]-c.engine.gear}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<257;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i%113===0||outcomes[key]===1)fixtures.push({input:c,outputBits:actual});
}
for(const shift of [-1,1])if(!Object.keys(outcomes).some(k=>k.endsWith(`:shift=${shift}`)))throw new Error('Missing gear transition');
for(let node=0;node<6;node++)if(!Object.keys(outcomes).some(k=>k.includes(`:position=${node}:`)))throw new Error('Missing position node');
for(const relation of ['alias','front-parent','rear-parent','separate'])if(!Object.keys(outcomes).some(k=>k.startsWith(`relationship=${relation}:`)))throw new Error('Missing transform relationship');
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Connected original 0x4a5bd7..0x4a5ea5 including front/rear suspension reset, live cache invalidation and reference position query through six-node transform graphs: shift timer, brake/input gates, crashed mass selection, digital/analog throttle, automatic gears, vertical acceleration filter and low-speed stop. Real input aggregator with one supplied device and supplied CRT shift draw. Positive filter durations and finite states, captured engine parameter table. Contact generation and full simulation loop excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
