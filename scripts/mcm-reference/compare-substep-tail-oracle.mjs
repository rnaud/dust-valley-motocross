import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {floatBits} from '../../src/physics/mcm/math.js';
import {evaluateSubstepTail} from './substep-tail-case.mjs';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-substep-tail-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'substep-tail-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>{const q=Array.from({length:4},()=>random()-.5),l=Math.hypot(...q),[x,y,z,w]=q.map(v=>v/l);return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,...vec(30),1].map(f);};
const transform=()=>({local:matrix(),world:matrix(),cacheValid:random()<.5?0:1});
for(let i=0;i<32000;i++){
 const n=vec(2),length=Math.hypot(...n),slow=i%5===0;
 cases.push({bike:{transform:transform(),state844:i%3,field618:i%3===0?1:i%2,field8a8:i%2,field564:f(i%2?.0005:.01),position:vec(10),velocity:vec(slow?.02:50),angularVelocity:vec(4),worldAngularVelocity:slow?[0,0,0]:vec(4),scratch540:vec(4),field654:vec(4),speed:f(random()*20),restitution:f(random()),inverseMass:f(.001+random()),inverseInertia:Array.from({length:3},()=>f(random()+.01)),alternateInertia:Array.from({length:3},()=>f(random()+.01))},proxy:transform(),collision:{contactCC:vec(10),contactD8:vec(.4),contactE4:n.map(x=>f(x/length)),localCenter:vec(3),radius:f(random()*5+.1),worldCenter:vec(5),matrix:matrix()},gridEnabled:i%7!==0,oldCells:Array.from({length:4},()=>Math.floor(random()*17)),active:Array.from({length:4},()=>random()<.5?0:1)});
}
cases.forEach((c,i)=>{
 c.bike.heading=f((random()-.5)*13);c.collisionType=Math.floor(i/2)%2;
 c.other={transform:transform(),state844:Math.floor(i/3)%3,inverseMass:f(.001+random()),alternateMass:f(.001+random()),riderMass:f(.001+random()),inverseInertia:vec(2).map(Math.abs),alternateInertia:vec(2).map(Math.abs),riderInertia:vec(2).map(Math.abs),position:vec(10),velocity:vec(30),worldAngularVelocity:vec(4),angularVelocity:vec(4),riderTransform:transform(),rider:{position:vec(10),velocity:vec(30),angular:vec(4),alternateVelocity:vec(30),alternateAngular:vec(4),flag13c:Math.floor(i/4)%2,flag140:Math.floor(i/8)%2}};
});
const eventCases=[];
for(let i=0;i<32000;i++) {
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
 eventCases.push(c);
}
cases.forEach((c,i)=>{c.bike.state844=0;c.bike.field618=0;c.bike.field8d0=eventCases[i].arg8;c.collisionType=Math.floor(i/16)%3;c.event=eventCases[i];if(i%41===0){c.event.otherSpeed=0;c.event.otherVelocity=[0,0,0];c.event.otherPresent=1;}});
cases.forEach((c,i)=>{
 c.step={present:i%11!==0,enabled:i%13!==0,managerEnabled:i%17!==0,remaining:1+i%5,carry:f(random()*.03),pair:Math.floor(i/7)%4===0?3:2};
 c.bike.field8a8=Math.floor(i/16)%2;c.bike.state844=i%19===0?1+Math.floor(i/19)%2:0;c.bike.field618=i%23===0?1:0;
 const t=c.bike.transform,m=t.cacheValid?t.world:t.local,[x,y,z]=c.collision.localCenter;
 const center=[f(((m[4]*y+m[0]*x)+m[8]*z)+m[12]),f(((m[9]*z+m[5]*y)+m[1]*x)+m[13]),f(((m[2]*x+m[10]*z)+m[6]*y)+m[14])];
 const offset=f(c.collision.radius*(i%5===0?3:.2+.5*random()));
 const position=[f(center[0]+offset),center[1],center[2]];
 for(const matrix of [c.other.transform.local,c.other.transform.world])for(let k=0;k<3;k++)matrix[12+k]=position[k];
 c.other.position=[...position];

});
cases.forEach((c,i)=>{
 c.step.dt=f(.005+random()*.025);c.step.inverseDt=f(1/c.step.dt);
 c.step.carry=[0,f(.00009),f(.0001),f(.00010001),f(random()*.03)][Math.floor(i/5)%5];
 c.post={both:Math.floor(i/32)%2,field714:c.event.field714,fieldbfc:i%17===0?1:0,field870:i%3?1:0,timer:f(i%2?-.01:random()*.1),awardBase:f(random()*8),score:f(random()*10000),suppressAward:i%7===0,frontHeight:f((random()-.5)*10),rearHeight:f((random()-.5)*10),frontOutput:f(random()),rearOutput:f(random())};
});
const scalarFields='speed previousSpeed otherSpeed launch inputPresent inputResult field710 field714 animation frame field4bc state height0 height1 suppress eventKind reason otherPresent counter field820 angle4f0 angle4d8 terrainMode uprightThreshold time decel accel invMass arg1 arg2 arg7 arg8 arg9 arg11 rand0 rand1'.split(' ');
const input=Buffer.alloc(4+cases.length*2340);input.writeUInt32LE(cases.length);
const node=n=>[...n.local,...n.world,n.cacheValid];
for(let i=0;i<cases.length;i++){
 const c=eventCases[i],s=c.setup,r=s.rider,values=[...c.position,...c.target,...c.velocity,...c.angularVelocity,...c.up,...c.otherVelocity,...scalarFields.map(k=>c[k]),...s.sourceLocal,...s.sourceWorld,...s.targetLocal,...s.targetWorld,s.parented,s.sourceCache,s.targetCache,...s.forward,s.field4e0,...s.envelope,...s.direction,s.inverted,s.field890,s.resource,s.normalResource,s.alternateResource,...s.boundsMin,...s.boundsMax,...s.liveBoundsMin,...s.liveBoundsMax,...s.scratch540,...s.scratch54c,...r.velocity,...r.angularVelocity,...r.previousVelocity,...r.selected,r.active13c,r.active16c,r.kind,...s.randomValues];
 for(const groups of s.records)for(const group of groups)values.push(group.length,...group,...Array(5-group.length).fill(0));
 values.push(c.arg10);
 if(values.length!==318)throw new Error('Input layout');
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*2340+j*4));
 {const c=cases[i];const b=c.bike,o=c.collision,w=c.other,r=w.rider;[...node(b.transform),...node(c.proxy),b.state844,b.field618,b.field8a8,b.field564,...b.position,...b.velocity,...b.angularVelocity,...b.worldAngularVelocity,...b.scratch540,...b.field654,b.speed,b.restitution,b.inverseMass,...b.inverseInertia,...b.alternateInertia,...o.contactCC,...o.contactD8,...o.contactE4,...o.localCenter,o.radius,...o.worldCenter,...o.matrix,+c.gridEnabled,...c.oldCells,...c.active,b.heading,c.collisionType,...node(w.transform),w.state844,w.inverseMass,w.alternateMass,w.riderMass,...w.inverseInertia,...w.alternateInertia,...w.riderInertia,...w.position,...w.velocity,...w.worldAngularVelocity,...w.angularVelocity,...node(w.riderTransform),...r.position,...r.velocity,...r.angular,...r.alternateVelocity,...r.alternateAngular,r.flag13c,r.flag140].forEach((v,j)=>input.writeFloatLE(v,4+i*2340+1272+j*4));}
}
cases.forEach((c,i)=>[+c.step.present,+c.step.enabled,+c.step.managerEnabled,c.step.remaining,c.step.carry,c.step.pair,c.step.dt,c.step.inverseDt,c.post.both,c.post.fieldbfc,c.post.field870,c.post.timer,c.post.awardBase,c.post.score,+c.post.suppressAward,c.post.frontHeight,c.post.rearHeight,c.post.frontOutput,c.post.rearOutput].forEach((v,j)=>input.writeFloatLE(v,4+i*2340+2264+j*4)));
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*1984)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++){
 const c=cases[i],expected=evaluateSubstepTail(c),actual=Array.from({length:496},(_,j)=>results.readUInt32LE(i*1984+j*4));
 const key=`present=${c.step.present}:skip=${c.bike.field8a8}:contactLinked=${actual[266]}:state=${actual[406]}:initial=${c.bike.state844}:remaining=${actual[263]}:reason=${actual[394]}:secondary=${actual[324]}:otherState=${c.other.state844}:carryCleared=${actual[370]===0&&c.step.carry>0}:rescheduled=${actual[371]===floatBits(c.step.carry)&&actual[369]===1&&c.step.carry>Math.fround(.0001)}:award=${actual[388]!==floatBits(c.post.score)}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<496;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i%113===0||outcomes[key]===1)fixtures.push({input:c,outputBits:actual});
}
if(!Object.keys(outcomes).some(k=>k.includes('present=true:skip=0:contactLinked=1:state=1:initial=0:remaining=0')))throw new Error('Missing crash transition');
if(!Object.keys(outcomes).some(k=>k.includes('present=true:skip=0:contactLinked=1:state=2:initial=2:')))throw new Error('Missing already-crashed contact');
for(let state=0;state<3;state++)if(!Object.keys(outcomes).some(k=>k.includes(`:secondary=1:otherState=${state}`)))throw new Error('Missing secondary response state');
if(!Object.keys(outcomes).some(k=>k.includes(':rescheduled=true:')))throw new Error('Missing carry-time reschedule');
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Connected original main-step tail 0x4ac6cd..0x4ac94b, including common post-event state, delayed score award, two-bike collision section, carry scheduling and orientation refresh with real proxy/grid update, dispatcher, ellipsoid-pair primitive, primary and secondary callbacks, ordered dynamic responses and event transition. Missing objects, suppression, filtering, miss/hit and crash remainder. Connected 0x49d900 type 0 through real impulse, transforms, proxy/grid and final 0x4a4b60 event decision, orientation and rider transition. Root bike transform, optionally parented source, no bounds children, supplied input and random draws. Visual effects and active audio disabled; second-bike final event uses a nontriggering timing state; triggered second-bike event setup, tags and whole-bike main step excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
