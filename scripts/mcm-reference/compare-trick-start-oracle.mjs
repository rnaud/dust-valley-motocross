import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {startMcmTrick} from '../../src/physics/mcm/trick-start.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-trick-start-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'trick-start-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>[...vec(3),0,...vec(3),0,...vec(3),0,...vec(100),1];
for(let i=0;i<48000;i++) {
 const c={position:vec(300),target:vec(300),velocity:vec(100),angularVelocity:vec(8),up:[0,1,0],otherVelocity:vec(100),speed:f(1+random()*100),previousSpeed:f(random()*100),otherSpeed:f(1+random()*100),launch:0,inputPresent:i%2,inputResult:0,field710:0,field714:i%2,animation:0,frame:28,field4bc:0,state:0,height0:f(-4),height1:f(-4),suppress:0,eventKind:7,reason:11,otherPresent:0,counter:0,field820:0,angle4f0:0,angle4d8:0,terrainMode:i%3,uprightThreshold:f(.2),time:f(.02),decel:f(-10000),accel:f(10000),invMass:f(.01),arg1:0,arg2:0,arg7:1,arg8:f(.02),arg9:0,arg11:0,rand0:Math.floor(random()*32768),rand1:Math.floor(random()*32768)};
 switch(i%16){
 case 0:c.launch=1;break;
 case 1:c.inputPresent=1;c.inputResult=1;c.field4bc=1;c.height0=f([-3.5,-3.50001,-3.49999,-4][(i>>4)%4]);break;
 case 2:c.suppress=1;c.otherPresent=1;break;
 case 3:c.field710=1;c.arg1=(i>>4)%2;c.speed=f([0,30,30.00001][(i>>5)%3]);break;
 case 4:c.field710=1;c.animation=11;c.frame=[27,28,29][(i>>4)%3];break;
 case 5:c.counter=[30,31,-1][(i>>4)%3];c.arg1=(i>>5)%2;break;
 case 6:c.angle4f0=f([.95989,.9599,.95991,-.95991][(i>>4)%4]);break;
 case 7:c.field4bc=1;c.angle4d8=f([1.29999,1.3,1.30001,-1.30001][(i>>4)%4]);break;
 case 8:c.arg1=1;c.arg7=f([.34199,.342,.34201,.76599,.766,.76601][(i>>4)%6]);break;
 case 9:c.up=vec(2);break;
 case 10:c.otherPresent=1;c.velocity=[0,0,c.speed];c.otherVelocity=[0,0,f(c.otherSpeed*[-1,-.7070001,-.707,-.7069999,0,.7069999,.707,.7070001,1][(i>>4)%9])];break;
 case 11:c.time=f([.01999,.02,.02001][(i>>4)%3]);c.decel=f(-5);break;
 case 12:c.arg9=1;c.accel=f(2);c.arg11=f(random()*100);break;
 case 13:c.field820=1;c.arg1=1;c.arg7=0;c.angle4f0=2;break;
 case 14:c.otherPresent=1;break;
 case 15:c.launch=+(random()<.05);c.inputResult=1;c.field710=+(random()<.3);c.field4bc=i%2;c.counter=Math.floor(random()*40);c.up=vec(2);c.otherPresent=1;c.angle4f0=f(random()*2);break;
 }
 if(i%19===0)c.angularVelocity[2]=-0;
 if(i%23===0)c.arg2=1;
 if(i%29===0)c.state=1;
 if(i%3===0)c.field820=1;
 c.arg10=c.arg11;c.arg11=f(random()*1000);
 c.setup={sourceLocal:matrix(),sourceWorld:matrix(),targetLocal:matrix(),targetWorld:matrix(),parented:i%2,sourceCache:(i>>1)%2,targetCache:(i>>2)%2,forward:vec(3),field4e0:f(random()),envelope:[...vec(3),f(random())],direction:vec(3),inverted:i%2,field890:f(random()),resource:100,normalResource:200,alternateResource:300,boundsMin:vec(10),boundsMax:vec(10),liveBoundsMin:vec(10),liveBoundsMax:vec(10),scratch540:vec(3),scratch54c:vec(3),rider:{velocity:vec(100),angularVelocity:vec(10),previousVelocity:vec(100),selected:[701,702,703],active13c:i%2,active16c:(i>>1)%2,kind:7},randomValues:Array.from({length:3},()=>Math.floor(random()*32768)),records:Array.from({length:8},(_,k)=>Array.from({length:3},(_,g)=>Array.from({length:g===0?(Math.floor(i/9)+k)%6:1+(i+k+g)%5},(_,j)=>10000*k+100*g+j+1)))};
 c.setup.components=Array.from({length:2},(_,k)=>({local:matrix(),world:matrix(),cacheValid:(i>>(k+3))%2,parentIndex:k===0?-1:((i>>5)%2?0:-1)}));
 c.setup.boundsChildren=Array.from({length:3},(_,k)=>({componentIndex:(k+i)%2,local:(i>>k)%2,forward:vec(5),up:vec(5),position:vec(10)}));
 c.field820=(i>>4)%2;c.trickIndex=i%16;c.awardBase=f(random()*20);c.fieldb4c=i%3;c.bikeAnimation=[7,8,9,10,11];c.riderAnimation=[12,13,14,15,16];c.bikeAnimationRecords=Array.from({length:16},(_,k)=>1000+k*13);c.riderAnimationRecords=Array.from({length:16},(_,k)=>2000+k*17);
 cases.push(c);
}
const scalarFields='speed previousSpeed otherSpeed launch inputPresent inputResult field710 field714 animation frame field4bc state height0 height1 suppress eventKind reason otherPresent counter field820 angle4f0 angle4d8 terrainMode uprightThreshold time decel accel invMass arg1 arg2 arg7 arg8 arg9 arg11 rand0 rand1'.split(' ');
const input=Buffer.alloc(4+cases.length*1860);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],s=c.setup,r=s.rider,values=[...c.position,...c.target,...c.velocity,...c.angularVelocity,...c.up,...c.otherVelocity,...scalarFields.map(k=>c[k]),...s.sourceLocal,...s.sourceWorld,...s.targetLocal,...s.targetWorld,s.parented,s.sourceCache,s.targetCache,...s.forward,s.field4e0,...s.envelope,...s.direction,s.inverted,s.field890,s.resource,s.normalResource,s.alternateResource,...s.boundsMin,...s.boundsMax,...s.liveBoundsMin,...s.liveBoundsMax,...s.scratch540,...s.scratch54c,...r.velocity,...r.angularVelocity,...r.previousVelocity,...r.selected,r.active13c,r.active16c,r.kind,...s.randomValues];
 for(const groups of s.records)for(const group of groups)values.push(group.length,...group,...Array(5-group.length).fill(0));
 values.push(c.arg10);
 for(const node of s.components)values.push(...node.local,...node.world,node.cacheValid,node.parentIndex);
 values.push(s.boundsChildren.length);
 for(const record of s.boundsChildren)values.push(record.componentIndex,record.local,...record.forward,...record.up,...record.position);
 values.push(c.trickIndex,c.awardBase,c.fieldb4c,...c.bikeAnimation,...c.riderAnimation,...c.bikeAnimationRecords,...c.riderAnimationRecords);
 if(values.length!==465)throw new Error('Input layout');
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*1860+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*836)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const c=cases[i],s=c.setup,t=startMcmTrick(c),r={...t,triggered:c.state,eventKind:c.eventKind,reason:c.reason,otherPresent:c.otherPresent,field714:c.field714,velocity:c.velocity,angularVelocity:c.angularVelocity,randomCalls:0,inputCalls:0,state:c.state,direction:s.direction,inverted:s.inverted,field890:s.field890,resource:s.resource,rider:s.rider},expected=[r.triggered,r.eventKind,r.reason,r.otherPresent,r.field710,r.field714,...[...r.velocity,...r.angularVelocity].map(floatBits),r.randomCalls,r.inputCalls,r.state,r.field820,r.animation,...[...r.envelope,...r.direction].map(floatBits),r.inverted,floatBits(r.field890),r.resource,...[...r.boundsMin,...r.boundsMax,...r.scratch540,...r.scratch54c,...r.target.local,...r.target.world,...r.source.world].map(floatBits),r.source.cacheValid,r.target.cacheValid,...[...r.rider.velocity,...r.rider.angularVelocity,...r.rider.previousVelocity].map(floatBits),...r.rider.selected,r.rider.active13c,r.rider.active16c,r.rider.kind,...r.components.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...r.boundsChildren.flatMap(n=>[...n.forward,...n.up,...n.position].map(floatBits)),floatBits(t.awardBase),t.fieldb4c,...t.bikeAnimation,...t.riderAnimation],actual=Array.from({length:209},(_,j)=>results.readUInt32LE(i*836+j*4));
 if(expected.length!==209)throw new Error('Output layout');
 const key=`trick=${c.trickIndex}:orientation=${!!c.field820}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<209;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%113===0)fixtures.push({input:cases[i],angularVelocityBits:cases[i].angularVelocity.map(floatBits),outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original trick-start helper 0x4a1970 with real orientation, bounds-child callbacks and rider/bike animation selection (0x430a20). All 16 trick indices, root bike target, source root/child, ordered mixed child callbacks, sibling/nested components. Record pointers normalized to supplied table indices; finite nondegenerate axes. Trick input selection, arbitrary graph aliases, live animation tables and whole-bike trajectories excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
