import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateNearbyFrameRider} from './nearby-frame-rider-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-nearby-frame-rider-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'nearby-frame-rider-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>[...vec(3),0,...vec(3),0,...vec(3),0,...vec(100),1];
for(let i=0;i<6000;i++)cases.push({nodes:Array.from({length:3},(_,k)=>({local:matrix(),world:matrix(),cacheValid:(i>>(k+2))%2})),position:vec(100),targetParent:1+i%2,bodyParent:(i>>1)%2,forward:vec(5),up:vec(5),componentIndex:(i>>5)%8,local:(i>>8)%2,positionEnabled:(i>>9)%2,frameCount:1+(i>>5)%8,fraction:f([0,.001,.25,.5,.75,.999,1][i%7]),weight:f([0,.001,.25,.5,.75,.999,1][Math.floor(i/7)%7]),pose:Math.floor(i/49)%14,nextPose:Math.floor(i/11)%11,enabled:Math.floor(i/17)%2,speed:f([-100,-32.2,-1,-0,0,1,32.2,100][Math.floor(i/19)%8]),secondaryWeight:f([0,.2,.5,1][Math.floor(i/23)%4]),riderParent:Math.floor(i/29)%2,childMask:Math.floor(i/31)%4,fieldbfc:[-1,0,1,3,4][Math.floor(i/37)%5],state:0,angle:f((random()-.5)*4),secondaryControl:Math.floor(i/41)%2,delta:f([0,.001,.02,.1,.3][Math.floor(i/3)%5]),active:Math.floor(i/7)%2,returning:Math.floor(i/11)%2,lean:f([-.7,-.4,-.1,-0,0,.1,.4,.7][Math.floor(i/13)%8]),progress:f([-.6,-.1,-.001,-0,0,.001,.1,.24,.6][Math.floor(i/17)%9]),nearbyAngle:f([-2.7,-1,-.1,0,.1,1,2.7][Math.floor(i/19)%7]),heading:f([-3.2,-1,0,1,3.2][Math.floor(i/23)%5]),bikePosition:vec(20),targetPosition:vec(20)});
cases.forEach(c=>{c.speedBits=floatBits(c.speed);c.leanBits=floatBits(c.lean);c.progressBits=floatBits(c.progress);});
const input=Buffer.alloc(4+cases.length*568);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[...c.nodes.flatMap(n=>[...n.local,...n.world]),...c.nodes.map(n=>n.cacheValid),0,0,...c.position,c.targetParent,c.bodyParent,...c.forward,...c.up,c.componentIndex,c.local,c.positionEnabled,c.frameCount,c.fraction,c.weight,c.pose,c.nextPose,c.enabled,c.speed,c.secondaryWeight,c.riderParent,c.childMask,c.fieldbfc,c.state,c.angle,c.secondaryControl,c.delta,c.active,c.returning,c.lean,c.progress,c.nearbyAngle,c.heading,...c.bikePosition,...c.targetPosition];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*568+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
fs.writeFileSync(join(output,'case-inputs.json'),JSON.stringify(cases));
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*52064)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const expected=evaluateNearbyFrameRider(cases[i]),actual=Array.from({length:13016},(_,j)=>results.readUInt32LE(i*52064+j*4));
 for(let j=0;j<13016;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 const c=cases[i],key=`active=${c.active}:returning=${c.returning}:lean=${Math.sign(c.lean)}:ended=${actual[3247]===0}:normalLater=${actual[13009]===0}:mask=${c.childMask}:riderParent=${c.riderParent}`;outcomes[key]=(outcomes[key]||0)+1;
 if(i%31===0||i<160)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original 0x4af710 nearby-interaction branch through return across four retained calls, including target-angle tracking and wrapping, lean/progress clamps, hold and return phases, both animation seeks and subsequent normal pose application after completion. Six transform nodes, both animation objects, control fields and all source children observed. Valid finite synthetic state/assets and stationary supplied target; recovery branch, full physics-frame integration, dynamic collisions and whole-bike trajectories remain excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
